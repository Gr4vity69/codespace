import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { initDatabase } from '../src/services/database'
import { usePetStore } from '../src/store/petStore'
import { useTaskStore } from '../src/store/taskStore'
import { View, ActivityIndicator } from 'react-native'
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
      </Stack>
    </>
  )
}
