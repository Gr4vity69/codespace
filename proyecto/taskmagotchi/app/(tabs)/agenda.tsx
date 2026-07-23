import { View, Text, StyleSheet } from 'react-native'
import { RetroPanel, RetroScreen, RetroSectionTitle, retroColors } from '../../src/components/retroUi'
import { useTaskStore } from '../../src/store/taskStore'

export default function AgendaScreen() {
  const { todayTasks } = useTaskStore()

  const scheduledTasks = todayTasks
    .filter(t => t.scheduledStart || t.scheduledEnd)
    .sort((a, b) => (a.scheduledStart ?? a.createdAt) - (b.scheduledStart ?? b.createdAt))

  return (
    <RetroScreen>
      <View style={styles.container}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.brand}>AGENDA</Text>
            <Text style={styles.brandSub}>plan del día</Text>
          </View>
          <View style={styles.dateBadge}>
            <Text style={styles.dateBadgeText}>
              {new Date().toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()}
            </Text>
          </View>
        </View>

        {scheduledTasks.length === 0 ? (
          <RetroPanel style={styles.emptyPanel}>
            <Text style={styles.emptyIcon}>☰</Text>
            <Text style={styles.emptyText}>Planifica tu día con el chat</Text>
            <Text style={styles.emptySub}>Habla con Magotchi para organizar tus tareas</Text>
          </RetroPanel>
        ) : (
          <View style={styles.timeline}>
            {scheduledTasks.map((task, i) => {
              const start = task.scheduledStart
                ? new Date(task.scheduledStart).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
                : null
              const end = task.scheduledEnd
                ? new Date(task.scheduledEnd).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
                : null

              return (
                <View key={task.id} style={styles.timelineItem}>
                  <View style={styles.timelineDot} />
                  {i < scheduledTasks.length - 1 && <View style={styles.timelineLine} />}
                  <RetroPanel style={[styles.taskBlock, {
                    borderLeftColor: task.priority === 'high' ? retroColors.danger : task.priority === 'medium' ? '#f3b64d' : retroColors.success,
                    borderLeftWidth: 4,
                  }]}>
                    <Text style={styles.taskTitle}>{task.title}</Text>
                    <Text style={styles.taskTime}>
                      {start || '?'} {end ? `— ${end}` : `· ${task.estimatedMinutes} min`}
                    </Text>
                    {task.description ? (
                      <Text style={styles.taskDesc} numberOfLines={2}>{task.description}</Text>
                    ) : null}
                  </RetroPanel>
                </View>
              )
            })}
          </View>
        )}

        <RetroSectionTitle style={{ marginTop: 16 }}>Próximamente</RetroSectionTitle>
        <RetroPanel style={styles.soonPanel}>
          <Text style={styles.soonText}>Vista de calendario completo tipo Google Calendar</Text>
          <Text style={styles.soonSub}>Bloques visuales por hora, integración con chat IA para modificar el plan</Text>
        </RetroPanel>
      </View>
    </RetroScreen>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  brand: { color: retroColors.text, fontSize: 18, fontFamily: 'monospace', fontWeight: '800', letterSpacing: 2 },
  brandSub: { color: retroColors.muted, fontSize: 10, fontFamily: 'monospace', letterSpacing: 1.2, marginTop: 2 },
  dateBadge: { borderWidth: 2, borderColor: retroColors.border, backgroundColor: retroColors.panel, paddingHorizontal: 8, paddingVertical: 4 },
  dateBadgeText: { color: retroColors.text, fontSize: 10, fontFamily: 'monospace', letterSpacing: 0.8 },

  // Empty
  emptyPanel: { alignItems: 'center', gap: 6, padding: 18 },
  emptyIcon: { fontSize: 26, color: retroColors.text },
  emptyText: { fontSize: 14, fontWeight: '700', color: retroColors.text, fontFamily: 'monospace' },
  emptySub: { fontSize: 11, color: retroColors.muted, fontFamily: 'monospace' },

  // Timeline
  timeline: { gap: 0, paddingLeft: 8 },
  timelineItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, minHeight: 70 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: retroColors.text, marginTop: 14, zIndex: 1 },
  timelineLine: { position: 'absolute', left: 9, top: 26, bottom: 0, width: 2, backgroundColor: 'rgba(247, 240, 219, 0.2)' },
  taskBlock: { flex: 1, gap: 4 },
  taskTitle: { color: retroColors.text, fontSize: 13, fontWeight: '700', fontFamily: 'monospace' },
  taskTime: { color: retroColors.muted, fontSize: 10, fontFamily: 'monospace' },
  taskDesc: { color: retroColors.muted, fontSize: 11, fontFamily: 'monospace' },

  // Soon
  soonPanel: { gap: 6 },
  soonText: { color: retroColors.text, fontSize: 12, fontFamily: 'monospace' },
  soonSub: { color: retroColors.muted, fontSize: 10, fontFamily: 'monospace' },
})
