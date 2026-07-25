import { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated, Modal } from 'react-native'
import PetSprite from './petSprite'
import { retroColors, monoFont } from './retroUi'
import type { PetMood } from '../types'

// ─── Mood messages ────────────────────────────────────────────────
const MOOD_MESSAGES: Record<PetMood, { title: string; body: string }> = {
  happy: { title: '🎉 ¡Bien hecho!', body: 'Tu mascota está feliz' },
  normal: { title: '😐 Buen trabajo', body: 'Sigue así' },
  sad: { title: '😢 Mascota triste', body: 'Completa tus tareas para animarla' },
  angry: { title: '😠 Mascota enojada', body: 'Tienes tareas vencidas' },
}

interface MoodPopupProps {
  visible: boolean
  mood: PetMood
  petName?: string
  species?: string
  onDismiss: () => void
  autoHideMs?: number
}

export default function MoodPopup({
  visible,
  mood,
  petName = 'Mascota',
  species = 'default',
  onDismiss,
  autoHideMs = 2500,
}: MoodPopupProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current
  const fadeAnim = useRef(new Animated.Value(0)).current
  const msg = MOOD_MESSAGES[mood]

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.3)
      fadeAnim.setValue(0)
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start()

      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => onDismiss())
      }, autoHideMs)

      return () => clearTimeout(timer)
    }
  }, [visible])

  if (!visible) return null

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.card,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
              borderColor: mood === 'happy' ? '#88e38b' : mood === 'angry' ? '#ff8a78' : mood === 'sad' ? '#6f7cff' : retroColors.border,
            },
          ]}
        >
          <PetSprite mood={mood} skin={species} size={80} />
          <Text style={styles.title}>{msg.title}</Text>
          <Text style={styles.body}>{msg.body}</Text>
          {petName && <Text style={styles.petName}>— {petName} —</Text>}
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  card: {
    backgroundColor: retroColors.panel,
    borderWidth: 2,
    borderRadius: 4,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    minWidth: 220,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: retroColors.text,
    fontFamily: monoFont,
    textAlign: 'center',
    letterSpacing: 1,
  },
  body: {
    fontSize: 12,
    color: retroColors.muted,
    fontFamily: monoFont,
    textAlign: 'center',
  },
  petName: {
    fontSize: 10,
    color: retroColors.text,
    fontFamily: monoFont,
    letterSpacing: 1.2,
    marginTop: 4,
  },
})
