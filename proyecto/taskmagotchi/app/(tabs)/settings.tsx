import { useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, Modal, Platform,
} from 'react-native'
import { usePetStore } from '../../src/store/petStore'
import { generateMathChallenge, checkMathAnswer } from '../../src/utils/mathBlocker'
import type { MathChallenge } from '../../src/types'
import { getDb } from '../../src/services/database'
import { PixelButton, RetroInputShell, RetroPanel, RetroScreen, RetroSectionTitle, retroColors } from '../../src/components/retroUi'

export default function SettingsScreen() {
  const { pet, updatePet } = usePetStore()
  const [showBlocker, setShowBlocker] = useState(false)
  const [challenge, setChallenge] = useState<MathChallenge | null>(null)
  const [answer, setAnswer] = useState('')
  const [unlockedUntil, setUnlockedUntil] = useState<number | null>(null)
  const [renaming, setRenaming] = useState(false)
  const [newName, setNewName] = useState('')

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

  const db = getDb()

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
        </RetroPanel>

        <RetroSectionTitle>Bloqueo</RetroSectionTitle>
        <RetroPanel style={styles.card}>
          <PixelButton variant="danger" onPress={handleRequestUnlock}>DESBLOQUEAR TEMPORALMENTE</PixelButton>
          <Text style={styles.hint}>Resuelve un ejercicio matemático para desbloquear 15 min</Text>
        </RetroPanel>

        <RetroSectionTitle>Apps bloqueadas</RetroSectionTitle>
        <RetroPanel style={styles.card}>
          <Text style={styles.placeholder}>Selecciona las apps a bloquear</Text>
          <Text style={styles.hint}>Configuración de lista de apps disponible próximamente</Text>
        </RetroPanel>

        <RetroSectionTitle>Horarios de descanso</RetroSectionTitle>
        <RetroPanel style={styles.card}>
          <Text style={styles.placeholder}>Configura rangos horarios fijos de descanso</Text>
          <Text style={styles.hint}>Próximamente: selector de horarios por día</Text>
        </RetroPanel>

        <RetroSectionTitle>API Keys</RetroSectionTitle>
        <RetroPanel style={styles.card}>
          <Text style={styles.settingLabel}>Groq API Key</Text>
          <RetroInputShell style={styles.fieldSpacing}><TextInput style={styles.input} placeholder="gsk_..." placeholderTextColor={retroColors.muted} secureTextEntry /></RetroInputShell>
          <Text style={styles.settingLabel}>Gemini API Key</Text>
          <RetroInputShell><TextInput style={styles.input} placeholder="AIza..." placeholderTextColor={retroColors.muted} secureTextEntry /></RetroInputShell>
        </RetroPanel>

        <RetroSectionTitle>Datos</RetroSectionTitle>
        <RetroPanel style={styles.card}>
          <PixelButton variant="ghost" onPress={handleResetStreak}>REINICIAR RACHA</PixelButton>
        </RetroPanel>

        <Text style={styles.version}>TaskMagotchi v1.0.0</Text>
      </ScrollView>

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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: retroColors.background, borderWidth: 2, borderColor: retroColors.border, padding: 16, gap: 10 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: retroColors.text, textAlign: 'center', marginBottom: 4, fontFamily: 'monospace', letterSpacing: 1.4 },
  challengeText: { fontSize: 24, fontWeight: '800', color: retroColors.text, textAlign: 'center', marginVertical: 10, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  modalButtons: { flexDirection: 'row', gap: 8, marginTop: 6 },
  modalButton: { flex: 1 },
})
