import { ScrollView, StyleSheet, View, Image, type DimensionValue } from 'react-native';
import { Text } from 'react-native-paper';
import Constants from 'expo-constants';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BaseLayout } from '../../../components/BaseLayout';
import palette from '../../../theme/colors';
import { useAuthStore } from '../../../store/authStore';

type Tournament = {
  id: string;
  type: string;
  startsIn: string;
  title: string;
  subtitle: string;
  prize: string;
  entryFee: string;
  spotsText: string;
  progress: DimensionValue;
  accentColor: string;
  extraLifeCost: string;
  mainActionText: string;
};

const MOCK_TOURNAMENTS: Tournament[] = [
  {
    id: '1',
    type: 'Trivia Pro Gamer',
    startsIn: '01:42 min',
    title: 'Copa Diamante E-Sports',
    subtitle: '15 preguntas • Categoría Gaming & Cultura Geek',
    prize: '$250.000 COP',
    entryFee: '$5.000 COP',
    spotsText: '42 / 50 casi lleno',
    progress: '84%',
    accentColor: '#FF0055',
    extraLifeCost: '+$2.000',
    mainActionText: 'Entrar a la Sala',
  },
  {
    id: '2',
    type: 'Modo Rápido',
    startsIn: '00:49 s',
    title: 'Torneo Relámpago COP',
    subtitle: '8 preguntas ultra veloces • Muerte súbita',
    prize: '$90.000 COP',
    entryFee: '$2.000 COP',
    spotsText: '28 / 30 listo',
    progress: '93%',
    accentColor: '#00FF00',
    extraLifeCost: '+$1.000',
    mainActionText: 'Unirse ahora',
  },
  {
    id: '3',
    type: 'Pozo Mayor',
    startsIn: '06:15 min',
    title: 'Gran Copa Las Lucas',
    subtitle: '20 preguntas multitema • Premios a los mejores 5',
    prize: '$500.000 COP',
    entryFee: '$10.000 COP',
    spotsText: '64 / 100 esperando',
    progress: '64%',
    accentColor: '#FFD700',
    extraLifeCost: '+$3.000',
    mainActionText: 'Reservar Cupo',
  },
  {
    id: '4',
    type: 'Duelo Rápido',
    startsIn: '03:20 min',
    title: 'Duelo Exprés Gamer',
    subtitle: '10 preguntas • Formato relámpago 1vs1v1',
    prize: '$40.000 COP',
    entryFee: '$1.000 COP',
    spotsText: '15 / 20 cupos',
    progress: '75%',
    accentColor: '#FFB6C1',
    extraLifeCost: '+$500',
    mainActionText: 'Entrar al Duelo',
  },
];

const appVersion = Constants.expoConfig?.version || '1.0.0';

export function TournamentsScreen() {
  const user = useAuthStore((state) => state.user);
  const avatarUrl = user?.avatarUrl ?? null;
  const name = user?.name ?? 'Usuario';

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
            <Text style={styles.balanceText}>$148.500</Text>
          </View>
        </View>

        {/* Header */}
        <Text style={styles.title}>Torneos</Text>
        <Text style={styles.description}>
          Compite en torneos de trivia en tiempo real, gana premios garantizados y demuestra que
          eres el mejor.
        </Text>

        {/* Tournament cards */}
        {MOCK_TOURNAMENTS.map((tournament) => (
          <View key={tournament.id} style={styles.card}>
            {/* Card header */}
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.typeBadge,
                  { borderColor: tournament.accentColor },
                ]}
              >
                <MaterialCommunityIcons
                  name="trophy-outline"
                  size={12}
                  color={tournament.accentColor}
                />
                <Text style={[styles.typeBadgeText, { color: tournament.accentColor }]}>
                  {tournament.type}
                </Text>
              </View>

              <View style={styles.timeBadge}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={12}
                  color={tournament.accentColor}
                />
                <Text style={[styles.timeBadgeText, { color: tournament.accentColor }]}>
                  {`Inicia en: ${tournament.startsIn}`}
                </Text>
              </View>
            </View>

            {/* Titles */}
            <Text style={styles.cardTitle}>{tournament.title}</Text>
            <Text style={styles.cardSubtitle}>{tournament.subtitle}</Text>

            {/* Prize / cost grid */}
            <View style={styles.infoRow}>
              <View style={styles.infoColumn}>
                <Text style={styles.infoLabel}>PREMIO GARANTIZADO</Text>
                <Text style={[styles.infoValue, { color: tournament.accentColor }]}>
                  {tournament.prize}
                </Text>
              </View>

              <View style={styles.infoColumn}>
                <Text style={styles.infoLabel}>COSTO ENTRADA</Text>
                <Text style={styles.entryValue}>{tournament.entryFee}</Text>
              </View>
            </View>

            {/* Progress bar */}
            <View style={styles.progressBlock}>
              <View style={styles.progressLabels}>
                <Text style={styles.progressLabel}>Cupos confirmados</Text>
                <Text style={styles.progressLabel}>{tournament.spotsText}</Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: tournament.progress,
                      backgroundColor: tournament.accentColor,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Action footer */}
            <View style={styles.cardActions}>
              <View
                style={[styles.primaryButton, { backgroundColor: tournament.accentColor }]}
              >
                <Text style={styles.primaryButtonText}>{tournament.mainActionText}</Text>
              </View>

              <View style={styles.extraLifeButton}>
                <Text style={[styles.extraLifeLabel, { color: tournament.accentColor }]}>
                  Vida extra
                </Text>
                <Text style={styles.extraLifePrice}>{tournament.extraLifeCost}</Text>
              </View>
            </View>
          </View>
        ))}

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
  },
  extraLifePrice: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'Inter_700Bold',
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
