import { getDb } from './database'
import type { BlockedApp, Schedule } from '../types'

// ═══════════════════════════════════════════════════════════════
//  App management (blocked_apps table)
// ═══════════════════════════════════════════════════════════════

/**
 * Load all registered apps.
 */
export async function getApps(): Promise<BlockedApp[]> {
  const db = getDb()
  return db.getAllAsync<BlockedApp>('SELECT * FROM blocked_apps ORDER BY isBlocked DESC, appName ASC')
}

/**
 * Add or update an app.
 * @param packageName unique identifier (e.g. 'com.android.chrome')
 * @param appName display name
 * @param isBlocked true = blocked (blacklist), false = allowed (whitelist)
 */
export async function upsertApp(
  packageName: string,
  appName: string,
  isBlocked: boolean,
): Promise<void> {
  const db = getDb()
  await db.runAsync(
    `INSERT INTO blocked_apps (packageName, appName, isBlocked)
     VALUES (?, ?, ?)
     ON CONFLICT(packageName) DO UPDATE SET appName = ?, isBlocked = ?`,
    packageName, appName, isBlocked ? 1 : 0,
    appName, isBlocked ? 1 : 0,
  )
}

/**
 * Remove an app from the list.
 */
export async function deleteApp(id: number): Promise<void> {
  const db = getDb()
  await db.runAsync('DELETE FROM blocked_apps WHERE id = ?', id)
}

/**
 * Toggle an app between blocked/allowed.
 */
export async function toggleApp(id: number, currentlyBlocked: boolean): Promise<void> {
  const db = getDb()
  await db.runAsync(
    'UPDATE blocked_apps SET isBlocked = ? WHERE id = ?',
    currentlyBlocked ? 0 : 1,
    id,
  )
}

// ═══════════════════════════════════════════════════════════════
//  Schedule management (schedules table)
// ═══════════════════════════════════════════════════════════════

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export { DAY_NAMES }

/**
 * Load all break schedules.
 */
export async function getSchedules(): Promise<Schedule[]> {
  const db = getDb()
  return db.getAllAsync<Schedule>(
    'SELECT * FROM schedules ORDER BY dayOfWeek ASC, breakStart ASC',
  )
}

/**
 * Update a schedule's times.
 */
export async function updateSchedule(
  id: number,
  breakStart: string,
  breakEnd: string,
): Promise<void> {
  const db = getDb()
  await db.runAsync(
    'UPDATE schedules SET breakStart = ?, breakEnd = ? WHERE id = ?',
    breakStart, breakEnd, id,
  )
}

/**
 * Toggle a schedule's active state.
 */
export async function toggleSchedule(id: number, active: boolean): Promise<void> {
  const db = getDb()
  await db.runAsync(
    'UPDATE schedules SET isActive = ? WHERE id = ?',
    active ? 1 : 0,
    id,
  )
}

/**
 * Seed default blocked apps (safe to call on mount — skips if data exists).
 */
export async function seedDefaultApps(): Promise<void> {
  const db = getDb()
  const count = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM blocked_apps',
  )
  if (count && count.count > 0) return

  const defaults: [string, string, boolean][] = [
    // Work apps (whitelist)
    ['com.android.chrome',     'Chrome',      false],
    ['com.microsoft.vscode',   'VS Code',     false],
    ['com.microsoft.terminal', 'Terminal',    false],
    ['com.notion',             'Notion',      false],
    // Blocked apps (blacklist)
    ['com.google.android.youtube',   'YouTube',    true],
    ['com.instagram.android',        'Instagram',  true],
    ['com.twitter.android',          'Twitter',    true],
    ['com.zhiliaoapp.musically',     'TikTok',     true],
    ['com.google.android.apps.maps', 'Maps',       false], // neutral
  ]

  for (const [pkg, name, blocked] of defaults) {
    await db.runAsync(
      'INSERT INTO blocked_apps (packageName, appName, isBlocked) VALUES (?, ?, ?)',
      pkg, name, blocked ? 1 : 0,
    )
  }
}
