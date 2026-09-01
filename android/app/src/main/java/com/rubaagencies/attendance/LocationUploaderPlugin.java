package com.rubaagencies.attendance;

import android.Manifest;
import android.content.Intent;
import android.os.Build;

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
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getContext().stopService(new Intent(getContext(), LocationUploadService.class));
        call.resolve();
    }
}
