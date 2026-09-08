import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  Image,
  type DimensionValue,
} from 'react-native';
import { Text } from 'react-native-paper';
import Constants from 'expo-constants';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BaseLayout } from '../../../components/BaseLayout';
import { GenericToast } from '../../../components/GenericToast';
import type { ToastType } from '../../../components/GenericToast';
import palette from '../../../theme/colors';
import { useAuthStore } from '../../../store/authStore';
import { useVotingStore } from '../../../store/votingStore';
import type { RankedCategory } from '../../../store/votingStore';
import {
  getWaitingRoom,
  subscribeToParticipantVotes,
  subscribeToRoomById,
} from '../../../services/tournaments.service';
import type { RootStackParamList } from '../../../navigation/types';

/** Duración de la fase de votación (backend: VOTING_WINDOW_MS). */
const VOTING_WINDOW_MS = 45 * 1000;

/** Colores representativos de categoría (estables por orden alfabético). */
const CATEGORY_COLORS = [
  '#FF007F',
  '#00FF7F',
  '#FFD700',
  '#4DD0E1',
  '#B388FF',
  '#FF7043',
  '#F48FB1',
  '#CDDC39',
];

const POSITION_BADGE_COLORS = {
  1: '#FF007F',
  2: '#00C157',
  3: '#FFB300',
} as const;

const FALLBACK_ICONS = [
  'help-circle-outline',
  'shape-outline',
  'lightbulb-outline',
  'star-four-points-outline',
  'diamond-stone',
];

type MaterialIconName = keyof typeof MaterialCommunityIcons.glyphMap;

function categoryIcon(categoryId: string, name: string): MaterialIconName {
  const n = name.toLowerCase();
  if (/deporte|f[uú]tbol|tenis/.test(n)) return 'soccer';
  if (/m[uú]sica|rock|reggaet/.test(n)) return 'music-note';
  if (/historia|antiguedad/.test(n)) return 'book-open-page-variant';
  if (/ciencia|naturaleza|qu[ií]mica|f[ií]sica/.test(n)) return 'flask';
  if (/cine|pel[ií]cula|series/.test(n)) return 'movie';
  if (/geograf|mundo|pa[ií]s|viaje/.test(n)) return 'earth';
  if (/arte|dibujo|pintura/.test(n)) return 'palette';
  if (/juego|videojuego|gamer|esports/.test(n)) return 'gamepad-variant';
  if (/literatura|cultura|libro|lectura/.test(n)) return 'book-open-variant';
  if (/tecnolog[aí]a|ciber/.test(n)) return 'access-point';
  if (/moda|estilo/.test(n)) return 'hanger';
  if (/gastronom|comida|cocina/.test(n)) return 'silverware-fork-knife';
  if (/animal|mascota/.test(n)) return 'paw';
  if (/famoso|celebridad/.test(n)) return 'star-face';

  let hash = 0;
  for (let i = 0; i < categoryId.length; i += 1) {
    hash = (hash * 31 + categoryId.charCodeAt(i)) >>> 0;
  }
  return FALLBACK_ICONS[hash % FALLBACK_ICONS.length] as MaterialIconName;
}

function formatCOP(value: number): string {
  const integer = Math.round(value).toString();
  return `$${integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

/**
 * Counts down to the voting close time (rooms.startTime). Before the snapshot
 * loads it shows the full 45s window.
 */
function useVotingCountdown(endsAtIso: string | null): { display: string; secondsLeft: number } {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  return useMemo(() => {
    let secondsLeft: number;

    if (endsAtIso) {
      const end = new Date(endsAtIso).getTime();
      secondsLeft = Math.max(0, Math.ceil((end - now) / 1000));
    } else {
      secondsLeft = Math.floor(VOTING_WINDOW_MS / 1000);
    }

    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    return { display, secondsLeft };
  }, [now, endsAtIso]);
}

const appVersion = Constants.expoConfig?.version || '1.0.0';

export function CategoryVotingScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const { roomId } = route.params as RootStackParamList['CategoryVoting'];

  const user = useAuthStore((state) => state.user);
  const avatarUrl = user?.avatarUrl ?? null;
  const name = user?.name ?? 'Usuario';
  const balance = user?.balance_lucas ?? 0;

  const status = useVotingStore((s) => s.status);
  const categories = useVotingStore((s) => s.categories);
  const rankings = useVotingStore((s) => s.rankings);
  const totalVotes = useVotingStore((s) => s.totalVotes);
  const maxPlayers = useVotingStore((s) => s.maxPlayers);
  const endsAtIso = useVotingStore((s) => s.endsAtIso);
  const myVote = useVotingStore((s) => s.myVote);
  const isSubmitting = useVotingStore((s) => s.isSubmitting);
  const error = useVotingStore((s) => s.error);

  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);
  const [submittingCategoryId, setSubmittingCategoryId] = useState<string | null>(null);

  const exitingRef = useRef(false);
  const allowLeaveRef = useRef(false);

  const hasVoted = Boolean(myVote.categoryId);

  // ---------- Init + cleanup ----------
  useEffect(() => {
    void useVotingStore.getState().init(roomId);
    return () => useVotingStore.getState().reset();
  }, [roomId]);

  // ---------- Block leaving the screen ----------
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (allowLeaveRef.current) {
        return;
      }
      e.preventDefault();
    });
    return unsubscribe;
  }, [navigation]);

  // ---------- Real-time room status (voting → active game) ----------
  const handleActive = useCallback(() => {
    if (exitingRef.current) {
      return;
    }
    exitingRef.current = true;
    allowLeaveRef.current = true;
    navigation.replace('ActiveGame', { roomId });
  }, [navigation, roomId]);

  useEffect(() => {
    const unsubscribe = subscribeToRoomById(roomId, (room) => {
      if (room.status === 'ACTIVE') {
        handleActive();
      }
    });
    return unsubscribe;
  }, [roomId, handleActive]);

  // ---------- Real-time votes ----------
  useEffect(() => {
    const unsubscribe = subscribeToParticipantVotes(roomId, (change) => {
      useVotingStore.getState().applyVoteDelta(change);
    });
    return unsubscribe;
  }, [roomId]);

  // ---------- Fallback when the countdown reaches zero ----------
  const countdown = useVotingCountdown(endsAtIso);

  useEffect(() => {
    if (status !== 'ready' || countdown.secondsLeft > 0) {
      return;
    }

    let cancelled = false;
    const timeout = setTimeout(async () => {
      try {
        const room = await getWaitingRoom(roomId);
        if (cancelled) {
          return;
        }
        if (room.status === 'ACTIVE') {
          handleActive();
        } else if (room.status === 'VOTING') {
          useVotingStore.setState({ endsAtIso: room.startTime });
        }
      } catch {
        // Si el fallback falla, el canal Realtime de rooms sigue activo.
      }
    }, 2000);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [countdown.secondsLeft, status, roomId, handleActive]);

  // ---------- Errors ----------
  useEffect(() => {
    if (!error) {
      return;
    }
    setToast({ type: 'error', message: error });
    useVotingStore.setState({ error: null });
  }, [error]);

  // ---------- Voting action ----------
  const handleVote = useCallback(
    async (categoryId: string) => {
      if (isSubmitting || myVote.categoryId) {
        return;
      }
      setSubmittingCategoryId(categoryId);
      await useVotingStore.getState().vote(categoryId);
      setSubmittingCategoryId(null);
    },
    [isSubmitting, myVote.categoryId],
  );

  // Color estable por categoría (orden alfabético del backend).
  const colorOf = useCallback(
    (categoryId: string): string => {
      const index = categories.findIndex((c) => c.id === categoryId);
      const safeIndex = index === -1 ? 0 : index;
      return CATEGORY_COLORS[safeIndex % CATEGORY_COLORS.length];
    },
    [categories],
  );

  const featuredColor = useCallback(
    (index: number): string => CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    [],
  );

  const totalVotesPill = `${totalVotes} / ${maxPlayers} jugadores`;

  if (status === 'loading') {
    return (
      <BaseLayout>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={styles.loadingText}>Preparando votación…</Text>
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

        {hasVoted ? (
          <>
            {/* ================= ESTADO B: RESULTADOS EN VIVO ================= */}
            <View style={styles.headerBlock}>
              <View style={styles.modeBadge}>
                <View style={styles.modeDot} />
                <Text style={styles.modeBadgeText}>VOTACIÓN EN VIVO</Text>
              </View>

              <Text style={styles.title}>RESULTADOS DE VOTACIÓN</Text>
              <Text style={styles.subtitle}>
                La categoría con mayor votación al terminar el tiempo será la jugada en la
                partida.
              </Text>

              <TimerPill label="CIERRE DE VOTACIÓN" time={countdown.display} />

              <View style={styles.totalVotesPill}>
                <MaterialCommunityIcons name="checkbox-blank-circle" size={10} color={palette.neonGreen} />
                <Text style={styles.totalVotesText}>
                  {`Total votos: ${totalVotesPill}`}
                </Text>
              </View>
            </View>

            {rankings.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>Aún no hay votos registrados.</Text>
              </View>
            ) : (
              rankings.map((entry) => (
                <ResultCard
                  key={entry.category.id}
                  entry={entry}
                  color={colorOf(entry.category.id)}
                  maxPlayers={maxPlayers}
                />
              ))
            )}
          </>
        ) : (
          <>
            {/* ================= ESTADO A: SELECCIÓN DE CATEGORÍA ================= */}
            <View style={styles.headerBlock}>
              <View style={styles.modeBadge}>
                <View style={styles.modeDot} />
                <Text style={styles.modeBadgeText}>MODO TORNEO</Text>
              </View>

              <Text style={styles.title}>ELIGE TU CATEGORÍA</Text>
              <Text style={styles.subtitle}>
                Selecciona tu especialidad, compite con otros jugadores y gana premios en
                efectivo.
              </Text>

              <TimerPill label="CIERRE DE SELECCIÓN" time={countdown.display} />
            </View>

            {categories.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>
                  No hay categorías disponibles en este momento.
                </Text>
                <Pressable
                  onPress={() => void useVotingStore.getState().init(roomId)}
                  style={({ pressed }) => [styles.retryButton, pressed && styles.pressedDown]}
                >
                  <Text style={styles.retryButtonText}>REINTENTAR</Text>
                </Pressable>
              </View>
            ) : (
              categories.map((category, index) => (
                <SelectionCard
                  key={category.id}
                  name={category.name}
                  categoryId={category.id}
                  color={featuredColor(index)}
                  featured={index === 0}
                  showTopCol={index === 1}
                  isLoading={submittingCategoryId === category.id}
                  disabled={isSubmitting}
                  onVote={() => void handleVote(category.id)}
                />
              ))
            )}
          </>
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

/* ------------------------------- Componentes ------------------------------- */

function TimerPill({ label, time }: { label: string; time: string }) {
  return (
    <View style={styles.timerPill}>
      <MaterialCommunityIcons name="clock-outline" size={14} color={palette.neonGreen} />
      <Text style={styles.timerPillLabel}>{`${label}: `}</Text>
      <Text style={styles.timerPillValue}>{time}</Text>
    </View>
  );
}

function SelectionCard({
  name,
  categoryId,
  color,
  featured,
  showTopCol,
  isLoading,
  disabled,
  onVote,
}: {
  name: string;
  categoryId: string;
  color: string;
  featured: boolean;
  showTopCol: boolean;
  isLoading: boolean;
  disabled: boolean;
  onVote: () => void;
}) {
  return (
    <Pressable
      onPress={onVote}
      disabled={disabled}
      style={({ pressed }) => [
        styles.selectCard,
        pressed && !disabled && styles.pressedDown,
      ]}
    >
      <View
        style={[
          styles.selectIconCircle,
          { backgroundColor: `${color}22`, borderColor: `${color}66` },
        ]}
      >
        <MaterialCommunityIcons name={categoryIcon(categoryId, name)} size={22} color={color} />
      </View>

      <View style={styles.selectInfo}>
        <Text style={styles.selectName}>{name}</Text>
        <View style={styles.selectBadges}>
          {featured ? (
            <View style={styles.hotBadge}>
              <Text style={styles.hotBadgeText}>HOT</Text>
            </View>
          ) : null}
          {showTopCol ? (
            <View style={styles.topColBadge}>
              <Text style={styles.topColBadgeText}>TOP COL</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={[styles.voteButton, featured && styles.voteButtonFeaturedBg]}>
        {isLoading ? (
          <ActivityIndicator size="small" color={featured ? '#000000' : palette.primary} />
        ) : (
          <Text
            style={[
              styles.voteButtonText,
              featured && styles.voteButtonTextFeatured,
            ]}
          >
            VOTAR »
          </Text>
        )}
      </View>
    </Pressable>
  );
}

function ResultCard({
  entry,
  color,
  maxPlayers,
}: {
  entry: RankedCategory;
  color: string;
  maxPlayers: number;
}) {
  const { category, votes, position } = entry;
  const fillPct: DimensionValue =
    maxPlayers > 0 ? `${Math.min(100, (votes / maxPlayers) * 100)}%` : '0%';
  const badgeColor = POSITION_BADGE_COLORS[position as keyof typeof POSITION_BADGE_COLORS] ?? '#6E7480';

  return (
    <View style={[styles.resultCard, { borderColor: color }]}>
      <View style={styles.resultRow}>
        {/* Left: icon + position badge + name + count */}
        <View style={styles.resultLeft}>
          <View style={styles.resultIconWrap}>
            <View
              style={[
                styles.resultIconCircle,
                { backgroundColor: `${color}22`, borderColor: `${color}66` },
              ]}
            >
              <MaterialCommunityIcons
                name={categoryIcon(category.id, category.name)}
                size={22}
                color={color}
              />
            </View>
            <View style={[styles.positionBadge, { backgroundColor: badgeColor }]}>
              <Text style={styles.positionBadgeText}>#{position}</Text>
            </View>
          </View>

          <View style={styles.resultInfo}>
            <Text style={styles.resultName}>{category.name}</Text>
            <Text style={styles.resultCount}>{`${votes} votos registrados`}</Text>
          </View>
        </View>

        {/* Right: top badges + percent + position label */}
        <View style={styles.resultRight}>
          {position === 1 ? (
            <View style={styles.leaderBadge}>
              <Text style={styles.leaderBadgeText}>👑 LÍDER</Text>
            </View>
          ) : position === 2 ? (
            <View style={styles.secondBadge}>
              <Text style={styles.secondBadgeText}>2º LUGAR</Text>
            </View>
          ) : null}

          <Text style={[styles.resultPercent, { color }]}>{entry.percent}%</Text>
          <Text style={styles.resultPositionLabel}>{`${position}º Lugar`}</Text>
        </View>
      </View>

      {/* Progress bar with the category color */}
      <View style={styles.resultProgressTrack}>
        <View style={[styles.resultProgressFill, { width: fillPct, backgroundColor: color }]} />
      </View>
    </View>
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
  headerBlock: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 0, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 80, 80, 0.5)',
    marginBottom: 14,
  },
  modeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4D4D',
  },
  modeBadgeText: {
    color: '#FF6B6B',
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: palette.white,
    fontSize: 26,
    fontFamily: 'Inter_900Black',
    textAlign: 'center',
    letterSpacing: 0.4,
    marginBottom: 10,
  },
  subtitle: {
    color: '#A0A0A0',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 19,
    textAlign: 'center',
    paddingHorizontal: 6,
    marginBottom: 18,
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.neonGreen,
    backgroundColor: 'rgba(0, 255, 127, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 9,
    alignSelf: 'center',
  },
  timerPillLabel: {
    color: '#A0A0A0',
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
  timerPillValue: {
    color: palette.neonGreen,
    fontSize: 12,
    fontFamily: 'Inter_900Black',
  },
  totalVotesPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 255, 127, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 127, 0.35)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 12,
    alignSelf: 'center',
  },
  totalVotesText: {
    color: palette.neonGreen,
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.3,
  },
  selectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16161C',
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    padding: 14,
    marginBottom: 12,
  },
  selectIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  selectInfo: {
    flex: 1,
    gap: 6,
  },
  selectName: {
    color: palette.white,
    fontSize: 15,
    fontFamily: 'Inter_900Black',
  },
  selectBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  hotBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#FF007F',
  },
  hotBadgeText: {
    color: '#000000',
    fontSize: 9,
    fontFamily: 'Inter_900Black',
    letterSpacing: 0.4,
  },
  topColBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(0, 140, 70, 0.85)',
  },
  topColBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: 'Inter_900Black',
    letterSpacing: 0.4,
  },
  voteButton: {
    minWidth: 76,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    marginLeft: 8,
  },
  voteButtonFeaturedBg: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  voteButtonText: {
    color: palette.primary,
    fontSize: 12,
    fontFamily: 'Inter_900Black',
    letterSpacing: 0.3,
  },
  voteButtonTextFeatured: {
    color: '#000000',
  },
  resultCard: {
    backgroundColor: '#16161C',
    borderRadius: 18,
    borderWidth: 1.2,
    padding: 14,
    marginBottom: 12,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  resultLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingRight: 12,
  },
  resultIconWrap: {
    position: 'relative',
    marginRight: 12,
  },
  resultIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  positionBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: 'Inter_900Black',
  },
  resultInfo: {
    flex: 1,
    gap: 4,
  },
  resultName: {
    color: palette.white,
    fontSize: 15,
    fontFamily: 'Inter_900Black',
  },
  resultCount: {
    color: '#A0A0A0',
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
  resultRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  leaderBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#FF007F',
  },
  leaderBadgeText: {
    color: '#000000',
    fontSize: 10,
    fontFamily: 'Inter_900Black',
    letterSpacing: 0.4,
  },
  secondBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#00C157',
  },
  secondBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'Inter_900Black',
    letterSpacing: 0.4,
  },
  resultPercent: {
    fontSize: 24,
    fontFamily: 'Inter_900Black',
    marginTop: 4,
  },
  resultPositionLabel: {
    color: '#888888',
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
  },
  resultProgressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginTop: 14,
    overflow: 'hidden',
  },
  resultProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  emptyCard: {
    backgroundColor: '#16161C',
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    padding: 24,
    alignItems: 'center',
    gap: 16,
  },
  emptyText: {
    color: palette.profileSubtitle,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 19,
  },
  retryButton: {
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: palette.primary,
  },
  retryButtonText: {
    color: palette.primary,
    fontSize: 11,
    fontFamily: 'Inter_900Black',
    letterSpacing: 0.5,
  },
  pressedDown: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
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