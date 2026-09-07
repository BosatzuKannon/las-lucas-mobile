import { create } from 'zustand';
import type { ToastType } from '../components/GenericToast';

type ToastState = {
  toast: { type: ToastType; message: string; key: number } | null;
  showToast: (type: ToastType, message: string) => void;
  hideToast: () => void;
};

/**
 * Global toast store. Rendered once at the navigator root so a toast can
 * survive screen transitions (e.g. the debit confirmation shown right after
 * navigating to the waiting room, or the cancellation notice shown when the
 * user is sent back to the tournament list).
 */
export const useToastStore = create<ToastState>((set) => ({
  toast: null,
  showToast: (type, message) =>
    set((state) => ({
      toast: { type, message, key: (state.toast?.key ?? 0) + 1 },
    })),
  hideToast: () => set({ toast: null }),
}));