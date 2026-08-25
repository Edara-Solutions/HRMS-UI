import { useNavigate } from "@tanstack/react-router";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { usePreferencesStore } from "@/shared/config";
import { cn } from "@/shared/lib/cn";
import { useClippedText } from "@/shared/lib/use-clipped-text";
import { Tooltip } from "@/shared/ui/tooltip";
import type { NotificationFeedItem } from "../api/notification-feed";
import { formatRelativeTime } from "../lib/relative-time";
import {
  NOTIFICATION_CATALOG,
  type NotificationRoute,
  type NotificationTone,
} from "../model/notification-catalog";
import { resolveNotificationCopy } from "../model/notification-copy";
import type { NotificationRowState } from "../model/notification-read-state";

const toneClassName: Record<NotificationTone, string> = {
  info: "bg-[var(--color-info-soft)] text-[var(--color-info)]",
  success: "bg-[var(--color-success-soft)] text-[var(--color-success)]",
  warning: "bg-[var(--color-warning-soft)] text-[var(--color-warning)]",
};

const rowClassName = "flex w-full items-start gap-2.5 px-4 py-2.5 text-start";

/** The whole unseen-to-read visual arc in one table: wash, tile, title, body. */
const stateClassName: Record<
  NotificationRowState,
  { row: string; tile: string; title: string; body: string }
> = {
  unseen: {
    row: "bg-[color-mix(in_srgb,var(--color-primary-soft)_55%,var(--color-surface))]",
    tile: "",
    title: "text-[var(--color-text)]",
    body: "text-[var(--color-text-muted)]",
  },
  settled: {
    row: "",
    tile: "",
    title: "text-[var(--color-text)]",
    body: "text-[var(--color-text-muted)]",
  },
  read: {
    row: "",
    tile: "opacity-70",
    title: "text-[var(--color-text-muted)]",
    body: "text-[var(--color-text-faint)]",
  },
};

interface NotificationRowProps {
  item: NotificationFeedItem;
  state: NotificationRowState;
  /** Marks the row read and closes the panel; only clickable rows can reach it. */
  onActivate: () => void;
}

export function NotificationRow({ item, state, onActivate }: NotificationRowProps) {
  const { t } = useTranslation("notification", { useSuspense: false });
  const locale = usePreferencesStore((preferences) => preferences.locale);
  const navigate = useNavigate();
  const titleRef = useRef<HTMLSpanElement>(null);
  const bodyRef = useRef<HTMLSpanElement>(null);

  const entry = NOTIFICATION_CATALOG.get(item.typeKey);
  const copy = resolveNotificationCopy(item, t, locale);
  const titleClipped = useClippedText(titleRef, copy?.title ?? "");
  const bodyClipped = useClippedText(bodyRef, copy?.body ?? "");

  if (!entry || !copy) {
    return null;
  }

  const route = entry.route?.(item.subject) ?? null;
  const Icon = entry.icon;
  const presentation = stateClassName[state];

  const content = (
    <>
      {state === "unseen" ? (
        <span
          aria-hidden="true"
          className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--color-primary)]"
        />
      ) : null}
      <span
        aria-hidden="true"
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-md)]",
          toneClassName[entry.tone],
          presentation.tile,
        )}
      >
        <Icon size={14} />
      </span>
      <Tooltip
        content={
          <span className="block">
            <span className="block font-semibold">{copy.title}</span>
            <span className="mt-0.5 block font-normal">{copy.body}</span>
          </span>
        }
        disabled={!titleClipped && !bodyClipped}
        placement="below"
        className="min-w-0 flex-1"
      >
        <span
          ref={titleRef}
          className={cn("block truncate text-[13px] font-medium leading-snug", presentation.title)}
        >
          {copy.title}
        </span>
        <span
          ref={bodyRef}
          className={cn("mt-0.5 block truncate text-xs leading-snug", presentation.body)}
        >
          {copy.body}
        </span>
      </Tooltip>
      <time
        dateTime={item.createdAt}
        className="shrink-0 pt-0.5 text-[11px] tabular-nums text-[var(--color-text-faint)]"
      >
        {formatRelativeTime(item.createdAt, locale)}
      </time>
    </>
  );

  if (!route) {
    return <li className={cn(rowClassName, presentation.row)}>{content}</li>;
  }

  return (
    <li className={presentation.row}>
      <button
        type="button"
        onClick={() => {
          onActivate();
          navigateTo(navigate, route);
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
