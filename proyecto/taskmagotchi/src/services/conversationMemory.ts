import { getDb } from './database'

const MAX_HISTORY = 20

export interface ConversationEntry {
  id: number
  userMessage: string
  aiResponse: string
  context: string
  createdAt: number
}

export async function saveConversation(
  userMessage: string,
  aiResponse: string,
  context: string,
): Promise<void> {
  const db = getDb()
  await db.runAsync(
    `INSERT INTO conversation_log (userMessage, aiResponse, context, createdAt)
     VALUES (?, ?, ?, ?)`,
    userMessage,
    aiResponse,
    context,
    Date.now(),
  )
}

export async function loadRecentConversations(
  limit: number = MAX_HISTORY,
): Promise<ConversationEntry[]> {
  const db = getDb()
  return db.getAllAsync<ConversationEntry>(
    'SELECT * FROM conversation_log ORDER BY createdAt DESC LIMIT ?',
    limit,
  )
}

export async function getTodaysConversations(): Promise<ConversationEntry[]> {
  const db = getDb()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return db.getAllAsync<ConversationEntry>(
    'SELECT * FROM conversation_log WHERE createdAt >= ? ORDER BY createdAt ASC',
    today.getTime(),
  )
}

export async function clearConversationHistory(): Promise<void> {
  const db = getDb()
  await db.runAsync('DELETE FROM conversation_log')
}

export function formatConversationSummary(entries: ConversationEntry[]): string {
  if (entries.length === 0) return ''

  const lines: string[] = ['Resumen de la conversación de hoy:']
  for (const entry of entries.slice(-10)) {
    const time = new Date(entry.createdAt).toLocaleTimeString('es', {
      hour: '2-digit',
      minute: '2-digit',
    })
    lines.push(`[${time}] Usuario: ${entry.userMessage.slice(0, 120)}`)
    const aiPreview = entry.aiResponse.replace(/\{[\s\S]*\}/, '').trim().slice(0, 120)
    if (aiPreview) {
      lines.push(`[${time}] Magotchi: ${aiPreview}`)
    }
  }
  return lines.join('\n')
}
