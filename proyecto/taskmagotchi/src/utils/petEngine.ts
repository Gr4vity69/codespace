import type { Pet, Task } from '../types'

const XP_PER_TASK = 20
const XP_PER_VERIFIED_TASK = 30
const XP_STREAK_BONUS = 10
const COINS_PER_TASK = 10
const COINS_PER_VERIFIED = 15
const PENALTY_UNFINISHED = -15
const PENALTY_IGNORE = -5

const MAX_STAT = 100
const MIN_STAT = 0
const DECAY_RATE = 2

export function calculateXpForLevel(level: number): number {
  return level * 100
}

export function addXp(pet: Pet, amount: number): Pet {
  let newXp = pet.xp + amount
  let newLevel = pet.level
  let newXpToNext = calculateXpForLevel(newLevel)

  while (newXp >= newXpToNext) {
    newXp -= newXpToNext
    newLevel++
    newXpToNext = calculateXpForLevel(newLevel)
  }

  return { ...pet, xp: newXp, level: newLevel, xpToNextLevel: newXpToNext }
}

export function addCoins(pet: Pet, amount: number): Pet {
  const newCoins = Math.max(0, pet.coins + amount)
  return {
    ...pet,
    coins: newCoins,
    totalEarned: amount > 0 ? pet.totalEarned + amount : pet.totalEarned,
    totalSpent: amount < 0 ? pet.totalSpent + Math.abs(amount) : pet.totalSpent,
  }
}

export function calculateTaskReward(task: Task, verified: boolean, hasStreak: boolean): {
  xp: number
  coins: number
} {
  let xp = verified ? XP_PER_VERIFIED_TASK : XP_PER_TASK
  let coins = verified ? COINS_PER_VERIFIED : COINS_PER_TASK

  if (hasStreak) {
    xp += XP_STREAK_BONUS
    coins += 5
  }

  if (task.priority === 'high') {
    xp += 10
    coins += 5
  }

  return { xp, coins }
}

export function calculatePenalty(taskStatus: string): { xp: number; coins: number } {
  if (taskStatus === 'pending' || taskStatus === 'in_progress') {
    return { xp: 0, coins: PENALTY_UNFINISHED }
  }
  return { xp: 0, coins: 0 }
}

export function applyDecay(pet: Pet, hoursSinceLastUpdate: number): Pet {
  const decayAmount = Math.round(hoursSinceLastUpdate * DECAY_RATE)

  return {
    ...pet,
    happiness: Math.max(MIN_STAT, pet.happiness - decayAmount),
    hunger: Math.max(MIN_STAT, pet.hunger - decayAmount),
    energy: Math.max(MIN_STAT, pet.energy - decayAmount),
  }
}

export function feedPet(pet: Pet): Pet {
  return {
    ...pet,
    hunger: Math.min(MAX_STAT, pet.hunger + 30),
    happiness: Math.min(MAX_STAT, pet.happiness + 5),
    lastFed: Date.now(),
  }
}

export function playWithPet(pet: Pet): Pet {
  return {
    ...pet,
    happiness: Math.min(MAX_STAT, pet.happiness + 25),
    energy: Math.max(MIN_STAT, pet.energy - 10),
    lastPlayed: Date.now(),
  }
}

export function restPet(pet: Pet): Pet {
  return {
    ...pet,
    energy: Math.min(MAX_STAT, pet.energy + 35),
    happiness: Math.min(MAX_STAT, pet.happiness + 10),
  }
}

export function getPetMood(pet: Pet): 'happy' | 'neutral' | 'sad' | 'sick' {
  const avg = (pet.happiness + pet.hunger + pet.energy) / 3
  if (avg >= 70) return 'happy'
  if (avg >= 40) return 'neutral'
  if (avg >= 20) return 'sad'
  return 'sick'
}

export function generateMotivationalMessage(mood: string, pendingTasks: number): string {
  if (pendingTasks === 0) {
    const messages = [
      '¡No tienes tareas pendientes! ¿Qué te gustaría hacer hoy?',
      'Día libre, ¿eh? ¿Aprovechamos para aprender algo nuevo?',
      'Sin tareas... ¿Qué tal si leemos un rato?',
    ]
    return messages[Math.floor(Math.random() * messages.length)]
  }

  switch (mood) {
    case 'happy':
      return '¡Estoy de muy buen humor! Vamos a terminar esas tareas juntos 💪'
    case 'neutral':
      return 'Bueno... tengo hambre pero podemos trabajar. ¿Empezamos?'
    case 'sad':
      return 'Estoy un poco triste... Me animaría si hacemos algunas tareas juntos'
    case 'sick':
      return '*tos* *tos*... Llevo sin cuidados mucho tiempo. ¿Me das atención?'
    default:
      return '¿En qué te ayudo hoy?'
  }
}
