/**
 * Runtime API Key Storage
 *
 * Allows users to configure API keys at runtime via settings,
 * falling back to process.env.EXPO_PUBLIC_* for build-time defaults.
 *
 * Keys are persisted in SQLite so they survive app restarts.
 */

import { getDb } from './database'

const KEYS_TABLE = 'api_keys'

/**
 * Ensure the api_keys table exists. Called lazily on first read/write.
 */
async function ensureTable(): Promise<void> {
  const db = getDb()
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS ${KEYS_TABLE} (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL DEFAULT ''
    );
  `)
}

/**
 * Get a runtime API key. Checks DB first, then falls back to
 * process.env.EXPO_PUBLIC_* build-time variable.
 */
export async function getApiKey(name: 'GROQ' | 'GEMINI'): Promise<string | null> {
  // 1) Check runtime DB storage
  try {
    await ensureTable()
    const db = getDb()
    const row = await db.getFirstAsync<{ value: string }>(
      `SELECT value FROM ${KEYS_TABLE} WHERE key = ?`,
      name
    )
    if (row && row.value) return row.value
  } catch {
    // DB not ready yet — fall through to env
  }

  // 2) Fall back to build-time env var
  const envKey = `EXPO_PUBLIC_${name}_API_KEY`
  const envVal = (process.env as Record<string, string | undefined>)[envKey]
  if (envVal && envVal.length > 0 && !envVal.includes('tu_key')) return envVal

  return null
}

/**
 * Save a runtime API key to SQLite. Persists across app restarts.
 */
export async function setApiKey(name: 'GROQ' | 'GEMINI', value: string): Promise<void> {
  await ensureTable()
  const db = getDb()
  await db.runAsync(
    `INSERT OR REPLACE INTO ${KEYS_TABLE} (key, value) VALUES (?, ?)`,
    name,
    value.trim()
  )
}

/**
 * Delete a stored API key (revert to env var fallback).
 */
export async function deleteApiKey(name: 'GROQ' | 'GEMINI'): Promise<void> {
  await ensureTable()
  const db = getDb()
  await db.runAsync(
    `DELETE FROM ${KEYS_TABLE} WHERE key = ?`,
    name
  )
}

/**
 * Check whether a key exists in runtime storage (ignoring env vars).
 */
export async function hasStoredApiKey(name: 'GROQ' | 'GEMINI'): Promise<boolean> {
  try {
    await ensureTable()
    const db = getDb()
    const row = await db.getFirstAsync<{ value: string }>(
      `SELECT value FROM ${KEYS_TABLE} WHERE key = ?`,
      name
    )
    return !!(row && row.value)
  } catch {
    return false
  }
}
