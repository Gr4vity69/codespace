// ── Barrel export — import paths limpios ─────────────────────────
// Uso: import { Pet, Task, BlockedApp } from '@/src'
//      import { initDatabase, getDb } from '@/src'

// Types
export type {
  Pet, PetMood, Task, TaskStatus, TaskPriority, BlockedApp,
  Category, Transaction, Reward, UserReward, Schedule,
  ConversationLog, DailyConfig, MathChallenge, ChatMessage,
  AIBlockResponse, AIPlanResponse,
} from './types'

// Services
export { initDatabase, getDb } from './services/database'
export { saveConversation, loadRecentConversations, getTodaysConversations, clearConversationHistory, formatConversationSummary } from './services/conversationMemory'
export { verifyTaskCompletion } from './services/ai'
export { getApiKey, setApiKey } from './services/apiKeys'
export {
  startBlockingService, stopBlockingService, isServiceRunning, isBlockingAvailable,
  getInstalledApps, getBlockedApps, addBlockedApp, removeBlockedApp,
  getCurrentForegroundApp, checkForegroundBlocked,
  showBlockingOverlay, hideBlockingOverlay,
  requestOverlayPermission, requestUsageStatsPermission, checkUsageStatsPermission,
  requestAccessibilityService, isAccessibilityServiceEnabled,
  setTemporaryUnlock, getTemporaryUnlockRemaining,
  syncBlockedAppsToNative, syncPetMoodToNative, checkAutoBlockingByMood,
  isBlockedApp, isInBreakTime,
} from './services/blocking'
export { getApps, upsertApp } from './services/settingsDb'
export { purchaseReward, getUserRewards, getRewards, isDayOff } from './services/shopService'
export { sendMessage, sendMessageWithMemory } from './services/groqChat'

// Stores
export { useTaskStore } from './store/taskStore'
export { usePetStore } from './store/petStore'

// Utils
export { getMoodFromTasks, calculateTaskReward, calculatePenalty } from './utils/petEngine'
export { timeStringToTimestamp, formatTimestampToTime } from './utils/timeHelpers'
export { generateMathChallenge, checkMathAnswer } from './utils/mathBlocker'
