package com.taskmagotchi.app

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Context
import android.content.SharedPreferences
import android.view.accessibility.AccessibilityEvent

/**
 * AccessibilityService que detecta en TIEMPO REAL cuándo el usuario abre
 * una app bloqueada y presiona "back" para devolverlo a TaskMagotchi.
 *
 * Es la ÚNICA solución que funciona en Android 10+ — getRunningTasks está
 * restringido y UsageStatsManager tiene delay de minutos.
 */
class AccessibilityBlockService : AccessibilityService() {

  companion object {
    const val PREFS_NAME = "app_blocker_prefs"
    const val PREFS_BLOCKED_PACKAGES = "blocked_packages"
    const val PREFS_UNLOCK_UNTIL = "unlock_until"
    const val PREFS_BLOCKING_ENABLED = "blocking_enabled"

    /** True after onServiceConnected() — el usuario habilitó el servicio en Settings > Accesibilidad */
    var isConnected: Boolean = false
      private set

    /** Último paquete detectado vía evento de accesibilidad (para diagnóstico) */
    var lastDetectedPackage: String? = null
      private set
  }

  private lateinit var prefs: SharedPreferences
  private var blockedEntryTime: Long = 0
  private var lastBlockedPkg: String? = null
  private var ourPkg: String = ""

  override fun onServiceConnected() {
    super.onServiceConnected()
    isConnected = true
    ourPkg = packageName ?: ""
    prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    // Configurar el tipo de eventos que queremos escuchar
    val info = AccessibilityServiceInfo().apply {
      eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
      feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
      notificationTimeout = 0
      // No necesitamos FLAG_REQUEST_FILTER_KEY_EVENTS ni FLAG_RETRIEVE_CONTENT
      flags = 0
    }
    serviceInfo = info
  }

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    if (event == null) return
    if (event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return

    val pkg = event.packageName?.toString() ?: return
    lastDetectedPackage = pkg

    // Actualizar BlockingService para que el overlay se muestre si es necesario
    BlockingService.currentForegroundPackage = pkg

    // Leer estado actual de SharedPreferences (se sincroniza desde JS)
    val enabled = prefs.getBoolean(PREFS_BLOCKING_ENABLED, false)
    if (!enabled) {
      // Bloqueo desactivado — no hacer nada
      BlockingService.isCurrentlyBlocked = false
      lastBlockedPkg = null
      return
    }

    val blockedPkgs = prefs.getStringSet(PREFS_BLOCKED_PACKAGES, emptySet()) ?: emptySet()
    val unlockUntil = prefs.getLong(PREFS_UNLOCK_UNTIL, 0)
    val isUnlocked = unlockUntil > System.currentTimeMillis()

    val isBlocked = pkg in blockedPkgs && !isUnlocked && pkg != ourPkg

    if (isBlocked) {
      BlockingService.isCurrentlyBlocked = true

      if (pkg != lastBlockedPkg) {
        // Acaba de entrar a la app bloqueada — inicio temporizador de gracia (1s)
        blockedEntryTime = System.currentTimeMillis()
        lastBlockedPkg = pkg
      } else {
        // Ya estaba en la app bloqueada — verificar si pasó el tiempo de gracia
        val elapsed = System.currentTimeMillis() - blockedEntryTime
        if (elapsed >= 1000) {
          // Tiempo de gracia agotado — presionar back para expulsar al usuario
          performGlobalAction(GLOBAL_ACTION_BACK)
          lastBlockedPkg = null // reset para no spamear back
        }
      }
    } else {
      // App no bloqueada o es la nuestra — limpiar estado
      BlockingService.isCurrentlyBlocked = false
      lastBlockedPkg = null
    }
  }

  override fun onInterrupt() {
    // El servicio fue interrumpido temporalmente por el sistema
  }

  override fun onDestroy() {
    isConnected = false
    BlockingService.isCurrentlyBlocked = false
    super.onDestroy()
  }
}
