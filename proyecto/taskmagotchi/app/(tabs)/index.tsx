import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { usePetStore } from '../../src/store/petStore'
import { useTaskStore } from '../../src/store/taskStore'
import { getPetMood, generateMotivationalMessage } from '../../src/utils/petEngine'
import { useEffect, useState } from 'react'
import { PixelButton, PlaceholderSprite, RetroInputShell, RetroPanel, RetroScreen, RetroSectionTitle, SpeechBubble, retroColors } from '../../src/components/retroUi'

export default function HomeScreen() {
  const router = useRouter()
  const pet = usePetStore(s => s.pet)
  const todayTasks = useTaskStore(s => s.todayTasks)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (pet) {
      const mood = getPetMood(pet)
      const pending = todayTasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length
      setMessage(generateMotivationalMessage(mood, pending))
    }
  }, [pet, todayTasks])

  const pendingTasks = todayTasks.filter(t => t.status === 'pending' || t.status === 'in_progress')
  const completedToday = todayTasks.filter(t => t.status === 'verified')

  if (!pet) return null

  const mood = getPetMood(pet)
  const moodLabel = mood === 'happy' ? 'FELIZ' : mood === 'neutral' ? 'NORMAL' : mood === 'sad' ? 'TRISTE' : 'CANSADA'

  return (
    <RetroScreen>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.brand}>TASKMAGOTCHI</Text>
            <Text style={styles.brandSub}>pixel task companion</Text>
          </View>
          <View style={styles.brandBadge}>
            <Text style={styles.brandBadgeText}>BETA</Text>
          </View>
        </View>

        <View style={styles.stageWrap}>
          <PlaceholderSprite label={pet.name.toUpperCase()} subtitle={`NIVEL ${pet.level}`} />
          <View style={styles.speechWrap}>
            <SpeechBubble>{`Hola! Soy ${pet.name}.`}</SpeechBubble>
          </View>
        </View>

        <RetroPanel style={styles.summaryPanel}>
          <View style={styles.summaryHeader}>
            <Text style={styles.petName}>{pet.name}</Text>
            <View style={styles.statusChip}>
              <Text style={styles.statusChipText}>{moodLabel}</Text>
            </View>
          </View>
          <Text style={styles.petLevel}>Nv. {pet.level} · {pet.xp}/{pet.xpToNextLevel} XP</Text>
          <View style={styles.xpBar}>
            <View style={[styles.xpFill, { width: `${(pet.xp / pet.xpToNextLevel) * 100}%` }]} />
          </View>

          <View style={styles.statsRow}>
            <StatBar label="Felicidad" value={pet.happiness} color="#f3b64d" />
            <StatBar label="Energía" value={pet.energy} color="#88e38b" />
            <StatBar label="Hambre" value={pet.hunger} color="#ff8a78" />
          </View>
        </RetroPanel>

        <RetroPanel style={styles.messagePanel}>
          <RetroSectionTitle>Mensaje</RetroSectionTitle>
          <Text style={styles.messageText}>{message}</Text>
        </RetroPanel>

        <View style={styles.commandRow}>
          <RetroInputShell style={styles.commandField}>
            <Text style={styles.commandText}>...</Text>
          </RetroInputShell>
          <PixelButton style={styles.commandButton} onPress={() => router.push('/chat')}>
            ↑
          </PixelButton>
        </View>

        <View style={styles.actionRow}>
          <PixelButton style={styles.actionButton} variant="ghost" onPress={() => router.push('/chat')}>
            CHAT
          </PixelButton>
          <PixelButton style={styles.actionButton} variant="ghost" onPress={() => router.push('/(tabs)/tasks')}>
            TASKS {pendingTasks.length}
          </PixelButton>
        </View>

        <View style={styles.section}>
          <RetroSectionTitle>Tareas de hoy</RetroSectionTitle>
          {pendingTasks.length === 0 ? (
            <RetroPanel style={styles.emptyPanel}>
              <Text style={styles.emptyText}>No hay tareas pendientes.</Text>
            </RetroPanel>
          ) : (
            pendingTasks.map(task => (
              <TouchableOpacity
                key={task.id}
                style={styles.taskItem}
                onPress={() => router.push(`/camera/${task.id}`)}
              >
                <View style={[styles.priorityDot, {
                  backgroundColor: task.priority === 'high' ? '#ff8a78' : task.priority === 'medium' ? '#f3b64d' : '#88e38b'
                }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  {task.estimatedMinutes && <Text style={styles.taskMeta}>{task.estimatedMinutes} min</Text>}
                </View>
                <Text style={styles.verifyIcon}>▣</Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        {completedToday.length > 0 && (
          <View style={styles.section}>
            <RetroSectionTitle>Completadas</RetroSectionTitle>
            {completedToday.map(task => (
              <View key={task.id} style={styles.completedItem}>
                <Text style={styles.completedIcon}>✓</Text>
                <Text style={styles.completedTitle}>{task.title}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </RetroScreen>
  )
}

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={statStyles.container}>
      <Text style={statStyles.label}>{label}</Text>
      <View style={statStyles.barBg}>
        <View style={[statStyles.barFill, { width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }]} />
      </View>
      <Text style={statStyles.value}>{Math.round(value)}%</Text>
    </View>
  )
}

const statStyles = StyleSheet.create({
  container: { gap: 6, flex: 1 },
  label: { fontSize: 11, fontWeight: '700', color: retroColors.text, fontFamily: 'monospace' },
  barBg: { width: '100%', height: 8, backgroundColor: retroColors.panelMuted, borderWidth: 1, borderColor: retroColors.border, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 0 },
  value: { fontSize: 11, fontWeight: '700', color: retroColors.muted, fontFamily: 'monospace' },
})

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24, gap: 12 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  brand: { color: retroColors.text, fontSize: 22, fontFamily: 'monospace', fontWeight: '800', letterSpacing: 2 },
  brandSub: { color: retroColors.muted, fontSize: 10, fontFamily: 'monospace', letterSpacing: 1.4, marginTop: 2 },
  brandBadge: { borderWidth: 2, borderColor: retroColors.border, backgroundColor: retroColors.panel, paddingHorizontal: 8, paddingVertical: 4 },
  brandBadgeText: { color: retroColors.text, fontSize: 10, fontFamily: 'monospace', letterSpacing: 1.4 },
  stageWrap: { gap: 10 },
  speechWrap: { alignSelf: 'flex-end', marginTop: -8, maxWidth: '72%' },
  summaryPanel: { gap: 10 },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  petName: { color: retroColors.text, fontFamily: 'monospace', fontSize: 18, fontWeight: '800', letterSpacing: 1 },
  petLevel: { color: retroColors.muted, fontFamily: 'monospace', fontSize: 11, letterSpacing: 1 },
  statusChip: { borderWidth: 2, borderColor: retroColors.border, backgroundColor: retroColors.panelMuted, paddingHorizontal: 8, paddingVertical: 4 },
  statusChipText: { color: retroColors.text, fontFamily: 'monospace', fontSize: 10, letterSpacing: 1.4 },
  xpBar: { width: '100%', height: 10, backgroundColor: retroColors.panelMuted, borderWidth: 2, borderColor: retroColors.border, overflow: 'hidden', marginTop: 2 },
  xpFill: { height: '100%', backgroundColor: retroColors.accentSoft },
  statsRow: { flexDirection: 'row', gap: 8 },
  messagePanel: { gap: 8 },
  messageText: { color: retroColors.text, fontSize: 13, lineHeight: 19, fontFamily: 'monospace' },
  commandRow: { flexDirection: 'row', gap: 8, alignItems: 'stretch' },
  commandField: { flex: 1, justifyContent: 'center' },
  commandText: { color: retroColors.muted, fontFamily: 'monospace', fontSize: 18, letterSpacing: 4 },
  commandButton: { width: 52, paddingHorizontal: 0 },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionButton: { flex: 1 },
  section: { gap: 8 },
  emptyPanel: { alignItems: 'center' },
  emptyText: { color: retroColors.muted, fontFamily: 'monospace', fontSize: 12 },
  taskItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 2, borderColor: retroColors.border, backgroundColor: retroColors.panel,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  priorityDot: { width: 9, height: 9, borderWidth: 1, borderColor: retroColors.border },
  taskTitle: { color: retroColors.text, fontFamily: 'monospace', fontSize: 13, fontWeight: '700' },
  taskMeta: { color: retroColors.muted, fontFamily: 'monospace', fontSize: 10, marginTop: 2 },
  verifyIcon: { color: retroColors.text, fontSize: 16 },
  completedItem: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 2, borderColor: retroColors.border, backgroundColor: retroColors.panelMuted, paddingHorizontal: 10, paddingVertical: 8 },
  completedIcon: { color: retroColors.success, fontSize: 13, fontFamily: 'monospace', fontWeight: '800' },
  completedTitle: { color: retroColors.text, fontFamily: 'monospace', fontSize: 12 },
})
