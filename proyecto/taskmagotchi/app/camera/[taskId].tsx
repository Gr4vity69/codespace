import { useState, useRef } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, Image, Alert,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as FileSystem from 'expo-file-system'
import { useTaskStore } from '../../src/store/taskStore'
import { usePetStore } from '../../src/store/petStore'
import { verifyTaskCompletion } from '../../src/services/ai'
import { addXp, addCoins, calculateTaskReward } from '../../src/utils/petEngine'
import { PixelButton, RetroPanel, RetroScreen, retroColors } from '../../src/components/retroUi'

export default function CameraScreen() {
  const { taskId } = useLocalSearchParams<{ taskId: string }>()
  const router = useRouter()
  const cameraRef = useRef<CameraView>(null)
  const [permission, requestPermission] = useCameraPermissions()
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [photoBase64, setPhotoBase64] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState<boolean | null>(null)
  const [reason, setReason] = useState('')

  const tasks = useTaskStore(s => s.tasks)
  const updateTask = useTaskStore(s => s.updateTask)
  const loadTasks = useTaskStore(s => s.loadTasks)
  const { pet, updatePet } = usePetStore()

  const task = tasks.find(t => t.id === parseInt(taskId))

  if (!permission) return <View style={styles.container} />
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.permissionText}>Necesito acceso a la cámara para verificar tus tareas</Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
            <Text style={styles.permissionBtnText}>Conceder permiso</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  async function handleTakePhoto() {
    if (!cameraRef.current) return
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 })
      if (photo?.uri) {
        setPhotoUri(photo.uri)
        if (photo.base64) setPhotoBase64(photo.base64)
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo tomar la foto')
    }
  }

  async function handleVerify() {
    if (!photoUri || !task) return
    setVerifying(true)

    try {
      // Usar base64 de la captura, o leer el archivo como fallback
      let b64 = photoBase64
      if (!b64) {
        b64 = await FileSystem.readAsStringAsync(photoUri, {
          encoding: FileSystem.EncodingType.Base64,
        })
      }

      const result = await verifyTaskCompletion(b64, task.title, task.description)
      setVerified(result.verified)
      setReason(result.reason)

      // 1) Primero actualizar la tarea en DB (fuente de verdad)
      await updateTask(task.id, {
        status: result.verified ? 'verified' : 'in_progress',
        photoUri,
        aiVerified: result.verified,
        completedAt: result.verified ? Date.now() : null,
      })

      // 2) SOLO si la tarea se actualizó bien, dar recompensa a la mascota
      if (result.verified && pet) {
        const hasStreak = (pet.streak ?? 0) > 0
        const reward = calculateTaskReward(task, true, hasStreak)
        const updatedPet = addCoins(addXp(pet, reward.xp), reward.coins)
        await updatePet(updatedPet)
      }

      await loadTasks()
    } catch (error) {
      Alert.alert('Error', 'No se pudo verificar la tarea')
    } finally {
      setVerifying(false)
    }
  }

  async function handleSkipAI() {
    if (!task || !pet) return

    // 1) Primero actualizar la tarea
    await updateTask(task.id, {
      status: 'verified',
      photoUri: photoUri || undefined,
      aiVerified: false,
      completedAt: Date.now(),
    })

    // 2) Luego dar recompensa
    const hasStreak = (pet.streak ?? 0) > 0
    const reward = calculateTaskReward(task, false, hasStreak)
    const updatedPet = addCoins(addXp(pet, reward.xp), reward.coins)
    await updatePet(updatedPet)

    await loadTasks()
    Alert.alert('✅ Tarea completada', `+${reward.xp} XP, +${reward.coins} 🪙`)
    router.back()
  }

  function handleRetry() {
    setPhotoUri(null)
    setPhotoBase64(null)
    setVerified(null)
    setReason('')
  }

  return (
    <RetroScreen>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Text style={styles.backBtn}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {task ? `VERIFICAR: ${task.title}` : 'CÁMARA'}
          </Text>
          <View style={{ width: 42 }} />
        </View>

        {!photoUri ? (
          <View style={styles.cameraContainer}>
            <View style={styles.cameraFrame}>
              <CameraView ref={cameraRef} style={styles.camera} facing="back" />
            </View>
            <TouchableOpacity style={styles.captureBtn} onPress={handleTakePhoto}>
              <View style={styles.captureInner} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.previewContainer}>
            <RetroPanel style={styles.previewPanel}>
              <Image source={{ uri: photoUri }} style={styles.preview} />
            </RetroPanel>

            {verified === null ? (
              <View style={styles.actionRow}>
                <PixelButton style={styles.actionBtn} variant="ghost" onPress={handleRetry}>REPETIR</PixelButton>
                <PixelButton style={styles.actionBtn} onPress={handleVerify} disabled={verifying}>
                  {verifying ? 'VERIFICANDO...' : 'VERIFICAR'}
                </PixelButton>
              </View>
            ) : (
              <RetroPanel style={styles.resultContainer}>
                <Text style={styles.resultIcon}>{verified ? '✅' : '❌'}</Text>
                <Text style={[styles.resultText, { color: verified ? '#88e38b' : '#ff8a78' }]}>
                  {verified ? '¡Tarea verificada!' : 'No se pudo verificar'}
                </Text>
                <Text style={styles.reasonText}>{reason}</Text>

                {!verified && (
                  <PixelButton style={styles.retryVerifyBtn} variant="ghost" onPress={handleRetry}>INTENTAR DE NUEVO</PixelButton>
                )}

                <PixelButton style={styles.doneBtn} onPress={() => router.back()}>
                  VOLVER
                </PixelButton>
              </RetroPanel>
            )}

            <TouchableOpacity style={styles.skipBtn} onPress={handleSkipAI}>
              <Text style={styles.skipBtnText}>Saltar verificación IA y marcar como hecha</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </RetroScreen>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingBottom: 12,
  },
  closeButton: { width: 42, height: 42, borderWidth: 2, borderColor: retroColors.border, backgroundColor: retroColors.panel, alignItems: 'center', justifyContent: 'center' },
  backBtn: { fontSize: 18, color: retroColors.text, fontFamily: 'monospace', fontWeight: '800' },
  headerTitle: { fontSize: 14, fontWeight: '800', color: retroColors.text, flex: 1, textAlign: 'center', fontFamily: 'monospace', letterSpacing: 1.2 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  permissionText: { color: retroColors.text, fontSize: 16, textAlign: 'center', marginBottom: 20, fontFamily: 'monospace' },
  permissionBtn: { backgroundColor: retroColors.text, paddingHorizontal: 24, paddingVertical: 14, borderWidth: 2, borderColor: retroColors.border },
  permissionBtnText: { color: retroColors.background, fontWeight: '700', fontSize: 15, fontFamily: 'monospace' },
  cameraContainer: { flex: 1, gap: 16 },
  cameraFrame: { flex: 1, borderWidth: 2, borderColor: retroColors.border, backgroundColor: retroColors.panelMuted, overflow: 'hidden' },
  camera: { flex: 1 },
  captureBtn: { position: 'absolute', bottom: 56, alignSelf: 'center', width: 76, height: 76, borderWidth: 2, borderColor: retroColors.border, backgroundColor: retroColors.panel, justifyContent: 'center', alignItems: 'center' },
  captureInner: { width: 52, height: 52, borderWidth: 2, borderColor: retroColors.border, backgroundColor: retroColors.text },
  previewContainer: { flex: 1, paddingBottom: 8 },
  previewPanel: { padding: 8, flex: 1 },
  preview: { flex: 1, minHeight: 320 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 4 },
  actionBtn: { flex: 1 },
  retakeBtn: { flex: 1 },
  verifyBtn: { flex: 1 },
  resultContainer: { alignItems: 'center', gap: 10, marginTop: 12, padding: 16 },
  resultIcon: { fontSize: 48 },
  resultText: { fontSize: 18, fontWeight: 'bold', marginBottom: 0, fontFamily: 'monospace' },
  reasonText: { fontSize: 12, color: retroColors.muted, textAlign: 'center', fontFamily: 'monospace' },
  retryVerifyBtn: { width: '100%' },
  retryVerifyText: { color: retroColors.text, fontWeight: '600' },
  doneBtn: { width: '100%' },
  doneBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
  skipBtn: { marginTop: 16, alignSelf: 'center', paddingVertical: 10 },
  skipBtnText: { color: retroColors.muted, fontSize: 12, textDecorationLine: 'underline', fontFamily: 'monospace' },
})
