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

  await refreshUserFromDatabase(session.user.id);
  subscribeToUserChanges(session.user.id);
}

type DbUserRow = {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  status: string;
  balance_lucas: number;
  is_pro: boolean;
  is_verified: boolean;
};

/** Fetches the latest users row so balance_lucas is reflected in Zustand. */
export async function refreshUserFromDatabase(userId: string): Promise<void> {
  const { data, error } = await supabase
    .from('users')
    .select(
      'id, email, name, avatar_url, status, balance_lucas, is_pro, is_verified',
    )
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    return;
  }

  const current = useAuthStore.getState().user;
  if (current) {
    useAuthStore.getState().setUser({
      ...current,
      balance_lucas: data.balance_lucas,
    });
  }
}

const subscribedUserIds = new Set<string>();

/** Subscribes to live UPDATEs of the users row to keep the balance in sync. */
export function subscribeToUserChanges(userId: string): void {
  console.log('Realtime UserID:', userId);

  if (!userId || typeof userId !== 'string') {
    console.warn('Realtime: skipping subscription, no valid userId', userId);
    return;
  }

  if (subscribedUserIds.has(userId)) {
    return;
  }
  subscribedUserIds.add(userId);

  const filter = `id=eq.${userId}`;
  console.log('Realtime filter:', filter);

  const channel = supabase
    .channel('public:users')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'users',
        filter,
      },
      (payload) => {
        const row = payload.new as Partial<DbUserRow>;
        const current = useAuthStore.getState().user;

        if (!current || !row.id) {
          return;
        }

        useAuthStore
          .getState()
          .setUser({ ...current, balance_lucas: row.balance_lucas ?? current.balance_lucas });
      },
    )
    .subscribe();
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
    balance_lucas: 0,
    isPro: meta.isPro === true || meta.is_pro === true,
    isVerified: meta.isVerified === true || meta.is_verified === true,
  };
}