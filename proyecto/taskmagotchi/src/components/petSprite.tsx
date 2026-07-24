import { useState, useEffect, useRef } from 'react'
import { View, Image, Text, StyleSheet, Animated } from 'react-native'
import { retroColors } from './retroUi'
import type { PetMood } from '../types'

// ─── Skin asset registry ────────────────────────────────────────
// To add a new skin: create a folder assets/skins/<name>/, place
// the 4 mood PNGs, and add an entry here.
const SKIN_SPRITES: Record<string, Partial<Record<string, number>>> = {
  default: {
    normal: require('../../assets/skins/default/normal.png'),
    happy:  require('../../assets/skins/default/happy.png'),
    sad:    require('../../assets/skins/default/sad.png'),
    angry:  require('../../assets/skins/default/angry.png'),
  },
}

/** List installed skins */
export const AVAILABLE_SKINS = Object.keys(SKIN_SPRITES) as string[]

/** Check whether a skin name exists in the registry */
export function isSkinAvailable(name: string): boolean {
  return name in SKIN_SPRITES
}

// ─── Mood visual config (fallback placeholders) ─────────────────
interface MoodVisual { bg: string; accent: string; emoji: string }
const MOOD_VISUALS: Record<string, MoodVisual> = {
  normal: { bg: '#15101d', accent: retroColors.accent, emoji: '😐' },
  happy:  { bg: '#0d1f15', accent: '#88e38b',       emoji: '😊' },
  sad:    { bg: '#0d131f', accent: '#6f7cff',       emoji: '😢' },
  angry:  { bg: '#1f0d0d', accent: '#ff8a78',       emoji: '😠' },
}

// ─── Sprite config ──────────────────────────────────────────────
const SPRITE_SIZE = 32
const FADE_DURATION = 200

// ─── Props ──────────────────────────────────────────────────────
interface PetSpriteProps {
  mood?: PetMood
  /** Skin folder name under assets/skins/ */
  skin?: string
  /** Display size in px (square). Default 64 */
  size?: number
}

// ─── Component ──────────────────────────────────────────────────
export default function PetSprite({
  mood = 'normal',
  skin = 'default',
  size = 64,
}: PetSpriteProps) {
  const spriteSource = SKIN_SPRITES[skin]?.[mood]
  const fadeAnim = useRef(new Animated.Value(1)).current
  const prevMood = useRef(mood)
  const visual = MOOD_VISUALS[mood] ?? MOOD_VISUALS.normal

  // Fade transition when mood changes
  useEffect(() => {
    if (prevMood.current === mood) return
    prevMood.current = mood

    fadeAnim.setValue(0.3)
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: FADE_DURATION,
      useNativeDriver: true,
    }).start()
  }, [mood, fadeAnim])

  // ── Render ──
  const content = spriteSource ? (
    <Image
      source={spriteSource}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  ) : (
    <View style={[styles.placeholderBox, { backgroundColor: visual.bg, borderColor: visual.accent }]}>
      <Text style={[styles.emoji, { fontSize: size * 0.45 }]}>{visual.emoji}</Text>
    </View>
  )

  return (
    <View style={[styles.wrapper, { width: size, height: size, borderColor: visual.accent }]}>
      <Animated.View style={{ opacity: fadeAnim, width: size, height: size }}>
        {content}
      </Animated.View>
    </View>
  )
}

// ─── Generic animated spritesheet helper ─────────────────────────
interface AnimatedSpriteProps {
  source: number
  frameWidth?: number
  frameHeight?: number
  frameCount?: number
  frameMs?: number
  size?: number
}

export function AnimatedSprite({
  source,
  frameWidth = SPRITE_SIZE,
  frameHeight = SPRITE_SIZE,
  frameCount = 1,
  frameMs = 150,
  size = 64,
}: AnimatedSpriteProps) {
  const [frame, setFrame] = useState(0)
  const scale = size / frameHeight

  useEffect(() => {
    if (frameCount <= 1) return
    const id = setInterval(() => {
      setFrame(prev => (prev + 1) % frameCount)
    }, frameMs)
    return () => clearInterval(id)
  }, [frameCount, frameMs])

  if (frameCount <= 1) {
    return (
      <View style={[styles.wrapper, { width: size, height: size }]}>
        <Image source={source} style={{ width: size, height: size }} resizeMode="contain" />
      </View>
    )
  }

  return (
    <View style={[styles.wrapper, { width: size, height: size }]}>
      <View style={[styles.clip, { width: size, height: size }]}>
        <Image
          source={source}
          style={{
            width: frameWidth * frameCount * scale,
            height: size,
            transform: [{ translateX: -frame * frameWidth * scale }],
          }}
        />
      </View>
    </View>
  )
}

// ─── Vendor sprite ───────────────────────────────────────────────
export const VENDOR_SPRITE = require('../../assets/skins/default/vendedor.png')

const styles = StyleSheet.create({
  wrapper: {
    borderWidth: 2,
    borderColor: retroColors.border,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  clip: { overflow: 'hidden' },
  placeholderBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emoji: { textAlign: 'center' },
})
