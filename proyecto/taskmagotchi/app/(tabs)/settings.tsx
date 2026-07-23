import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, Modal, Platform,
} from 'react-native'
import { usePetStore } from '../../src/store/petStore'
import { generateMathChallenge, checkMathAnswer } from '../../src/utils/mathBlocker'
import { getApiKey, setApiKey } from '../../src/services/apiKeys'
import {
  getApps, upsertApp, deleteApp, toggleApp,
  getSchedules, updateSchedule, toggleSchedule, DAY_NAMES,
} from '../../src/services/settingsDb'
import PetSprite, { AVAILABLE_SKINS } from '../../src/components/petSprite'
import type { MathChallenge, BlockedApp, Schedule, PetMood } from '../../src/types'
import {
  PixelButton, RetroInputShell, RetroPanel, RetroScreen,
  RetroSectionTitle, retroColors,
} from '../../src/components/retroUi'

// ─── Day-of-week helper ─────────────────────────────────────────
function DayToggle({ day, active, onToggle }: {
  day: string
  active: boolean
  onToggle: () => void
}) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      style={[styles.dayToggle, active && styles.dayToggleActive]}
    >
      <Text style={[styles.dayToggleText, active && styles.dayToggleTextActive]}>
        {day}
      </Text>
    </TouchableOpacity>
  )
}

export default function SettingsScreen() {
  const { pet, updatePet } = usePetStore()

  // ── Existing state ──
  const [showBlocker, setShowBlocker] = useState(false)
  const [challenge, setChallenge] = useState<MathChallenge | null>(null)
  const [answer, setAnswer] = useState('')
  const [unlockedUntil, setUnlockedUntil] = useState<number | null>(null)
  const [renaming, setRenaming] = useState(false)
  const [newName, setNewName] = useState('')
  const [groqKey, setGroqKey] = useState('')
  const [geminiKey, setGeminiKey] = useState('')
  const [keysLoaded, setKeysLoaded] = useState(false)
  const [savingGroq, setSavingGroq] = useState(false)
  const [savingGemini, setSavingGemini] = useState(false)

  // ── Apps state ──
  const [apps, setApps] = useState<BlockedApp[]>([])
  const [showAppModal, setShowAppModal] = useState(false)
  const [newAppName, setNewAppName] = useState('')
  const [newAppPkg, setNewAppPkg] = useState('')
  const [newAppIsBlocked, setNewAppIsBlocked] = useState(true)

  // ── Schedules state ──
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')

  // ── Load data ──
  const loadApps = useCallback(async () => {
    try { setApps(await getApps()) } catch {}
  }, [])

  const loadSchedules = useCallback(async () => {
    try { setSchedules(await getSchedules()) } catch {}
  }, [])

  useEffect(() => {
    async function init() {
      const [gk, gemk] = await Promise.all([getApiKey('GROQ'), getApiKey('GEMINI')])
      if (gk) setGroqKey(gk)
      if (gemk) setGeminiKey(gemk)
      setKeysLoaded(true)
      await Promise.all([loadApps(), loadSchedules()])
    }
    init()
  }, [loadApps, loadSchedules])

  // ── API Key handlers ──
  async function handleSaveGroqKey() {
    setSavingGroq(true)
    await setApiKey('GROQ', groqKey)
    setSavingGroq(false)
    Alert.alert('✅ Guardada', 'API key de Groq actualizada')
  }

  async function handleSaveGeminiKey() {
    setSavingGemini(true)
    await setApiKey('GEMINI', geminiKey)
    setSavingGemini(false)
    Alert.alert('✅ Guardada', 'API key de Gemini actualizada')
  }

  // ── Blocker handlers ──
  function handleRequestUnlock() {
    if (unlockedUntil && Date.now() < unlockedUntil) {
      const remaining = Math.round((unlockedUntil - Date.now()) / 60000)
      Alert.alert('Ya está desbloqueado', `Por ${remaining} minutos más`)
      return
    }
    const c = generateMathChallenge('medium')
    setChallenge(c)
    setAnswer('')
    setShowBlocker(true)
  }

  function handleSubmitAnswer() {
    if (!challenge) return
    const numAnswer = parseInt(answer)
    if (checkMathAnswer(challenge, numAnswer)) {
      const until = Date.now() + 15 * 60 * 1000
      setUnlockedUntil(until)
      setShowBlocker(false)
      setChallenge(null)
      Alert.alert('✅ Desbloqueado', 'Tienes 15 minutos de acceso libre')
    } else {
      Alert.alert('❌ Incorrecto', 'Respuesta equivocada. Intenta de nuevo en un momento.')
      setAnswer('')
    }
  }

  // ── Pet handlers ──
  async function handleRename() {
    if (!newName.trim()) return
    await updatePet({ name: newName.trim() })
    setRenaming(false)
    setNewName('')
  }

  async function handleResetStreak() {
    await updatePet({ streak: 0, lastStreakDate: '' })
    Alert.alert('Racha reiniciada')
  }

  // ── App handlers ──
  async function handleAddApp() {
    if (!newAppName.trim() || !newAppPkg.trim()) return
    await upsertApp(newAppPkg.trim(), newAppName.trim(), newAppIsBlocked)
    setNewAppName('')
    setNewAppPkg('')
    setShowAppModal(false)
    await loadApps()
  }

  async function handleDeleteApp(id: number) {
    await deleteApp(id)
    await loadApps()
  }

  async function handleToggleApp(app: BlockedApp) {
    await toggleApp(app.id, app.isBlocked)
    await loadApps()
  }

  // ── Schedule handlers ──
  function openScheduleEditor(sched: Schedule) {
    setEditingSchedule(sched)
    setEditStart(sched.breakStart)
    setEditEnd(sched.breakEnd)
  }

  async function handleSaveSchedule() {
    if (!editingSchedule) return
    if (!/^\d{2}:\d{2}$/.test(editStart) || !/^\d{2}:\d{2}$/.test(editEnd)) {
      Alert.alert('Formato inválido', 'Usa HH:MM (ej. 14:30)')
      return
    }
    await updateSchedule(editingSchedule.id, editStart, editEnd)
    setEditingSchedule(null)
    await loadSchedules()
  }

  // ── Group schedules by day ──
  const scheduleByDay: Record<number, Schedule[]> = {}
  for (const s of schedules) {
    if (!scheduleByDay[s.dayOfWeek]) scheduleByDay[s.dayOfWeek] = []
    scheduleByDay[s.dayOfWeek].push(s)
  }

  return (
    <RetroScreen>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.brand}>SETTINGS</Text>
            <Text style={styles.brandSub}>system panel</Text>
          </View>
          <View style={styles.versionBadge}><Text style={styles.versionBadgeText}>v1.0.0</Text></View>
        </View>

        {/* ───────────── Mascota ───────────── */}
        <RetroSectionTitle>Mascota</RetroSectionTitle>
        <RetroPanel style={styles.card}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Nombre: {pet?.name}</Text>
            <TouchableOpacity onPress={() => setRenaming(!renaming)}>
              <Text style={styles.settingAction}>✎</Text>
            </TouchableOpacity>
          </View>
          {renaming && (
            <View style={styles.renameRow}>
              <RetroInputShell style={styles.renameInputShell}>
                <TextInput
                  style={styles.input}
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="Nuevo nombre"
                  placeholderTextColor={retroColors.muted}
                />
              </RetroInputShell>
              <PixelButton style={styles.saveBtn} onPress={handleRename}>GUARDAR</PixelButton>
            </View>
          )}
          <View style={styles.petStats}>
            <Text style={styles.statText}>Lv.{pet?.level} · 🪙 {pet?.coins} · 🔥 racha {pet?.streak}d</Text>
          </View>
        </RetroPanel>

        {/* ───────────── Bloqueo ───────────── */}
        <RetroSectionTitle>Bloqueo</RetroSectionTitle>
        <RetroPanel style={styles.card}>
          <PixelButton variant="danger" onPress={handleRequestUnlock}>DESBLOQUEAR TEMPORALMENTE</PixelButton>
          <Text style={styles.hint}>Resuelve un ejercicio matemático para desbloquear 15 min</Text>
        </RetroPanel>

        {/* ───────────── Apps ───────────── */}
        <RetroSectionTitle>Apps</RetroSectionTitle>
        <RetroPanel style={styles.card}>
          {apps.length === 0 ? (
            <Text style={styles.placeholder}>No hay apps configuradas</Text>
          ) : (
            apps.map(app => (
              <View key={app.id} style={styles.appRow}>
                <Text style={styles.appName}>{app.appName}</Text>
                <View style={styles.appActions}>
                  <TouchableOpacity
                    onPress={() => handleToggleApp(app)}
                    style={[
                      styles.appTypeBadge,
                      { backgroundColor: app.isBlocked ? retroColors.danger : retroColors.success },
                    ]}
                  >
                    <Text style={styles.appTypeText}>
                      {app.isBlocked ? 'BLOQ' : 'TRAB'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteApp(app.id)}>
                    <Text style={styles.appDelete}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
          <PixelButton variant="ghost" onPress={() => setShowAppModal(true)}>
            + AÑADIR APP
          </PixelButton>
          <Text style={styles.hint}>TRAB = app de trabajo (permitida), BLOQ = bloqueada durante tareas</Text>
        </RetroPanel>

        {/* ───────────── Horarios ───────────── */}
        <RetroSectionTitle>Horarios de descanso</RetroSectionTitle>
        {[0, 1, 2, 3, 4, 5, 6].map(day => {
          const daySchedules = scheduleByDay[day] || []
          return (
            <RetroPanel key={day} style={styles.schedDayCard}>
              <View style={styles.schedDayHeader}>
                <Text style={styles.schedDayName}>{DAY_NAMES[day]}</Text>
              </View>
              {daySchedules.length === 0 ? (
                <Text style={styles.schedEmpty}>Sin horarios</Text>
              ) : (
                daySchedules.map(sched => (
                  <View key={sched.id} style={styles.schedRow}>
                    <DayToggle
                      day={sched.isActive ? 'ON' : 'OFF'}
                      active={sched.isActive}
                      onToggle={() => toggleSchedule(sched.id, !sched.isActive)}
                    />
                    <TouchableOpacity
                      style={styles.schedTimeBtn}
                      onPress={() => openScheduleEditor(sched)}
                    >
                      <Text style={styles.schedTimeText}>
                        {sched.breakStart} — {sched.breakEnd}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </RetroPanel>
          )
        })}

        {/* ───────────── Skins ───────────── */}
        <RetroSectionTitle>Skin de mascota</RetroSectionTitle>
        <RetroPanel style={styles.card}>
          <View style={styles.skinPreview}>
            <PetSprite mood="normal" size={80} skin={pet?.species ?? 'default'} />
            <View style={{ flex: 1 }}>
              <Text style={styles.skinName}>{pet?.species ?? 'default'}</Text>
              <Text style={styles.skinHint}>Skin actual</Text>
            </View>
          </View>
          {AVAILABLE_SKINS.length > 1 ? (
            <View style={styles.skinList}>
              {AVAILABLE_SKINS.map(skin => (
                <TouchableOpacity
                  key={skin}
                  onPress={async () => {
                    await updatePet({ species: skin })
                    Alert.alert('✅ Skin cambiada', `Ahora usando: ${skin}`)
                  }}
                  style={[
                    styles.skinOption,
                    (pet?.species ?? 'default') === skin && styles.skinOptionActive,
                  ]}
                >
                  <PetSprite mood="normal" size={48} skin={skin} />
                  <Text style={styles.skinOptionName}>{skin}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.hint}>
              Próximamente: más skins disponibles para descargar
            </Text>
          )}
        </RetroPanel>

        {/* ───────────── API Keys ───────────── */}
        <RetroSectionTitle>API Keys</RetroSectionTitle>
        <RetroPanel style={styles.card}>
          <Text style={styles.settingLabel}>Groq API Key (chat con IA)</Text>
          <RetroInputShell style={styles.fieldSpacing}>
            <TextInput
              style={styles.input}
              value={groqKey}
              onChangeText={setGroqKey}
              placeholder={keysLoaded ? 'gsk_...' : 'Cargando...'}
              placeholderTextColor={retroColors.muted}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </RetroInputShell>
          <PixelButton onPress={handleSaveGroqKey} disabled={savingGroq || !groqKey.trim()}>
            {savingGroq ? 'GUARDANDO...' : 'GUARDAR GROQ'}
          </PixelButton>

          <View style={{ height: 12 }} />

          <Text style={styles.settingLabel}>Gemini API Key (verificación fotos)</Text>
          <RetroInputShell style={styles.fieldSpacing}>
            <TextInput
              style={styles.input}
              value={geminiKey}
              onChangeText={setGeminiKey}
              placeholder={keysLoaded ? 'AIza...' : 'Cargando...'}
              placeholderTextColor={retroColors.muted}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </RetroInputShell>
          <PixelButton onPress={handleSaveGeminiKey} disabled={savingGemini || !geminiKey.trim()}>
            {savingGemini ? 'GUARDANDO...' : 'GUARDAR GEMINI'}
          </PixelButton>
        </RetroPanel>

        {/* ───────────── Datos ───────────── */}
        <RetroSectionTitle>Datos</RetroSectionTitle>
        <RetroPanel style={styles.card}>
          <PixelButton variant="ghost" onPress={handleResetStreak}>REINICIAR RACHA</PixelButton>
        </RetroPanel>

        <Text style={styles.version}>TaskMagotchi v1.0.0</Text>
      </ScrollView>

      {/* ── Math blocker modal ── */}
      <Modal visible={showBlocker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>DESBLOQUEAR</Text>
            <Text style={styles.challengeText}>{challenge?.question}</Text>
            <RetroInputShell>
              <TextInput
                style={styles.input}
                placeholder="Tu respuesta"
                placeholderTextColor={retroColors.muted}
                value={answer}
                onChangeText={setAnswer}
                keyboardType="number-pad"
              />
            </RetroInputShell>
            <View style={styles.modalButtons}>
              <PixelButton style={styles.modalButton} variant="ghost" onPress={() => { setShowBlocker(false); setChallenge(null) }}>CANCELAR</PixelButton>
              <PixelButton style={styles.modalButton} onPress={handleSubmitAnswer}>VERIFICAR</PixelButton>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Add app modal ── */}
      <Modal visible={showAppModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>AÑADIR APP</Text>
            <Text style={styles.settingLabel}>Nombre</Text>
            <RetroInputShell>
              <TextInput
                style={styles.input}
                value={newAppName}
                onChangeText={setNewAppName}
                placeholder="Chrome"
                placeholderTextColor={retroColors.muted}
              />
            </RetroInputShell>
            <Text style={styles.settingLabel}>Package (ID único)</Text>
            <RetroInputShell>
              <TextInput
                style={styles.input}
                value={newAppPkg}
                onChangeText={setNewAppPkg}
                placeholder="com.android.chrome"
                placeholderTextColor={retroColors.muted}
                autoCapitalize="none"
              />
            </RetroInputShell>
            <View style={styles.typeRow}>
              <TouchableOpacity
                onPress={() => setNewAppIsBlocked(false)}
                style={[styles.typeOption, !newAppIsBlocked && styles.typeOptionActive]}
              >
                <Text style={[styles.typeOptionText, !newAppIsBlocked && styles.typeOptionTextActive]}>TRABAJO</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setNewAppIsBlocked(true)}
                style={[styles.typeOption, newAppIsBlocked && styles.typeOptionActive]}
              >
                <Text style={[styles.typeOptionText, newAppIsBlocked && styles.typeOptionTextActive]}>BLOQUEAR</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalButtons}>
              <PixelButton style={styles.modalButton} variant="ghost" onPress={() => setShowAppModal(false)}>CANCELAR</PixelButton>
              <PixelButton style={styles.modalButton} onPress={handleAddApp}>AÑADIR</PixelButton>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Edit schedule modal ── */}
      <Modal visible={!!editingSchedule} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>EDITAR HORARIO</Text>
            <Text style={styles.settingLabel}>Inicio (HH:MM)</Text>
            <RetroInputShell>
              <TextInput
                style={styles.input}
                value={editStart}
                onChangeText={setEditStart}
                placeholder="12:00"
                placeholderTextColor={retroColors.muted}
                autoCapitalize="none"
              />
            </RetroInputShell>
            <Text style={styles.settingLabel}>Fin (HH:MM)</Text>
            <RetroInputShell>
              <TextInput
                style={styles.input}
                value={editEnd}
                onChangeText={setEditEnd}
                placeholder="13:00"
                placeholderTextColor={retroColors.muted}
                autoCapitalize="none"
              />
            </RetroInputShell>
            <View style={styles.modalButtons}>
              <PixelButton style={styles.modalButton} variant="ghost" onPress={() => setEditingSchedule(null)}>CANCELAR</PixelButton>
              <PixelButton style={styles.modalButton} onPress={handleSaveSchedule}>GUARDAR</PixelButton>
            </View>
          </View>
        </View>
      </Modal>
    </RetroScreen>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 24, gap: 12 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  brand: { color: retroColors.text, fontSize: 18, fontFamily: 'monospace', fontWeight: '800', letterSpacing: 2 },
  brandSub: { color: retroColors.muted, fontSize: 10, fontFamily: 'monospace', letterSpacing: 1.2, marginTop: 2 },
  versionBadge: { borderWidth: 2, borderColor: retroColors.border, backgroundColor: retroColors.panel, paddingHorizontal: 8, paddingVertical: 4 },
  versionBadgeText: { color: retroColors.text, fontSize: 10, fontFamily: 'monospace', letterSpacing: 1.2 },
  card: { gap: 8 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settingLabel: { fontSize: 12, color: retroColors.text, fontWeight: '700', marginBottom: 4, fontFamily: 'monospace' },
  settingAction: { fontSize: 18, color: retroColors.text },
  renameRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  renameInputShell: { flex: 1 },
  fieldSpacing: { marginBottom: 8 },
  input: { flex: 1, color: retroColors.text, fontFamily: 'monospace', fontSize: 13, padding: 0 },
  saveBtn: { width: 104, minHeight: 42 },
  hint: { fontSize: 11, color: retroColors.muted, marginTop: 6, textAlign: 'center', fontFamily: 'monospace' },
  placeholder: { fontSize: 12, color: retroColors.text, textAlign: 'center', fontFamily: 'monospace' },
  version: { textAlign: 'center', fontSize: 11, color: retroColors.muted, marginVertical: 18, fontFamily: 'monospace', letterSpacing: 1.2 },

  // Pet stats
  petStats: { borderTopWidth: 1, borderTopColor: retroColors.borderSoft, paddingTop: 6 },
  statText: { fontSize: 11, color: retroColors.muted, fontFamily: 'monospace', textAlign: 'center' },

  // Apps
  appRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(247,240,219,0.08)',
  },
  appName: { color: retroColors.text, fontSize: 13, fontFamily: 'monospace', flex: 1 },
  appActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  appTypeBadge: { paddingHorizontal: 6, paddingVertical: 2 },
  appTypeText: { color: '#000', fontSize: 9, fontWeight: '700', fontFamily: 'monospace' },
  appDelete: { color: retroColors.danger, fontSize: 14, fontWeight: '700', paddingHorizontal: 4 },

  // Schedules
  schedDayCard: { gap: 6, paddingVertical: 10 },
  schedDayHeader: {},
  schedDayName: { color: retroColors.text, fontSize: 13, fontWeight: '700', fontFamily: 'monospace', letterSpacing: 1 },
  schedEmpty: { color: retroColors.muted, fontSize: 11, fontFamily: 'monospace', textAlign: 'center' },
  schedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  schedTimeBtn: { borderWidth: 1, borderColor: retroColors.borderSoft, paddingHorizontal: 10, paddingVertical: 4, flex: 1 },
  schedTimeText: { color: retroColors.text, fontSize: 12, fontFamily: 'monospace' },

  // Day toggle
  dayToggle: { borderWidth: 2, borderColor: retroColors.borderSoft, paddingHorizontal: 8, paddingVertical: 4 },
  dayToggleActive: { borderColor: retroColors.success, backgroundColor: 'rgba(136, 227, 139, 0.15)' },
  dayToggleText: { color: retroColors.muted, fontSize: 10, fontWeight: '700', fontFamily: 'monospace' },
  dayToggleTextActive: { color: retroColors.success },

  // Skins
  skinPreview: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  skinName: { color: retroColors.text, fontSize: 14, fontWeight: '700', fontFamily: 'monospace' },
  skinHint: { color: retroColors.muted, fontSize: 11, fontFamily: 'monospace', marginTop: 2 },
  skinList: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  skinOption: { alignItems: 'center', gap: 4, borderWidth: 2, borderColor: retroColors.borderSoft, padding: 8 },
  skinOptionActive: { borderColor: retroColors.text, backgroundColor: retroColors.panelSoft },
  skinOptionName: { color: retroColors.text, fontSize: 10, fontFamily: 'monospace' },

  // Type row
  typeRow: { flexDirection: 'row', gap: 8 },
  typeOption: { flex: 1, paddingVertical: 10, borderWidth: 2, borderColor: retroColors.border, backgroundColor: retroColors.panel, alignItems: 'center' },
  typeOptionActive: { backgroundColor: retroColors.text },
  typeOptionText: { fontSize: 11, fontWeight: '700', color: retroColors.text, fontFamily: 'monospace' },
  typeOptionTextActive: { color: retroColors.background },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: retroColors.background, borderWidth: 2, borderColor: retroColors.border, padding: 16, gap: 10 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: retroColors.text, textAlign: 'center', marginBottom: 4, fontFamily: 'monospace', letterSpacing: 1.4 },
  challengeText: { fontSize: 24, fontWeight: '800', color: retroColors.text, textAlign: 'center', marginVertical: 10, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  modalButtons: { flexDirection: 'row', gap: 8, marginTop: 6 },
  modalButton: { flex: 1 },
})
