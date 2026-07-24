import { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native'
import { usePetStore } from '../../src/store/petStore'
import {
  PixelButton, RetroPanel, RetroScreen, RetroSectionTitle, retroColors, monoFont,
} from '../../src/components/retroUi'
import { AnimatedSprite, VENDOR_SPRITE } from '../../src/components/petSprite'
import { getRewards, getUserRewards, purchaseReward } from '../../src/services/shopService'
import type { Reward, UserReward } from '../../src/types'

// ─── Reward display config ──────────────────────────────────────
const REWARD_META: Record<string, { icon: string }> = {
  day_off:     { icon: '★' },
  extra_time:  { icon: '◆' },
  cosmetic:    { icon: '♠' },
}

export default function ShopScreen() {
  const pet = usePetStore(s => s.pet)
  const updatePet = usePetStore(s => s.updatePet)

  const [rewards, setRewards] = useState<Reward[]>([])
  const [userRewards, setUserRewards] = useState<UserReward[]>([])
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<number | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  // Load rewards & user purchases
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [r, ur] = await Promise.all([getRewards(), getUserRewards()])
      setRewards(r)
      setUserRewards(ur)
    } catch (err) {
      console.error('Failed to load shop data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Clear success message after 3s
  useEffect(() => {
    if (!message) return
    const id = setTimeout(() => setMessage(null), 3000)
    return () => clearTimeout(id)
  }, [message])

  const handleBuy = useCallback(async (reward: Reward) => {
    if (!pet) return

    if (pet.coins < reward.cost) {
      Alert.alert('Sin suficientes coins', `Necesitas ${reward.cost} 🪙 para comprar "${reward.name}"`)
      return
    }

    setPurchasing(reward.id)
    try {
      const ok = await purchaseReward(pet, reward, updatePet)
      if (ok) {
        setMessage(`✅ "${reward.name}" adquirido`)
        await loadData()
      } else {
        Alert.alert('Error', 'No se pudo completar la compra')
      }
    } catch {
      Alert.alert('Error', 'Ocurrió un problema al procesar la compra')
    } finally {
      setPurchasing(null)
    }
  }, [pet, updatePet, loadData])

  // Check if reward is already active today
  const isPurchased = (rewardId: number): boolean => {
    return userRewards.some(ur => ur.rewardId === rewardId)
  }

  return (
    <RetroScreen>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.topRow}>
          <View>
            <Text style={styles.brand}>TIENDA</Text>
            <Text style={styles.brandSub}>gasta tus coins</Text>
          </View>
          <View style={styles.coinsBadge}>
            <Text style={styles.coinsBadgeText}>🪙 {pet?.coins ?? 0}</Text>
          </View>
        </View>

        {/* Flash message */}
        {message && (
          <RetroPanel style={styles.flashPanel}>
            <Text style={styles.flashText}>{message}</Text>
          </RetroPanel>
        )}

        {/* Vendor Mascot */}
        <RetroPanel style={styles.vendorPanel}>
          <View style={styles.vendorInner}>
            <AnimatedSprite source={VENDOR_SPRITE} size={64} frameMs={200} />
            <View style={styles.vendorText}>
              <Text style={styles.vendorTitle}>¡Bienvenido, viajero!</Text>
              <Text style={styles.vendorDesc}>
                Tus coins bien ganados...{'\n'}¿qué quieres comprar?
              </Text>
            </View>
          </View>
        </RetroPanel>

        {/* Rewards */}
        <RetroSectionTitle>Recompensas</RetroSectionTitle>
        {loading ? (
          <RetroPanel style={styles.loadingPanel}>
            <Text style={styles.loadingText}>Cargando tienda...</Text>
          </RetroPanel>
        ) : (
          <View style={styles.rewardsList}>
            {rewards.map((reward) => {
              const meta = REWARD_META[reward.type] || { icon: '●' }
              const owned = isPurchased(reward.id)
              const busy = purchasing === reward.id
              const canAfford = pet ? pet.coins >= reward.cost : false

              return (
                <RetroPanel key={reward.id} style={styles.rewardCard}>
                  <View style={styles.rewardLeft}>
                    <Text style={styles.rewardIcon}>{meta.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rewardName}>{reward.name}</Text>
                      <Text style={styles.rewardDesc}>
                        {reward.type === 'day_off'
                          ? 'Sin restricciones de apps por 24h'
                          : reward.type === 'extra_time'
                          ? `${reward.durationMinutes} min de descanso extra`
                          : ''}
                      </Text>
                    </View>
                  </View>

                  {owned ? (
                    <View style={styles.ownedBadge}>
                      <Text style={styles.ownedText}>✓ ACTIVO</Text>
                    </View>
                  ) : (
                    <PixelButton
                      style={styles.buyBtn}
                      disabled={!canAfford || busy}
                      onPress={() => handleBuy(reward)}
                    >
                      {busy ? '...' : `🪙 ${reward.cost}`}
                    </PixelButton>
                  )}
                </RetroPanel>
              )
            })}
          </View>
        )}

        {/* Cosméticos (próximamente) */}
        <RetroSectionTitle style={{ marginTop: 8 }}>Cosméticos</RetroSectionTitle>
        <RetroPanel style={styles.soonPanel}>
          <Text style={styles.soonText}>Próximamente: skins para tu mascota</Text>
          <Text style={styles.soonSub}>
            Cambia la apariencia de Magotchi con nuevos diseños pixel art
          </Text>
        </RetroPanel>
      </ScrollView>
    </RetroScreen>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 24, gap: 12 },
  topRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  brand: {
    color: retroColors.text, fontSize: 18, fontFamily: monoFont,
    fontWeight: '800', letterSpacing: 2,
  },
  brandSub: {
    color: retroColors.muted, fontSize: 10, fontFamily: monoFont,
    letterSpacing: 1.2, marginTop: 2,
  },
  coinsBadge: {
    borderWidth: 2, borderColor: retroColors.border,
    backgroundColor: retroColors.panel, paddingHorizontal: 10, paddingVertical: 6,
  },
  coinsBadgeText: {
    color: retroColors.text, fontSize: 12, fontFamily: monoFont, fontWeight: '700',
  },

  // Flash message
  flashPanel: {
    borderColor: retroColors.success, paddingVertical: 8,
  },
  flashText: {
    color: retroColors.success, fontSize: 12, fontFamily: monoFont,
    fontWeight: '700', textAlign: 'center',
  },

  // Vendor
  vendorPanel: { padding: 12 },
  vendorInner: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  vendorText: { flex: 1 },
  vendorTitle: {
    color: retroColors.text, fontSize: 13, fontWeight: '700', fontFamily: monoFont,
  },
  vendorDesc: {
    color: retroColors.muted, fontSize: 11, fontFamily: monoFont, marginTop: 4,
  },

  // Loading
  loadingPanel: { alignItems: 'center', padding: 18 },
  loadingText: {
    color: retroColors.muted, fontSize: 12, fontFamily: monoFont,
  },

  // Rewards
  rewardsList: { gap: 8 },
  rewardCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  rewardLeft: {
    flexDirection: 'row', gap: 10, alignItems: 'center', flex: 1,
  },
  rewardIcon: { fontSize: 20, color: retroColors.text },
  rewardName: {
    color: retroColors.text, fontSize: 13, fontWeight: '700', fontFamily: monoFont,
  },
  rewardDesc: {
    color: retroColors.muted, fontSize: 10, fontFamily: monoFont, marginTop: 2,
  },
  buyBtn: { minHeight: 38, paddingHorizontal: 12 },

  // Owned badge
  ownedBadge: {
    borderWidth: 2, borderColor: retroColors.success,
    paddingHorizontal: 8, paddingVertical: 6,
  },
  ownedText: {
    color: retroColors.success, fontSize: 10, fontFamily: monoFont,
    fontWeight: '700',
  },

  // Soon
  soonPanel: { gap: 6 },
  soonText: { color: retroColors.text, fontSize: 12, fontFamily: monoFont },
  soonSub: { color: retroColors.muted, fontSize: 10, fontFamily: monoFont },
})
