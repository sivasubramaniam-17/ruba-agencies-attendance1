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
            // Ask for frequent fixes (minDistance 0) so we still post a heartbeat
            // while the employee is standing still — otherwise they'd drop off
            // the map. Actual upload rate is throttled below to MIN_POST_INTERVAL.
            if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                locationManager.requestLocationUpdates(
                        LocationManager.GPS_PROVIDER, 15000, 0, this, Looper.getMainLooper());
            }
            if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                locationManager.requestLocationUpdates(
                        LocationManager.NETWORK_PROVIDER, 15000, 0, this, Looper.getMainLooper());
            }
        } catch (SecurityException e) {
            // Location permission not granted — nothing to do until it is.
        }
    }

    // Throttle uploads so the two providers don't double-post and so we send at
    // most one every ~30s (keeps the employee "live" without spamming the API).
    private static final long MIN_POST_INTERVAL_MS = 30000;
    private long lastPostAt = 0;

    @Override
    public void onLocationChanged(Location location) {
        if (location == null) return;
        if (!withinTrackingHours()) return; // off after 10 PM until 6 AM (IST)
        long now = System.currentTimeMillis();
        if (now - lastPostAt < MIN_POST_INTERVAL_MS) return;
        lastPostAt = now;
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
