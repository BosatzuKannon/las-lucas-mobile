import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  View,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Text } from 'react-native-paper';
import Constants from 'expo-constants';
import { useNavigation, useRoute } from '@react-navigation/native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Svg, { Circle } from 'react-native-svg';
import { BaseLayout } from '../../../components/BaseLayout';
import { GenericToast } from '../../../components/GenericToast';
import type { ToastType } from '../../../components/GenericToast';
import palette from '../../../theme/colors';
import { useAuthStore } from '../../../store/authStore';
import { useToastStore } from '../../../store/toastStore';
import {
  getWaitingRoom,
  subscribeToRoomById,
  subscribeToRoomParticipants,
} from '../../../services/tournaments.service';
import type {
  WaitingRoomData,
  WaitingRoomPlayer,
} from '../../../services/tournaments.service';
import type { RootStackParamList } from '../../../navigation/types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

const ACCENT_COLOR = '#FF0055';
const TOURNAMENT_TYPE = 'TRIVIA PRO GAMER';

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

/**
 * Counts down to a target ISO timestamp. Returns the display string and the
 * current progress (0..1) consumed by the animated timer ring.
 */
function useCountdownTo(targetIso?: string) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const result = useMemo(() => {
    let secondsLeft: number;
    let total: number;

    if (targetIso) {
      const target = new Date(targetIso).getTime();
      total = 10 * 60;
      secondsLeft = Math.max(0, Math.floor((target - now) / 1000));
    } else {
      total = 10 * 60;
      secondsLeft = total;
    }

    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    return {
      display,
      secondsLeft,
      total,
      progress: total > 0 ? Math.min(1, secondsLeft / total) : 0,
    };
  }, [now, targetIso]);

  return result;
}

function PlayerAvatar({ player }: { player: WaitingRoomPlayer }) {
  const avatarUrl = player.user.avatarUrl;
  const initial = player.user.name.charAt(0).toUpperCase();

  if (avatarUrl) {
    return (
      <Image source={{ uri: avatarUrl }} style={styles.playerAvatarImage} />
    );
  }
  return (
    <View style={styles.playerAvatarFallback}>
      <Text style={styles.playerAvatarInitial}>{initial}</Text>
    </View>
  );
}

const appVersion = Constants.expoConfig?.version || '1.0.0';

export function WaitingRoomScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const { roomId } = route.params as RootStackParamList['WaitingRoom'];

  const user = useAuthStore((state) => state.user);
  const avatarUrl = user?.avatarUrl ?? null;
  const name = user?.name ?? 'Usuario';
  const balance = user?.balance_lucas ?? 0;

  const [room, setRoom] = useState<WaitingRoomData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);

  const me = room?.participants.find((p) => p.user.id === user?.id) ?? null;
  const hasExtraLife = me?.hasPurchasedExtraLife ?? false;
  const refundAmount = room
    ? room.entryFee + (hasExtraLife ? room.extraLifeFee : 0)
    : 0;

  const exitingRef = useRef(false);
  const allowLeaveRef = useRef(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (allowLeaveRef.current) {
        return;
      }
      e.preventDefault();
    });

    return unsubscribe;
  }, [navigation]);

  const handleActive = useCallback(() => {
    if (exitingRef.current) {
      return;
    }
    exitingRef.current = true;
    allowLeaveRef.current = true;
    navigation.replace('ActiveGame', { roomId });
  }, [navigation, roomId]);

  const handleVoting = useCallback(() => {
    if (exitingRef.current) {
      return;
    }
    exitingRef.current = true;
    allowLeaveRef.current = true;
    navigation.replace('CategoryVoting', { roomId });
  }, [navigation, roomId]);

  const handleCanceled = useCallback(() => {
    if (exitingRef.current) {
      return;
    }
    exitingRef.current = true;
    allowLeaveRef.current = true;
    useToastStore
      .getState()
      .showToast(
        'warning',
        `Torneo cancelado por falta de cupos. Se te devolvieron ${formatCOP(
          refundAmount,
        )} a tu saldo instantáneamente.`,
      );
    setTimeout(() => {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('Main');
      }
    }, 800);
  }, [navigation, refundAmount]);

  useEffect(() => {
    let mounted = true;

    getWaitingRoom(roomId)
      .then((data) => {
        if (!mounted) {
          return;
        }

        if (data.status === 'VOTING') {
          handleVoting();
          return;
        }

        if (data.status === 'ACTIVE') {
          handleActive();
          return;
        }

        if (data.status === 'CANCELLED') {
          handleCanceled();
          return;
        }

        setRoom(data);
        setIsLoading(false);
      })
      .catch(() => {
        if (mounted) {
          setIsLoading(false);
          setToast({
            type: 'error',
            message: 'No se pudo cargar la información de la sala.',
          });
        }
      });

    return () => {
      mounted = false;
    };
  }, [roomId, handleActive, handleCanceled, handleVoting]);

  useEffect(() => {
    const unsubscribe = subscribeToRoomById(roomId, (updatedRoom) => {
      setRoom((prev) =>
        prev
          ? { ...prev, ...updatedRoom, startTime: prev.startTime }
          : prev,
      );

      if (updatedRoom.status === 'VOTING') {
        handleVoting();
        return;
      }

      if (updatedRoom.status === 'ACTIVE') {
        handleActive();
        return;
      }

      if (updatedRoom.status === 'CANCELLED') {
        handleCanceled();
        return;
      }
    });

    return () => unsubscribe();
  }, [roomId, handleActive, handleCanceled, handleVoting]);

  useEffect(() => {
    const unsubscribe = subscribeToRoomParticipants(
      roomId,
      ({ type, participant }) => {
        setRoom((prev) => {
          if (!prev) {
            return prev;
          }

          const participants = [...prev.participants];
          const index = participants.findIndex(
            (p) => p.user.id === participant.user.id,
          );

          if (type === 'INSERT' || type === 'UPDATE') {
            if (index === -1) {
              participants.push(participant);
            } else {
              participants[index] = participant;
            }
          } else if (type === 'DELETE' && index !== -1) {
            participants.splice(index, 1);
          }

          return { ...prev, participants };
        });
      },
    );

    return () => unsubscribe();
  }, [roomId]);

  const countdown = useCountdownTo(room?.startTime);

  useEffect(() => {
    if (isLoading || !room) {
      return;
    }
    if (countdown.secondsLeft > 0) {
      return;
    }
    if (room.currentPlayers >= room.maxPlayers) {
      return;
    }

    handleCanceled();
  }, [countdown.secondsLeft, isLoading, room, handleCanceled]);

  const currentPlayers = room?.currentPlayers ?? 0;
  const maxPlayers = room?.maxPlayers ?? 0;
  const sortedParticipants = useMemo(() => {
    const list = [...(room?.participants ?? [])];
    return list.sort((a, b) => {
      if (a.user.id === user?.id) return -1;
      if (b.user.id === user?.id) return 1;
      return b.user.name.localeCompare(a.user.name);
    });
  }, [room?.participants, user?.id]);
  const progress: `${number}%` = `${Math.round(
    (currentPlayers / Math.max(1, maxPlayers)) * 100,
  )}%`;

  const ringSize = 140;
  const ringStroke = 4;
  const ringRadius = (ringSize - ringStroke) / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - countdown.progress);

  if (isLoading) {
    return (
      <BaseLayout>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ACCENT_COLOR} />
          <Text style={styles.loadingText}>Cargando sala…</Text>
        </View>
      </BaseLayout>
    );
  }

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

            {hasExtraLife ? (
              <View style={styles.extraLifeChip}>
                <Text style={styles.extraLifeChipText}>⚡ 1x Extra Vida</Text>
              </View>
            ) : null}
          </View>

          <Text style={[styles.prizeValue, { color: ACCENT_COLOR }]}>
            {`${formatCOP(room?.prizePool ?? 0)} COP`}
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="ticket-confirmation-outline" size={16} color="#A0A0A0" />
              <Text style={styles.metaText}>{`Entrada: ${formatCOP(room?.entryFee ?? 0)}`}</Text>
            </View>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="clock-outline" size={16} color="#A0A0A0" />
              <Text style={styles.metaText}>{`${room?.normalQuestionCount ?? 0} Preguntas`}</Text>
            </View>
          </View>
        </View>

        {/* Countdown card */}
        <View style={[styles.card, styles.timerCard]}>
          <View style={styles.ringContainer}>
            <Svg width={ringSize} height={ringSize}>
              <Circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={ringRadius}
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth={ringStroke}
                fill="none"
              />
              <Circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={ringRadius}
                stroke={ACCENT_COLOR}
                strokeWidth={ringStroke}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
                transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
              />
            </Svg>
            <View style={styles.ringCenter}>
              <Text style={styles.timerText}>{countdown.display}</Text>
              <Text style={styles.timerLabel}>CUENTA REGRESIVA</Text>
            </View>
          </View>

          <Text style={styles.timerTitle}>Esperando inicio automático</Text>
          <Text style={styles.timerDescription}>
            La sala comenzará tan pronto se llenen los {maxPlayers} cupos o al agotar el
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
              refundAmount,
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
              {`${currentPlayers} / ${maxPlayers}`}
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
            {sortedParticipants.map((player) =>
              player.user.id === user?.id ? (
                <View
                  key={player.user.id}
                  style={[styles.currentPlayerChip, { backgroundColor: ACCENT_COLOR }]}
                >
                  <View style={styles.currentPlayerOnlineDot} />
                  <Text style={styles.currentPlayerChipText}>Tú (Listo)</Text>
                </View>
              ) : (
                <View key={player.user.id} style={styles.playerChip}>
                  <PlayerAvatar player={player} />
                  <Text style={styles.playerChipText}>{player.user.name}</Text>
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

      {toast ? (
        <GenericToast
          type={toast.type}
          message={toast.message}
          onHide={() => setToast(null)}
        />
      ) : null}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#A0A0A0',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
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
  ringContainer: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 0.5,
    borderColor: '#FF0055',
  },
  currentPlayerOnlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00FF00',
  },
  currentPlayerChipText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'Inter_700Bold',
  },
  playerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  playerAvatarImage: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  playerAvatarFallback: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  playerAvatarInitial: {
    color: '#FFFFFF',
    fontSize: 9,
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
