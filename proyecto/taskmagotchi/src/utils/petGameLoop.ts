/**
 * Pet Game Loop — modifica happiness/hunger/energy según las acciones
 * del usuario y calcula el mood de la mascota.
 * 
 * NUEVO: 
 *   - Sugerencias proactivas por mood 
 *   - Recompensas automáticas por streaks
 *   - Autodetección de necesidad de bloqueo de apps
 */
import type { Pet, PetMood, Task } from '../types'

// ─── Constants ────────────────────────────────────────────────────
const HAPPY_TASK_BONUS = 8      // happiness que gana al completar una tarea
const ENERGY_TASK_COST = 5      // energy que pierde al completar una tarea
const HUNGER_TASK_COST = 4      // hunger que pierde al hacer una tarea (tiene hambre)
const HAPPY_SKIP_PENALTY = -10  // happiness que pierde al saltar una tarea sin verificar
const HAPPY_OVERDUE_PENALTY = -5  // happiness que pierde por cada tarea vencida
const MIN_STAT = 0
const MAX_STAT = 100

// Recompensas por streaks y logros
const REWARD_FOR_STREAK_3 = { coins: 5, xp: 10 }; // Cada 3 streak, mini-recompensa
const REWARD_FOR_STREAK_5 = { coins: 15, xp: 30 }; // Al alcanzar streak 5, gran recompensa
const DAILY_BONUS = { coins: 10, xp: 20 }; // Bonus diario por completar al menos 1 tarea

// Sugerencias predeterminadas por mood
export const SUGGESTIONS_BY_MOOD: Record<PetMood, string[]> = {
  happy: [
    '¡Vamos excelente! ¿Quieres añadir una tarea de "Aprender algo nuevo" hoy?',
    'Presupuesta tiempo para tu hobby favorito! 🎨',
    'Haz una pausa y disfruta un café consciente ☕',
  ],
  normal: [
    '¿Te gustaría planificar tus tareas restantes?',
    'Tienes energía para seguir. ¿Qué más deseas hacer hoy?',
    '¿Quieres intentar una tarea un poco más desafiante?',
  ],
  sad: [
    'No te desanimes, te entiendo. ¿Quieres empezar con una tarea pequeña y fácil?',
    '¿Te gustaría que te sugiera una actividad relajante?',
    '¿Quieres que te ayude a reorganizar tus prioridades?',
  ],
  angry: [
    '¡Vamos a ordenar! ¿Qué tarea crítica está pendiente?',
    '¿Necesitas bloquear alguna app distractora? Te sugiero bloquearla.',
    '¿Te gustaría hacer una tarea rápida para recuperar el control?',
  ],
};

export const REWARD_MESSAGES: Record<string, string> = {
  streak3: '¡Mini-recompensa! Has completado 3 días seguidos 🎉',
  streak5: '¡Gran recompensa! Has alcanzado racha de 5 días 🔥',
  daily: '¡Bonus diario ganado! Tu mascota te felicita 🎁',
};

// ─── Stat helpers ─────────────────────────────────────────────────
function clamp(val: number): number {
  return Math.max(MIN_STAT, Math.min(MAX_STAT, val))
}

/**
 * Aplica los efectos de COMPLETAR una tarea.
 */
export function applyTaskCompletion(pet: Pet): Partial<Pet> {
  return {
    happiness: clamp(pet.happiness + HAPPY_TASK_BONUS),
    energy: clamp(pet.energy - ENERGY_TASK_COST),
    hunger: clamp(pet.hunger - HUNGER_TASK_COST),
  }
}

/**
 * Aplica los efectos de SALTAR/IGNORAR una tarea (skip sin verificar).
 */
export function applyTaskSkip(pet: Pet): Partial<Pet> {
  return {
    happiness: clamp(pet.happiness + HAPPY_SKIP_PENALTY),
    energy: clamp(pet.energy - 2),
    hunger: clamp(pet.hunger - 1),
  }
}

/**
 * Aplica penalización por tareas vencidas (overdue).
 */
export function applyOverduePenalty(pet: Pet, overdueCount: number): Partial<Pet> {
  return {
    happiness: clamp(pet.happiness + HAPPY_OVERDUE_PENALTY * overdueCount),
  }
}

/**
 * Calcula el mood de la mascota basado ÚNICAMENTE en tareas.
 */
export function computeMood(
  pet: Pet,
  todayTasks: Task[],
): PetMood {
  const now = Date.now()
  const pending = todayTasks.filter(t => t.status === 'pending' || t.status === 'in_progress')
  const completedToday = todayTasks.filter(t => t.status === 'verified').length

  const overdue = pending.filter(t => {
    const deadline = t.deadline ?? (t.createdAt + t.estimatedMinutes * 60000)
    return deadline < now
  })
  const hasManyOverdue = overdue.length >= 3
  const hasStreak = pet.streak >= 2
  const hasManyCompleted = completedToday >= 2

  // Angry: muchas tareas vencidas (3+)
  if (hasManyOverdue) {
    return 'angry'
  }

  // Happy: buena racha (streak >= 2) + completando tareas (2+)
  if (hasStreak && hasManyCompleted) {
    return 'happy'
  }

  // Sad: zero completadas + muchas pendientes (3+)
  if (completedToday === 0 && pending.length >= 3) {
    return 'sad'
  }

  return 'normal'
}

/**
 * Aplica decaimiento natural con el paso del tiempo.
 */
export function applyTimeDecay(pet: Pet, hoursElapsed: number): Partial<Pet> {
  return {
    happiness: clamp(pet.happiness - hoursElapsed * 0.5),
    hunger: clamp(pet.hunger - hoursElapsed * 1.2),
    energy: clamp(pet.energy + hoursElapsed * 0.3),
  }
}

/**
 * Obtiene sugerencia proactiva basada en el mood actual.
 */
export function getProactiveSuggestion(mood: PetMood, pending: Task[]): string | null {
  const suggestions = SUGGESTIONS_BY_MOOD[mood]
  if (suggestions.length === 0) return null
  return suggestions[Math.floor(Math.random() * suggestions.length)]
}

/**
 * Determina si la mascota recomendaría bloquear apps.
 * Solo recomienda si está enojada y hay apps candidatas.
 */
export function shouldRecommendBlocking(mood: PetMood): boolean {
  return mood === 'angry'
}

/**
 * Calcula recompensas adicionales por streak/logros.
 */
export function getStreakRewards(oldStreak: number, newStreak: number): { coins: number; xp: number; message: string } | null {
  if (oldStreak < 3 && newStreak >= 3) {
    return { ...REWARD_FOR_STREAK_3, message: REWARD_MESSAGES.streak3 }
  }
  if (oldStreak < 5 && newStreak >= 5) {
    return { ...REWARD_FOR_STREAK_5, message: REWARD_MESSAGES.streak5 }
  }
  return null
}