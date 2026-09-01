package com.rubaagencies.attendance;

import android.Manifest;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * JS bridge for the native background location uploader.
 * start({ url, token }) requests location permission then runs the foreground
 * service; stop() tears it down.
 */
@CapacitorPlugin(
        name = "LocationUploader",
        permissions = {
                @Permission(
                        alias = "location",
                        strings = {
                                Manifest.permission.ACCESS_FINE_LOCATION,
                                Manifest.permission.ACCESS_COARSE_LOCATION
                        }
                )
        }
)
public class LocationUploaderPlugin extends Plugin {

    @PluginMethod
    public void start(PluginCall call) {
        if (getPermissionState("location") != PermissionState.GRANTED) {
            requestPermissionForAlias("location", call, "locationPermissionCallback");
        } else {
            launchService(call);
        }
    }

    @PermissionCallback
    private void locationPermissionCallback(PluginCall call) {
        if (getPermissionState("location") == PermissionState.GRANTED) {
            launchService(call);
        } else {
            call.reject("Location permission is required to share your location.");
        }
    }

    private void launchService(PluginCall call) {
        Intent intent = new Intent(getContext(), LocationUploadService.class);
        intent.putExtra("url", call.getString("url"));
        intent.putExtra("token", call.getString("token"));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(intent);
        } else {
            getContext().startService(intent);
        }
        requestBatteryExemption();
        call.resolve();
    }

    // Ask the OS (one-tap system dialog) to stop battery-optimising this app, so
    // MIUI/Oppo/etc. don't kill the foreground service after a few minutes.
    // Only shows if not already granted.
    private void requestBatteryExemption() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return;
        try {
            PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
            String pkg = getContext().getPackageName();
            if (pm != null && !pm.isIgnoringBatteryOptimizations(pkg)) {
                Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                intent.setData(Uri.parse("package:" + pkg));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
            }
        } catch (Exception ignored) {
            // Some ROMs block this dialog — the user can still whitelist manually.
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getContext().stopService(new Intent(getContext(), LocationUploadService.class));
        call.resolve();
    }

    // Opens the phone's "Autostart" management screen (MIUI/Oppo/Vivo/Huawei) so
    // the employee can enable it with one tap. Falls back to the app info page.
    @PluginMethod
    public void openAutoStartSettings(PluginCall call) {
        Context ctx = getContext();
        String[][] targets = {
                {"com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity"},
                {"com.letv.android.letvsafe", "com.letv.android.letvsafe.AutobootManageActivity"},
                {"com.huawei.systemmanager", "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity"},
                {"com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity"},
                {"com.oppo.safe", "com.oppo.safe.permission.startup.StartupAppListActivity"},
                {"com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity"},
                {"com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity"},
        };
        for (String[] t : targets) {
            try {
                Intent intent = new Intent();
                intent.setComponent(new ComponentName(t[0], t[1]));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx.startActivity(intent);
                call.resolve();
                return;
            } catch (Exception ignored) {
                // try the next OEM target
            }
        }
        // Fallback: the standard app info screen (Autostart/Battery live under it).
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + ctx.getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(intent);
        } catch (Exception ignored) {
        }
        call.resolve();
    }
}
