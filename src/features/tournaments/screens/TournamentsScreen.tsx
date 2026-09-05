import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  RefreshControl,
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
import { GenericToast } from '../../../components/GenericToast';
import type { ToastType } from '../../../components/GenericToast';
import palette from '../../../theme/colors';
import { useAuthStore } from '../../../store/authStore';
import {
  getTournaments,
  joinTournament,
  type TournamentRoom,
} from '../../../services/tournaments.service';

type RoomCard = {
  id: string;
  typeLabel: string;
  title: string;
  subtitle: string;
  prize: string;
  entryFee: string;
  entryFeeText: string;
  extraLifeText: string;
  spotsText: string;
  progress: DimensionValue;
  accentColor: string;
  startTime: string;
};

const TYPE_LABELS: Record<TournamentRoom['tournamentType'], string> = {
  DAILY: 'Torneo Diario',
  WEEKLY: 'Torneo Semanal',
  BIWEEKLY: 'Torneo Quincenal',
  CUSTOM_DATE: 'Torneo Especial',
};

const TYPE_ACCENTS: Record<TournamentRoom['tournamentType'], string> = {
  DAILY: '#00FF00',
  WEEKLY: '#FF0055',
  BIWEEKLY: '#FFD700',
  CUSTOM_DATE: '#FFB6C1',
};

function formatCOP(value: number): string {
  const integer = Math.round(value).toString();
  return `$${integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

const WAITING_WINDOW_MS = 10 * 60 * 1000;

type RoomPhase = 'future' | 'waiting' | 'closed';

function getRoomPhase(card: RoomCard, nowMs: number): RoomPhase {
  const start = new Date(card.startTime).getTime();
  if (!Number.isFinite(start)) return 'closed';
  if (nowMs < start) return 'future';
  if (nowMs < start + WAITING_WINDOW_MS) return 'waiting';
  return 'closed';
}

function formatStartTime(startTime: string, nowMs: number): string {
  const start = new Date(startTime).getTime();
  const now = nowMs;

  if (!Number.isFinite(start)) {
    return 'El torneo ha iniciado';
  }

  const diffMs = start - now;

  if (diffMs <= 0) {
    return 'El torneo ha iniciado';
  }

  const diffMinutes = Math.ceil(diffMs / 60000);

  if (diffMinutes < 60) {
    return `Inicia en ${diffMinutes} ${diffMinutes === 1 ? 'minuto' : 'minutos'}`;
  }

  const diffHours = Math.floor(diffMs / 3600000);

  if (diffHours < 24) {
    return `Inicia en ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
  }

  const startDate = new Date(start);
  const tomorrow = new Date(now + 86400000);
  const isTomorrow = startDate.toDateString() === tomorrow.toDateString();

  if (isTomorrow) {
    return 'Inicia mañana';
  }

  const weekday = startDate.toLocaleDateString('es-CO', { weekday: 'long' });
  return `Inicia el ${weekday}`;
}

function formatCloseCountdown(startTime: string, nowMs: number): string {
  const start = new Date(startTime).getTime();
  const closeAt = Number.isFinite(start) ? start + WAITING_WINDOW_MS : nowMs;
  const diffMs = Math.max(0, closeAt - nowMs);
  const totalSeconds = Math.ceil(diffMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `Cierra en: ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function LiveStatusDot({ active }: { active: boolean }) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active) {
      opacity.setValue(1);
      return;
    }

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
  }, [active, opacity]);

  return (
    <Animated.View
      style={[
        styles.playerStatusDot,
        { backgroundColor: active ? '#00FF00' : '#888888' },
        active ? { opacity } : null,
      ]}
    />
  );
}

function toRoomCard(room: TournamentRoom): RoomCard {
  const pct =
    room.maxPlayers > 0
      ? Math.min(100, Math.max(0, Math.round((room.currentPlayers / room.maxPlayers) * 100)))
      : 0;

  let spotsSuffix = ' cupos';
  if (room.currentPlayers >= room.maxPlayers) spotsSuffix = ' completo';
  else if (pct >= 90) spotsSuffix = ' casi lleno';
  else if (room.currentPlayers === 0) spotsSuffix = ' esperando';

  const typeLabel = TYPE_LABELS[room.tournamentType] ?? 'Torneo';

  return {
    id: room.id,
    typeLabel,
    title: `Copa ${typeLabel}`,
    subtitle: `${room.normalQuestionCount} preguntas • Cupo de ${room.maxPlayers} jugadores`,
    prize: `${formatCOP(room.prizePool)} COP`,
    entryFee: `${formatCOP(room.entryFee)} COP`,
    entryFeeText: `Entrada normal ${formatCOP(room.entryFee)}`,
    extraLifeText: `Con vida extra +${formatCOP(room.entryFee + room.extraLifeFee)}`,
    spotsText: `${room.currentPlayers} / ${room.maxPlayers}${spotsSuffix}`,
    progress: `${pct}%`,
    accentColor: TYPE_ACCENTS[room.tournamentType] ?? '#FF0055',
    startTime: room.startTime,
  };
}

const appVersion = Constants.expoConfig?.version || '1.0.0';

export function TournamentsScreen() {
  const user = useAuthStore((state) => state.user);
  const avatarUrl = user?.avatarUrl ?? null;
  const name = user?.name ?? 'Usuario';
  const balance = user?.balance_lucas ?? 0;

  const [rooms, setRooms] = useState<RoomCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const visibleRooms = useMemo(
    () => rooms.filter((card) => getRoomPhase(card, now) !== 'closed'),
    [rooms, now],
  );

  const loadTournaments = useCallback(async () => {
    try {
      const data = await getTournaments();
      setRooms(data.map(toRoomCard));
    } catch (error) {
      setToast({
        type: 'error',
        message:
          error instanceof Error ? error.message : 'No se pudieron cargar los torneos.',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadTournaments();
  }, [loadTournaments]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    void loadTournaments();
  }, [loadTournaments]);

  const handleJoin = useCallback(
    async (card: RoomCard, buyExtraLife: boolean) => {
      if (joiningId) return;

      if (!user) {
        setToast({
          type: 'error',
          message: 'Inicia sesión para unirte a un torneo.',
        });
        return;
      }

      if (getRoomPhase(card, Date.now()) !== 'waiting') {
        setToast({
          type: 'warning',
          message: 'Podrás unirte en cuanto inicie el torneo',
        });
        return;
      }

      setJoiningId(card.id);
      setToast(null);

      try {
        const updatedRoom = await joinTournament(card.id, buyExtraLife);
        const cost =
          updatedRoom.entryFee + (buyExtraLife ? updatedRoom.extraLifeFee : 0);
        const newBalance = Math.max(0, (user.balance_lucas ?? 0) - cost);
        useAuthStore.getState().setUser({ ...user, balance_lucas: newBalance });
        await loadTournaments();
        setToast({
          type: 'success',
          message: `Inscrito en "${card.title}". Nuevo saldo: ${formatCOP(newBalance)}`,
        });
      } catch (error) {
        setToast({
          type: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'No se pudo completar la inscripción.',
        });
      } finally {
        setJoiningId(null);
      }
    },
    [joiningId, user, loadTournaments],
  );

  return (
    <>
      <BaseLayout>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={palette.secondary}
            />
          }
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

          {/* Header */}
          <Text style={styles.title}>Torneos</Text>
          <Text style={styles.description}>
            Compite en torneos de trivia en tiempo real, gana premios garantizados y demuestra que
            eres el mejor.
          </Text>

          {/* Tournament cards */}
          {isLoading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator color={palette.primary} />
            </View>
          ) : visibleRooms.length === 0 ? (
            <View style={styles.centerBox}>
              <Text style={styles.emptyText}>
                No hay torneos abiertos en este momento. Vuelve pronto.
              </Text>
            </View>
          ) : (
            visibleRooms.map((card) => {
                const phase = getRoomPhase(card, now);
                const active = phase === 'waiting';
                const isJoining = joiningId === card.id;
                const buttonsLocked = phase !== 'waiting' || Boolean(joiningId);
                return (
                  <Pressable
                    key={card.id}
                    style={({ pressed }) => [
                      styles.card,
                      pressed && !active && styles.cardPressed,
                    ]}
                    onPress={() => {
                      if (!active) {
                        setToast({
                          type: 'warning',
                          message: 'Podrás unirte en cuanto inicie el torneo',
                        });
                      }
                    }}
                    disabled={active}
                  >
                  {/* Card header */}
                  <View style={styles.cardHeader}>
                    <View style={[styles.typeBadge, { borderColor: card.accentColor }]}>
                      <MaterialCommunityIcons
                        name="trophy-outline"
                        size={12}
                        color={card.accentColor}
                      />
                      <Text style={[styles.typeBadgeText, { color: card.accentColor }]}>
                        {card.typeLabel}
                      </Text>
                    </View>

                    <View style={styles.timeBadge}>
                      <MaterialCommunityIcons
                        name="clock-outline"
                        size={12}
                        color={card.accentColor}
                      />
<Text style={[styles.timeBadgeText, { color: card.accentColor }]}>
  {active
    ? formatCloseCountdown(card.startTime, now)
    : formatStartTime(card.startTime, now)}
</Text>
                    </View>
                  </View>

                  {/* Titles */}
                  <Text style={styles.cardTitle}>{card.title}</Text>
                  <Text style={styles.cardSubtitle}>{card.subtitle}</Text>

                  {/* Prize / cost grid */}
                  <View style={styles.infoRow}>
                    <View style={styles.infoColumn}>
                      <Text style={styles.infoLabel}>PREMIO GARANTIZADO</Text>
                      <Text style={[styles.infoValue, { color: card.accentColor }]}>
                        {card.prize}
                      </Text>
                    </View>

                    <View style={styles.infoColumn}>
                      <Text style={styles.infoLabel}>COSTO ENTRADA</Text>
                      <Text style={styles.entryValue}>{card.entryFee}</Text>
                    </View>
                  </View>

                  {/* Progress bar */}
                  <View style={styles.progressBlock}>
                    <View style={styles.progressLabels}>
                      <Text style={styles.progressLabel}>Cupos confirmados</Text>
                      <View style={styles.playersBadge}>
                        <LiveStatusDot active={active} />
                        <Text style={styles.progressLabel}>{card.spotsText}</Text>
                      </View>
                    </View>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: card.progress,
                            backgroundColor: card.accentColor,
                          },
                        ]}
                      />
                    </View>
                  </View>

                  {/* Action footer */}
                  <View style={styles.cardActions}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.primaryButton,
                        { backgroundColor: card.accentColor },
                        !active && styles.buttonInactive,
                        pressed && active && !isJoining && styles.pressedDown,
                        isJoining && styles.buttonDisabled,
                      ]}
                      onPress={() => void handleJoin(card, false)}
                      disabled={buttonsLocked}
                    >
                      {isJoining ? (
                        <ActivityIndicator color="#000000" />
                      ) : (
                        <Text style={styles.primaryButtonText}>
                          {card.entryFeeText}
                        </Text>
                      )}
                    </Pressable>

                    <Pressable
                      style={({ pressed }) => [
                        styles.extraLifeButton,
                        !active && styles.buttonInactive,
                        pressed && active && !isJoining && styles.pressedDown,
                      ]}
                      onPress={() => void handleJoin(card, true)}
                      disabled={buttonsLocked}
                    >
                      <Text style={[styles.extraLifeLabel, { color: card.accentColor }]}>
                        {card.extraLifeText}
                      </Text>
                    </Pressable>
                  </View>
                </Pressable>
              );
            })
          )}

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

      {toast ? (
        <GenericToast
          type={toast.type}
          message={toast.message}
          onHide={() => setToast(null)}
        />
      ) : null}
    </>
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
    marginBottom: 24,
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
  centerBox: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    color: palette.profileSubtitle,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  title: {
    color: palette.white,
    fontSize: 32,
    fontFamily: 'Inter_900Black',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    color: '#A0A0A0',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 10,
    marginBottom: 30,
  },
  card: {
    backgroundColor: '#16161C',
    borderRadius: 24,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    padding: 20,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'Inter_700Bold',
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'Inter_700Bold',
    textAlign: 'right',
  },
  cardTitle: {
    color: palette.white,
    fontSize: 22,
    fontFamily: 'Inter_900Black',
    marginBottom: 4,
  },
  cardSubtitle: {
    color: '#888888',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  infoColumn: {
    flex: 1,
  },
  infoLabel: {
    color: '#888888',
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 18,
    fontFamily: 'Inter_900Black',
  },
  entryValue: {
    color: palette.white,
    fontSize: 18,
    fontFamily: 'Inter_900Black',
  },
  progressBlock: {
    marginBottom: 20,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    color: '#A0A0A0',
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
  playersBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  playerStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '900',
    fontFamily: 'Inter_900Black',
  },
  pressedDown: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonInactive: {
    opacity: 0.35,
  },
  cardPressed: {
    opacity: 0.8,
  },
  extraLifeButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  extraLifeLabel: {
    fontSize: 11,
    fontWeight: '900',
    fontFamily: 'Inter_900Black',
    textAlign: 'center',
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