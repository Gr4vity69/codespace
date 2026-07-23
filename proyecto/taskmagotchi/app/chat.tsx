import { useState, useRef, useEffect } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  FlatList, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { sendMessage } from '../src/services/groqChat'
import { useTaskStore } from '../src/store/taskStore'
import type { ChatMessage, AIPlanResponse } from '../src/types'
import { PixelButton, RetroInputShell, RetroScreen, SpeechBubble, retroColors } from '../src/components/retroUi'

export default function ChatScreen() {
  const router = useRouter()
  const addTask = useTaskStore(s => s.addTask)
  const loadTasks = useTaskStore(s => s.loadTasks)
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
              content: `✅ ¡Listo! He creado ${taskCount} tarea${taskCount > 1 ? 's' : ''} para ti. Revisa la sección de tareas para ver el plan detallado.`,
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
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Text style={styles.backBtn}>✕</Text>
          </TouchableOpacity>
          <View style={styles.headerMeta}>
            <Text style={styles.headerTitle}>MAGOTCHI</Text>
            <Text style={styles.headerSub}>assistant console</Text>
          </View>
          <View style={styles.headerRight} />
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(_, i) => i.toString()}
          contentContainerStyle={styles.messageList}
          renderItem={({ item }) => (
            <View style={[styles.messageRow, item.role === 'user' ? styles.userRow : styles.assistantRow]}>
              <View style={[styles.avatarBadge, item.role === 'user' ? styles.userAvatar : styles.assistantAvatar]}>
                <Text style={styles.avatarText}>{item.role === 'user' ? 'YOU' : 'AI'}</Text>
              </View>
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

        <View style={styles.inputRow}>
          <RetroInputShell style={styles.inputShell}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="..."
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
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
  },
  closeButton: { width: 42, height: 42, borderWidth: 2, borderColor: retroColors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: retroColors.panel },
  backBtn: { fontSize: 18, color: retroColors.text, fontFamily: 'monospace', fontWeight: '800' },
  headerMeta: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: retroColors.text, fontFamily: 'monospace', letterSpacing: 2 },
  headerSub: { fontSize: 10, color: retroColors.muted, fontFamily: 'monospace', letterSpacing: 1.2, marginTop: 2 },
  headerRight: { width: 42 },
  messageList: { paddingHorizontal: 16, paddingBottom: 10, gap: 12 },
  messageRow: { gap: 8 },
  userRow: { alignItems: 'flex-end' },
  assistantRow: { alignItems: 'flex-start' },
  avatarBadge: { borderWidth: 2, borderColor: retroColors.border, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' },
  userAvatar: { backgroundColor: retroColors.panelSoft },
  assistantAvatar: { backgroundColor: retroColors.panel },
  avatarText: { color: retroColors.text, fontSize: 10, fontFamily: 'monospace', letterSpacing: 1.2 },
  messageBubbleWrap: { maxWidth: '88%' },
  typingIndicator: { paddingHorizontal: 16, paddingBottom: 8 },
  typingText: { fontSize: 11, color: retroColors.muted, fontFamily: 'monospace', letterSpacing: 1.3 },
  inputRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 16, alignItems: 'stretch' },
  inputShell: { flex: 1, minHeight: 52, justifyContent: 'center' },
  input: { color: retroColors.text, fontFamily: 'monospace', fontSize: 14, minHeight: 24, maxHeight: 120, padding: 0, textAlignVertical: 'top' },
  sendBtn: { width: 56, paddingHorizontal: 0 },
})
