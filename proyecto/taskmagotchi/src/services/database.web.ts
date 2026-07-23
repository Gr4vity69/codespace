export interface SQLiteDatabase {
  getFirstAsync<T>(query: string, ...params: unknown[]): Promise<T | null>
  getAllAsync<T>(query: string, ...params: unknown[]): Promise<T[]>
  runAsync(query: string, ...params: unknown[]): Promise<{ lastInsertRowId: number; changes: number }>
  execAsync(query: string): Promise<void>
}

const noopDb: SQLiteDatabase = {
  async getFirstAsync<T>() {
    return null as T | null
  },
  async getAllAsync<T>() {
    return [] as T[]
  },
  async runAsync() {
    return { lastInsertRowId: 0, changes: 0 }
  },
  async execAsync() {},
}

export async function initDatabase(): Promise<void> {
  return
}

export function getDb(): SQLiteDatabase {
  return noopDb
}

export const SQLite = {}
