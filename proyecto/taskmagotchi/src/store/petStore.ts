import { create } from 'zustand'
import type { Pet } from '../types'
import { getDb } from '../services/database'
import { applyDecay } from '../utils/petEngine'

function createDefaultPet(): Pet {
  const now = Date.now()
  return {
    id: 1,
    name: 'Magotchi',
    species: 'default',
    happiness: 70,
    hunger: 35,
    energy: 75,
    level: 1,
    xp: 0,
    xpToNextLevel: 100,
    lastFed: now,
    lastPlayed: now,
    coins: 0,
    totalEarned: 0,
    totalSpent: 0,
    streak: 0,
    lastStreakDate: '',
  }
}

interface PetState {
  pet: Pet | null
  loading: boolean
  loadPet: () => Promise<void>
  updatePet: (updates: Partial<Pet>) => Promise<void>
  refreshPet: () => Promise<void>
}

export const usePetStore = create<PetState>((set, get) => ({
  pet: createDefaultPet(),
  loading: true,

  loadPet: async () => {
    try {
      const db = getDb()
      const row = await db.getFirstAsync<Record<string, unknown>>('SELECT * FROM pet WHERE id = 1')
      if (row) {
        const pet: Pet = {
          id: row.id as number,
          name: row.name as string,
          species: row.species as string,
          happiness: row.happiness as number,
          hunger: row.hunger as number,
          energy: row.energy as number,
          level: row.level as number,
          xp: row.xp as number,
          xpToNextLevel: row.xpToNextLevel as number,
          lastFed: row.lastFed as number,
          lastPlayed: row.lastPlayed as number,
          coins: row.coins as number,
          totalEarned: row.totalEarned as number,
          totalSpent: row.totalSpent as number,
          streak: row.streak as number,
          lastStreakDate: row.lastStreakDate as string,
        }

        const now = Date.now()
        const hoursSinceUpdate = Math.max(0, (now - Math.max(pet.lastFed, pet.lastPlayed)) / 3600000)
        const decayed = applyDecay(pet, hoursSinceUpdate)
        set({ pet: decayed, loading: false })

        if (hoursSinceUpdate > 1) {
          get().updatePet(decayed)
        }
      } else {
        set({ pet: createDefaultPet(), loading: false })
      }
    } catch (error) {
      console.error('Error loading pet:', error)
      set({ pet: createDefaultPet(), loading: false })
    }
  },

  updatePet: async (updates: Partial<Pet>) => {
    const current = get().pet
    if (!current) return

    const updated = { ...current, ...updates }
    set({ pet: updated })

    try {
      const db = getDb()
      await db.runAsync(
        `UPDATE pet SET
          name = ?, happiness = ?, hunger = ?, energy = ?,
          level = ?, xp = ?, xpToNextLevel = ?,
          lastFed = ?, lastPlayed = ?,
          coins = ?, totalEarned = ?, totalSpent = ?,
          streak = ?, lastStreakDate = ?
        WHERE id = 1`,
        updated.name, updated.happiness, updated.hunger, updated.energy,
        updated.level, updated.xp, updated.xpToNextLevel,
        updated.lastFed, updated.lastPlayed,
        updated.coins, updated.totalEarned, updated.totalSpent,
        updated.streak, updated.lastStreakDate
      )
    } catch (error) {
      console.error('Error updating pet:', error)
    }
  },

  refreshPet: async () => {
    await get().loadPet()
  },
}))
