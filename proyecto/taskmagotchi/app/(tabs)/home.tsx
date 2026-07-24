import { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList,
  TextInput, Modal, Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useTaskStore } from '../../src/store/taskStore'
import { usePetStore } from '../../src/store/petStore'
import { calculateTaskReward } from '../../src/utils/petEngine'
import { PixelButton, RetroInputShell, RetroPanel, RetroScreen, retroColors, monoFont } from '../../src/components/retroUi'
import type { Task, TaskPriority } from '../../src/types'

export default function HomeScreen() {
  const router = useRouter()
  const { todayTasks, addTask, updateTask, loadTasks } = useTaskStore()
  const { pet, updatePet } = usePetStore()
  const [showForm, setShowForm] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  // Create task form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [estimatedMinutes, setEstimatedMinutes] = useState('30')
  const [whitelistedApps, setWhitelistedApps] = useState('')

  // Deadline timer
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)

  // Auto-select first pending task on mount
  useEffect(() => {
    const pending = todayTasks.filter(
      t => t.status === 'pending' || t.status === 'in_progress'
    )
    if (pending.length > 0 && !selectedTask) {
      setSelectedTask(pending[0])
    }
  }, [todayTasks])

  // Timer countdown
  useEffect(() => {
    if (!selectedTask) { setTimeRemaining(null); return }
    if (selectedTask.status === 'verified') { setTimeRemaining(null); return }

    const deadline = selectedTask.deadline || (
      selectedTask.createdAt + selectedTask.estimatedMinutes * 60000
    )

    function tick() {
      const remaining = Math.max(0, deadline - Date.now())
      setTimeRemaining(remaining)
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [selectedTask])

  const pendingTasks = todayTasks.filter(
    t => t.status === 'pending' || t.status === 'in_progress'
  )
  const isTimeUp = timeRemaining !== null && timeRemaining <= 0

  async function handleCreate() {
    if (!title.trim()) return
    await addTask({
      title: title.trim(),
      description: description.trim(),
      priority,
      deadline: null,
      categoryId: null,
      whitelistedApps: whitelistedApps.split(',').map(s => s.trim()).filter(Boolean),
      estimatedMinutes: parseInt(estimatedMinutes) || 30,
      scheduledStart: null,
      scheduledEnd: null,
      breakAfter: 10,
      materials: '',
    })
    setTitle('')
    setDescription('')
    setEstimatedMinutes('30')
    setWhitelistedApps('')
    setShowForm(false)
  }

  function formatTime(ms: number): string {
    if (ms <= 0) return '00:00'
    const totalSec = Math.floor(ms / 1000)
    const min = Math.floor(totalSec / 60)
    const sec = totalSec % 60
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  return (
    <RetroScreen>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.topRow}>
          <View>
            <Text style={styles.brand}>TASKMAGOTCHI</Text>
            <Text style={styles.brandSub}>pixel task companion</Text>
          </View>
          {pet && (
            <View style={styles.statsRow}>
              <Text style={styles.statBadge}>Lv.{pet.level}</Text>
              <Text style={styles.statBadge}>{pet.coins}🪙</Text>
            </View>
          )}
          <PixelButton style={styles.addButton} onPress={() => setShowForm(true)}>+</PixelButton>
        </View>

        {/* Timer / Active Task */}
        {selectedTask && selectedTask.status !== 'verified' && (
          <RetroPanel style={[
            styles.timerPanel,
            isTimeUp && styles.timerPanelTimeUp,
          ]}>
            <Text style={styles.timerTaskName}>{selectedTask.title}</Text>
            {isTimeUp ? (
              <>
                <Text style={[styles.timerDisplay, { color: retroColors.danger }]}>
                  ¡TIEMPO!
                </Text>
                <Text style={styles.timeUpSub}>Sube una foto para verificar o completa manual</Text>
              </>
            ) : (
              <>
                <Text style={[
                  styles.timerDisplay,
                  { color: timeRemaining !== null && timeRemaining < 300000 ? retroColors.danger : retroColors.text }
                ]}>
                  {timeRemaining !== null ? formatTime(timeRemaining) : '--:--'}
                </Text>
                <Text style={styles.timerLabel}>
                  {selectedTask.estimatedMinutes} min estimados
                  {selectedTask.deadline ? ' · CON DEADLINE' : ''}
                </Text>
              </>
            )}
            <View style={styles.timerActions}>
              <PixelButton
                style={styles.timerBtn}
                variant="solid"
                onPress={() => router.push('/camera/' + selectedTask.id)}
              >
                TOMAR FOTO
              </PixelButton>
            </View>
          </RetroPanel>
        )}

        {/* Task Slider */}
        <View style={styles.sliderSection}>
          <Text style={styles.sectionLabel}>
            TAREAS {pendingTasks.length > 0 ? `· ${pendingTasks.length} pendientes` : ''}
          </Text>
          {pendingTasks.length === 0 ? (
            <RetroPanel style={styles.emptyPanel}>
              <Text style={styles.emptyIcon}>□</Text>
              <Text style={styles.emptyText}>Todo listo por hoy</Text>
              <Text style={styles.emptySub}>Usa el chat para planificar tu día</Text>
            </RetroPanel>
          ) : (
            <FlatList
              horizontal
              data={pendingTasks}
              keyExtractor={t => t.id.toString()}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sliderContent}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => setSelectedTask(item)}
                  style={[
                    styles.taskCard,
                    selectedTask?.id === item.id && styles.taskCardActive,
                  ]}
                >
                  <View style={[styles.priorityLine, {
                    backgroundColor: item.priority === 'high' ? retroColors.danger : item.priority === 'medium' ? '#f3b64d' : retroColors.success
                  }]} />
                  <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                  <Text style={styles.cardTime}>{item.estimatedMinutes} min</Text>
                  {item.whitelistedApps.length > 0 && (
                    <Text style={styles.cardApps} numberOfLines={1}>{item.whitelistedApps.slice(0, 2).join(', ')}</Text>
                  )}
                </TouchableOpacity>
              )}
            />
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <PixelButton
            style={styles.actionBtn}
            variant="ghost"
            onPress={() => {
              if (selectedTask) router.push('/camera/' + selectedTask.id)
            }}
            disabled={!selectedTask}
          >
            SUBIR FOTO
          </PixelButton>
        </View>
      </View>

      {/* Create Task Modal */}
      <Modal visible={showForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>NUEVA TAREA</Text>

            <RetroInputShell>
              <TextInput style={styles.input} placeholder="¿Qué tienes que hacer?" placeholderTextColor={retroColors.muted} value={title} onChangeText={setTitle} />
            </RetroInputShell>
            <RetroInputShell style={styles.multilineShell}>
              <TextInput style={[styles.input, styles.inputMultiline]} placeholder="Descripción (opcional)" placeholderTextColor={retroColors.muted} value={description} onChangeText={setDescription} multiline />
            </RetroInputShell>

            <Text style={styles.label}>Prioridad</Text>
            <View style={styles.priorityRow}>
              {(['low', 'medium', 'high'] as const).map(p => (
                <TouchableOpacity
                  key={p}
                  style={[styles.priorityOption, priority === p && styles.priorityOptionActive]}
                  onPress={() => setPriority(p)}
                >
                  <Text style={[styles.priorityOptionText, priority === p && styles.priorityOptionTextActive]}>
                    {p === 'high' ? 'ALTA' : p === 'medium' ? 'MEDIA' : 'BAJA'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Tiempo estimado (min)</Text>
            <RetroInputShell>
              <TextInput style={styles.input} placeholder="30" placeholderTextColor={retroColors.muted} value={estimatedMinutes} onChangeText={setEstimatedMinutes} keyboardType="number-pad" />
            </RetroInputShell>

            <Text style={styles.label}>Apps necesarias</Text>
            <RetroInputShell>
              <TextInput style={styles.input} placeholder="Chrome, VS Code, Terminal" placeholderTextColor={retroColors.muted} value={whitelistedApps} onChangeText={setWhitelistedApps} />
            </RetroInputShell>

            <View style={styles.modalButtons}>
              <PixelButton style={styles.modalButton} variant="ghost" onPress={() => setShowForm(false)}>CANCEL</PixelButton>
              <PixelButton style={styles.modalButton} onPress={handleCreate}>CREAR</PixelButton>
            </View>
          </View>
        </View>
      </Modal>
    </RetroScreen>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 14 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { color: retroColors.text, fontSize: 20, fontFamily: monoFont, fontWeight: '800', letterSpacing: 2 },
  brandSub: { color: retroColors.muted, fontSize: 10, fontFamily: monoFont, letterSpacing: 1.2, marginTop: 2 },
  addButton: { width: 46, minHeight: 46, paddingHorizontal: 0 },
  statsRow: { flexDirection: 'row', gap: 6, marginRight: 8 },
  statBadge: { color: retroColors.text, fontSize: 12, fontFamily: monoFont, fontWeight: '700', letterSpacing: 0.8 },

  // Timer Panel
  timerPanel: { gap: 8, alignItems: 'center', paddingVertical: 16 },
  timerPanelTimeUp: { borderColor: retroColors.danger },
  timerTaskName: { color: retroColors.text, fontSize: 16, fontWeight: '800', fontFamily: monoFont, textAlign: 'center' },
  timerDisplay: { fontSize: 48, fontWeight: '800', fontFamily: monoFont, letterSpacing: 4 },
  timerLabel: { fontSize: 11, color: retroColors.muted, fontFamily: monoFont },
  timerActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  timerBtn: { minHeight: 38, paddingHorizontal: 16 },
  timeUpSub: { fontSize: 12, color: retroColors.danger, fontFamily: monoFont, textAlign: 'center' },

  // Slider
  sliderSection: { gap: 8 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: retroColors.text, fontFamily: monoFont, letterSpacing: 1.2 },
  sliderContent: { gap: 10, paddingBottom: 4 },
  taskCard: {
    width: 140,
    borderWidth: 2,
    borderColor: retroColors.border,
    backgroundColor: retroColors.panel,
    padding: 10,
    gap: 6,
  },
  taskCardActive: {
    borderColor: retroColors.text,
    backgroundColor: retroColors.panelSoft,
  },
  priorityLine: { height: 3, width: '100%' },
  cardTitle: { color: retroColors.text, fontSize: 12, fontWeight: '700', fontFamily: monoFont },
  cardTime: { color: retroColors.muted, fontSize: 10, fontFamily: monoFont },
  cardApps: { color: retroColors.muted, fontSize: 9, fontFamily: monoFont },

  // Empty
  emptyPanel: { alignItems: 'center', gap: 6, padding: 18 },
  emptyIcon: { fontSize: 26, color: retroColors.text },
  emptyText: { fontSize: 14, fontWeight: '700', color: retroColors.text, fontFamily: monoFont },
  emptySub: { fontSize: 11, color: retroColors.muted, fontFamily: monoFont },

  // Quick Actions
  quickActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modal: { backgroundColor: retroColors.background, borderTopWidth: 2, borderColor: retroColors.border, padding: 16, maxHeight: '88%', gap: 10 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: retroColors.text, marginBottom: 6, fontFamily: monoFont, letterSpacing: 1.4 },
  input: { color: retroColors.text, fontFamily: monoFont, fontSize: 13, padding: 0 },
  inputMultiline: { minHeight: 72, textAlignVertical: 'top' },
  multilineShell: { minHeight: 92 },
  label: { fontSize: 11, fontWeight: '700', color: retroColors.text, marginBottom: 4, marginTop: 2, fontFamily: monoFont, letterSpacing: 1 },
  priorityRow: { flexDirection: 'row', gap: 8 },
  priorityOption: { flex: 1, paddingVertical: 10, borderWidth: 2, borderColor: retroColors.border, backgroundColor: retroColors.panel, alignItems: 'center' },
  priorityOptionActive: { backgroundColor: retroColors.text },
  priorityOptionText: { fontSize: 11, fontWeight: '700', color: retroColors.text, fontFamily: monoFont },
  priorityOptionTextActive: { color: retroColors.background },
  modalButtons: { flexDirection: 'row', gap: 8, marginTop: 4 },
  modalButton: { flex: 1 },
})
