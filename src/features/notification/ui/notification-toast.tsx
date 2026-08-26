import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { usePreferencesStore } from "@/shared/config";
import { cn } from "@/shared/lib/cn";
import { useAutoDismiss } from "../lib/use-auto-dismiss";
import { NOTIFICATION_CATALOG } from "../model/notification-catalog";
import { resolveNotificationCopy } from "../model/notification-copy";
import {
  type NotificationToast,
  TOAST_DURATION_MS,
  type ToastTone,
  useToastStore,
} from "../model/toast-store";

const EXIT_DURATION_MS = 120;

/** Enter 180ms, exit 120ms, transform and opacity only — the reduced-motion block collapses both. */
const motionClassName = {
  entering: "translate-y-2 opacity-0 duration-[var(--motion-base)]",
  visible: "translate-y-0 opacity-100 duration-[var(--motion-base)]",
  leaving: "translate-y-1 opacity-0 duration-[var(--motion-fast)]",
};

const toneClassName: Record<ToastTone, string> = {
  info: "bg-[var(--color-info-soft)] text-[var(--color-info)]",
  success: "bg-[var(--color-success-soft)] text-[var(--color-success)]",
  warning: "bg-[var(--color-warning-soft)] text-[var(--color-warning)]",
  danger: "bg-[var(--color-danger-soft)] text-[var(--color-danger)]",
};

interface NotificationToastCardProps {
  toast: NotificationToast;
  /** True while the pointer rests on the stack; the auto-dismiss clock waits it out. */
  paused: boolean;
}

export function NotificationToastCard({ toast, paused }: NotificationToastCardProps) {
  const { t } = useTranslation("notification", { useSuspense: false });
  const locale = usePreferencesStore((preferences) => preferences.locale);
  const dismissToast = useToastStore((state) => state.dismissToast);
  const [entered, setEntered] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // The card animates itself out before it leaves the stack, so the store never holds exit state.
  useEffect(() => {
    if (!leaving) return;

    const timer = setTimeout(() => dismissToast(toast.id), EXIT_DURATION_MS);
    return () => clearTimeout(timer);
  }, [leaving, dismissToast, toast.id]);

  useAutoDismiss(TOAST_DURATION_MS[toast.tone], paused, () => setLeaving(true));

  const entry = NOTIFICATION_CATALOG.get(toast.typeKey);
  const copy = resolveNotificationCopy(toast, t, locale);

  if (!entry || !copy) {
    return null;
  }

  const Icon = entry.icon;
  const motion = leaving ? "leaving" : entered ? "visible" : "entering";

  return (
    <li
      className={cn(
        "flex items-start gap-2.5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-md)]",
        "transition-[transform,opacity] ease-[var(--motion-easing)]",
        motionClassName[motion],
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-md)]",
          toneClassName[toast.tone],
        )}
      >
        <Icon size={14} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium leading-snug text-[var(--color-text)]">
          {copy.title}
        </p>
        <p className="mt-0.5 text-xs leading-snug text-[var(--color-text-muted)]">{copy.body}</p>
      </div>

      <button
        type="button"
        title={t("toast.dismiss")}
        aria-label={t("toast.dismiss")}
        onClick={() => setLeaving(true)}
        className="-me-1 -mt-1 flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-md)] text-[var(--color-text-faint)] transition-colors duration-[var(--motion-fast)] ease-[var(--motion-easing)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
      >
        <X size={14} />
      </button>
    </li>
  );
}
