import * as SQLite from 'expo-sqlite'
import { seedDefaultApps } from './settingsDb'
import type {
  Pet, Task, BlockedApp, Category, Transaction,
  Reward, UserReward, Schedule, ConversationLog, DailyConfig
} from '../types'

let db: SQLite.SQLiteDatabase

export async function initDatabase(): Promise<void> {
  db = await SQLite.openDatabaseAsync('taskmagotchi.db')

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS pet (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL DEFAULT 'Magotchi',
      species TEXT NOT NULL DEFAULT 'default',
      happiness REAL NOT NULL DEFAULT 50,
      hunger REAL NOT NULL DEFAULT 50,
      energy REAL NOT NULL DEFAULT 50,
      level INTEGER NOT NULL DEFAULT 1,
      xp INTEGER NOT NULL DEFAULT 0,
      xpToNextLevel INTEGER NOT NULL DEFAULT 100,
      lastFed INTEGER NOT NULL DEFAULT 0,
      lastPlayed INTEGER NOT NULL DEFAULT 0,
      coins INTEGER NOT NULL DEFAULT 0,
      totalEarned INTEGER NOT NULL DEFAULT 0,
      totalSpent INTEGER NOT NULL DEFAULT 0,
      streak INTEGER NOT NULL DEFAULT 0,
      lastStreakDate TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
      deadline INTEGER,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'verified')),
      photoUri TEXT,
      aiVerified INTEGER NOT NULL DEFAULT 0,
      categoryId INTEGER,
      whitelistedApps TEXT NOT NULL DEFAULT '[]',
      estimatedMinutes INTEGER NOT NULL DEFAULT 30,
      scheduledStart INTEGER,
      scheduledEnd INTEGER,
      breakAfter INTEGER NOT NULL DEFAULT 10,
      materials TEXT NOT NULL DEFAULT '',
      createdAt INTEGER NOT NULL,
      completedAt INTEGER,
      FOREIGN KEY (categoryId) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS blocked_apps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      packageName TEXT NOT NULL UNIQUE,
      appName TEXT NOT NULL,
      isBlocked INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#6366f1',
      icon TEXT NOT NULL DEFAULT 'star'
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('earn', 'spend', 'penalty')),
      amount INTEGER NOT NULL,
      reason TEXT NOT NULL,
      taskId INTEGER,
      createdAt INTEGER NOT NULL,
      FOREIGN KEY (taskId) REFERENCES tasks(id)
    );

    CREATE TABLE IF NOT EXISTS rewards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      cost INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('day_off', 'extra_time', 'cosmetic')),
      durationMinutes INTEGER,
      cosmeticId TEXT
    );

    CREATE TABLE IF NOT EXISTS user_rewards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rewardId INTEGER NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      expiresAt INTEGER,
      FOREIGN KEY (rewardId) REFERENCES rewards(id)
    );

    CREATE TABLE IF NOT EXISTS schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dayOfWeek INTEGER NOT NULL CHECK(dayOfWeek BETWEEN 0 AND 6),
      breakStart TEXT NOT NULL,
      breakEnd TEXT NOT NULL,
      isActive INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS conversation_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userMessage TEXT NOT NULL,
      aiResponse TEXT NOT NULL,
      context TEXT NOT NULL DEFAULT 'general' CHECK(context IN ('planning', 'motivation', 'general')),
      createdAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS daily_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      isDayOff INTEGER NOT NULL DEFAULT 0,
      boredomBlockMinutes INTEGER NOT NULL DEFAULT 45,
      unblockMathDifficulty TEXT NOT NULL DEFAULT 'medium' CHECK(unblockMathDifficulty IN ('easy', 'medium', 'hard')),
      tasksAddedToday INTEGER NOT NULL DEFAULT 0,
      date TEXT NOT NULL UNIQUE
    );
  `)

  await seedDefaults()
}

async function seedDefaults(): Promise<void> {
  const petCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM pet')
  if (petCount?.count === 0) {
    await db.runAsync(
      `INSERT INTO pet (name, species, lastFed, lastPlayed) VALUES (?, ?, ?, ?)`,
      'Magotchi', 'default', Date.now(), Date.now()
    )
  }

  const catCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM categories')
  if (catCount?.count === 0) {
    const defaultCats = [
      ['Trabajo', '#ef4444', 'briefcase'],
      ['Estudio', '#3b82f6', 'book'],
      ['Personal', '#10b981', 'heart'],
      ['Ejercicio', '#f59e0b', 'run'],
      ['Lectura', '#8b5cf6', 'book-open'],
    ]
    for (const [name, color, icon] of defaultCats) {
      await db.runAsync('INSERT INTO categories (name, color, icon) VALUES (?, ?, ?)', name, color, icon)
    }
  }

  const rewardCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM rewards')
  if (rewardCount?.count === 0) {
    await db.runAsync('INSERT INTO rewards (name, cost, type, durationMinutes) VALUES (?, ?, ?, ?)', 'Día libre', 100, 'day_off', null)
    await db.runAsync('INSERT INTO rewards (name, cost, type, durationMinutes) VALUES (?, ?, ?, ?)', '30 min extra ocio', 20, 'extra_time', 30)
    await db.runAsync('INSERT INTO rewards (name, cost, type, durationMinutes) VALUES (?, ?, ?, ?)', '1 hora extra ocio', 35, 'extra_time', 60)
    await db.runAsync('INSERT INTO rewards (name, cost, type, durationMinutes) VALUES (?, ?, ?, ?)', 'Saltar una tarea', 50, 'day_off', null)
  }

  await seedDefaultApps()

  const schedCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM schedules')
  if (schedCount?.count === 0) {
    for (let d = 0; d < 7; d++) {
      await db.runAsync(
        'INSERT INTO schedules (dayOfWeek, breakStart, breakEnd) VALUES (?, ?, ?)',
        d, '12:00', '13:00'
      )
      await db.runAsync(
        'INSERT INTO schedules (dayOfWeek, breakStart, breakEnd) VALUES (?, ?, ?)',
        d, '18:00', '19:00'
      )
    }
  }
}

export function getDb(): SQLite.SQLiteDatabase {
  return db
}

export { SQLite }
export type { SQLiteDatabase } from 'expo-sqlite'
