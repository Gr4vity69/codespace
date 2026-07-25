package com.taskmagotchi.app

import android.app.ActivityManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.Settings
import android.view.Gravity
import android.view.WindowManager
import android.widget.TextView

class BlockingService : Service() {

  companion object {
    const val CHANNEL_ID = "app_blocker_channel"
    const val NOTIFICATION_ID = 1001
    const val CHECK_INTERVAL_MS = 1000L
    const val ACCESSIBILITY_TIMEOUT_MS = 5000L // si AccessibilityService no actualiza en 5s, usamos fallback
    const val FOREGROUND_PACKAGE_KEY = "com.taskmagotchi.app.FOREGROUND_PACKAGE"
    const val CURRENT_BLOCKED_KEY = "com.taskmagotchi.app.CURRENT_BLOCKED"
    const val PREFS_NAME = "app_blocker_prefs"
    const val PREFS_UNLOCK_UNTIL = "unlock_until"
    const val PREFS_BLOCKED_PACKAGES = "blocked_packages"
    const val PREFS_BLOCKING_ENABLED = "blocking_enabled"

    /** Actualizado por AccessibilityBlockService en tiempo real (o por fallback) */
    var currentForegroundPackage: String? = null
      set(value) {
        field = value
        lastAccessibilityUpdate = System.currentTimeMillis()
      }
    var isCurrentlyBlocked: Boolean = false
      private set
    var unlockUntil: Long = 0
    var blockedPackages: Set<String> = emptySet()

    /** Timestamp del último update vía AccessibilityService */
    private var lastAccessibilityUpdate: Long = 0

    /** Último mood conocido de la mascota (actualizado vía JS bridge) */
    var petMood: String = "normal"
  }

  private var overlayView: TextView? = null

  private val handler = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
    Handler.createAsync(Looper.getMainLooper())
  } else {
    @Suppress("DEPRECATION")
    Handler(Looper.getMainLooper())
  }
  private val checkRunnable = object : Runnable {
    override fun run() {
      // 1. Obtener foreground package
      //    Prioridad: AccessibilityService > fallback polling
      val now = System.currentTimeMillis()
      val pkg = if (AccessibilityBlockService.isConnected &&
        now - lastAccessibilityUpdate < ACCESSIBILITY_TIMEOUT_MS
      ) {
        // AccessibilityService está activo y actualizando — usar su valor
        currentForegroundPackage
      } else {
        // Fallback: polling directo con UsageStatsManager
        getForegroundPackage().also { currentForegroundPackage = it }
      }

      // 2. Verificar si está desbloqueado temporalmente (math challenge)
      val isUnlocked = unlockUntil > now

      // 3. Determinar si la app actual está bloqueada
      val isBlocked = pkg != null &&
        pkg in blockedPackages &&
        !isUnlocked &&
        pkg != packageName // no bloquearnos a nosotros mismos

      // 4. Mostrar/ocultar overlay
      if (isBlocked) {
        isCurrentlyBlocked = true
        showBlockingOverlay(pkg!!)
      } else {
        isCurrentlyBlocked = false
        hideBlockingOverlay()
      }

      handler.postDelayed(this, CHECK_INTERVAL_MS)
    }
  }

  override fun onCreate() {
    super.onCreate()
    val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    unlockUntil = prefs.getLong(PREFS_UNLOCK_UNTIL, 0)
    val saved = prefs.getStringSet(PREFS_BLOCKED_PACKAGES, emptySet())
    if (saved != null) blockedPackages = saved
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
    hideBlockingOverlay()
    super.onDestroy()
  }

  private fun startMonitoring() {
    handler.post(checkRunnable)
  }

  /**
   * Fallback para cuando AccessibilityService NO está disponible.
   * Usa UsageStatsManager con una ventana de 5 minutos.
   */
  private fun getForegroundPackage(): String? {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
        val am = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val tasks = am.getRunningTasks(1)
        if (tasks != null && tasks.isNotEmpty()) {
          return tasks[0]?.topActivity?.packageName
        }
      }
    } catch (_: Exception) {}

    // Fallback a UsageStatsManager
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
        val usm = getSystemService(Context.USAGE_STATS_SERVICE) as android.app.usage.UsageStatsManager
        val currentTime = System.currentTimeMillis()
        val stats = usm.queryUsageStats(
          android.app.usage.UsageStatsManager.INTERVAL_DAILY,
          currentTime - 5 * 60 * 1000L,
          currentTime
        )
        if (stats != null) {
          return stats.maxByOrNull { it.lastTimeUsed }?.packageName
        }
      }
    } catch (_: Exception) {}
    return null
  }

  // ─── Overlay management ────────────────────────────────────────

  private fun showBlockingOverlay(blockedPkg: String) {
    if (overlayView != null) return

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      if (!Settings.canDrawOverlays(this)) return
    }

    try {
      val wm = getSystemService(Context.WINDOW_SERVICE) as WindowManager

      // Mood visual config
      val moodEmoji = when (petMood) {
        "happy" -> "😊"
        "sad" -> "😢"
        "angry" -> "😠"
        else -> "😐"
      }
      val moodBg = when (petMood) {
        "happy" -> "#CC0d1f15"
        "sad" -> "#CC0d131f"
        "angry" -> "#CC1f0d0d"
        else -> "#CC0f0f23"
      }
      val moodText = when (petMood) {
        "happy" -> "¡Bien hecho!"
        "sad" -> "Animo, completa tus tareas"
        "angry" -> "Tienes tareas vencidas"
        else -> "Modo concentracion"
      }

      val view = TextView(this).apply {
        text = "$moodEmoji  MAGOTCHI\n$moodText\n\n🔒 $blockedPkg"
        setTextColor(android.graphics.Color.WHITE)
        textSize = 20f
        gravity = Gravity.CENTER
        setBackgroundColor(android.graphics.Color.parseColor(moodBg))
        setTypeface(Typeface.MONOSPACE, Typeface.BOLD)
      }

      val params = WindowManager.LayoutParams(
        WindowManager.LayoutParams.MATCH_PARENT,
        WindowManager.LayoutParams.MATCH_PARENT,
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
          WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        else
          WindowManager.LayoutParams.TYPE_PHONE,
        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
          WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
          WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
        PixelFormat.TRANSLUCENT
      )

      wm.addView(view, params)
      overlayView = view
    } catch (_: Exception) {}
  }

  private fun hideBlockingOverlay() {
    val view = overlayView ?: return
    try {
      val wm = getSystemService(Context.WINDOW_SERVICE) as WindowManager
      wm.removeView(view)
    } catch (_: Exception) {}
    overlayView = null
  }

  // ─── Notification ──────────────────────────────────────────────

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
