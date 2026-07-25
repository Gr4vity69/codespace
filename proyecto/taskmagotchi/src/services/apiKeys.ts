/**
 * API Key Storage — uses expo-secure-store (encrypted keystore).
 *
 * Keys survive app restarts but are NOT exportable via ADB backup
 * (unlike the old SQLite storage).
 */

import * as SecureStore from 'expo-secure-store'

const STORE_KEYS = {
  GROQ: 'api_key_groq',
  GEMINI: 'api_key_gemini',
} as const

type KeyName = keyof typeof STORE_KEYS

/**
 * Get a runtime API key. Checks secure store first, then falls back to
 * process.env.EXPO_PUBLIC_* build-time variable.
 */
export async function getApiKey(name: KeyName): Promise<string | null> {
  try {
    const stored = await SecureStore.getItemAsync(STORE_KEYS[name])
    if (stored) return stored
  } catch {
    // SecureStore not available (web, SSR) — fall through
  }

  // Fall back to build-time env var
  const envKey = `EXPO_PUBLIC_${name}_API_KEY`
  const envVal = (process.env as Record<string, string | undefined>)[envKey]
  if (envVal && envVal.length > 0 && !envVal.includes('tu_key')) return envVal

  return null
}

/**
 * Save a runtime API key to secure store. Persists across app restarts.
 */
export async function setApiKey(name: KeyName, value: string): Promise<void> {
  await SecureStore.setItemAsync(STORE_KEYS[name], value.trim())
}

/**
 * Delete a stored API key (revert to env var fallback).
 */
export async function deleteApiKey(name: KeyName): Promise<void> {
  await SecureStore.deleteItemAsync(STORE_KEYS[name])
}

/**
 * Check whether a key exists in secure store (ignoring env vars).
 */
export async function hasStoredApiKey(name: KeyName): Promise<boolean> {
  try {
    const stored = await SecureStore.getItemAsync(STORE_KEYS[name])
    return !!stored
  } catch {
    return false
  }
}
