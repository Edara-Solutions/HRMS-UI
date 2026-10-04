import type { NotificationFeedItem } from "@/features/notification/api/notification-transport";

/** Wire-valid notification rows. `n` maps to a stable public ID so tests can name rows by number. */
export function notificationId(n: number) {
  return `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

export function notificationItem(
  n: number,
  createdAt = `2026-08-25T0${n % 10}:00:00.000Z`,
  overrides: Record<string, unknown> = {},
) {
  return {
    publicId: notificationId(n),
    typeKey: "company.user-joined",
    typeVersion: 1,
    importance: "normal",
    params: {},
    subject: null,
    createdAt,
    seenAt: null,
    readAt: null,
    actor: { kind: "SYSTEM" },
    ...overrides,
  };
}

export function notificationPage(items: unknown[], nextCursor: string | null = null) {
  return { items, nextCursor, hasMore: nextCursor !== null };
}

/** A row as the feature models it: generated wire fields without the actor. */
export function notificationRow(
  n: number,
  typeKey = "company.user-joined",
  createdAt = `2026-08-25T0${n % 10}:00:00.000Z`,
): NotificationFeedItem {
  return {
    publicId: notificationId(n),
    typeKey,
    typeVersion: 1,
    importance: "normal",
    params: {},
    subject: null,
    createdAt,
    seenAt: null,
    readAt: null,
  };
}
