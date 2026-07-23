import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { usePetStore } from '../../src/store/petStore'
import { getPetMood, feedPet, playWithPet, restPet } from '../../src/utils/petEngine'
import { PixelButton, PlaceholderSprite, RetroPanel, RetroScreen, RetroSectionTitle, retroColors } from '../../src/components/retroUi'

export default function PetScreen() {
  const { pet, updatePet } = usePetStore()

  if (!pet) return null

  const mood = getPetMood(pet)

  async function handleFeed() {
    if (pet) await updatePet(feedPet(pet))
  }

  async function handlePlay() {
    if (pet) await updatePet(playWithPet(pet))
  }

  async function handleRest() {
    if (pet) await updatePet(restPet(pet))
  }

  return (
    <RetroScreen>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brand}>PET LAB</Text>
            <Text style={styles.brandSub}>placeholder sprite console</Text>
          </View>
          <View style={styles.levelBadge}><Text style={styles.levelBadgeText}>LV {pet.level}</Text></View>
        </View>

        <PlaceholderSprite label={pet.name.toUpperCase()} subtitle={mood === 'happy' ? 'HAPPY' : mood === 'neutral' ? 'NORMAL' : mood === 'sad' ? 'SAD' : 'TIRED'} />

        <RetroPanel style={styles.heroPanel}>
          <Text style={styles.petName}>{pet.name}</Text>
          <Text style={styles.petLevel}>Nivel {pet.level} · {mood === 'happy' ? 'Feliz' : mood === 'neutral' ? 'Normal' : mood === 'sad' ? 'Triste' : 'Enfermo'}</Text>
          <View style={styles.xpContainer}>
            <View style={styles.xpBar}><View style={[styles.xpFill, { width: `${(pet.xp / pet.xpToNextLevel) * 100}%` }]} /></View>
            <Text style={styles.xpText}>{pet.xp} / {pet.xpToNextLevel} XP</Text>
          </View>
        </RetroPanel>

        <RetroSectionTitle>Estado</RetroSectionTitle>
        <View style={styles.statsGrid}>
          <StatItem label="Felicidad" value={pet.happiness} icon="☺" color="#f3b64d" />
          <StatItem label="Energía" value={pet.energy} icon="⚡" color="#88e38b" />
          <StatItem label="Hambre" value={pet.hunger} icon="■" color="#ff8a78" />
        </View>

        <RetroSectionTitle>Cuidados</RetroSectionTitle>
        <View style={styles.actionsGrid}>
          <PixelButton style={styles.actionButton} onPress={handleFeed}>ALIMENTAR</PixelButton>
          <PixelButton style={styles.actionButton} onPress={handlePlay}>JUGAR</PixelButton>
          <PixelButton style={styles.actionButton} onPress={handleRest}>DESCANSAR</PixelButton>
        </View>

        <RetroSectionTitle>Economía</RetroSectionTitle>
        <RetroPanel style={styles.economyCard}>
          <View style={styles.economyRow}><Text style={styles.economyLabel}>Monedas</Text><Text style={styles.economyValue}>{pet.coins}</Text></View>
          <View style={styles.economyRow}><Text style={styles.economyLabel}>Ganado</Text><Text style={styles.economyValue}>{pet.totalEarned}</Text></View>
          <View style={styles.economyRow}><Text style={styles.economyLabel}>Gastado</Text><Text style={styles.economyValue}>{pet.totalSpent}</Text></View>
          <View style={[styles.economyRow, styles.economyRowLast]}><Text style={styles.economyLabel}>Racha</Text><Text style={styles.economyValue}>{pet.streak} días</Text></View>
        </RetroPanel>
      </ScrollView>
    </RetroScreen>
  )
}

function StatItem({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  return (
    <View style={statStyles.card}>
      <Text style={statStyles.icon}>{icon}</Text>
      <Text style={statStyles.label}>{label}</Text>
      <View style={statStyles.barBg}>
        <View style={[statStyles.barFill, { width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }]} />
      </View>
      <Text style={statStyles.value}>{Math.round(value)}%</Text>
    </View>
  )
}

const statStyles = StyleSheet.create({
  card: {
    backgroundColor: retroColors.panel,
    borderWidth: 2,
    borderColor: retroColors.border,
    padding: 12,
    alignItems: 'center', width: '31%',
  },
  icon: { fontSize: 24, color: retroColors.text },
  label: { fontSize: 11, fontWeight: '700', color: retroColors.text, marginTop: 4, fontFamily: 'monospace' },
  barBg: { width: '100%', height: 8, backgroundColor: retroColors.panelMuted, borderWidth: 1, borderColor: retroColors.border, overflow: 'hidden', marginTop: 8 },
  barFill: { height: '100%', borderRadius: 4 },
  value: { fontSize: 11, fontWeight: '700', color: retroColors.muted, marginTop: 4, fontFamily: 'monospace' },
})

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 24, gap: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  brand: { color: retroColors.text, fontFamily: 'monospace', fontSize: 18, fontWeight: '800', letterSpacing: 2 },
  brandSub: { color: retroColors.muted, fontFamily: 'monospace', fontSize: 10, letterSpacing: 1.2, marginTop: 2 },
  levelBadge: { borderWidth: 2, borderColor: retroColors.border, backgroundColor: retroColors.panel, paddingHorizontal: 8, paddingVertical: 4 },
  levelBadgeText: { color: retroColors.text, fontFamily: 'monospace', fontSize: 10, letterSpacing: 1.2 },
  heroPanel: { gap: 8 },
  petName: { color: retroColors.text, fontFamily: 'monospace', fontSize: 18, fontWeight: '800', letterSpacing: 1 },
  petLevel: { color: retroColors.muted, fontFamily: 'monospace', fontSize: 11 },
  xpContainer: { gap: 4 },
  xpBar: { width: '100%', height: 10, backgroundColor: retroColors.panelMuted, borderWidth: 2, borderColor: retroColors.border, overflow: 'hidden' },
  xpFill: { height: '100%', backgroundColor: retroColors.accentSoft },
  xpText: { textAlign: 'center', fontSize: 10, color: retroColors.muted, marginTop: 2, fontWeight: '700', fontFamily: 'monospace' },
  statsGrid: { flexDirection: 'row', gap: 8 },
  actionsGrid: { flexDirection: 'row', gap: 8 },
  actionButton: { flex: 1 },
  economyCard: { gap: 8 },
  economyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(247, 240, 219, 0.2)' },
  economyRowLast: { borderBottomWidth: 0, paddingBottom: 0 },
  economyLabel: { fontSize: 12, color: retroColors.text, fontFamily: 'monospace' },
  economyValue: { fontSize: 12, fontWeight: '700', color: retroColors.text, fontFamily: 'monospace' },
})
