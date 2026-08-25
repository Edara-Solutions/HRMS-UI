import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { usePreferencesStore } from "@/shared/config";
import { cn } from "@/shared/lib/cn";
import type { NotificationFeedItem } from "../api/notification-feed";
import { formatRelativeTime } from "../lib/relative-time";
import {
  NOTIFICATION_CATALOG,
  type NotificationRoute,
  type NotificationTone,
} from "../model/notification-catalog";
import { resolveNotificationCopy } from "../model/notification-copy";

const toneClassName: Record<NotificationTone, string> = {
  info: "bg-[var(--color-info-soft)] text-[var(--color-info)]",
  success: "bg-[var(--color-success-soft)] text-[var(--color-success)]",
  warning: "bg-[var(--color-warning-soft)] text-[var(--color-warning)]",
};

const rowClassName = "flex w-full items-start gap-2.5 px-4 py-2.5 text-start";

const unseenRowClassName =
  "bg-[color-mix(in_srgb,var(--color-primary-soft)_55%,var(--color-surface))]";

interface NotificationRowProps {
  item: NotificationFeedItem;
  /** Closes the panel once a clickable row has navigated. */
  onNavigate: () => void;
}

export function NotificationRow({ item, onNavigate }: NotificationRowProps) {
  const { t } = useTranslation("notification");
  const locale = usePreferencesStore((state) => state.locale);
  const navigate = useNavigate();

  const entry = NOTIFICATION_CATALOG.get(item.typeKey);
  const copy = resolveNotificationCopy(item, t, locale);

  if (!entry || !copy) {
    return null;
  }

  const route = entry.route?.(item.subject) ?? null;
  const Icon = entry.icon;
  const unseen = item.seenAt === null;

  const content = (
    <>
      {unseen && (
        <span
          aria-hidden="true"
          className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--color-primary)]"
        />
      )}
      <span
        aria-hidden="true"
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-md)]",
          toneClassName[entry.tone],
        )}
      >
        <Icon size={14} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium leading-snug text-[var(--color-text)]">
          {copy.title}
        </span>
        <span className="mt-0.5 block truncate text-xs leading-snug text-[var(--color-text-muted)]">
          {copy.body}
        </span>
      </span>
      <time
        dateTime={item.createdAt}
        className="shrink-0 pt-0.5 text-[11px] tabular-nums text-[var(--color-text-faint)]"
      >
        {formatRelativeTime(item.createdAt, locale)}
      </time>
    </>
  );

  if (!route) {
    return <li className={cn(rowClassName, unseen && unseenRowClassName)}>{content}</li>;
  }

  return (
    <li className={cn(unseen && unseenRowClassName)}>
      <button
        type="button"
        onClick={() => {
          navigateTo(navigate, route);
          onNavigate();
        }}
        className={cn(
          rowClassName,
          "cursor-pointer transition-colors duration-[var(--motion-fast)] ease-[var(--motion-easing)] hover:bg-[var(--color-surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-primary)]",
        )}
      >
        {content}
      </button>
    </li>
  );
}

function navigateTo(navigate: ReturnType<typeof useNavigate>, route: NotificationRoute) {
  if (route.to === "/admin/conversion-requests/$publicId") {
    void navigate({ to: route.to, params: { publicId: route.publicId } });
    return;
  }

  void navigate({ to: route.to });
}
