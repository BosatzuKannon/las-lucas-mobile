import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { Session, User } from '@supabase/supabase-js';
import type { AuthUser } from '../store/authStore';
import { useAuthStore } from '../store/authStore';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY en el .env',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const GOOGLE_OAUTH_REDIRECT_URL =
  process.env.EXPO_PUBLIC_OAUTH_REDIRECT_URL ?? 'exp://192.168.40.9:8081';

export type AuthUrlTokens = {
  access_token?: string;
  refresh_token?: string;
  code?: string;
  error?: string;
  error_description?: string;
};

export function getTokensFromUrl(url: string): AuthUrlTokens {
  const raw = url.replace(/^[^?#]*/, '').slice(1);
  const params: Record<string, string> = {};

  for (const pair of raw.split('&')) {
    if (!pair) continue;
    const eq = pair.indexOf('=');
    const key = eq === -1 ? pair : pair.slice(0, eq);
    const value = eq === -1 ? '' : pair.slice(eq + 1);
    try {
      params[decodeURIComponent(key)] = decodeURIComponent(value);
    } catch {
      params[key] = value;
    }
  }

  return params;
}

export async function persistAuthSession(session: Session | null): Promise<void> {
  if (!session?.access_token || !session.user) return;

  useAuthStore
    .getState()
    .setSession(session.access_token, supabaseUserToAuthUser(session.user));
}

export async function replaceSessionFromUri(url: string): Promise<boolean> {
  const tokens = getTokensFromUrl(url);

  if (tokens.error || tokens.error_description) {
    throw new Error(
      tokens.error_description ?? tokens.error ?? 'La autenticación falló',
    );
  }

  if (tokens.access_token && tokens.refresh_token) {
    const { error } = await supabase.auth.setSession({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });
    if (error) throw error;
    return true;
  }

  if (tokens.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(tokens.code);
    if (error) throw error;
    return true;
  }

  return false;
}

export function supabaseUserToAuthUser(user: User): AuthUser {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const name =
    typeof meta.full_name === 'string'
      ? meta.full_name
      : typeof meta.name === 'string'
        ? meta.name
        : (user.email ?? 'Usuario');
  const avatarUrl =
    typeof meta.avatar_url === 'string'
      ? meta.avatar_url
      : typeof meta.picture === 'string'
        ? meta.picture
        : null;

  return {
    id: user.id,
    email: user.email ?? '',
    name,
    avatarUrl,
    status: 'ACTIVE',
    balanceLucas: 0,
    isPro: meta.isPro === true || meta.is_pro === true,
    isVerified: meta.isVerified === true || meta.is_verified === true,
  };
}