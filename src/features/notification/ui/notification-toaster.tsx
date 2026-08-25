import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNotificationArrivals } from "../lib/use-notification-arrivals";
import { useToastStore } from "../model/toast-store";
import { NotificationToastCard } from "./notification-toast";

/**
 * The app-wide toast stack: bottom inline-end, newest closest to the corner, at most three cards
 * with everything older folded into a count. Mounted once per shell, and the host of the arrival
 * watch that turns high-importance feed deltas into toasts here.
 */
export function NotificationToaster() {
  const { t } = useTranslation("notification", { useSuspense: false });
  const toasts = useToastStore((state) => state.toasts);
  const earlierCount = useToastStore((state) => state.earlierCount);
  const [paused, setPaused] = useState(false);

  useNotificationArrivals();

  return (
    <div
      role="region"
      aria-label={t("toast.region")}
      className="pointer-events-none fixed bottom-4 end-4 z-50 flex w-[min(360px,calc(100vw-32px))] flex-col items-stretch gap-2"
    >
      {earlierCount > 0 ? (
        <p className="pointer-events-auto self-end rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-0.5 text-[11px] font-medium tabular-nums text-[var(--color-text-muted)]">
          {t("toast.earlier", { count: earlierCount })}
        </p>
      ) : null}

      {/* The list owns the pointer surface so crossing the gap between two cards is not a leave. */}
      <ol
        aria-live="polite"
        className="pointer-events-auto flex flex-col gap-2"
        onPointerEnter={() => setPaused(true)}
        onPointerLeave={() => setPaused(false)}
      >
        {toasts.map((toast) => (
          <NotificationToastCard key={toast.id} toast={toast} paused={paused} />
        ))}
      </ol>
    </div>
  );
}
