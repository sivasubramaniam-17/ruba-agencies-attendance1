package com.rubaagencies.attendance;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.IBinder;
import android.os.Looper;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * Foreground service that reads GPS and POSTs each fix to /api/location using a
 * Bearer token — entirely in native code, so it keeps running (and posting)
 * even after the app is cleared from recents. No JavaScript involved.
 */
public class LocationUploadService extends Service implements LocationListener {
    public static final String CHANNEL_ID = "ruba_location";
    private static final int NOTIF_ID = 8823;

    private String url;
    private String token;
    private LocationManager locationManager;
    private HandlerThread bgThread;
    private Handler bgHandler;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            if (intent.getStringExtra("url") != null) url = intent.getStringExtra("url");
            if (intent.getStringExtra("token") != null) token = intent.getStringExtra("token");
        }

        startAsForeground();
        startLocationUpdates();

        // START_STICKY: if Android kills us for memory, it recreates the service.
        return START_STICKY;
    }

    private void startAsForeground() {
        Notification notification = buildNotification();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIF_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
        } else {
            startForeground(NOTIF_ID, notification);
        }
    }

    private void startLocationUpdates() {
        if (bgThread == null) {
            bgThread = new HandlerThread("ruba-loc-upload");
            bgThread.start();
            bgHandler = new Handler(bgThread.getLooper());
        }
        locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        if (locationManager == null) return;
        try {
            // Ask for fixes every ~8s (minDistance 0) so a moving employee can be
            // posted near-live; standing still still yields a heartbeat. The actual
            // upload rate is throttled above (fast while moving, slow while idle).
            if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                locationManager.requestLocationUpdates(
                        LocationManager.GPS_PROVIDER, 8000, 0, this, Looper.getMainLooper());
            }
            if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                locationManager.requestLocationUpdates(
                        LocationManager.NETWORK_PROVIDER, 8000, 0, this, Looper.getMainLooper());
            }
        } catch (SecurityException e) {
            // Location permission not granted — nothing to do until it is.
        }
    }

    // Adaptive throttle: when the employee is moving we post near-live (every
    // ~10s) so the admin map tracks them like Google Maps; when they're standing
    // still we drop to a ~45s heartbeat so office staff don't spam the API/DB and
    // run up cost. The two providers also can't double-post inside these windows.
    private static final long MOVING_POST_INTERVAL_MS = 10000;  // ~10s while moving
    private static final long IDLE_POST_INTERVAL_MS = 45000;    // ~45s while still
    private static final float MOVED_THRESHOLD_M = 30f;         // >30m = "moving"
    private long lastPostAt = 0;
    private double lastLat = Double.NaN;
    private double lastLng = Double.NaN;

    private long lastGpsAt = 0;

    @Override
    public void onLocationChanged(Location location) {
        if (location == null) return;
        if (!withinTrackingHours()) return; // off after 10 PM until 6 AM (IST)
        long now = System.currentTimeMillis();

        // Prefer precise GPS fixes. If this is a coarse network (cell/wifi) fix but
        // we had a real GPS fix in the last 2 minutes, skip it so the pin stays sharp.
        boolean isGps = LocationManager.GPS_PROVIDER.equals(location.getProvider());
        if (isGps) lastGpsAt = now;
        else if (now - lastGpsAt < 120000) return;

        // How far since the last upload? Decides the fast vs heartbeat interval.
        float moved = Float.MAX_VALUE;
        if (!Double.isNaN(lastLat)) {
            float[] r = new float[1];
            Location.distanceBetween(lastLat, lastLng, location.getLatitude(), location.getLongitude(), r);
            moved = r[0];
        }
        long minInterval = moved >= MOVED_THRESHOLD_M ? MOVING_POST_INTERVAL_MS : IDLE_POST_INTERVAL_MS;
        if (now - lastPostAt < minInterval) return;

        lastPostAt = now;
        lastLat = location.getLatitude();
        lastLng = location.getLongitude();
        uploadLocation(location);
    }

    // Tracking window: 06:00–22:00 IST. Outside it, don't post.
    private boolean withinTrackingHours() {
        java.util.Calendar cal = java.util.Calendar.getInstance(java.util.TimeZone.getTimeZone("Asia/Kolkata"));
        int hour = cal.get(java.util.Calendar.HOUR_OF_DAY);
        return hour >= 6 && hour < 22;
    }

    private void uploadLocation(final Location loc) {
        if (url == null || token == null || bgHandler == null) return;
        bgHandler.post(new Runnable() {
            @Override
            public void run() {
                HttpURLConnection conn = null;
                try {
                    conn = (HttpURLConnection) new URL(url).openConnection();
                    conn.setRequestMethod("POST");
                    conn.setRequestProperty("Content-Type", "application/json");
                    conn.setRequestProperty("Authorization", "Bearer " + token);
                    conn.setConnectTimeout(15000);
                    conn.setReadTimeout(15000);
                    conn.setDoOutput(true);

                    String body = "{"
                            + "\"latitude\":" + loc.getLatitude()
                            + ",\"longitude\":" + loc.getLongitude()
                            + ",\"accuracy\":" + (loc.hasAccuracy() ? loc.getAccuracy() : "null")
                            + ",\"heading\":" + (loc.hasBearing() ? loc.getBearing() : "null")
                            + ",\"speed\":" + (loc.hasSpeed() ? loc.getSpeed() : "null")
                            + "}";

                    OutputStream os = conn.getOutputStream();
                    os.write(body.getBytes(StandardCharsets.UTF_8));
                    os.flush();
                    os.close();
                    conn.getResponseCode(); // triggers the request
                } catch (Exception ignored) {
                    // Offline / transient — the next fix will retry.
                } finally {
                    if (conn != null) conn.disconnect();
                }
            }
        });
    }

    private Notification buildNotification() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID, "Location sharing", NotificationManager.IMPORTANCE_LOW);
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(channel);
        }
        Intent open = new Intent(this, MainActivity.class);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        PendingIntent pi = PendingIntent.getActivity(this, 0, open, flags);

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Ruba Attendance")
                .setContentText("Sharing your live location.")
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setOngoing(true)
                .setContentIntent(pi)
                .build();
    }

    // Called when the user swipes the app away from recents. Immediately relaunch
    // the service so tracking continues (works on most ROMs; MIUI still needs the
    // app "locked" in recents to guarantee it).
    @Override
    public void onTaskRemoved(Intent rootIntent) {
        try {
            Intent restart = new Intent(getApplicationContext(), LocationUploadService.class);
            restart.putExtra("url", url);
            restart.putExtra("token", token);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                getApplicationContext().startForegroundService(restart);
            } else {
                getApplicationContext().startService(restart);
            }
        } catch (Exception ignored) {
        }
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public void onDestroy() {
        try {
            if (locationManager != null) locationManager.removeUpdates(this);
        } catch (Exception ignored) {
        }
        if (bgThread != null) bgThread.quitSafely();
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    // Required LocationListener callbacks (unused).
    @Override
    public void onProviderEnabled(String provider) {
    }

    @Override
    public void onProviderDisabled(String provider) {
    }

    @Override
    public void onStatusChanged(String provider, int status, Bundle extras) {
    }
}
