import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  status: string;
  balanceLucas: number;
  isPro: boolean;
  isVerified: boolean;
};

type AuthState = {
  accessToken: string | null;
  user: AuthUser | null;
  setSession: (accessToken: string, user: AuthUser) => void;
  setUser: (user: AuthUser) => void;
  clearSession: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setSession: (accessToken, user) => set({ accessToken, user }),
      setUser: (user) => set({ user }),
      clearSession: () => set({ accessToken: null, user: null }),
    }),
    {
      name: 'las-lucas-auth',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);