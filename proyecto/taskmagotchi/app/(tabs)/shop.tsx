import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { usePetStore } from '../../src/store/petStore'
import { PixelButton, RetroPanel, RetroScreen, RetroSectionTitle, retroColors } from '../../src/components/retroUi'

export default function ShopScreen() {
  const pet = usePetStore(s => s.pet)

  const rewards = [
    { name: 'Día libre', cost: 100, desc: 'Sin restricciones de apps por 24h', icon: '★' },
    { name: '30 min ocio extra', cost: 20, desc: 'Tiempo extra de descanso', icon: '◆' },
    { name: '1 hora ocio extra', cost: 35, desc: 'Una hora más de tiempo libre', icon: '◆' },
    { name: 'Saltar una tarea', cost: 50, desc: 'Exime una tarea pendiente', icon: '■' },
  ]

  return (
    <RetroScreen>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.brand}>TIENDA</Text>
            <Text style={styles.brandSub}>gasta tus coins</Text>
          </View>
          <View style={styles.coinsBadge}>
            <Text style={styles.coinsBadgeText}>🪙 {pet?.coins ?? 0}</Text>
          </View>
        </View>

        {/* Vendor Mascot */}
        <RetroPanel style={styles.vendorPanel}>
          <View style={styles.vendorInner}>
            <View style={styles.vendorSprite}>
              <Text style={styles.vendorHat}>🎩</Text>
              <Text style={styles.vendorFace}>(◕‿◕)</Text>
            </View>
            <View>
              <Text style={styles.vendorTitle}>¡Bienvenido, viajero!</Text>
              <Text style={styles.vendorDesc}>Tus coins bien ganados... ¿qué quieres comprar?</Text>
            </View>
          </View>
        </RetroPanel>

        <RetroSectionTitle>Recompensas</RetroSectionTitle>
        <View style={styles.rewardsList}>
          {rewards.map((reward, i) => (
            <RetroPanel key={i} style={styles.rewardCard}>
              <View style={styles.rewardHeader}>
                <Text style={styles.rewardIcon}>{reward.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rewardName}>{reward.name}</Text>
                  <Text style={styles.rewardDesc}>{reward.desc}</Text>
                </View>
              </View>
              <PixelButton
                style={styles.buyBtn}
                disabled={!pet || pet.coins < reward.cost}
                onPress={() => {}}
              >
                🪙 {reward.cost}
              </PixelButton>
            </RetroPanel>
          ))}
        </View>

        <RetroSectionTitle style={{ marginTop: 8 }}>Cosméticos</RetroSectionTitle>
        <RetroPanel style={styles.soonPanel}>
          <Text style={styles.soonText}>Próximamente: skins para tu mascota</Text>
          <Text style={styles.soonSub}>Cambia la apariencia de Magotchi con nuevos diseños pixel art</Text>
        </RetroPanel>
      </ScrollView>
    </RetroScreen>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 24, gap: 12 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  brand: { color: retroColors.text, fontSize: 18, fontFamily: 'monospace', fontWeight: '800', letterSpacing: 2 },
  brandSub: { color: retroColors.muted, fontSize: 10, fontFamily: 'monospace', letterSpacing: 1.2, marginTop: 2 },
  coinsBadge: { borderWidth: 2, borderColor: retroColors.border, backgroundColor: retroColors.panel, paddingHorizontal: 10, paddingVertical: 6 },
  coinsBadgeText: { color: retroColors.text, fontSize: 12, fontFamily: 'monospace', fontWeight: '700' },

  // Vendor
  vendorPanel: { padding: 12 },
  vendorInner: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  vendorSprite: { width: 64, height: 64, borderWidth: 2, borderColor: retroColors.border, backgroundColor: '#15101d', justifyContent: 'center', alignItems: 'center' },
  vendorHat: { fontSize: 16, position: 'absolute', top: -8 },
  vendorFace: { fontSize: 16 },
  vendorTitle: { color: retroColors.text, fontSize: 13, fontWeight: '700', fontFamily: 'monospace' },
  vendorDesc: { color: retroColors.muted, fontSize: 11, fontFamily: 'monospace', marginTop: 4 },

  // Rewards
  rewardsList: { gap: 8 },
  rewardCard: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rewardHeader: { flexDirection: 'row', gap: 10, alignItems: 'center', flex: 1 },
  rewardIcon: { fontSize: 20, color: retroColors.text },
  rewardName: { color: retroColors.text, fontSize: 13, fontWeight: '700', fontFamily: 'monospace' },
  rewardDesc: { color: retroColors.muted, fontSize: 10, fontFamily: 'monospace', marginTop: 2 },
  buyBtn: { minHeight: 38, paddingHorizontal: 12 },

  // Soon
  soonPanel: { gap: 6 },
  soonText: { color: retroColors.text, fontSize: 12, fontFamily: 'monospace' },
  soonSub: { color: retroColors.muted, fontSize: 10, fontFamily: 'monospace' },
})
