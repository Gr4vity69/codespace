import { Platform } from 'react-native'
import { getDb } from './database'
import type { BlockedApp } from '../types'

const BLOCKER_MODULE_NAME = 'AppBlocker'

interface BlockerNativeModule {
  startBlockingService(): Promise<void>
  stopBlockingService(): Promise<void>
  isServiceRunning(): Promise<boolean>
  getInstalledApps(): Promise<{ packageName: string; appName: string }[]>
  getCurrentForegroundApp(): Promise<string>
  showOverlay(): Promise<void>
  hideOverlay(): Promise<void>
  requestOverlayPermission(): Promise<void>
  requestAccessibilityPermission(): Promise<void>
  requestUsageStatsPermission(): Promise<void>
  hasUsageStatsPermission(): Promise<boolean>
  setUnlockUntil(durationMinutes: number): Promise<boolean>
  getUnlockRemaining(): Promise<number>
}

let nativeModule: BlockerNativeModule | null = null

function getNativeModule(): BlockerNativeModule | null {
  if (nativeModule) return nativeModule

  try {
    const NativeModules = require('react-native').NativeModules
    if (NativeModules[BLOCKER_MODULE_NAME]) {
      nativeModule = NativeModules[BLOCKER_MODULE_NAME] as BlockerNativeModule
    }
  } catch {
    console.warn('AppBlocker native module not available')
  }

  return nativeModule
}

export async function isBlockingAvailable(): Promise<boolean> {
  if (Platform.OS !== 'android') return false
  return getNativeModule() !== null
}

export async function startBlockingService(): Promise<boolean> {
  if (Platform.OS !== 'android') return false
  const module = getNativeModule()
  if (!module) return false

  try {
    await module.startBlockingService()
    return true
  } catch (error) {
    console.error('Failed to start blocking service:', error)
    return false
  }
}

export async function stopBlockingService(): Promise<boolean> {
  if (Platform.OS !== 'android') return false
  const module = getNativeModule()
  if (!module) return false

  try {
    await module.stopBlockingService()
    return true
  } catch (error) {
    console.error('Failed to stop blocking service:', error)
    return false
  }
}

export async function getInstalledApps(): Promise<{ packageName: string; appName: string }[]> {
  if (Platform.OS !== 'android') return []
  const module = getNativeModule()
  if (!module) return []

  try {
    return await module.getInstalledApps()
  } catch (error) {
    console.error('Failed to get installed apps:', error)
    return []
  }
}

export async function getBlockedApps(): Promise<BlockedApp[]> {
  const db = getDb()
  return db.getAllAsync<BlockedApp>('SELECT * FROM blocked_apps WHERE isBlocked = 1')
}

export async function addBlockedApp(packageName: string, appName: string): Promise<void> {
  const db = getDb()
  await db.runAsync(
    'INSERT OR REPLACE INTO blocked_apps (packageName, appName, isBlocked) VALUES (?, ?, 1)',
    packageName, appName
  )
}

export async function getCurrentForegroundApp(): Promise<string> {
  if (Platform.OS !== 'android') return ''
  const module = getNativeModule()
  if (!module) return ''
  try {
    return await module.getCurrentForegroundApp()
  } catch {
    return ''
  }
}

/**
 * Check if the current foreground app is blocked.
 * If so, returns the BlockedApp; otherwise null.
 */
export async function checkForegroundBlocked(): Promise<BlockedApp | null> {
  const foreground = await getCurrentForegroundApp()
  if (!foreground) return null
  const blocked = await getBlockedApps()
  return blocked.find(a => a.packageName === foreground) ?? null
}

export async function removeBlockedApp(packageName: string): Promise<void> {
  const db = getDb()
  await db.runAsync('DELETE FROM blocked_apps WHERE packageName = ?', packageName)
}

export async function showBlockingOverlay(message: string): Promise<void> {
  const module = getNativeModule()
  if (!module) return

  try {
    await module.showOverlay()
  } catch (error) {
    console.error('Failed to show overlay:', error)
  }
}

export async function hideBlockingOverlay(): Promise<void> {
  const module = getNativeModule()
  if (!module) return

  try {
    await module.hideOverlay()
  } catch (error) {
    console.error('Failed to hide overlay:', error)
  }
}

export function isBlockedApp(appPackageName: string, blockedApps: BlockedApp[]): boolean {
  return blockedApps.some(app => app.packageName === appPackageName && app.isBlocked)
}

/**
 * Temporarily unlock apps for N minutes (math challenge reward).
 * The blocking service will skip enforcement during this window.
 */
export async function setTemporaryUnlock(durationMinutes: number): Promise<boolean> {
  if (Platform.OS !== 'android') return false
  const module = getNativeModule()
  if (!module) return false
  try {
    await module.setUnlockUntil(durationMinutes)
    return true
  } catch {
    return false
  }
}

export async function getTemporaryUnlockRemaining(): Promise<number> {
  if (Platform.OS !== 'android') return 0
  const module = getNativeModule()
  if (!module) return 0
  try {
    return await module.getUnlockRemaining()
  } catch {
    return 0
  }
}

export async function requestAccessibilityService(): Promise<boolean> {
  if (Platform.OS !== 'android') return false
  const module = getNativeModule()
  if (!module) return false
  try {
    await module.requestAccessibilityPermission()
    return true
  } catch {
    return false
  }
}

export async function requestOverlayPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false
  const module = getNativeModule()
  if (!module) return false
  try {
    await module.requestOverlayPermission()
    return true
  } catch {
    return false
  }
}

export async function requestUsageStatsPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false
  const module = getNativeModule()
  if (!module) return false
  try {
    await module.requestUsageStatsPermission()
    return true
  } catch {
    return false
  }
}

export async function checkUsageStatsPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false
  const module = getNativeModule()
  if (!module) return false
  try {
    return await module.hasUsageStatsPermission()
  } catch {
    return false
  }
}

export function isInBreakTime(schedules: { breakStart: string; breakEnd: string }[]): boolean {
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  for (const schedule of schedules) {
    const [startH, startM] = schedule.breakStart.split(':').map(Number)
    const [endH, endM] = schedule.breakEnd.split(':').map(Number)
    const startMinutes = startH * 60 + startM
    const endMinutes = endH * 60 + endM

    if (endMinutes <= startMinutes) {
      // Horario overnight (ej: 22:00-06:00) — cruza la medianoche
      if (currentMinutes >= startMinutes || currentMinutes < endMinutes) {
        return true
      }
    } else {
      // Horario normal en el mismo día
      if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
        return true
      }
    }
  }

  return false
}
