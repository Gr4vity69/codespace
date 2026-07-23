export interface Pet {
  id: number
  name: string
  /** Skin name — maps to assets/skins/<species>/ */
  species: string
  level: number
  xp: number
  xpToNextLevel: number
  coins: number
  totalEarned: number
  totalSpent: number
  streak: number
  lastStreakDate: string
}

export type PetMood = 'normal' | 'happy' | 'sad' | 'angry'

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'verified'
export type TaskPriority = 'low' | 'medium' | 'high'

export interface Task {
  id: number
  title: string
  description: string
  priority: TaskPriority
  deadline: number | null
  status: TaskStatus
  photoUri: string | null
  aiVerified: boolean
  categoryId: number | null
  whitelistedApps: string[]
  estimatedMinutes: number
  scheduledStart: number | null
  scheduledEnd: number | null
  breakAfter: number
  materials: string
  createdAt: number
  completedAt: number | null
}

export interface BlockedApp {
  id: number
  packageName: string
  appName: string
  isBlocked: boolean
}

export interface Category {
  id: number
  name: string
  color: string
  icon: string
}

export interface Transaction {
  id: number
  type: 'earn' | 'spend' | 'penalty'
  amount: number
  reason: string
  taskId: number | null
  createdAt: number
}

export interface Reward {
  id: number
  name: string
  cost: number
  type: 'day_off' | 'extra_time' | 'cosmetic'
  durationMinutes: number | null
  cosmeticId: string | null
}

export interface UserReward {
  id: number
  rewardId: number
  active: boolean
  expiresAt: number | null
}

export interface Schedule {
  id: number
  dayOfWeek: number
  breakStart: string
  breakEnd: string
  isActive: boolean
}

export interface ConversationLog {
  id: number
  userMessage: string
  aiResponse: string
  context: 'planning' | 'motivation' | 'general'
  createdAt: number
}

export interface DailyConfig {
  isDayOff: boolean
  boredomBlockMinutes: number
  unblockMathDifficulty: 'easy' | 'medium' | 'hard'
  tasksAddedToday: boolean
  date: string
}

export interface MathChallenge {
  question: string
  answer: number
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface AIPlanResponse {
  ready?: boolean
  suggestion?: string
  description?: string
  duration?: number
  tasks: {
    title: string
    description: string
    priority: TaskPriority
    estimatedMinutes: number
    whitelistedApps: string[]
    materials: string
  }[]
  schedule: {
    startTime: string
    endTime: string
    taskTitle: string
    breakAfter: number
  }[]
}
