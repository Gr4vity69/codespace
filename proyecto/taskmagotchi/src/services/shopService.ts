import { getDb } from './database'
import type { Reward, UserReward, Pet } from '../types'

/**
 * Load all available rewards from the database.
 */
export async function getRewards(): Promise<Reward[]> {
  const db = getDb()
  return db.getAllAsync<Reward>('SELECT * FROM rewards ORDER BY cost ASC')
}

/**
 * Load active (non-expired) user rewards.
 */
export async function getUserRewards(): Promise<UserReward[]> {
  const db = getDb()
  const now = Date.now()
  return db.getAllAsync<UserReward>(
    'SELECT * FROM user_rewards WHERE active = 1 AND (expiresAt IS NULL OR expiresAt > ?)',
    now
  )
}

/**
 * Purchase a reward: deduct coins, record purchase, apply immediate effects.
 * Returns true on success, false if insufficient coins or DB error.
 */
export async function purchaseReward(
  pet: Pet,
  reward: Reward,
  updatePet: (updates: Partial<Pet>) => Promise<void>,
): Promise<boolean> {
  if (pet.coins < reward.cost) return false

  const db = getDb()

  try {
    // 1. Deduct coins
    await updatePet({
      coins: pet.coins - reward.cost,
      totalSpent: (pet.totalSpent ?? 0) + reward.cost,
    })

    // 2. Record purchase
    const expiresAt = reward.durationMinutes
      ? Date.now() + reward.durationMinutes * 60000
      : null

    await db.runAsync(
      'INSERT INTO user_rewards (rewardId, active, expiresAt) VALUES (?, ?, ?)',
      reward.id,
      1,
      expiresAt,
    )

    // 3. Apply immediate effects
    if (reward.type === 'day_off') {
      const today = new Date().toISOString().split('T')[0]
      const existing = await db.getFirstAsync<{ id: number }>(
        'SELECT id FROM daily_config WHERE date = ?',
        today,
      )
      if (existing) {
        await db.runAsync('UPDATE daily_config SET isDayOff = 1 WHERE date = ?', today)
      } else {
        await db.runAsync(
          'INSERT INTO daily_config (date, isDayOff, tasksAddedToday) VALUES (?, 1, 0)',
          today,
        )
      }
    }

    return true
  } catch (error) {
    console.error('purchaseReward failed:', error)
    return false
  }
}

/**
 * Check if today is a day off.
 */
export async function isDayOff(): Promise<boolean> {
  const db = getDb()
  const today = new Date().toISOString().split('T')[0]
  const row = await db.getFirstAsync<{ isDayOff: number }>(
    'SELECT isDayOff FROM daily_config WHERE date = ?',
    today,
  )
  return row?.isDayOff === 1
}
