import type { Pet, Task, PetMood } from '../types'

const XP_PER_TASK = 20
const XP_PER_VERIFIED_TASK = 30
const XP_STREAK_BONUS = 10
const COINS_PER_TASK = 10
const COINS_PER_VERIFIED = 15
const PENALTY_UNFINISHED = -15

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

// ═══════════════════════════════════════════════════════════════
//  Mood engine — based ONLY on task performance
// ═══════════════════════════════════════════════════════════════

/**
 * Determine pet mood based on task data:
 *  - happy:  streak ≥ 3 AND at least 2 tasks completed today
 *  - angry:  overdue tasks (past estimated time or deadline)
 *  - sad:    no tasks completed today AND many pending
 *  - normal: everything else
 */
export function getMoodFromTasks(
  todayTasks: Task[],
  streak: number,
): PetMood {
  const now = Date.now()
  const pending = todayTasks.filter(t => t.status === 'pending' || t.status === 'in_progress')
  const completedToday = todayTasks.filter(t => t.status === 'verified').length

  // Happy: on a roll
  if (streak >= 3 && completedToday >= 2) return 'happy'

  // Angry: overdue tasks
  const overdue = pending.filter(t => {
    const deadline = t.deadline ?? (t.createdAt + t.estimatedMinutes * 60000)
    return deadline < now
  })
  if (overdue.length >= 2) return 'angry'
  if (overdue.length >= 1 && completedToday === 0) return 'angry'

  // Sad: abandoned
  if (completedToday === 0 && pending.length >= 3) return 'sad'

  return 'normal'
}

// ═══════════════════════════════════════════════════════════════
//  Motivational messages — updated for new mood system
// ═══════════════════════════════════════════════════════════════

export function generateMotivationalMessage(mood: PetMood, pendingTasks: number): string {
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
      return '¡Vamos excelente! Sigamos con esta racha imparable 🎉'
    case 'normal':
      return 'Vamos a terminar esas tareas juntos. ¿Empezamos con la primera? 💪'
    case 'sad':
      return 'Ánimo, podemos con esto. Empieza con la tarea más fácil y vamos de ahí 💙'
    case 'angry':
      return 'Se nos acumularon varias... mejor empezamos ya y vamos una por una ⏰'
  }
}
