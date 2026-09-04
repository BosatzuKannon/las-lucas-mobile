import { useCallback, useEffect, useState } from 'react';
import { Linking, View, StyleSheet, Image } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';
import * as WebBrowser from 'expo-web-browser';
import { BaseLayout } from '../../../components/BaseLayout';
import { CapsuleButton } from '../../../components/CapsuleButton';
import { CapsulePill } from '../../../components/CapsulePill';
import { GenericToast } from '../../../components/GenericToast';
import type { ToastType } from '../../../components/GenericToast';
import {
  GOOGLE_OAUTH_REDIRECT_URL,
  getTokensFromUrl,
  persistAuthSession,
  replaceSessionFromUri,
  supabase,
} from '../../../services/supabase';
import palette from '../../../theme/colors';

export function LoginScreen() {
  const theme = useTheme<MD3Theme>();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      void persistAuthSession(session);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  const finishAuthFromUrl = useCallback(async (url: string) => {
    try {
      const handled = await replaceSessionFromUri(url);
      if (!handled) {
        const tokens = getTokensFromUrl(url);
        if (tokens.error || tokens.error_description) {
          setToast({
            type: 'error',
            message:
              tokens.error_description ?? tokens.error ?? 'No se pudo iniciar sesión. Inténtalo de nuevo.',
          });
        }
      }
    } catch (error) {
      setToast({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'No se pudo iniciar sesión. Inténtalo de nuevo.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleUrl = (event: { url: string }) => {
      void finishAuthFromUrl(event.url);
    };

    const subscription = Linking.addEventListener('url', handleUrl);
    Linking.getInitialURL().then((url) => {
      if (url) void finishAuthFromUrl(url);
    });

    return () => subscription.remove();
  }, [finishAuthFromUrl]);

  const handleGooglePress = useCallback(async () => {
    setLoading(true);
    setToast(null);

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: GOOGLE_OAUTH_REDIRECT_URL,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;
      if (!data.url) {
        throw new Error('No se pudo iniciar el flujo de Google.');
      }

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        GOOGLE_OAUTH_REDIRECT_URL,
      );

      if (result.type === 'success' && result.url) {
        await finishAuthFromUrl(result.url);
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
      setToast({
        type: 'error',
        message: 'No ha sido posible iniciar sesion con google.',
      });
    }
  }, [finishAuthFromUrl]);

  return (
    <>
      <BaseLayout>
        <View style={styles.root}>
        {/* Floating header pills */}
        <View style={styles.header}>
          <CapsulePill
            label="SERVIDOR EN VIVO"
            dotColor={palette.secondary}
            textColor={palette.white}
          />
          <CapsulePill
            label="100% SEGURO"
            textColor={palette.onSurfaceVariant}
          />
        </View>

        {/* Center — brand identity */}
        <View style={styles.brandSection}>
          <View style={styles.logoWrap}>
            <Image
              source={require('../../../../assets/logonobg.png')}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="Logo Las Lucas"
            />
          </View>

          <CapsulePill
            label="TRIVIA EN VIVO • DINERO REAL"
            textColor={palette.secondary}
            backgroundColor="rgba(0, 255, 127, 0.08)"
            borderColor="rgba(0, 255, 127, 0.25)"
            dotColor={palette.secondary}
            containerStyle={styles.playTag}
          />

          <Text style={[styles.description, { color: palette.onSurface }]}>
            Demuestra tu conocimiento, compite en tiempo real contra otros
            jugadores y gana dinero real con cada partida.
          </Text>
        </View>

        {/* Footer — sign in */}
        <View style={styles.footer}>
          <CapsuleButton
            label="Continuar con Google"
            variant="google"
            onPress={handleGooglePress}
            disabled={loading}
            style={styles.googleButton}
            icon={
              <Image
                source={require('../../../../assets/icons/google.png')}
                style={styles.googleIcon}
              />
            }
          />

          <CapsulePill
            label="+18  Juega con responsabilidad"
            textColor={palette.onSurfaceVariant}
            backgroundColor="rgba(46, 42, 43, 0.72)"
            borderColor="rgba(255, 255, 255, 0.10)"
            containerStyle={styles.ageBadge}
          />

          <Text style={[styles.legalNote, { color: theme.colors.onSurfaceVariant }]}>
            Al continuar aceptas los{' '}
            <Text style={styles.legalLink}>Términos y Condiciones</Text> y la{' '}
            <Text style={styles.legalLink}>Política de Privacidad</Text> de Las Lucas.
          </Text>
        </View>
      </View>
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
  root: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 26,
  },
  logo: {
    width: 168,
    height: 168,
  },
  playTag: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    paddingHorizontal: 12,
    maxWidth: 320,
  },
  footer: {
    gap: 14,
    alignItems: 'center',
  },
  googleButton: {
    width: '100%',
  },
  googleIcon: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  ageBadge: {
    alignSelf: 'center',
    marginTop: 2,
  },
  legalNote: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 16,
  },
  legalLink: {
    fontWeight: '700',
    color: palette.onSurfaceVariant,
    textDecorationLine: 'underline',
  },
});