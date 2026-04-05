package com.kavach;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.location.Location;
import android.location.LocationManager;
import android.os.BatteryManager;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

/**
 * KavachPlugin - Android Java native bridge
 * Adds mock-location detection and hardware heartbeat checks.
 */
@CapacitorPlugin(name = "KavachPlugin")
public class KavachPlugin extends Plugin {

    private float lastBatteryLevel = -1;
    private long lastBatteryReadTime = 0;

    @PluginMethod
    public void getBatteryTemperature(PluginCall call) {
        try {
            JSObject batterySnapshot = readBatterySnapshot();
            call.resolve(batterySnapshot);
        } catch (Exception e) {
            call.reject("Battery read error: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getScreenBrightness(PluginCall call) {
        try {
            Context context = getContext();
            int brightness = Settings.System.getInt(
                context.getContentResolver(),
                Settings.System.SCREEN_BRIGHTNESS,
                128
            );

            JSObject result = new JSObject();
            result.put("brightness", brightness / 255.0f);
            result.put("rawValue", brightness);
            call.resolve(result);
        } catch (Exception e) {
            JSObject result = new JSObject();
            result.put("brightness", 0.75f);
            result.put("rawValue", 191);
            call.resolve(result);
        }
    }

    @PluginMethod
    public void getLocationIntegrity(PluginCall call) {
        try {
            JSObject result = readLocationIntegrity();
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Location integrity error: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getDeviceMetrics(PluginCall call) {
        getBridge().execute(() -> {
            try {
                JSObject battery = readBatterySnapshot();
                JSObject brightness = readBrightnessSnapshot();
                JSObject location = readLocationIntegrity();
                JSObject heartbeat = readSensorFusionHeartbeat();

                JSObject result = new JSObject();
                result.put("batteryTemp", battery.getDouble("temperature"));
                result.put("deviceTemp", battery.getDouble("temperature"));
                result.put("isCharging", battery.getBoolean("isCharging"));
                result.put("batteryLevel", battery.getDouble("batteryLevel"));
                result.put("drainRate", battery.getDouble("drainRate"));
                result.put("screenBrightness", brightness.getDouble("brightness"));
                result.put("brightness", brightness.getDouble("brightness"));

                result.put("isMockLocation", location.getBoolean("isMockLocation"));
                result.put("locationVerified", location.getBoolean("locationVerified"));
                result.put("locationProvider", location.getString("provider"));

                result.put("hardwareHeartbeat", heartbeat.getBoolean("hardwareHeartbeat"));
                result.put("batteryTempStatic", heartbeat.getBoolean("batteryTempStatic"));
                result.put("motionIdle", heartbeat.getBoolean("motionIdle"));
                result.put("motionSamples", heartbeat.getInteger("motionSamples"));
                result.put("activeMotionSamples", heartbeat.getInteger("activeMotionSamples"));
                result.put("maxAcceleration", heartbeat.getDouble("maxAcceleration"));

                call.resolve(result);
            } catch (Exception e) {
                call.reject("Device metrics error: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void getSensorFusionHeartbeat(PluginCall call) {
        getBridge().execute(() -> {
            try {
                JSObject result = readSensorFusionHeartbeat();
                call.resolve(result);
            } catch (Exception e) {
                call.reject("Sensor fusion error: " + e.getMessage());
            }
        });
    }

    private JSObject readBatterySnapshot() throws Exception {
        Context context = getContext();
        IntentFilter iFilter = new IntentFilter(Intent.ACTION_BATTERY_CHANGED);
        Intent batteryStatus = context.registerReceiver(null, iFilter);

        if (batteryStatus == null) {
            throw new Exception("Battery status unavailable");
        }

        int tempTenths = batteryStatus.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, -1);
        float tempCelsius = tempTenths / 10.0f;

        int status = batteryStatus.getIntExtra(BatteryManager.EXTRA_STATUS, -1);
        boolean isCharging = status == BatteryManager.BATTERY_STATUS_CHARGING
            || status == BatteryManager.BATTERY_STATUS_FULL;

        int level = batteryStatus.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
        int scale = batteryStatus.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
        float batteryPct = (scale > 0) ? (level / (float) scale) : 0.5f;

        float drainRate = 0.3f;
        long now = System.currentTimeMillis();
        if (lastBatteryLevel >= 0 && lastBatteryReadTime > 0 && !isCharging) {
            long elapsedMs = now - lastBatteryReadTime;
            if (elapsedMs > 10000) {
                float levelDelta = lastBatteryLevel - batteryPct;
                float minutesElapsed = elapsedMs / 60000.0f;
                drainRate = Math.max(0, levelDelta / minutesElapsed);
            }
        }
        lastBatteryLevel = batteryPct;
        lastBatteryReadTime = now;

        JSObject result = new JSObject();
        result.put("temperature", tempCelsius);
        result.put("isCharging", isCharging);
        result.put("batteryLevel", batteryPct);
        result.put("drainRate", drainRate);
        result.put("rawTempTenths", tempTenths);
        return result;
    }

    private JSObject readBrightnessSnapshot() {
        JSObject result = new JSObject();
        try {
            Context context = getContext();
            int brightness = Settings.System.getInt(
                context.getContentResolver(),
                Settings.System.SCREEN_BRIGHTNESS,
                200
            );
            result.put("brightness", brightness / 255.0f);
            result.put("rawValue", brightness);
        } catch (Exception e) {
            result.put("brightness", 0.8f);
            result.put("rawValue", 200);
        }
        return result;
    }

    private JSObject readLocationIntegrity() {
        JSObject result = new JSObject();
        Context context = getContext();

        boolean fineGranted = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        boolean coarseGranted = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        if (!fineGranted && !coarseGranted) {
            result.put("locationVerified", false);
            result.put("isMockLocation", false);
            result.put("provider", "permission_missing");
            return result;
        }

        LocationManager locationManager = (LocationManager) context.getSystemService(Context.LOCATION_SERVICE);
        Location bestLocation = null;
        String bestProvider = "unknown";

        List<String> providers = locationManager.getProviders(true);
        for (String provider : providers) {
            try {
                Location location = locationManager.getLastKnownLocation(provider);
                if (location != null && (bestLocation == null || location.getTime() > bestLocation.getTime())) {
                    bestLocation = location;
                    bestProvider = provider;
                }
            } catch (SecurityException ignored) {
                // Permission already checked above.
            }
        }

        boolean isMockLocation = false;
        if (bestLocation != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR2) {
            isMockLocation = bestLocation.isFromMockProvider();
        }

        result.put("locationVerified", bestLocation != null && !isMockLocation);
        result.put("isMockLocation", isMockLocation);
        result.put("provider", bestProvider);
        result.put("accuracy", bestLocation != null ? bestLocation.getAccuracy() : -1);
        result.put("locationAgeMs", bestLocation != null ? Math.max(0, System.currentTimeMillis() - bestLocation.getTime()) : -1);
        return result;
    }

    private JSObject readSensorFusionHeartbeat() throws Exception {
        JSObject firstBattery = readBatterySnapshot();
        try {
            Thread.sleep(1200);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        JSObject secondBattery = readBatterySnapshot();

        double firstTemp = firstBattery.getDouble("temperature");
        double secondTemp = secondBattery.getDouble("temperature");
        boolean exactWholeNumber = Math.abs(firstTemp - Math.rint(firstTemp)) < 0.001 && Math.abs(secondTemp - Math.rint(secondTemp)) < 0.001;
        boolean batteryTempStatic = Math.abs(firstTemp - secondTemp) < 0.05 || exactWholeNumber;

        SensorManager sensorManager = (SensorManager) getContext().getSystemService(Context.SENSOR_SERVICE);
        Sensor linearAcceleration = sensorManager != null
            ? sensorManager.getDefaultSensor(Sensor.TYPE_LINEAR_ACCELERATION)
            : null;

        final int[] motionSamples = {0};
        final int[] activeMotionSamples = {0};
        final long[] lastMovementAt = {System.currentTimeMillis()};
        final double[] maxAcceleration = {0};

        if (linearAcceleration != null && sensorManager != null) {
            final CountDownLatch latch = new CountDownLatch(1);
            final SensorEventListener listener = new SensorEventListener() {
                @Override
                public void onSensorChanged(SensorEvent event) {
                    motionSamples[0]++;
                    double x = event.values[0];
                    double y = event.values[1];
                    double z = event.values[2];
                    double magnitude = Math.sqrt((x * x) + (y * y) + (z * z));
                    maxAcceleration[0] = Math.max(maxAcceleration[0], magnitude);

                    if (magnitude > 0.12d) {
                        activeMotionSamples[0]++;
                        lastMovementAt[0] = System.currentTimeMillis();
                    }
                }

                @Override
                public void onAccuracyChanged(Sensor sensor, int accuracy) {
                    // No-op.
                }
            };

            sensorManager.registerListener(listener, linearAcceleration, SensorManager.SENSOR_DELAY_NORMAL);
            try {
                Thread.sleep(10000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } finally {
                sensorManager.unregisterListener(listener);
                latch.countDown();
                latch.await(1, TimeUnit.SECONDS);
            }
        }

        boolean motionIdle = linearAcceleration == null
            || activeMotionSamples[0] == 0
            || (System.currentTimeMillis() - lastMovementAt[0]) >= 10000;

        boolean hardwareHeartbeat = !batteryTempStatic && !motionIdle && motionSamples[0] > 0;

        JSObject result = new JSObject();
        result.put("batteryTempStart", firstTemp);
        result.put("batteryTempEnd", secondTemp);
        result.put("batteryTempStatic", batteryTempStatic);
        result.put("motionSamples", motionSamples[0]);
        result.put("activeMotionSamples", activeMotionSamples[0]);
        result.put("motionIdle", motionIdle);
        result.put("maxAcceleration", maxAcceleration[0]);
        result.put("hardwareHeartbeat", hardwareHeartbeat);
        return result;
    }
}
