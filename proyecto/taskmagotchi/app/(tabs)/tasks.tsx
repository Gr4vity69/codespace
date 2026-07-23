import { useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Modal, Platform,
} from 'react-native'
import { useTaskStore } from '../../src/store/taskStore'
import { usePetStore } from '../../src/store/petStore'
import { useRouter } from 'expo-router'
import type { TaskPriority } from '../../src/types'
import { addXp, addCoins, calculateTaskReward } from '../../src/utils/petEngine'
import { PixelButton, RetroInputShell, RetroPanel, RetroScreen, RetroSectionTitle, retroColors } from '../../src/components/retroUi'

export default function TasksScreen() {
  const router = useRouter()
  const { tasks, todayTasks, addTask, updateTask, deleteTask, loadTasks } = useTaskStore()
  const { pet, updatePet } = usePetStore()
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'today' | 'verified'>('today')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [estimatedMinutes, setEstimatedMinutes] = useState('30')
  const [whitelistedApps, setWhitelistedApps] = useState('')

  const filteredTasks = (() => {
    switch (filter) {
      case 'pending': return tasks.filter(t => t.status === 'pending' || t.status === 'in_progress')
      case 'today': return todayTasks
      case 'verified': return tasks.filter(t => t.status === 'verified')
      default: return tasks
    }
  })()

  async function handleCreate() {
    if (!title.trim()) return
    const taskId = await addTask({
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

  async function handleComplete(taskId: number) {
    if (pet) {
      const task = tasks.find(t => t.id === taskId)
      if (task) {
        const reward = calculateTaskReward(task, false, false)
        const updatedPet = addCoins(addXp(pet, reward.xp), reward.coins)
        await updatePet(updatedPet)
      }
    }
    await updateTask(taskId, { status: 'verified', completedAt: Date.now() })
  }

  const filters = [
    { key: 'today', label: 'Hoy' },
    { key: 'pending', label: 'Pendientes' },
    { key: 'all', label: 'Todas' },
    { key: 'verified', label: 'Hechas' },
  ] as const

  return (
    <RetroScreen>
      <View style={styles.container}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.brand}>TASKS</Text>
            <Text style={styles.brandSub}>retro board</Text>
          </View>
          <PixelButton style={styles.addButton} onPress={() => setShowForm(true)}>+</PixelButton>
        </View>

        <View style={styles.filterRow}>
          {filters.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {filteredTasks.length === 0 ? (
            <RetroPanel style={styles.empty}>
              <Text style={styles.emptyIcon}>□</Text>
              <Text style={styles.emptyText}>No hay tareas aquí</Text>
              <Text style={styles.emptySub}>Agrega una nueva tarea.</Text>
            </RetroPanel>
          ) : (
            filteredTasks.map(task => (
              <RetroPanel key={task.id} style={styles.taskCard}>
                <View style={styles.taskHeader}>
                  <View style={[styles.priorityBadge, { backgroundColor: task.priority === 'high' ? '#4c2020' : task.priority === 'medium' ? '#43310f' : '#14301b' }]}>
                    <Text style={styles.priorityText}>{task.priority === 'high' ? 'ALTA' : task.priority === 'medium' ? 'MEDIA' : 'BAJA'}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: task.status === 'verified' ? '#14301b' : task.status === 'completed' ? '#43310f' : '#241f2d' }]}>
                    <Text style={styles.statusText}>{task.status === 'verified' ? '✓ HECHA' : task.status === 'completed' ? '📸 FOTO' : '⏳ PENDIENTE'}</Text>
                  </View>
                </View>

                <Text style={styles.taskTitle}>{task.title}</Text>
                {task.description ? <Text style={styles.taskDesc}>{task.description}</Text> : null}

                {task.whitelistedApps.length > 0 && (
                  <Text style={styles.taskApps}>Apps: {task.whitelistedApps.join(', ')}</Text>
                )}

                <View style={styles.taskFooter}>
                  <Text style={styles.taskTime}>{task.estimatedMinutes} min</Text>
                  {task.status === 'pending' && <PixelButton style={styles.footerButton} onPress={() => handleComplete(task.id)}>DONE</PixelButton>}
                  {task.status === 'pending' && <PixelButton style={styles.footerButton} variant="ghost" onPress={() => router.push(`/camera/${task.id}`)}>CAM</PixelButton>}
                  {task.status !== 'verified' && (
                    <TouchableOpacity onPress={() => deleteTask(task.id)}>
                      <Text style={styles.deleteBtn}>×</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </RetroPanel>
            ))
          )}
        </ScrollView>

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

              <Text style={styles.label}>Tiempo estimado</Text>
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
      </View>
    </RetroScreen>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, gap: 12 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { color: retroColors.text, fontSize: 20, fontFamily: 'monospace', fontWeight: '800', letterSpacing: 2 },
  brandSub: { color: retroColors.muted, fontSize: 10, fontFamily: 'monospace', letterSpacing: 1.2, marginTop: 2 },
  addButton: { width: 46, minHeight: 46, paddingHorizontal: 0 },
  filterRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 2, borderColor: retroColors.border, backgroundColor: retroColors.panel },
  filterBtnActive: { backgroundColor: retroColors.text },
  filterText: { fontSize: 11, fontWeight: '700', color: retroColors.text, fontFamily: 'monospace', letterSpacing: 1 },
  filterTextActive: { color: retroColors.background },
  list: { flex: 1 },
  listContent: { gap: 10, paddingBottom: 20 },
  empty: { alignItems: 'center', gap: 6, padding: 18 },
  emptyIcon: { fontSize: 26, color: retroColors.text },
  emptyText: { fontSize: 14, fontWeight: '700', color: retroColors.text, fontFamily: 'monospace' },
  emptySub: { fontSize: 11, color: retroColors.muted, fontFamily: 'monospace' },
  taskCard: { gap: 8 },
  taskHeader: { flexDirection: 'row', gap: 8 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderWidth: 2, borderColor: retroColors.border },
  priorityText: { fontSize: 10, fontWeight: '800', color: retroColors.text, fontFamily: 'monospace', letterSpacing: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderWidth: 2, borderColor: retroColors.border },
  statusText: { fontSize: 10, fontWeight: '800', color: retroColors.text, fontFamily: 'monospace', letterSpacing: 1 },
  taskTitle: { fontSize: 15, fontWeight: '800', color: retroColors.text, fontFamily: 'monospace' },
  taskDesc: { fontSize: 12, color: retroColors.muted, fontFamily: 'monospace' },
  taskApps: { fontSize: 11, color: retroColors.text, fontFamily: 'monospace' },
  taskFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  taskTime: { fontSize: 11, color: retroColors.muted, fontWeight: '700', fontFamily: 'monospace', marginRight: 'auto' },
  footerButton: { minHeight: 34, paddingHorizontal: 10 },
  deleteBtn: { fontSize: 18, color: retroColors.danger, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modal: { backgroundColor: retroColors.background, borderTopWidth: 2, borderColor: retroColors.border, padding: 16, maxHeight: '88%', gap: 10 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: retroColors.text, marginBottom: 6, fontFamily: 'monospace', letterSpacing: 1.4 },
  input: { color: retroColors.text, fontFamily: 'monospace', fontSize: 13, padding: 0 },
  inputMultiline: { minHeight: 72, textAlignVertical: 'top' },
  multilineShell: { minHeight: 92 },
  label: { fontSize: 11, fontWeight: '700', color: retroColors.text, marginBottom: 4, marginTop: 2, fontFamily: 'monospace', letterSpacing: 1 },
  priorityRow: { flexDirection: 'row', gap: 8 },
  priorityOption: { flex: 1, paddingVertical: 10, borderWidth: 2, borderColor: retroColors.border, backgroundColor: retroColors.panel, alignItems: 'center' },
  priorityOptionActive: { backgroundColor: retroColors.text },
  priorityOptionText: { fontSize: 11, fontWeight: '700', color: retroColors.text, fontFamily: 'monospace' },
  priorityOptionTextActive: { color: retroColors.background },
  modalButtons: { flexDirection: 'row', gap: 8, marginTop: 4 },
  modalButton: { flex: 1 },
})
