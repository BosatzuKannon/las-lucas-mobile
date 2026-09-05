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
    key: 'recharge',
    title: 'Recargar Saldo',
    subtitle: 'Añade fondos a tu cuenta',
    icon: 'cash-plus',
  },
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
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatarImage, styles.avatarFallback]}>
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
                  <MaterialCommunityIcons name="check" size={12} color={palette.white} />
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

          {/* Standard menu items (including Recargar Saldo) */}
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
    backgroundColor: '#000000',
    borderWidth: 1.5,
    borderColor: palette.neonGreen,
    shadowColor: palette.neonGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 25,
    elevation: 20,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 45,
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
    bottom: -12,
    alignSelf: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: palette.neonGreen,
    zIndex: 10,
  },
  proBadgeText: {
    color: palette.black,
    fontSize: 11,
    fontWeight: '900',
    fontFamily: 'Inter_900Black',
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
    fontSize: 28,
    fontWeight: '900',
    fontFamily: 'Inter_900Black',
    letterSpacing: -0.5,
  },
  verifyBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginLeft: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.neonGreen,
  },
  emailText: {
    marginTop: 4,
    color: palette.profileEmail,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  balanceCard: {
    marginTop: 30,
    marginBottom: 14,
    borderRadius: 24,
    padding: 20,
    opacity: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: palette.profileItemBg,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.10)',
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
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'Inter_900Black',
  },
  featuredItem: {
    marginBottom: 14,
    borderRadius: 24,
    padding: 20,
    opacity: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.profileFeaturedBg,
    borderWidth: 1.5,
    borderColor: palette.neonGreen,
    shadowColor: palette.neonGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 15,
  },
  featuredIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
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
    fontSize: 17,
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
    fontSize: 9,
    fontWeight: '900',
    fontFamily: 'Inter_900Black',
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
    marginBottom: 14,
    borderRadius: 24,
    padding: 20,
    opacity: 1,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.profileItemBg,
  },
  standardIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
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
    marginTop: 20,
    height: 60,
    borderRadius: 30,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderWidth: 1.5,
    borderColor: palette.logoutAccent,
  },
  logoutText: {
    color: palette.logoutAccent,
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    marginLeft: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
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