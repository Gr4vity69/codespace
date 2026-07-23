import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { RetroPanel, RetroScreen, RetroSectionTitle, retroColors } from '../../src/components/retroUi'
import { useTaskStore } from '../../src/store/taskStore'
import { formatTimestampToTime } from '../../src/utils/timeHelpers'
import type { Task } from '../../src/types'

function PriorityBadge({ priority }: { priority: Task['priority'] }) {
  const color = priority === 'high' ? retroColors.danger
    : priority === 'medium' ? '#f3b64d'
    : retroColors.success
  const label = priority === 'high' ? 'ALTA' : priority === 'medium' ? 'MEDIA' : 'BAJA'
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  )
}

export default function AgendaScreen() {
  const { todayTasks } = useTaskStore()

  // Split tasks: scheduled (have start time) vs unscheduled
  const scheduledTasks = todayTasks
    .filter(t => t.scheduledStart != null)
    .sort((a, b) => (a.scheduledStart ?? 0) - (b.scheduledStart ?? 0))

  const unscheduledTasks = todayTasks
    .filter(t => t.scheduledStart == null)
    .sort((a, b) => (a.createdAt) - (b.createdAt))

  const hasTasks = scheduledTasks.length > 0 || unscheduledTasks.length > 0

  function renderTaskCard(task: Task, showTime: boolean) {
    return (
      <RetroPanel key={task.id} style={[styles.taskCard, {
        borderLeftColor: task.priority === 'high' ? retroColors.danger
          : task.priority === 'medium' ? '#f3b64d'
          : retroColors.success,
        borderLeftWidth: 4,
      }]}>
        <View style={styles.taskHeader}>
          <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
          <PriorityBadge priority={task.priority} />
        </View>
        {showTime && task.scheduledStart && (
          <Text style={styles.taskTime}>
            {formatTimestampToTime(task.scheduledStart)}
            {task.scheduledEnd ? ` — ${formatTimestampToTime(task.scheduledEnd)}` : ''}
            {` · ${task.estimatedMinutes} min`}
          </Text>
        )}
        {!showTime && (
          <Text style={styles.taskTime}>{task.estimatedMinutes} min</Text>
        )}
        {task.description ? (
          <Text style={styles.taskDesc} numberOfLines={2}>{task.description}</Text>
        ) : null}
      </RetroPanel>
    )
  }

  return (
    <RetroScreen>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.topRow}>
          <View>
            <Text style={styles.brand}>AGENDA</Text>
            <Text style={styles.brandSub}>plan del día</Text>
          </View>
          <View style={styles.dateBadge}>
            <Text style={styles.dateBadgeText}>
              {new Date().toLocaleDateString('es', {
                weekday: 'short', day: 'numeric', month: 'short',
              }).toUpperCase()}
            </Text>
          </View>
        </View>

        {!hasTasks ? (
          <RetroPanel style={styles.emptyPanel}>
            <Text style={styles.emptyIcon}>☰</Text>
            <Text style={styles.emptyText}>Planifica tu día con el chat</Text>
            <Text style={styles.emptySub}>
              Habla con Magotchi para organizar tus tareas{'\n'}y aparecerán aquí con horario
            </Text>
          </RetroPanel>
        ) : (
          <>
            {/* Scheduled tasks — timeline */}
            {scheduledTasks.length > 0 && (
              <View style={styles.section}>
                <RetroSectionTitle>CRONOGRAMA</RetroSectionTitle>
                <View style={styles.timeline}>
                  {scheduledTasks.map((task, i) => (
                    <View key={task.id} style={styles.timelineItem}>
                      <View style={styles.timelineLeft}>
                        <View style={styles.timelineDot} />
                        {i < scheduledTasks.length - 1 && (
                          <View style={styles.timelineLine} />
                        )}
                      </View>
                      {renderTaskCard(task, true)}
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Unscheduled tasks */}
            {unscheduledTasks.length > 0 && (
              <View style={styles.section}>
                <RetroSectionTitle>
                  SIN HORARIO · {unscheduledTasks.length}
                </RetroSectionTitle>
                <View style={styles.unscheduledList}>
                  {unscheduledTasks.map(task => renderTaskCard(task, false))}
                </View>
              </View>
            )}
          </>
        )}

        {/* Próximamente */}
        <View style={styles.section}>
          <RetroSectionTitle>PRÓXIMAMENTE</RetroSectionTitle>
          <RetroPanel style={styles.soonPanel}>
            <Text style={styles.soonItem}>▸ Vista calendario completo tipo Google Calendar</Text>
            <Text style={styles.soonItem}>▸ Bloques visuales por hora</Text>
            <Text style={styles.soonItem}>▸ Editar plan directamente desde la agenda</Text>
          </RetroPanel>
        </View>
      </ScrollView>
    </RetroScreen>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 32 },

  // Header
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  brand: { color: retroColors.text, fontSize: 18, fontFamily: 'monospace', fontWeight: '800', letterSpacing: 2 },
  brandSub: { color: retroColors.muted, fontSize: 10, fontFamily: 'monospace', letterSpacing: 1.2, marginTop: 2 },
  dateBadge: {
    borderWidth: 2, borderColor: retroColors.border,
    backgroundColor: retroColors.panel, paddingHorizontal: 8, paddingVertical: 4,
  },
  dateBadgeText: { color: retroColors.text, fontSize: 10, fontFamily: 'monospace', letterSpacing: 0.8 },

  // Sections
  section: { gap: 8 },

  // Empty
  emptyPanel: { alignItems: 'center', gap: 6, padding: 18 },
  emptyIcon: { fontSize: 26, color: retroColors.text },
  emptyText: { fontSize: 14, fontWeight: '700', color: retroColors.text, fontFamily: 'monospace' },
  emptySub: { fontSize: 11, color: retroColors.muted, fontFamily: 'monospace', textAlign: 'center' },

  // Timeline
  timeline: { gap: 0 },
  timelineItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, minHeight: 76 },
  timelineLeft: { width: 12, alignItems: 'center' },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: retroColors.text, marginTop: 14, zIndex: 1 },
  timelineLine: {
    position: 'absolute', top: 26, bottom: 0, width: 2,
    backgroundColor: 'rgba(247, 240, 219, 0.2)',
  },

  // Task card
  taskCard: { flex: 1, gap: 4, paddingVertical: 10 },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  taskTitle: { color: retroColors.text, fontSize: 13, fontWeight: '700', fontFamily: 'monospace', flex: 1 },
  taskTime: { color: retroColors.muted, fontSize: 10, fontFamily: 'monospace' },
  taskDesc: { color: retroColors.muted, fontSize: 11, fontFamily: 'monospace' },
  badge: { paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { color: '#000', fontSize: 9, fontFamily: 'monospace', fontWeight: '700' },

  // Unscheduled
  unscheduledList: { gap: 8 },

  // Soon
  soonPanel: { gap: 6 },
  soonItem: { color: retroColors.text, fontSize: 12, fontFamily: 'monospace', lineHeight: 18 },
})
