import type { z } from "zod";
import {
  companyNotificationOperations,
  platformNotificationOperations,
  requestAudienceOperation,
  sendAudienceCommand,
} from "@/shared/api";
import type { NotificationTier } from "../model/notification-tier";

type CompanyFeedItem = z.output<
  (typeof companyNotificationOperations)["feed"]["responses"]["200"]
>["items"][number];
type PlatformFeedItem = z.output<
  (typeof platformNotificationOperations)["feed"]["responses"]["200"]
>["items"][number];

/**
 * One row as every shape renders it, whichever audience's generated contract delivered it. The
 * actor is deliberately dropped: the panel never names who acted, so it cannot disclose it.
 */
export type NotificationFeedItem = Omit<CompanyFeedItem | PlatformFeedItem, "actor" | "params"> & {
  readonly params: Record<string, unknown>;
};

/**
 * The count, seen and read operations share one shape across audiences, so they are chosen by tier
 * from a single map rather than a branch at every call.
 */
const lifecycleOperations = {
  company: companyNotificationOperations,
  platform: platformNotificationOperations,
} as const;

export interface NotificationFeedPage {
  readonly items: readonly NotificationFeedItem[];
  readonly nextCursor: string | null;
  readonly hasMore: boolean;
}

/** Page-size contract: default 20, server maximum 50. */
const PAGE_LIMIT = 20;

function toFeedItem(item: CompanyFeedItem | PlatformFeedItem): NotificationFeedItem {
  // The actor is not copied: the panel never names who acted, so it cannot disclose it.
  return {
    publicId: item.publicId,
    typeKey: item.typeKey,
    typeVersion: item.typeVersion,
    importance: item.importance,
    params: { ...item.params },
    subject: item.subject,
    createdAt: item.createdAt,
    seenAt: item.seenAt,
    readAt: item.readAt,
  };
}

/** Reads one feed page (or a `since` delta) through the audience's own generated operation. */
export async function fetchNotificationFeed(
  tier: NotificationTier,
  query: { cursor?: string | null; since?: string } = {},
  signal?: AbortSignal,
): Promise<NotificationFeedPage> {
  const input = {
    query: { limit: PAGE_LIMIT, cursor: query.cursor ?? undefined, since: query.since },
  };
  const page =
    tier === "company"
      ? await requestAudienceOperation("company", companyNotificationOperations.feed, input, signal)
      : await requestAudienceOperation(
          "platform",
          platformNotificationOperations.feed,
          input,
          signal,
        );
  return { items: page.items.map(toFeedItem), nextCursor: page.nextCursor, hasMore: page.hasMore };
}

/** The declared unread-count read; the badge never derives its number from cached feed rows. */
export async function fetchUnreadCount(tier: NotificationTier, signal?: AbortSignal) {
  const result = await requestAudienceOperation(tier, lifecycleOperations[tier].count, {}, signal);
  return result.unreadCount;
}

/** Marks rows seen by public ID. Seen drains the badge; it never marks a row read. */
export async function sendNotificationsSeen(tier: NotificationTier, publicIds: readonly string[]) {
  await requestAudienceOperation(tier, lifecycleOperations[tier].seen, {
    body: { publicIds: [...publicIds] },
  });
}

/** Marks one row read, or advances the bulk-read cursor with `{ all: true }`. */
export function sendNotificationRead(
  tier: NotificationTier,
  target: { publicId: string } | { all: true },
) {
  return sendAudienceCommand(tier, lifecycleOperations[tier].read, { body: target });
}
