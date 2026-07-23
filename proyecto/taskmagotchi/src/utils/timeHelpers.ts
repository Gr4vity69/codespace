/**
 * Convert a "HH:MM" string to a JS timestamp for today.
 * e.g. timeStringToTimestamp("09:30") → timestamp for today at 09:30
 */
export function timeStringToTimestamp(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date.getTime()
}

/**
 * Format a timestamp to a short time string.
 * e.g. formatTime(1700000000000) → "09:30"
 */
export function formatTimestampToTime(ts: number): string {
  const date = new Date(ts)
  return date.toLocaleTimeString('es', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/**
 * Check if a timestamp is for today.
 */
export function isToday(ts: number): boolean {
  const now = new Date()
  const date = new Date(ts)
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}
