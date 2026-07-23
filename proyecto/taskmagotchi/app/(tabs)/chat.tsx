import { useState, useRef, useEffect } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  FlatList, KeyboardAvoidingView, Platform, Image,
} from 'react-native'
import { sendMessage } from '../../src/services/groqChat'
import { useTaskStore } from '../../src/store/taskStore'
import { usePetStore } from '../../src/store/petStore'
import { getPetMood } from '../../src/utils/petEngine'
import type { ChatMessage, AIPlanResponse } from '../../src/types'
import { PixelButton, RetroInputShell, RetroScreen, SpeechBubble, retroColors } from '../../src/components/retroUi'

export default function ChatScreen() {
  const addTask = useTaskStore(s => s.addTask)
  const loadTasks = useTaskStore(s => s.loadTasks)
  const pet = usePetStore(s => s.pet)

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: '¡Hola! Soy Magotchi 🐾 ¿Tienes tareas pendientes para hoy? Cuéntame y te ayudo a organizarlas.',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [context, setContext] = useState<'planning' | 'motivation' | 'general'>('planning')
  const flatListRef = useRef<FlatList>(null)

  const mood = pet ? getPetMood(pet) : 'neutral'
  const moodLabel = mood === 'happy' ? 'FELIZ' : mood === 'neutral' ? 'NORMAL' : mood === 'sad' ? 'TRISTE' : 'CANSADA'

  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true })
  }, [messages])

  async function handleSend() {
    if (!input.trim() || loading) return

    const userMsg: ChatMessage = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const response = await sendMessage(
        newMessages.map(m => ({ role: m.role, content: m.content })),
        context
      )

      const aiMsg: ChatMessage = { role: 'assistant', content: response }
      setMessages(prev => [...prev, aiMsg])

      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          const plan: AIPlanResponse = JSON.parse(jsonMatch[0])
          if (plan.ready && plan.tasks) {
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
              })
            }
            await loadTasks()
            const taskCount = plan.tasks.length
            const summary: ChatMessage = {
              role: 'assistant',
              content: `✅ ¡Listo! He creado ${taskCount} tarea${taskCount > 1 ? 's' : ''} para ti. Revisa el Home para verlas.`,
            }
            setMessages(prev => [...prev, summary])
            setContext('general')
          }
        } catch {
          // Not a JSON response, continue conversation
        }
      }
    } catch (error) {
      const errMsg: ChatMessage = {
        role: 'assistant',
        content: 'Lo siento, tuve un problema al procesar tu mensaje. ¿Podemos intentarlo de nuevo?',
      }
      setMessages(prev => [...prev, errMsg])
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
            {/* Placeholder sprite — will be replaced with animated pixel art */}
            <View style={styles.spritePlaceholder}>
              <Text style={styles.spriteEmoji}>🐼</Text>
            </View>
            <View style={styles.mascotInfo}>
              <Text style={styles.mascotName}>{pet?.name?.toUpperCase() || 'MAGOTCHI'}</Text>
              <Text style={styles.mascotMood}>{moodLabel}</Text>
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

        {loading && (
          <View style={styles.typingIndicator}>
            <Text style={styles.typingText}>MAGOTCHI TYPING...</Text>
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
  spritePlaceholder: {
    width: 64,
    height: 64,
    borderWidth: 2,
    borderColor: retroColors.border,
    backgroundColor: '#15101d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spriteEmoji: { fontSize: 32 },
  mascotInfo: { gap: 2 },
  mascotName: { color: retroColors.text, fontSize: 14, fontWeight: '800', fontFamily: 'monospace', letterSpacing: 1.2 },
  mascotMood: { color: retroColors.muted, fontSize: 10, fontFamily: 'monospace', letterSpacing: 1 },

  // Messages
  messageList: { paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
  messageRow: { gap: 8 },
  userRow: { alignItems: 'flex-end' },
  assistantRow: { alignItems: 'flex-start' },
  messageBubbleWrap: { maxWidth: '88%' },
  typingIndicator: { paddingHorizontal: 16, paddingBottom: 8 },
  typingText: { fontSize: 11, color: retroColors.muted, fontFamily: 'monospace', letterSpacing: 1.3 },

  // Input
  inputRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 16, alignItems: 'stretch' },
  inputShell: { flex: 1, minHeight: 52, justifyContent: 'center' },
  input: { color: retroColors.text, fontFamily: 'monospace', fontSize: 14, minHeight: 24, maxHeight: 120, padding: 0, textAlignVertical: 'top' },
  sendBtn: { width: 56, paddingHorizontal: 0 },
})
