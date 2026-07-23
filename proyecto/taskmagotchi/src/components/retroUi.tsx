import { ReactNode } from 'react'
import { Platform, StyleSheet, Text, TouchableOpacity, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'

export const retroColors = {
  background: '#050507',
  panel: '#17131f',
  panelSoft: '#221b2e',
  panelMuted: '#120f18',
  border: '#f7f0db',
  borderSoft: '#8f8571',
  text: '#fff7e8',
  muted: '#c6bca7',
  accent: '#d86b57',
  accentSoft: '#6f7cff',
  success: '#88e38b',
  danger: '#ff8a78',
}

const monoFont = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' })

type ContainerProps = {
  children: ReactNode
  style?: StyleProp<ViewStyle>
}

export function RetroScreen({ children, style }: ContainerProps) {
  return (
    <View style={[styles.screen, style]}>
      <View style={styles.orbTopLeft} />
      <View style={styles.orbTopRight} />
      <View style={styles.orbBottomLeft} />
      <View style={styles.orbBottomRight} />
      <View style={styles.content}>{children}</View>
    </View>
  )
}

export function RetroPanel({ children, style }: ContainerProps) {
  return <View style={[styles.panel, style]}>{children}</View>
}

export function RetroSectionTitle({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.sectionTitle, style]}>{children}</Text>
}

type PixelButtonProps = ContainerProps & {
  onPress?: () => void
  variant?: 'solid' | 'ghost' | 'danger'
  disabled?: boolean
  textStyle?: StyleProp<TextStyle>
}

export function PixelButton({ children, onPress, variant = 'solid', disabled, style, textStyle }: PixelButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        variant === 'ghost' && styles.buttonGhost,
        variant === 'danger' && styles.buttonDanger,
        disabled && styles.buttonDisabled,
        style,
      ]}
    >
      <Text style={[styles.buttonText, variant === 'ghost' && styles.buttonTextGhost, variant === 'danger' && styles.buttonTextDanger, textStyle]}>{children}</Text>
    </TouchableOpacity>
  )
}

export function PixelField({ children, style }: ContainerProps) {
  return <View style={[styles.field, style]}>{children}</View>
}

export function SpeechBubble({ children, align = 'left', style }: ContainerProps & { align?: 'left' | 'right' }) {
  return (
    <View style={[styles.bubble, align === 'right' && styles.bubbleRight, style]}>
      <View style={[styles.tail, align === 'right' ? styles.tailRight : styles.tailLeft]} />
      <Text style={[styles.bubbleText, align === 'right' && styles.bubbleTextRight]}>{children}</Text>
    </View>
  )
}

type SpriteProps = {
  label?: string
  subtitle?: string
}

export function PlaceholderSprite({ label = 'MASCOT', subtitle = 'SPRITE PLACEHOLDER' }: SpriteProps) {
  return (
    <View style={styles.spriteStage}>
      <View style={styles.spriteGlow} />
      <View style={styles.spriteShadow} />
      <View style={styles.spriteBody}>
        <View style={styles.spriteEarLeft} />
        <View style={styles.spriteEarRight} />
        <View style={styles.spriteHead}>
          <View style={styles.spriteEyeLeft} />
          <View style={styles.spriteEyeRight} />
          <View style={styles.spriteSnout} />
        </View>
        <View style={styles.spriteTorso} />
        <View style={styles.spriteFootLeft} />
        <View style={styles.spriteFootRight} />
      </View>
      <View style={styles.spriteLabel}>
        <Text style={styles.spriteLabelText}>{label}</Text>
        <Text style={styles.spriteSubtitleText}>{subtitle}</Text>
      </View>
    </View>
  )
}

export function RetroInputShell({ children, style }: ContainerProps) {
  return <View style={[styles.inputShell, style]}>{children}</View>
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: retroColors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 12,
  },
  orbTopLeft: {
    position: 'absolute',
    top: 28,
    left: 14,
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255, 247, 232, 0.05)',
  },
  orbTopRight: {
    position: 'absolute',
    top: 110,
    right: -24,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(216, 107, 87, 0.08)',
  },
  orbBottomLeft: {
    position: 'absolute',
    bottom: 132,
    left: -34,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(111, 124, 255, 0.08)',
  },
  orbBottomRight: {
    position: 'absolute',
    bottom: 36,
    right: -18,
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: 'rgba(255, 247, 232, 0.04)',
  },
  panel: {
    borderWidth: 2,
    borderColor: retroColors.border,
    backgroundColor: retroColors.panel,
    padding: 12,
  },
  sectionTitle: {
    color: retroColors.text,
    fontFamily: monoFont,
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  button: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderWidth: 2,
    borderColor: retroColors.border,
    backgroundColor: retroColors.text,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonGhost: {
    backgroundColor: retroColors.panel,
  },
  buttonDanger: {
    backgroundColor: retroColors.danger,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonText: {
    color: retroColors.background,
    fontFamily: monoFont,
    fontSize: 12,
    letterSpacing: 1.3,
  },
  buttonTextGhost: {
    color: retroColors.text,
  },
  buttonTextDanger: {
    color: retroColors.background,
  },
  field: {
    borderWidth: 2,
    borderColor: retroColors.border,
    backgroundColor: retroColors.panelMuted,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  bubble: {
    position: 'relative',
    borderWidth: 2,
    borderColor: retroColors.border,
    backgroundColor: retroColors.panel,
    paddingHorizontal: 12,
    paddingVertical: 10,
    maxWidth: '100%',
  },
  bubbleRight: {
    backgroundColor: retroColors.panelSoft,
  },
  tail: {
    position: 'absolute',
    bottom: -7,
    width: 12,
    height: 12,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: retroColors.border,
    backgroundColor: retroColors.panel,
  },
  tailLeft: {
    left: 18,
    transform: [{ rotate: '-45deg' }],
  },
  tailRight: {
    right: 18,
    transform: [{ rotate: '135deg' }],
    backgroundColor: retroColors.panelSoft,
  },
  bubbleText: {
    color: retroColors.text,
    fontFamily: monoFont,
    fontSize: 13,
    lineHeight: 19,
  },
  bubbleTextRight: {
    color: retroColors.text,
  },
  spriteStage: {
    width: '100%',
    aspectRatio: 1,
    borderWidth: 2,
    borderColor: retroColors.border,
    backgroundColor: '#15101d',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spriteGlow: {
    position: 'absolute',
    width: '90%',
    height: '90%',
    borderRadius: 999,
    backgroundColor: 'rgba(216, 107, 87, 0.08)',
  },
  spriteShadow: {
    position: 'absolute',
    bottom: 16,
    width: 104,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
  },
  spriteBody: {
    width: 132,
    height: 132,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spriteEarLeft: {
    position: 'absolute',
    top: 2,
    left: 28,
    width: 20,
    height: 28,
    borderWidth: 2,
    borderColor: retroColors.border,
    backgroundColor: retroColors.accent,
    transform: [{ rotate: '-16deg' }],
  },
  spriteEarRight: {
    position: 'absolute',
    top: 2,
    right: 28,
    width: 20,
    height: 28,
    borderWidth: 2,
    borderColor: retroColors.border,
    backgroundColor: retroColors.accent,
    transform: [{ rotate: '16deg' }],
  },
  spriteHead: {
    position: 'absolute',
    top: 12,
    width: 72,
    height: 60,
    borderWidth: 2,
    borderColor: retroColors.border,
    backgroundColor: retroColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spriteEyeLeft: {
    position: 'absolute',
    top: 22,
    left: 16,
    width: 6,
    height: 6,
    backgroundColor: retroColors.border,
  },
  spriteEyeRight: {
    position: 'absolute',
    top: 22,
    right: 16,
    width: 6,
    height: 6,
    backgroundColor: retroColors.border,
  },
  spriteSnout: {
    position: 'absolute',
    bottom: 10,
    width: 28,
    height: 18,
    borderWidth: 2,
    borderColor: retroColors.border,
    backgroundColor: '#fff7eb',
  },
  spriteTorso: {
    position: 'absolute',
    bottom: 18,
    width: 76,
    height: 84,
    borderWidth: 2,
    borderColor: retroColors.border,
    backgroundColor: '#7c2f3f',
  },
  spriteFootLeft: {
    position: 'absolute',
    bottom: 0,
    left: 32,
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: retroColors.border,
    backgroundColor: '#6d2a3a',
  },
  spriteFootRight: {
    position: 'absolute',
    bottom: 0,
    right: 32,
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: retroColors.border,
    backgroundColor: '#6d2a3a',
  },
  spriteLabel: {
    position: 'absolute',
    top: 12,
    right: 12,
    alignItems: 'flex-end',
    borderWidth: 2,
    borderColor: retroColors.border,
    backgroundColor: retroColors.panel,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  spriteLabelText: {
    color: retroColors.text,
    fontFamily: monoFont,
    fontSize: 12,
  },
  spriteSubtitleText: {
    color: retroColors.muted,
    fontFamily: monoFont,
    fontSize: 9,
    letterSpacing: 1,
  },
  inputShell: {
    borderWidth: 2,
    borderColor: retroColors.border,
    backgroundColor: retroColors.panelMuted,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
})