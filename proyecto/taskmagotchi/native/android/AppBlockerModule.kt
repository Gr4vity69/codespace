package com.taskmagotchi.app

import android.app.ActivityManager
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.*

class AppBlockerModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  companion object {
    const val NAME = "AppBlocker"
    const val SERVICE_ACTION_START = "com.taskmagotchi.app.action.START_BLOCKING"
    const val SERVICE_ACTION_STOP = "com.taskmagotchi.app.action.STOP_BLOCKING"
    const val PREFS_NAME = "app_blocker_prefs"
    const val PREFS_SERVICE_RUNNING = "service_running"
  }

  override fun getName(): String = NAME

  @ReactMethod
  fun startBlockingService(promise: Promise) {
    try {
      val context = reactApplicationContext
      val hasUsageStats = hasUsageStatsPermission()
      if (!hasUsageStats) {
        promise.reject("USAGE_STATS_DENIED", "Se necesita permiso UsageStatsManager")
        return
      }

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val serviceIntent = Intent(context, BlockingService::class.java)
        context.startForegroundService(serviceIntent)
      } else {
        val serviceIntent = Intent(context, BlockingService::class.java)
        context.startService(serviceIntent)
      }

      getPrefs().edit().putBoolean(PREFS_SERVICE_RUNNING, true).apply()
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("SERVICE_ERROR", e.message)
    }
  }

  @ReactMethod
  fun stopBlockingService(promise: Promise) {
    try {
      val context = reactApplicationContext
      val serviceIntent = Intent(context, BlockingService::class.java)
      context.stopService(serviceIntent)
      getPrefs().edit().putBoolean(PREFS_SERVICE_RUNNING, false).apply()
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("SERVICE_ERROR", e.message)
    }
  }

  @ReactMethod
  fun isServiceRunning(promise: Promise) {
    try {
      val manager = reactApplicationContext.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
      for (service in manager.getRunningServices(Integer.MAX_VALUE)) {
        if (service.service.className == BlockingService::class.java.name) {
          promise.resolve(true)
          return
        }
      }
      promise.resolve(false)
    } catch (e: Exception) {
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun getInstalledApps(promise: Promise) {
    try {
      val pm = reactApplicationContext.packageManager
      val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
      val activities = pm.queryIntentActivities(intent, 0)
      val apps = Arguments.createArray()
      for (resolveInfo in activities) {
        val pkg = resolveInfo.activityInfo.packageName
        val label = resolveInfo.loadLabel(pm).toString()
        val app = Arguments.createMap()
        app.putString("packageName", pkg)
        app.putString("appName", label)
        apps.pushMap(app)
      }
      promise.resolve(apps)
    } catch (e: Exception) {
      promise.reject("APPS_ERROR", e.message)
    }
  }

  @ReactMethod
  fun getCurrentForegroundApp(promise: Promise) {
    try {
      val pkg = BlockingService.currentForegroundPackage
      if (pkg != null) {
        promise.resolve(pkg)
      } else {
        promise.resolve("")
      }
    } catch (e: Exception) {
      promise.reject("FOREGROUND_ERROR", e.message)
    }
  }

  @ReactMethod
  fun showOverlay(promise: Promise) {
    try {
      val context = reactApplicationContext
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        if (!Settings.canDrawOverlays(context)) {
          promise.reject("OVERLAY_DENIED", "Se necesita permiso de superposición")
          return
        }
      }
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("OVERLAY_ERROR", e.message)
    }
  }

  @ReactMethod
  fun hideOverlay(promise: Promise) {
    promise.resolve(true)
  }

  @ReactMethod
  fun requestOverlayPermission(promise: Promise) {
    try {
      val context = reactApplicationContext
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        val intent = Intent(
          Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
          android.net.Uri.parse("package:${context.packageName}")
        )
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
      }
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("INTENT_ERROR", e.message)
    }
  }

  @ReactMethod
  fun requestAccessibilityPermission(promise: Promise) {
    try {
      val context = reactApplicationContext
      val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("INTENT_ERROR", e.message)
    }
  }

  @ReactMethod
  fun requestUsageStatsPermission(promise: Promise) {
    try {
      val context = reactApplicationContext
      val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("INTENT_ERROR", e.message)
    }
  }

  @ReactMethod
  fun hasUsageStatsPermission(promise: Promise) {
    promise.resolve(hasUsageStatsPermission())
  }

  private fun hasUsageStatsPermission(): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP) return true
    val usm = reactApplicationContext.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    val currentTime = System.currentTimeMillis()
    // Query 24 hours to avoid false negatives when the user hasn't used the phone recently
    val stats = usm.queryUsageStats(
      UsageStatsManager.INTERVAL_DAILY,
      currentTime - 24 * 60 * 60 * 1000L,
      currentTime
    )
    return !stats.isNullOrEmpty()
  }

  private fun getPrefs() =
    reactApplicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
}
