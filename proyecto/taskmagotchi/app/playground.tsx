import React, { useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Platform, TextInput
} from 'react-native'
import {
  RetroScreen, RetroPanel, RetroSectionTitle, RetroInputShell,
  PixelButton, SpeechBubble, PlaceholderSprite, retroColors, monoFont,
} from '../src/components/retroUi'
import MoodPopup from '../src/components/moodPopup'
import { useRouter } from 'expo-router'

type PetMood = 'happy' | 'normal' | 'sad' | 'angry'

const MOODS: PetMood[] = ['happy', 'normal', 'sad', 'angry']

export default function PlaygroundScreen() {
  const router = useRouter()
  const [selectedMood, setSelectedMood] = useState<PetMood>('normal')
  const [count, setCount] = useState(0)
  const [showMood, setShowMood] = useState(false)

  return (
    <RetroScreen>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🧪 PLAYGROUND</Text>
        <Text style={styles.sub}>catálogo de componentes</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ───────────────── Sprite ──────────────────────── */}
        <Section label="🖼️ Sprite de la mascota">
          <View style={styles.moodRow}>
            {MOODS.map(m => (
              <TouchableOpacity
                key={m}
                onPress={() => setSelectedMood(m)}
                style={[styles.moodChip, selectedMood === m && styles.moodChipActive]}
              >
                <Text style={[styles.moodChipText, selectedMood === m && styles.moodChipTextActive]}>
                  {m === 'happy' ? '😊' : m === 'normal' ? '😐' : m === 'sad' ? '😢' : '😠'} {m}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.spriteArea}>
            <PlaceholderSprite label="MASCOT" subtitle={`MODO: ${selectedMood.toUpperCase()}`} />
          </View>
        </Section>

        {/* ───────────────── Mood Popup ──────────────────────── */}
        <Section label="💬 Mood Popup">
          <PixelButton onPress={() => setShowMood(true)} variant="ghost">
            MOSTRAR POPUP ({selectedMood})
          </PixelButton>
          <MoodPopup visible={showMood} mood={selectedMood} onDismiss={() => setShowMood(false)} />
        </Section>

        {/* ───────────────── Botones ──────────────────────── */}
        <Section label="🔘 Botones">
          <View style={styles.btnRow}>
            <PixelButton onPress={() => setCount(c => c + 1)}>SOLID</PixelButton>
            <PixelButton variant="ghost">GHOST</PixelButton>
            <PixelButton variant="danger">PELIGRO</PixelButton>
            <PixelButton disabled>OFF</PixelButton>
          </View>
          <View style={styles.btnRow}>
            <PixelButton onPress={() => setCount(c => c + 1)}>CONTADOR: {count}</PixelButton>
          </View>
        </Section>

        {/* ───────────────── Inputs ──────────────────────── */}
        <Section label="⌨️ Inputs">
          <RetroInputShell>
            <TextInput
              placeholder="Texto de ejemplo..."
              placeholderTextColor={retroColors.muted}
              style={styles.input}
            />
          </RetroInputShell>
          <RetroInputShell>
            <TextInput
              placeholder="Área de texto..."
              placeholderTextColor={retroColors.muted}
              multiline
              style={[styles.input, styles.textarea]}
            />
          </RetroInputShell>
        </Section>

        {/* ───────────────── Speech Bubble ──────────────── */}
        <Section label="💭 Burbuja de diálogo">
          <SpeechBubble align="left">
            ¡Hola! Soy tu mascota. Puedo ayudarte con tus tareas.
          </SpeechBubble>
          <View style={{ height: 8 }} />
          <SpeechBubble align="right">
            ¡Buen trabajo! Sigue así.
          </SpeechBubble>
        </Section>

        {/* ───────────────── Paneles ────────────────────── */}
        <Section label="📦 Paneles">
          <RetroPanel>
            <RetroSectionTitle>📋 Panel default</RetroSectionTitle>
            <Text style={styles.panelText}>Este es un panel estándar con bordes y fondo oscuro.</Text>
          </RetroPanel>

          <RetroPanel style={{ borderColor: retroColors.success }}>
            <RetroSectionTitle>✅ Éxito</RetroSectionTitle>
            <Text style={styles.panelText}>Tarea completada con éxito.</Text>
          </RetroPanel>

          <RetroPanel style={{ borderColor: retroColors.danger }}>
            <RetroSectionTitle>⚠️ Peligro</RetroSectionTitle>
            <Text style={styles.panelText}>¡Tareas vencidas! Tomá acción.</Text>
          </RetroPanel>
        </Section>

        {/* ───────────────── Screen Preview ─────────────── */}
        <Section label="🖥️ Preview pantalla">
          <View style={styles.screenPreview}>
            <View style={styles.screenHeader}>
              <View>
                <Text style={styles.screenTitle}>TASK MAGOTCHI</Text>
                <Text style={styles.screenSub}>tus tareas de hoy</Text>
              </View>
              <PixelButton style={{ paddingHorizontal: 10, paddingVertical: 4 }} textStyle={{ fontSize: 10 }}>
                HOY
              </PixelButton>
            </View>

            <RetroPanel style={{ marginBottom: 8 }}>
              <View style={styles.taskItem}>
                <View style={styles.taskDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.taskTitle}>Diseñar landing page</Text>
                  <Text style={styles.taskTime}>⏰ 14:00</Text>
                </View>
                <Text style={styles.taskXp}>+25 XP</Text>
              </View>
            </RetroPanel>

            <RetroPanel style={{ marginBottom: 0 }}>
              <View style={styles.taskItem}>
                <View style={[styles.taskDot, { backgroundColor: retroColors.success }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.taskTitle, { opacity: 0.6, textDecorationLine: 'line-through' }]}>Revisar PR</Text>
                  <Text style={styles.taskTime}>✅ completada</Text>
                </View>
                <Text style={[styles.taskXp, { color: retroColors.success }]}>+50 XP</Text>
              </View>
            </RetroPanel>
          </View>
        </Section>

        {/* ───────────────── Colores ────────────────────── */}
        <Section label="🎨 Paleta de colores">
          <View style={styles.colorGrid}>
            {Object.entries(retroColors).map(([name, hex]) => (
              <View key={name} style={styles.colorItem}>
                <View style={[styles.colorSwatch, { backgroundColor: hex as string }]} />
                <Text style={styles.colorName}>{name}</Text>
                <Text style={styles.colorHex}>{hex as string}</Text>
              </View>
            ))}
          </View>
        </Section>

        <View style={{ height: 40 }} />
      </ScrollView>
    </RetroScreen>
  )
}

// ─── Section wrapper ────────────────────────────────────
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
    </View>
  )
}

// ─── Styles ─────────────────────────────────────────────
const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: retroColors.border,
    position: 'relative',
  },
  title: {
    fontFamily: monoFont,
    fontSize: 18,
    color: retroColors.text,
    fontWeight: '800',
    letterSpacing: 2,
  },
  sub: {
    fontFamily: monoFont,
    fontSize: 10,
    color: retroColors.muted,
    letterSpacing: 1.2,
    marginTop: 2,
  },
  closeBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 12,
    right: 16,
    padding: 8,
  },
  closeBtnText: { fontSize: 18, color: retroColors.text },
  scroll: { padding: 16, gap: 16 },
  section: { marginBottom: 8 },
  sectionLabel: {
    fontFamily: monoFont,
    fontSize: 10,
    color: retroColors.muted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
    opacity: 0.7,
  },
  moodRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  moodChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: retroColors.border,
    backgroundColor: retroColors.panel,
  },
  moodChipActive: {
    borderColor: retroColors.accent,
    backgroundColor: retroColors.panelSoft,
  },
  moodChipText: {
    fontFamily: monoFont,
    fontSize: 11,
    color: retroColors.muted,
  },
  moodChipTextActive: { color: retroColors.text },
  spriteArea: { alignItems: 'center', paddingVertical: 10 },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 6,
  },
  input: {
    color: retroColors.text,
    fontFamily: monoFont,
    fontSize: 13,
    padding: 8,
  },
  textarea: { minHeight: 60, textAlignVertical: 'top' },
  panelText: {
    fontFamily: monoFont,
    fontSize: 12,
    color: retroColors.muted,
    lineHeight: 18,
  },
  screenPreview: {
    backgroundColor: retroColors.panelMuted,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: retroColors.borderSoft,
  },
  screenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  screenTitle: {
    fontFamily: monoFont,
    fontSize: 14,
    color: retroColors.text,
    fontWeight: '800',
    letterSpacing: 2,
  },
  screenSub: {
    fontFamily: monoFont,
    fontSize: 9,
    color: retroColors.muted,
    letterSpacing: 1.2,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  taskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: retroColors.accent,
  },
  taskTitle: {
    fontFamily: monoFont,
    fontSize: 12,
    color: retroColors.text,
  },
  taskTime: {
    fontFamily: monoFont,
    fontSize: 10,
    color: retroColors.muted,
    marginTop: 2,
  },
  taskXp: {
    fontFamily: monoFont,
    fontSize: 10,
    color: retroColors.accent,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  colorItem: {
    width: 80,
    alignItems: 'center',
    gap: 2,
    padding: 6,
    backgroundColor: retroColors.panel,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: retroColors.borderSoft,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  colorName: {
    fontFamily: monoFont,
    fontSize: 8,
    color: retroColors.muted,
    textAlign: 'center',
  },
  colorHex: {
    fontFamily: monoFont,
    fontSize: 7,
    color: retroColors.muted,
    opacity: 0.6,
  },
})
