import { Platform } from 'react-native'
import { getDb } from './database'
import type { BlockedApp } from '../types'
import { computeMood } from '../utils/petGameLoop'
import { usePetStore } from '../store/petStore'
import { useTaskStore } from '../store/taskStore'

const BLOCKER_MODULE_NAME = 'AppBlocker'

interface BlockerNativeModule {
  startBlockingService(): Promise<boolean>
  stopBlockingService(): Promise<boolean>
  isServiceRunning(): Promise<boolean>
  getInstalledApps(): Promise<{ packageName: string; appName: string }[]>
  getCurrentForegroundApp(): Promise<string>
  showOverlay(): Promise<void>
  hideOverlay(): Promise<void>
  requestOverlayPermission(): Promise<void>
  requestAccessibilityPermission(): Promise<void>
  isAccessibilityServiceEnabled(): Promise<boolean>
  requestUsageStatsPermission(): Promise<void>
  hasUsageStatsPermission(): Promise<boolean>
  setUnlockUntil(durationMinutes: number): Promise<boolean>
  getUnlockRemaining(): Promise<number>
  setBlockedPackages(packages: string[]): Promise<boolean>
  setPetMood(mood: string): Promise<boolean>
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

export async function isServiceRunning(): Promise<boolean> {
  if (Platform.OS !== 'android') return false
  const module = getNativeModule()
  if (!module) return false
  try {
    return await module.isServiceRunning()
  } catch {
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

/**
 * Sync the blocked apps list from the local DB to the native module.
 * The native BlockingService needs to know which packages to block.
 */
export async function syncBlockedAppsToNative(): Promise<boolean> {
  if (Platform.OS !== 'android') return false
  const module = getNativeModule()
  if (!module) return false
  try {
    const blocked = await getBlockedApps()
    const packages = blocked.map(a => a.packageName)
    await module.setBlockedPackages(packages)
    return true
  } catch (error) {
    console.error('Failed to sync blocked apps:', error)
    return false
  }
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
/**
 * Sincroniza el mood actual de la mascota con el overlay nativo.
 * El BlockingService usará esto para mostrar emoji/color según el ánimo.
 */
export async function syncPetMoodToNative(mood: string): Promise<boolean> {
  if (Platform.OS !== 'android') return false
  const module = getNativeModule()
  if (!module) return false
  try {
    await module.setPetMood(mood)
    return true
  } catch {
    return false
  }
}

/**
 * 🐾 Control proactivo de la mascota sobre el bloqueo de apps.
 * Si la mascota está enojada (3+ tareas vencidas), activa el servicio de bloqueo
 * automáticamente para mantener al usuario enfocado.
 */
export async function checkAutoBlockingByMood(): Promise<{ shouldBlock: boolean; mood: string; reason: string }> {
  if (Platform.OS !== 'android') {
    return { shouldBlock: false, mood: 'normal', reason: 'Not Android' }
  }

  try {
    const pet = usePetStore.getState().pet
    const todayTasks = useTaskStore.getState().todayTasks
    if (!pet) return { shouldBlock: false, mood: 'normal', reason: 'No pet' }

    const mood = computeMood(pet, todayTasks)

    // Solo bloquear si está enojada y hay apps configuradas
    if (mood === 'angry') {
      const blocked = await getBlockedApps()
      if (blocked.length > 0) {
        const isRunning = await isServiceRunning()
        if (!isRunning) {
          await syncBlockedAppsToNative()
          await startBlockingService()
          await syncPetMoodToNative(mood)
          return { shouldBlock: true, mood, reason: 'Mascota enojada: bloqueo activado automáticamente' }
        }
      }
      return { shouldBlock: false, mood, reason: 'Mascota enojada pero no hay apps bloqueadas configuradas' }
    }

    // Si el mood mejoró, sincronizar el nuevo mood con el overlay
    await syncPetMoodToNative(mood)
    return { shouldBlock: false, mood, reason: `Mood actual: ${mood}` }
  } catch (error) {
    console.error('Error checking auto-blocking:', error)
    return { shouldBlock: false, mood: 'normal', reason: 'Error checking mood' }
  }
}

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

export async function isAccessibilityServiceEnabled(): Promise<boolean> {
  if (Platform.OS !== 'android') return false
  const module = getNativeModule()
  if (!module) return false
  try {
    return await module.isAccessibilityServiceEnabled()
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
