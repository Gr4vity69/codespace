import { create } from 'zustand'
import type { Task } from '../types'
import { getDb } from '../services/database'
import { calculatePenalty } from '../utils/petEngine'
import { usePetStore } from './petStore'

// Track tasks that already had penalty applied (in-memory, resets on app restart)
const penalizedTasks = new Set<number>()

type CreateTaskInput = {
  title: string
  description?: string
  priority?: Task['priority']
  deadline?: number | null
  categoryId?: number | null
  whitelistedApps?: string[]
  estimatedMinutes?: number
  scheduledStart?: number | null
  scheduledEnd?: number | null
  breakAfter?: number
  materials?: string
}

interface TaskState {
  tasks: Task[]
  todayTasks: Task[]
  loading: boolean
  loadTasks: () => Promise<void>
  addTask: (task: CreateTaskInput) => Promise<number>
  updateTask: (id: number, updates: Partial<Task>) => Promise<void>
  completeTask: (id: number, photoUri?: string) => Promise<void>
  verifyTask: (id: number, verified: boolean) => Promise<void>
  deleteTask: (id: number) => Promise<void>
  getTasksByStatus: (status: string) => Task[]
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  todayTasks: [],
  loading: true,

  loadTasks: async () => {
    try {
      const db = getDb()
      const rows = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM tasks ORDER BY createdAt DESC')
      const tasks: Task[] = rows.map(mapRowToTask)
      set({ tasks, loading: false })

      // Apply penalty for overdue tasks (one-time per session)
      const now = Date.now()
      for (const task of tasks) {
        if (penalizedTasks.has(task.id)) continue
        if (task.status !== 'pending' && task.status !== 'in_progress') continue

        const deadline = task.deadline ?? (task.createdAt + task.estimatedMinutes * 60000)
        if (deadline < now) {
          const penalty = calculatePenalty(task.status)
          if (penalty.coins < 0) {
            const pet = usePetStore.getState().pet
            if (pet) {
              const { addCoins } = await import('../utils/petEngine')
              await usePetStore.getState().updatePet(addCoins(pet, penalty.coins))
              console.warn(`[penalty] Task #${task.id} overdue: ${penalty.coins} coins`)
            }
          }
          penalizedTasks.add(task.id)
        }
      }

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayTs = today.getTime()
      const todayEnd = todayTs + 86400000

      const todayTasks = tasks.filter(t => {
        if (t.status === 'verified') return (t.completedAt ?? 0) >= todayTs
        return (t.createdAt >= todayTs && t.createdAt < todayEnd) ||
               (t.deadline !== null && t.deadline >= todayTs && t.deadline < todayEnd) ||
               (t.scheduledStart !== null && t.scheduledStart >= todayTs && t.scheduledStart < todayEnd)
      })

      set({ todayTasks: [...new Map(todayTasks.map(t => [t.id, t])).values()] })
    } catch (error) {
      console.error('Error loading tasks:', error)
      set({ loading: false })
    }
  },

  addTask: async (taskData) => {
    const db = getDb()
    const now = Date.now()
    const result = await db.runAsync(
      `INSERT INTO tasks (title, description, priority, deadline, status,
        categoryId, whitelistedApps, estimatedMinutes, scheduledStart, scheduledEnd,
        breakAfter, materials, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        taskData.title ?? '',
        taskData.description ?? '',
        taskData.priority ?? 'medium' as string,
        taskData.deadline ?? null,
        'pending',
        taskData.categoryId ?? null,
        JSON.stringify(taskData.whitelistedApps ?? []),
        taskData.estimatedMinutes ?? 30,
        taskData.scheduledStart ?? null,
        taskData.scheduledEnd ?? null,
        taskData.breakAfter ?? 10,
        taskData.materials ?? '',
        now,
      ]
    )
    await get().loadTasks()
    return result.lastInsertRowId
  },

  updateTask: async (id, updates) => {
    const db = getDb()
    const fieldMap: Record<string, string> = {
      title: 'title', description: 'description', priority: 'priority',
      deadline: 'deadline', status: 'status', categoryId: 'categoryId',
      estimatedMinutes: 'estimatedMinutes', scheduledStart: 'scheduledStart',
      scheduledEnd: 'scheduledEnd', breakAfter: 'breakAfter', materials: 'materials',
    }

    const setClauses: string[] = []
    const values: (string | number | null)[] = []

    for (const [key, col] of Object.entries(fieldMap)) {
      if (key in updates) {
        let val = (updates as Record<string, unknown>)[key] as string | number | null
        if (key === 'whitelistedApps' && val !== null && typeof val !== 'string') {
          val = JSON.stringify(val)
        }
        setClauses.push(`${col} = ?`)
        values.push(val)
      }
    }

    if (setClauses.length > 0) {
      values.push(id)
      await db.runAsync(`UPDATE tasks SET ${setClauses.join(', ')} WHERE id = ?`, values)
      await get().loadTasks()
    }
  },

  completeTask: async (id, photoUri) => {
    const db = getDb()
    const now = Date.now()
    await db.runAsync(
      'UPDATE tasks SET status = ?, photoUri = ?, completedAt = ? WHERE id = ?',
      photoUri ? 'completed' : 'verified', photoUri || null, now, id
    )
    await get().loadTasks()
  },

  verifyTask: async (id, verified) => {
    const db = getDb()
    await db.runAsync(
      'UPDATE tasks SET aiVerified = ?, status = ? WHERE id = ?',
      verified ? 1 : 0, verified ? 'verified' : 'in_progress', id
    )
    await get().loadTasks()
  },

  deleteTask: async (id) => {
    const db = getDb()
    await db.runAsync('DELETE FROM tasks WHERE id = ?', id)
    await get().loadTasks()
  },

  getTasksByStatus: (status) => {
    return get().tasks.filter(t => t.status === status)
  },
}))

function mapRowToTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as number,
    title: row.title as string,
    description: row.description as string,
    priority: row.priority as Task['priority'],
    deadline: row.deadline as number | null,
    status: row.status as Task['status'],
    photoUri: row.photoUri as string | null,
    aiVerified: Boolean(row.aiVerified),
    categoryId: row.categoryId as number | null,
    whitelistedApps: parseJSONArray(row.whitelistedApps as string),
    estimatedMinutes: row.estimatedMinutes as number,
    scheduledStart: row.scheduledStart as number | null,
    scheduledEnd: row.scheduledEnd as number | null,
    breakAfter: row.breakAfter as number,
    materials: row.materials as string,
    createdAt: row.createdAt as number,
    completedAt: row.completedAt as number | null,
  }
}

function parseJSONArray(val: string): string[] {
  try {
    return JSON.parse(val || '[]')
  } catch {
    return []
  }
}
