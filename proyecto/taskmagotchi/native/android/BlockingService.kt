package com.taskmagotchi.app

import android.app.ActivityManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper

class BlockingService : Service() {

  companion object {
    const val CHANNEL_ID = "app_blocker_channel"
    const val NOTIFICATION_ID = 1001
    const val CHECK_INTERVAL_MS = 2000L
    const val FOREGROUND_PACKAGE_KEY = "com.taskmagotchi.app.FOREGROUND_PACKAGE"
    const val CURRENT_BLOCKED_KEY = "com.taskmagotchi.app.CURRENT_BLOCKED"
    var currentForegroundPackage: String? = null
      private set
    var isCurrentlyBlocked: Boolean = false
      private set
  }

  private val handler = Handler(Looper.getMainLooper())
  private val checkRunnable = object : Runnable {
    override fun run() {
      val foregroundPkg = getForegroundPackage()
      currentForegroundPackage = foregroundPkg
      handler.postDelayed(this, CHECK_INTERVAL_MS)
    }
  }

  override fun onCreate() {
    super.onCreate()
    createNotificationChannel()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val notification = buildNotification()
    startForeground(NOTIFICATION_ID, notification)
    startMonitoring()
    return START_STICKY
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onDestroy() {
    handler.removeCallbacks(checkRunnable)
    super.onDestroy()
  }

  private fun startMonitoring() {
    handler.post(checkRunnable)
  }

  private fun getForegroundPackage(): String? {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
        val am = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val tasks = am.getRunningTasks(1)
        if (tasks != null && tasks.isNotEmpty()) {
          return tasks[0]?.topActivity?.packageName
        }
      }
    } catch (e: Exception) {
      // Fallback — intentar con UsageStatsManager
      try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
          val usm = getSystemService(Context.USAGE_STATS_SERVICE) as android.app.usage.UsageStatsManager
          val currentTime = System.currentTimeMillis()
          val stats = usm.queryUsageStats(
            android.app.usage.UsageStatsManager.INTERVAL_DAILY,
            currentTime - 60 * 1000,
            currentTime
          )
          if (stats != null) {
            return stats.maxByOrNull { it.lastTimeUsed }?.packageName
          }
        }
      } catch (_: Exception) {}
    }
    return null
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        CHANNEL_ID,
        "Bloqueo de apps",
        NotificationManager.IMPORTANCE_LOW
      ).apply {
        description = "Monitoriza apps bloqueadas"
      }
      val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      manager.createNotificationChannel(channel)
    }
  }

  private fun buildNotification(): Notification {
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(this, CHANNEL_ID)
    } else {
      Notification.Builder(this)
    }
    return builder
      .setContentTitle("TaskMagotchi")
      .setContentText("Monitorizando apps bloqueadas...")
      .setSmallIcon(android.R.drawable.ic_dialog_info)
      .setOngoing(true)
      .build()
  }
}
