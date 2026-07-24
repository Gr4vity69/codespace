package com.taskmagotchi.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import java.util.Timer
import java.util.TimerTask

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

  private var timer: Timer? = null

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
    timer?.cancel()
    timer = null
    super.onDestroy()
  }

  private fun startMonitoring() {
    timer = Timer()
    timer?.scheduleAtFixedRate(object : TimerTask() {
      override fun run() {
        val foregroundPkg = getForegroundPackage()
        currentForegroundPackage = foregroundPkg
      }
    }, 0, CHECK_INTERVAL_MS)
  }

  private fun getForegroundPackage(): String? {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
        val usm = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val currentTime = System.currentTimeMillis()
        val stats = usm.queryUsageStats(
          UsageStatsManager.INTERVAL_DAILY,
          currentTime - 1000 * 10,
          currentTime
        )
        if (stats != null) {
          val sortedStats = stats.sortedByDescending { it.lastTimeUsed }
          return sortedStats.firstOrNull()?.packageName
        }
      }
    } catch (e: Exception) {
      // Fallback
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
