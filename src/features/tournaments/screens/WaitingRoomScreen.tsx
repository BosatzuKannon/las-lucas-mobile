import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  View,
  Image,
  type DimensionValue,
} from 'react-native';
import { Text } from 'react-native-paper';
import Constants from 'expo-constants';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BaseLayout } from '../../../components/BaseLayout';
import palette from '../../../theme/colors';
import { useAuthStore } from '../../../store/authStore';

const ACCENT_COLOR = '#FF0055';
const TOURNAMENT_TYPE = 'TRIVIA PRO GAMER';
const TOTAL_SECONDS = 10 * 60;

type MockPlayer = {
  id: string;
  name: string;
  initials: string;
  isMe?: boolean;
  hasPurchasedExtraLife?: boolean;
};

const CURRENT_PLAYER: MockPlayer = {
  id: 'me',
  name: 'Usuario',
  initials: 'UE',
  isMe: true,
  hasPurchasedExtraLife: true,
};

const MOCK_PLAYERS: MockPlayer[] = [
  CURRENT_PLAYER,
  { id: 'p1', name: 'Carlos M.', initials: 'CM' },
  { id: 'p2', name: 'Valentina', initials: 'VR' },
  { id: 'p3', name: 'Andrés P.', initials: 'AP' },
  { id: 'p4', name: 'Laura G.', initials: 'LG' },
  { id: 'p5', name: 'Sebastián R.', initials: 'SR' },
  { id: 'p6', name: 'Camila T.', initials: 'CT' },
  { id: 'p7', name: 'Felipe Z.', initials: 'FZ' },
];

const READY_PLAYERS = 46;
const MAX_PLAYERS = 50;
const ENTRY_FEE = 5000;
const PRIZE_POOL = 250000;
const QUESTION_COUNT = 15;

const RULES = [
  '10 segundos por pregunta contrarreloj.',
  'Mayor velocidad y precisión determinan podio.',
  'Premios acreditados al saldo al finalizar la partida.',
];

function formatCOP(value: number): string {
  const integer = Math.round(value).toString();
  return `$${integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

function BlinkingDot({ color = '#00FF00' }: { color?: string }) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.25,
          duration: 650,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 650,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[styles.blinkingDot, { backgroundColor: color, opacity }]}
    />
  );
}

function useCountdown(totalSeconds: number): string {
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

const appVersion = Constants.expoConfig?.version || '1.0.0';

export function WaitingRoomScreen() {
  const user = useAuthStore((state) => state.user);
  const avatarUrl = user?.avatarUrl ?? null;
  const name = user?.name ?? 'Usuario';
  const balance = user?.balance_lucas ?? 0;

  const timeText = useCountdown(TOTAL_SECONDS);
  const progress: DimensionValue = `${Math.round((READY_PLAYERS / MAX_PLAYERS) * 100)}%`;

  return (
    <BaseLayout>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={styles.pill}>
            <MaterialCommunityIcons name="account-multiple" size={13} color={palette.white} />
            <Text style={styles.pillLogoText}>LAS LUCAS</Text>
            <View style={styles.statusDot} />
          </View>

          <View style={styles.pill}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <Text style={styles.balanceText}>{formatCOP(balance)}</Text>
          </View>
        </View>

        {/* Sub-header — room state */}
        <View style={styles.subHeader}>
          <View style={[styles.subHeaderBadge, { borderColor: ACCENT_COLOR }]}>
            <View style={[styles.accentDot, { backgroundColor: ACCENT_COLOR }]} />
            <Text style={[styles.subHeaderText, { color: ACCENT_COLOR }]}>
              {TOURNAMENT_TYPE}
            </Text>
          </View>

          <View style={styles.activeBadge}>
            <BlinkingDot color="#00FF00" />
            <Text style={styles.activeBadgeText}>SALA ACTIVA</Text>
          </View>
        </View>

        {/* Main info card — wallet */}
        <View style={styles.card}>
          <View style={styles.walletHeader}>
            <View style={styles.walletLabelRow}>
              <MaterialCommunityIcons name="trophy" size={18} color="#FFD700" />
              <Text style={styles.walletLabel}>BOLSA ACUMULADA</Text>
            </View>

            {CURRENT_PLAYER.hasPurchasedExtraLife ? (
              <View style={styles.extraLifeChip}>
                <Text style={styles.extraLifeChipText}>⚡ 1x Extra Vida</Text>
              </View>
            ) : null}
          </View>

          <Text style={[styles.prizeValue, { color: ACCENT_COLOR }]}>
            {`${formatCOP(PRIZE_POOL)} COP`}
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="ticket-confirmation-outline" size={16} color="#A0A0A0" />
              <Text style={styles.metaText}>{`Entrada: ${formatCOP(ENTRY_FEE)}`}</Text>
            </View>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="clock-outline" size={16} color="#A0A0A0" />
              <Text style={styles.metaText}>{`${QUESTION_COUNT} Preguntas`}</Text>
            </View>
          </View>
        </View>

        {/* Countdown card */}
        <View style={[styles.card, styles.timerCard]}>
          <View style={[styles.timerCircle, { borderColor: ACCENT_COLOR }]}>
            <Text style={styles.timerText}>{timeText}</Text>
            <Text style={styles.timerLabel}>CUENTA REGRESIVA</Text>
          </View>

          <Text style={styles.timerTitle}>Esperando inicio automático</Text>
          <Text style={styles.timerDescription}>
            La sala comenzará tan pronto se llenen los {MAX_PLAYERS} cupos o al agotar el
            tiempo.
          </Text>
        </View>

        {/* Refund guarantee card */}
        <View style={styles.card}>
          <View style={styles.refundHeader}>
            <MaterialCommunityIcons name="shield-check-outline" size={20} color="#00FF00" />
            <Text style={styles.refundTitle}>Garantía de Reembolso •</Text>
          </View>
          <Text style={styles.refundDescription}>
            {`Si no se completa la sala en los 10 minutos, el valor total de tu entrada (${formatCOP(
              ENTRY_FEE,
            )} COP) se devolverá íntegro e instantáneo a tu billetera.`}
          </Text>
        </View>

        {/* Ready players card */}
        <View style={styles.card}>
          <View style={styles.playersHeader}>
            <View style={styles.playersLabelRow}>
              <MaterialCommunityIcons name="account-group-outline" size={16} color="#888888" />
              <Text style={styles.playersLabel}>JUGADORES LISTOS</Text>
            </View>
            <Text style={[styles.playersCount, { color: ACCENT_COLOR }]}>
              {`${READY_PLAYERS} / ${MAX_PLAYERS}`}
            </Text>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: progress, backgroundColor: ACCENT_COLOR },
              ]}
            />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.playersList}
          >
            {MOCK_PLAYERS.map((player) =>
              player.isMe ? (
                <View
                  key={player.id}
                  style={[styles.currentPlayerChip, { backgroundColor: ACCENT_COLOR }]}
                >
                  <Text style={styles.currentPlayerChipText}>● Tú (Listo)</Text>
                </View>
              ) : (
                <View key={player.id} style={styles.playerChip}>
                  <Text style={styles.playerChipText}>
                    {`${player.initials} ${player.name}`}
                  </Text>
                </View>
              ),
            )}
          </ScrollView>
        </View>

        {/* Rules card */}
        <View style={[styles.card, styles.rulesCard]}>
          <View style={styles.rulesTitleRow}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={14} color="#888888" />
            <Text style={styles.rulesTitle}>REGLAS DEL TORNEO</Text>
          </View>

          {RULES.map((rule, index) => (
            <View key={rule} style={styles.ruleRow}>
              <View style={styles.ruleNumberCircle}>
                <Text style={styles.ruleNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.ruleText}>{rule}</Text>
            </View>
          ))}
        </View>

        {/* System footer */}
        <View style={styles.footer}>
          <View style={styles.statusPill}>
            <View style={styles.footerStatusDot} />
            <Text style={styles.statusText}>{`LAS LUCAS v${appVersion} • SERVIDOR SEGURO`}</Text>
          </View>
          <Text style={styles.disclaimer}>
            Juego regulado para mayores de 18 años. Juega con responsabilidad.
          </Text>
        </View>
      </ScrollView>
    </BaseLayout>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 120,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
  },
  pillLogoText: {
    color: palette.white,
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.neonGreen,
  },
  avatarImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  avatarFallback: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
  },
  avatarInitial: {
    color: palette.white,
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'Inter_700Bold',
  },
  balanceText: {
    color: '#00FF00',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  subHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  subHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
  },
  accentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  subHeaderText: {
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: '#00FF00',
  },
  blinkingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activeBadgeText: {
    color: '#00FF00',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.4,
  },
  card: {
    backgroundColor: '#16161C',
    borderRadius: 24,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    padding: 20,
    marginBottom: 16,
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  walletLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  walletLabel: {
    color: '#888888',
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  extraLifeChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(0, 255, 0, 0.12)',
    borderWidth: 0.5,
    borderColor: 'rgba(0, 255, 0, 0.4)',
  },
  extraLifeChipText: {
    color: '#00FF00',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  prizeValue: {
    fontSize: 26,
    fontFamily: 'Inter_900Black',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: '#A0A0A0',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  timerCard: {
    padding: 24,
    alignItems: 'center',
  },
  timerCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontFamily: 'Inter_900Black',
  },
  timerLabel: {
    color: '#888888',
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 4,
  },
  timerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_900Black',
    marginTop: 20,
    textAlign: 'center',
  },
  timerDescription: {
    color: '#A0A0A0',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  refundHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refundTitle: {
    color: '#00FF00',
    fontSize: 14,
    fontFamily: 'Inter_900Black',
  },
  refundDescription: {
    color: '#A0A0A0',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
    marginTop: 6,
  },
  playersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playersLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  playersLabel: {
    color: '#888888',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Inter_700Bold',
  },
  playersCount: {
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Inter_700Bold',
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 12,
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  playersList: {
    gap: 8,
    paddingRight: 8,
  },
  currentPlayerChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 0.5,
    borderColor: '#FF0055',
  },
  currentPlayerChipText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'Inter_700Bold',
  },
  playerChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  playerChipText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'Inter_700Bold',
  },
  rulesCard: {
    marginBottom: 24,
  },
  rulesTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  rulesTitle: {
    color: '#888888',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  ruleNumberCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22222A',
  },
  ruleNumberText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'Inter_700Bold',
  },
  ruleText: {
    flex: 1,
    color: '#C0C0C0',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
  },
  footer: {
    marginTop: 30,
  },
  statusPill: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
  },
  footerStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.neonGreen,
  },
  statusText: {
    color: palette.footerMuted,
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  disclaimer: {
    marginTop: 12,
    color: palette.disclaimerGray,
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 14,
  },
});