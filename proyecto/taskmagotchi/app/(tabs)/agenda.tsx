import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, ActivityIndicator, Platform, TextInput } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { RetroPanel, RetroScreen, RetroSectionTitle, retroColors, monoFont, RetroInputShell } from '../../src/components/retroUi';
import { useTaskStore } from '../../src/store/taskStore';
import { formatTimestampToTime } from '../../src/utils/timeHelpers';
import type { Task } from '../../src/types';
import { usePetStore } from '../../src/store/petStore';
import { computeMood, getProactiveSuggestion } from '../../src/utils/petGameLoop';
import { PixelButton } from '../../src/components/retroUi';

export default function AgendaScreen() {
  const { todayTasks, tasks, updateTask: updateTaskStore, loadTasks } = useTaskStore();
  const { pet } = usePetStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [markedDates, setMarkedDates] = useState({});

  // Compute mood for theme
  const mood = pet ? computeMood(pet, todayTasks) : 'normal';

  // Background color based on mood
  const bgColor = mood === 'happy' ? '#0d1f15' : mood === 'sad' ? '#0d131f' : mood === 'angry' ? '#1f0d0d' : '#15101d';

  useEffect(() => {
    // Update marked dates for calendar (days with tasks)
    const marked: { [key: string]: { selected: boolean; selectedColor?: string } } = {};
    tasks.forEach(task => {
      if (task.scheduledStart) {
        const date = new Date(task.scheduledStart);
        const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        marked[dateString] = { selected: true, selectedColor: retroColors.accent };
      }
    });
    setMarkedDates(marked);
  }, [tasks]);

  useEffect(() => {
    loadTasks();
  }, []);

  const handleDayPress = (dayData: { dateString: string; day: number; month: number; year: number; timestamp: number }) => {
    const [year, month, day] = dayData.dateString.split('-').map(Number);
    setSelectedDate(new Date(year, month - 1, day));
    setModalVisible(true);
  };

  const handleTaskPress = (task: Task) => {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskDescription(task.description || '');
    setModalVisible(true);
  };

  const handleSaveTask = async () => {
    if (!editingTask) return;
    setLoading(true);
    try {
      await updateTaskStore(editingTask.id, {
        title: taskTitle,
        description: taskDescription,
      });
      setEditingTask(null);
      setTaskTitle('');
      setTaskDescription('');
      setModalVisible(false);
    } catch (e) {
      console.error('Failed to update task:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditingTask(null);
    setTaskTitle('');
    setTaskDescription('');
    setModalVisible(false);
  };

  const tasksForSelectedDate = tasks.filter(task => {
    if (!task.scheduledStart) return false;
    const taskDate = new Date(task.scheduledStart);
    return taskDate.toDateString() === selectedDate.toDateString();
  });

  return (
    <RetroScreen style={{ backgroundColor: bgColor }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>AGENDA</Text>
            <Text style={styles.brandSub}>calendario mensual</Text>
          </View>
          <TouchableOpacity onPress={() => setSelectedDate(new Date())} style={styles.todayBtn}>
            <Text style={styles.todayBtnText}>HOY</Text>
          </TouchableOpacity>
        </View>

        <Calendar
          markedDates={markedDates}
          onDayPress={handleDayPress}
          enableSwipeMonths={true}
          monthFormat={'MMMM yyyy'}
          hideArrows={false}
          hideExtraDays={false}
          renderArrow={(arrowDirection: string) => (
            <TouchableOpacity style={{ padding: 8, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 20, color: retroColors.text }}>{arrowDirection === 'left' ? '‹' : '›'}</Text>
            </TouchableOpacity>
          )}
          theme={{
            todayTextColor: retroColors.text,
            selectedDayBackgroundColor: retroColors.accent,
            selectedDayTextColor: retroColors.background,
          }}
        />

        {/* Task Modal */}
        <Modal visible={modalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingTask ? 'EDITAR TAREA' : `TAREAS DEL ${selectedDate.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
                </Text>
                <TouchableOpacity onPress={handleCancel} style={styles.modalClose}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              {editingTask ? (
                <View style={styles.modalBody}>
                  <Text style={styles.modalLabel}>Título</Text>
                  <RetroInputShell>
                    <TextInput
                      style={styles.input}
                      value={taskTitle}
                      onChangeText={setTaskTitle}
                      placeholder="Título de la tarea"
                    />
                  </RetroInputShell>
                  <Text style={styles.modalLabel}>Descripción</Text>
                  <RetroInputShell>
                    <TextInput
                      value={taskDescription}
                      onChangeText={setTaskDescription}
                      placeholder="Descripción (opcional)"
                      multiline
                      style={[styles.input, styles.inputMultiline]}
                    />
                  </RetroInputShell>
                  <View style={styles.modalActions}>
                    <PixelButton onPress={handleCancel} variant="ghost">CANCELAR</PixelButton>
                    <PixelButton onPress={handleSaveTask} disabled={loading}>GUARDAR</PixelButton>
                  </View>
                </View>
              ) : (
                <View style={styles.modalBody}>
                  {tasksForSelectedDate.length === 0 ? (
                    <Text style={styles.modalEmptyText}>No hay tareas para este día</Text>
                  ) : (
                    <FlatList
                      data={tasksForSelectedDate}
                      keyExtractor={item => item.id.toString()}
                      renderItem={({ item }) => (
                        <TouchableOpacity onPress={() => handleTaskPress(item)} style={styles.taskItem}>
                          <View style={styles.taskLeft}>
                            <View style={{ width: 4, backgroundColor: item.priority === 'high' ? retroColors.danger : item.priority === 'medium' ? '#f3b64d' : retroColors.success }} />
                            <Text style={styles.taskTitle}>{item.title}</Text>
                          </View>
                          <View style={styles.taskRight}>
                            <Text style={styles.taskTime}>{formatTimestampToTime(item.scheduledStart ?? 0)}</Text>
                            {item.whitelistedApps.length > 0 && (
                              <Text style={styles.taskApps}>{item.whitelistedApps.join(', ')}</Text>
                            )}
                          </View>
                        </TouchableOpacity>
                      )}
                    />
                  )}
                  <View style={styles.addTaskSection}>
                    <PixelButton onPress={() => {
                      const suggestion = getProactiveSuggestion(
                        mood,
                        todayTasks.filter(t => t.status === 'pending' || t.status === 'in_progress')
                      );
                      setEditingTask(null);
                      setTaskTitle(suggestion ?? '');
                      setTaskDescription('');
                    }} variant="ghost">
                      AÑADIR SUGERENCIA
                    </PixelButton>
                  </View>
                </View>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </RetroScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 0 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: retroColors.panel,
  },
  brand: { color: retroColors.text, fontSize: 18, fontFamily: monoFont, fontWeight: '800', letterSpacing: 2 },
  brandSub: { color: retroColors.muted, fontSize: 10, fontFamily: monoFont, letterSpacing: 1.2 },
  todayBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: retroColors.text, borderRadius: 4 },
  todayBtnText: { color: retroColors.background, fontWeight: '600', fontFamily: monoFont },

  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { width: '90%', maxWidth: 320, backgroundColor: retroColors.panel, borderRadius: 8, padding: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: retroColors.text, fontFamily: monoFont },
  modalClose: { padding: 4 },
  modalCloseText: { fontSize: 18, color: retroColors.text },
  modalBody: { gap: 12 },
  modalLabel: { fontSize: 12, fontWeight: '600', color: retroColors.text, fontFamily: monoFont },
  input: { color: retroColors.text, fontFamily: monoFont, padding: 8, backgroundColor: retroColors.background, borderWidth: 1, borderColor: retroColors.border, borderRadius: 4 },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  modalEmptyText: { textAlign: 'center', color: retroColors.muted, fontStyle: 'italic' },
  addTaskSection: { marginTop: 12 },
  taskItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: retroColors.borderSoft },
  taskLeft: { flexDirection: 'row', alignItems: 'center' },
  taskTitle: { flex: 1, fontSize: 14, color: retroColors.text, fontFamily: monoFont },
  taskRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  taskTime: { fontSize: 12, color: retroColors.muted, fontFamily: monoFont },
  taskApps: { fontSize: 10, color: retroColors.muted, fontFamily: monoFont },
  day: { marginVertical: 4, justifyContent: 'center' },
});