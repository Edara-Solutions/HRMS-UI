import { create } from "zustand";
import { NOTIFICATION_CATALOG, type NotificationTone } from "./notification-catalog";

/**
 * Toast tones extend the catalog's set with `danger`, the one tone that never auto-dismisses.
 * No catalog type carries it — a sticky toast asks for it explicitly.
 */
export type ToastTone = NotificationTone | "danger";

/** How long a tone stays on screen; `null` keeps the toast until someone dismisses it. */
export const TOAST_DURATION_MS: Record<ToastTone, number | null> = {
  info: 5_000,
  success: 5_000,
  warning: 7_000,
  danger: null,
};

/** Beyond this the stack stops growing and older toasts collapse into the "+N earlier" pill. */
const MAX_VISIBLE_TOASTS = 3;

export interface ToastRequest {
  readonly typeKey: string;
  readonly params?: Record<string, unknown>;
  /** Overrides the tone the catalog gives the type. */
  readonly tone?: ToastTone;
}

export interface NotificationToast {
  readonly id: number;
  readonly typeKey: string;
  readonly params: Record<string, unknown>;
  readonly tone: ToastTone;
}

interface ToastState {
  toasts: readonly NotificationToast[];
  /** Toasts pushed out of the visible stack and still counted by the pill. */
  earlierCount: number;
  showToast: (request: ToastRequest) => void;
  dismissToast: (id: number) => void;
}

let lastToastId = 0;

/**
 * The toaster's whole state. Dismissal is presentation-only — nothing here talks to the server,
 * and a dismissed toast leaves its notification unread.
 */
export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  earlierCount: 0,

  showToast: (request) =>
    set((state) => {
      const entry = NOTIFICATION_CATALOG.get(request.typeKey);

      // A type the mirror does not know has no copy, tone or icon to render.
      if (!entry) {
        return state;
      }

      lastToastId += 1;

      const stack = [
        ...state.toasts,
        {
          id: lastToastId,
          typeKey: request.typeKey,
          params: request.params ?? {},
          tone: request.tone ?? entry.tone,
        },
      ];

      return {
        toasts: stack.slice(-MAX_VISIBLE_TOASTS),
        earlierCount: state.earlierCount + Math.max(0, stack.length - MAX_VISIBLE_TOASTS),
      };
    }),

  dismissToast: (id) =>
    set((state) => {
      const toasts = state.toasts.filter((toast) => toast.id !== id);

      // An empty stack has nothing left to be "earlier" than.
      return { toasts, earlierCount: toasts.length === 0 ? 0 : state.earlierCount };
    }),
}));
