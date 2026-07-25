import { useState, useRef, useEffect } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  FlatList, KeyboardAvoidingView, Platform,
} from 'react-native'
import { sendMessageWithMemory } from '../../src/services/groqChat'
import { useTaskStore } from '../../src/store/taskStore'
import { usePetStore } from '../../src/store/petStore'
import { computeMood, getProactiveSuggestion, shouldRecommendBlocking } from '../../src/utils/petGameLoop'
import { checkAutoBlockingByMood } from '../../src/services/blocking'
import { timeStringToTimestamp, formatTimestampToTime } from '../../src/utils/timeHelpers'
import { getApps, upsertApp } from '../../src/services/settingsDb'
import { loadRecentConversations, saveConversation, formatConversationSummary } from '../../src/services/conversationMemory'
import type { ChatMessage, AIPlanResponse, AIBlockResponse } from '../../src/types'
import { PixelButton, RetroInputShell, RetroScreen, SpeechBubble, retroColors, monoFont } from '../../src/components/retroUi'
import PetSprite from '../../src/components/petSprite'

export default function ChatScreen() {
  const addTask = useTaskStore(s => s.addTask)
  const loadTasks = useTaskStore(s => s.loadTasks)
  const todayTasks = useTaskStore(s => s.todayTasks)
  const pet = usePetStore(s => s.pet)

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: '¡Hola! Soy Magotchi 🐾 ¿Tienes tareas pendientes para hoy? Cuéntame y te ayudo a organizarlas.',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [processingLabel, setProcessingLabel] = useState<string | null>(null)
  const [context, setContext] = useState<'planning' | 'motivation' | 'general'>('planning')
  const flatListRef = useRef<FlatList>(null)

  const skinMood = pet ? computeMood(pet, todayTasks) : 'normal'

  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true })
  }, [messages])

useEffect(() => {
     ;(async () => {
       const history = await loadRecentConversations(6)
       if (history.length > 0) {
         const pastMessages: ChatMessage[] = []
         for (const entry of history) {
           pastMessages.push({ role: 'user', content: entry.userMessage })
           const clean = entry.aiResponse.replace(/\{[\s\S]*?\}/, '').trim()
           if (clean) pastMessages.push({ role: 'assistant', content: clean })
         }
         if (pastMessages.length > 0) {
           setMessages(prev => [...prev, ...pastMessages])
         }
       }
     })()
   }, [])
   
   // 🐾 Proactive pet suggestions and auto-blocking check
   useEffect(() => {
     ;(async () => {
       // Check for auto-blocking by mood
       const { shouldBlock, mood, reason } = await checkAutoBlockingByMood()
       if (shouldBlock) {
         console.log(`🚨 Chat auto-block triggered: ${reason}`)
       }
       
       // Get proactive suggestion based on current mood
       const pet = usePetStore.getState().pet
       const todayTasks = useTaskStore.getState().todayTasks
       if (pet && todayTasks.length > 0) {
         const currentMood = computeMood(pet, todayTasks)
         const pendingTasks = todayTasks.filter(t => t.status === 'pending' || t.status === 'in_progress')
         
         // Get a proactive suggestion if we have pending tasks
         const suggestion = getProactiveSuggestion(currentMood, pendingTasks)
         if (suggestion) {
           // Add the suggestion as a message from the pet
           setMessages(prev => [...prev, {
             role: 'assistant',
             content: suggestion
           }])
           
           // Save this suggestion to conversation memory
           await saveConversation('System check for proactive suggestion', suggestion, context)
         }
       }
     })()
   }, [todayTasks, pet]) // Re-run when tasks or pet change

  async function handleBlockResponse(cmd: AIBlockResponse) {
    if (cmd.action === 'list_blocked') {
      const apps = await getApps()
      const blocked = apps.filter(a => a.isBlocked)
      const allowed = apps.filter(a => !a.isBlocked)
      let msg = ''
      if (blocked.length > 0) msg += `🚫 Bloqueadas: ${blocked.map(a => a.appName).join(', ')}\n`
      if (allowed.length > 0) msg += `✅ Permitidas: ${allowed.map(a => a.appName).join(', ')}`
      if (!msg) msg = 'No hay apps configuradas. Ve a Settings > Apps para añadir.'
      setMessages(prev => [...prev, { role: 'assistant', content: msg }])
      return
    }

    if (cmd.action === 'block_app' && cmd.packageName) {
      await upsertApp(cmd.packageName, cmd.appName || cmd.packageName, true)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `✅ He bloqueado **${cmd.appName || cmd.packageName}**${cmd.reason ? ` (${cmd.reason})` : ''}. Lo tendrás restringido durante tus tareas.`,
      }])
      return
    }

    if (cmd.action === 'unblock_app' && cmd.packageName) {
      await upsertApp(cmd.packageName, cmd.appName || cmd.packageName, false)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `✅ He desbloqueado **${cmd.appName || cmd.packageName}**. Ya puedes usarlo libremente.`,
      }])
      return
    }

    if (cmd.action === 'block_suggestion') {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `💡 ¿Quieres que bloquee **${cmd.appName || ''}**?${cmd.reason ? ` (${cmd.reason})` : ''}\n\nDi "sí" para bloquearlo o "no" para ignorarlo.`,
      }])
      return
    }
  }

  function stripJson(text: string): string {
    // Non-greedy: solo elimina el primer bloque JSON, no todo entre el primer { y el último }
    return text.replace(/\{[\s\S]*?\}/, '').trim()
  }

  async function handleSend() {
    if (!input.trim() || loading) return

    const userMsg: ChatMessage = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const conversationSummary = formatConversationSummary(await loadRecentConversations(12))

      const pendingList = todayTasks
        .filter(t => t.status === 'pending' || t.status === 'in_progress')
        .map(t => `  - ${t.title} (${t.estimatedMinutes} min, ${t.priority})`)

      const scheduleList = todayTasks
        .filter(t => t.scheduledStart != null)
        .sort((a, b) => (a.scheduledStart ?? 0) - (b.scheduledStart ?? 0))
        .map(t => {
          const start = t.scheduledStart ? formatTimestampToTime(t.scheduledStart) : '?'
          const end = t.scheduledEnd ? formatTimestampToTime(t.scheduledEnd) : '?'
          return `  ${start}-${end}: ${t.title}`
        })

      const response = await sendMessageWithMemory(
        newMessages.map(m => ({ role: m.role, content: m.content })),
        context,
        {
          conversationSummary,
          pendingTasks: pendingList.length > 0 ? pendingList.join('\n') : 'Sin tareas pendientes',
          todaySchedule: scheduleList.length > 0 ? scheduleList.join('\n') : 'Sin horario definido',
          currentMood: skinMood,
          petLevel: pet ? `Lv.${pet.level} (${pet.xp}/${pet.xpToNextLevel} XP)` : undefined,
        }
      )

      const jsonMatch = response.match(/\{[\s\S]*?\}/)
      const conversationalText = jsonMatch ? stripJson(response) : response

      if (jsonMatch) {
        let handled = false
        let aiDisplayContent = ''

        // Try task-plan JSON
        try {
          const plan: AIPlanResponse = JSON.parse(jsonMatch[0])
          if (plan.ready && plan.tasks) {
            handled = true
            if (conversationalText) {
              aiDisplayContent = conversationalText
              setMessages(prev => [...prev, { role: 'assistant', content: conversationalText }])
            }
            setProcessingLabel('📋 Estableciendo tareas...')

            for (const task of plan.tasks) {
              const scheduleForTask = plan.schedule?.find(
                s => s.taskTitle.toLowerCase() === task.title.toLowerCase()
              )
              await addTask({
                title: task.title,
                description: task.description || '',
                priority: task.priority || 'medium',
                whitelistedApps: task.whitelistedApps || [],
                estimatedMinutes: task.estimatedMinutes || 30,
                breakAfter: scheduleForTask?.breakAfter ?? 10,
                materials: task.materials || '',
                scheduledStart: scheduleForTask?.startTime
                  ? timeStringToTimestamp(scheduleForTask.startTime)
                  : null,
                scheduledEnd: scheduleForTask?.endTime
                  ? timeStringToTimestamp(scheduleForTask.endTime)
                  : null,
              })
            }

            await loadTasks()
            setProcessingLabel(null)
            const taskCount = plan.tasks.length
            const summaryMsg = `✅ Tareas establecidas (${taskCount}). Revisa el Home para verlas.`
            aiDisplayContent = summaryMsg
            setMessages(prev => [...prev, { role: 'assistant', content: summaryMsg }])
            setContext('general')
          }
        } catch {}

        // Try blocking JSON
        if (!handled) {
          try {
            const blockCmd: AIBlockResponse = JSON.parse(jsonMatch[0])
            if (blockCmd.action && ['block_app', 'unblock_app', 'list_blocked', 'block_suggestion'].includes(blockCmd.action)) {
              handled = true
              if (conversationalText) {
                aiDisplayContent = conversationalText
                setMessages(prev => [...prev, { role: 'assistant', content: conversationalText }])
              }
              setProcessingLabel(blockCmd.action === 'block_app' ? '🔒 Bloqueando app...' : '🔓 Desbloqueando...')
              await handleBlockResponse(blockCmd)
              setProcessingLabel(null)
            }
          } catch {}
        }

        // Unknown JSON — show raw conversational text only
        if (!handled && conversationalText) {
          aiDisplayContent = conversationalText
          setMessages(prev => [...prev, { role: 'assistant', content: conversationalText }])
        }

        if (aiDisplayContent) {
          await saveConversation(input.trim(), aiDisplayContent, context)
        }
      } else {
        // No JSON — normal conversational response
        setMessages(prev => [...prev, { role: 'assistant', content: response }])
        await saveConversation(input.trim(), response, context)
      }
    } catch (error) {
      setProcessingLabel(null)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Lo siento, tuve un problema al procesar tu mensaje. ¿Podemos intentarlo de nuevo?',
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <RetroScreen>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Mascot Container */}
        <View style={styles.mascotBar}>
          <View style={styles.mascotFrame}>
            <PetSprite mood={skinMood} size={64} />
            <View style={styles.mascotInfo}>
              <Text style={styles.mascotName}>{pet?.name?.toUpperCase() || 'MAGOTCHI'}</Text>
              <Text style={styles.mascotMood}>{skinMood.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(_, i) => i.toString()}
          contentContainerStyle={styles.messageList}
          renderItem={({ item }) => (
            <View style={[styles.messageRow, item.role === 'user' ? styles.userRow : styles.assistantRow]}>
              <View style={styles.messageBubbleWrap}>
                <SpeechBubble align={item.role === 'user' ? 'right' : 'left'}>
                  {item.content}
                </SpeechBubble>
              </View>
            </View>
          )}
        />

        {(loading || processingLabel) && (
          <View style={styles.typingIndicator}>
            <Text style={styles.typingText}>
              {processingLabel || 'MAGOTCHI TYPING...'}
            </Text>
          </View>
        )}

        {/* Chat Input Bar */}
        <View style={styles.inputRow}>
          <RetroInputShell style={styles.inputShell}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder={input ? '' : '...'}
              placeholderTextColor={retroColors.muted}
              multiline
              maxLength={500}
              onSubmitEditing={handleSend}
            />
          </RetroInputShell>
          <PixelButton style={styles.sendBtn} onPress={handleSend} disabled={!input.trim() || loading}>
            ↑
          </PixelButton>
        </View>
      </KeyboardAvoidingView>
    </RetroScreen>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Mascot Bar
  mascotBar: {
    borderBottomWidth: 2,
    borderBottomColor: retroColors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: retroColors.panel,
  },
  mascotFrame: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mascotInfo: { gap: 2 },
  mascotName: { color: retroColors.text, fontSize: 14, fontWeight: '800', fontFamily: monoFont, letterSpacing: 1.2 },
  mascotMood: { color: retroColors.muted, fontSize: 10, fontFamily: monoFont, letterSpacing: 1 },

  // Messages
  messageList: { paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
  messageRow: { gap: 8 },
  userRow: { alignItems: 'flex-end' },
  assistantRow: { alignItems: 'flex-start' },
  messageBubbleWrap: { maxWidth: '88%' },
  typingIndicator: { paddingHorizontal: 16, paddingBottom: 8 },
  typingText: { fontSize: 11, color: retroColors.muted, fontFamily: monoFont, letterSpacing: 1.3 },

  // Input
  inputRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 16, alignItems: 'stretch' },
  inputShell: { flex: 1, minHeight: 52, justifyContent: 'center' },
  input: { color: retroColors.text, fontFamily: monoFont, fontSize: 14, minHeight: 24, maxHeight: 120, padding: 0, textAlignVertical: 'top' },
  sendBtn: { width: 56, paddingHorizontal: 0 },
})
