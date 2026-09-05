import { useState } from 'react';
import { ScrollView, StyleSheet, View, Image, Pressable, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import Constants from 'expo-constants';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BaseLayout } from '../../../components/BaseLayout';
import { GenericToast } from '../../../components/GenericToast';
import type { ToastType } from '../../../components/GenericToast';
import palette from '../../../theme/colors';
import { useAuthStore } from '../../../store/authStore';
import { supabase } from '../../../services/supabase';

type MenuItem = {
  key: string;
  title: string;
  subtitle: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
};

const MENU_ITEMS: MenuItem[] = [
  {
    key: 'information',
    title: 'Información',
    subtitle: 'Datos de tu cuenta',
    icon: 'card-account-details-outline',
  },
  {
    key: 'preferences',
    title: 'Preferencias',
    subtitle: 'Idioma y notificaciones',
    icon: 'tune-variant',
  },
  {
    key: 'privacy',
    title: 'Privacidad',
    subtitle: 'Seguridad y permisos',
    icon: 'shield-check-outline',
  },
  {
    key: 'terms',
    title: 'Términos',
    subtitle: 'Legales y condiciones',
    icon: 'file-document-outline',
  },
];

function formatBalance(balance: number): string {
  const integer = Math.round(balance).toString();
  return `$${integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

const appVersion = Constants.expoConfig?.version || '1.0.0';

export function ProfileScreen() {
  const user = useAuthStore((state) => state.user);

  const name = user?.name ?? 'Usuario';
  const email = user?.email ?? '';
  const avatarUrl = user?.avatarUrl ?? null;
  const balance = user?.balanceLucas ?? 0;
  const isPro = user?.isPro ?? false;
  const isVerified = user?.isVerified ?? false;

  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);

  const handleSignOut = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      setToast({ type: 'success', message: 'Sesión cerrada.' });
    } finally {
      useAuthStore.getState().clearSession();
    }
  };

  return (
    <>
      <BaseLayout>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header — avatar and user data */}
          <View style={styles.header}>
            <View style={styles.avatarContainer}>
              {avatarUrl ? (
                <View style={styles.avatarRing}>
                  <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                </View>
              ) : (
                <View style={[styles.avatarRing, styles.avatarFallback]}>
                  <Text style={styles.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              {isPro ? (
                <View style={styles.proBadge}>
                  <Text style={styles.proBadgeText}>★ PRO</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.nameRow}>
              <Text style={styles.nameText}>{name}</Text>
              {isVerified ? (
                <View style={styles.verifyBadge}>
                  <Text style={styles.verifyCheck}>✓</Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.emailText}>{email}</Text>
          </View>

          {/* Balance card */}
          <View style={styles.balanceCard}>
            <View style={styles.balanceLeft}>
              <MaterialCommunityIcons name="cash" size={18} color={palette.neonGreen} />
              <Text style={styles.balanceLabel}>Saldo</Text>
            </View>
            <Text style={styles.balanceAmount}>{formatBalance(balance)}</Text>
          </View>

          {/* Featured item — withdrawals */}
          <Pressable
            style={({ pressed }) => [styles.featuredItem, pressed && styles.pressedDown]}
            onPress={() => {}}
          >
            <View pointerEvents="none" style={styles.featuredInnerRing} />
            <View style={styles.featuredIconWrap}>
              <MaterialCommunityIcons name="wallet" size={26} color={palette.black} />
            </View>
            <View style={styles.itemCenter}>
              <View style={styles.itemTitleRow}>
                <Text style={styles.itemTitle}>Retiros de Dinero</Text>
                <View style={styles.instantBadge}>
                  <Text style={styles.instantBadgeText}>INSTANTÁNEO</Text>
                </View>
              </View>
              <Text style={styles.featuredSubtitle}>Transferencias a Nequi o Bancolombia</Text>
            </View>
            <View style={styles.chevronCircle}>
              <MaterialCommunityIcons name="chevron-right" size={20} color={palette.neonGreen} />
            </View>
          </Pressable>

          {/* Standard menu items */}
          {MENU_ITEMS.map((item) => (
            <Pressable
              key={item.key}
              style={({ pressed }) => [styles.standardItem, pressed && styles.pressedDown]}
              onPress={() => {}}
            >
              <View style={styles.standardIconWrap}>
                <MaterialCommunityIcons name={item.icon} size={20} color={palette.onSurface} />
              </View>
              <View style={styles.itemCenter}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={18}
                color="rgba(255, 255, 255, 0.30)"
              />
            </Pressable>
          ))}

          {/* Sign out */}
          <Pressable
            style={({ pressed }) => [
              styles.logoutButton,
              pressed && styles.pressedDown,
              isLoading && styles.logoutDisabled,
            ]}
            onPress={handleSignOut}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={palette.logoutAccent} />
            ) : (
              <>
                <MaterialCommunityIcons name="logout" size={20} color={palette.logoutAccent} />
                <Text style={styles.logoutText}>CERRAR SESIÓN</Text>
              </>
            )}
          </Pressable>

          {/* System footer */}
          <View style={styles.footer}>
            <View style={styles.statusPill}>
              <View style={styles.statusDot} />
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
  header: {
    alignItems: 'center',
    marginTop: 8,
  },
  avatarContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.profileIconCircle,
    borderWidth: 4,
    borderColor: 'rgba(0, 255, 0, 0.3)',
    shadowColor: palette.neonGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 14,
    shadowOpacity: 0.8,
    elevation: 15,
  },
  avatarRing: {
    flex: 1,
    width: '100%',
    borderRadius: 41,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 0, 0.55)',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: palette.white,
    fontSize: 34,
    fontFamily: 'Inter_800ExtraBold',
  },
  proBadge: {
    position: 'absolute',
    bottom: -10,
    alignSelf: 'center',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: palette.neonGreen,
  },
  proBadgeText: {
    color: palette.black,
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 0.4,
  },
  nameRow: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameText: {
    color: palette.white,
    fontSize: 22,
    fontWeight: '900',
    fontFamily: 'Inter_900Black',
  },
  verifyBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginLeft: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.neonGreen,
  },
  verifyCheck: {
    color: palette.white,
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 12,
  },
  emailText: {
    marginTop: 4,
    color: palette.profileEmail,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  balanceCard: {
    marginTop: 24,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: palette.profileCardBg,
  },
  balanceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceLabel: {
    marginLeft: 8,
    color: palette.profileLabel,
    fontSize: 14,
    fontWeight: '900',
    fontFamily: 'Inter_900Black',
  },
  balanceAmount: {
    color: palette.neonGreen,
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  featuredItem: {
    marginTop: 24,
    marginBottom: 12,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.profileFeaturedBg,
    borderWidth: 4,
    borderColor: 'rgba(0, 255, 0, 0.3)',
    shadowColor: palette.neonGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 14,
    shadowOpacity: 0.8,
    elevation: 15,
  },
  featuredInnerRing: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 3,
    bottom: 3,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 0, 0.55)',
  },
  featuredIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.neonGreen,
  },
  itemCenter: {
    flex: 1,
    marginLeft: 12,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemTitle: {
    color: palette.white,
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'Inter_900Black',
  },
  instantBadge: {
    marginLeft: 8,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: palette.neonGreen,
  },
  instantBadgeText: {
    color: palette.black,
    fontSize: 8.5,
    fontWeight: '800',
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 0.3,
  },
  featuredSubtitle: {
    marginTop: 4,
    color: palette.neonGreen,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  chevronCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  standardItem: {
    marginBottom: 12,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.profileItemBg,
  },
  standardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.profileIconCircle,
  },
  itemSubtitle: {
    marginTop: 2,
    color: palette.profileSubtitle,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  pressedDown: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  logoutButton: {
    marginTop: 16,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderWidth: 1,
    borderColor: palette.logoutBorder,
  },
  logoutText: {
    color: palette.logoutAccent,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  logoutDisabled: {
    opacity: 0.7,
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
  statusDot: {
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