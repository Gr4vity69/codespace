import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Platform, View, ActivityIndicator } from 'react-native'
import { initDatabase } from '../src/services/database'
import { usePetStore } from '../src/store/petStore'
import { useTaskStore } from '../src/store/taskStore'
import { applyTimeDecay, computeMood } from '../src/utils/petGameLoop'
import { checkAutoBlockingByMood } from '../src/index'
import { retroColors } from '../src/components/retroUi'

export default function RootLayout() {
  const loadPet = usePetStore(s => s.loadPet)
  const loadTasks = useTaskStore(s => s.loadTasks)
  const petLoading = usePetStore(s => s.loading)
  const tasksLoading = useTaskStore(s => s.loading)
  useEffect(() => {
    async function init() {
      await initDatabase()
      await Promise.all([loadPet(), loadTasks()])

      // 🐾 Aplicar decaimiento natural según tiempo transcurrido
      //    (happiness baja, hunger sube, energy se recupera lentamente)
      const p = usePetStore.getState().pet
      if (p) {
        const hoursElapsed = (Date.now() - p.lastPlayed) / 3600000
        if (hoursElapsed >= 1) {
          const decay = applyTimeDecay(p, hoursElapsed)
          await usePetStore.getState().updatePet({ ...decay, lastPlayed: Date.now() })
        }
      }

      // 🐾 Verificar mood y activar auto-bloqueo si es necesario
      try {
        const { shouldBlock, mood, reason } = await checkAutoBlockingByMood()
        if (shouldBlock) {
          console.log(`🚨 Auto-block activated: ${reason}`)
        }
        
        // Actualizar el overlay con el mood actual
        const { syncPetMoodToNative } = await import('../src/services/blocking')
        await syncPetMoodToNative(mood as string)
      } catch (error) {
        console.error('Error during mood/blocking check:', error)
        // Fallback to original mood sync
        try {
          const { syncPetMoodToNative } = await import('../src/services/blocking')
          const pet = usePetStore.getState().pet
          const tasks = useTaskStore.getState().todayTasks
          if (pet) {
            const mood = computeMood(pet, tasks)
            await syncPetMoodToNative(mood)
          }
        } catch {}
      }

      // Auto-start blocking service if there are blocked apps configured
      if (Platform.OS === 'android') {
        try {
          const { getBlockedApps, syncBlockedAppsToNative, startBlockingService } = await import('../src/services/blocking')
          const blocked = await getBlockedApps()
          if (blocked.length > 0) {
            await syncBlockedAppsToNative()
            await startBlockingService()
          }
        } catch {}
      }
    }
    init()
  }, [])

  if (petLoading || tasksLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: retroColors.background }}>
        <ActivityIndicator size="large" color={retroColors.text} />
      </View>
    )
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="camera/[taskId]" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="playground" options={{ presentation: 'modal', headerShown: false }} />
      </Stack>
    </>
  )
}
