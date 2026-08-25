import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { z } from "zod";
import { apiClient } from "@/shared/api";
import { notificationKeys } from "../model/notification-keys";
import { type NotificationTier, useNotificationTier } from "../model/notification-tier";

/**
 * Interim wire contract pinned to HRMS_Back_End#198 §5 (`NotificationFeedPage`). Swap for
 * `components["schemas"]["NotificationFeedPage"]` once the endpoint is reachable and
 * `bun run openapi:types` can regenerate the schema.
 */
const feedItemSchema = z.object({
  id: z.number().int(),
  scope: z.enum(["company", "platform"]),
  typeKey: z.string().min(1),
  typeVersion: z.number().int(),
  importance: z.enum(["high", "normal"]),
  params: z.record(z.string(), z.unknown()),
  actor: z.union([
    z.object({ kind: z.literal("system") }),
    z.object({ kind: z.enum(["user", "platform_admin"]), publicId: z.string() }),
  ]),
  subject: z.object({ type: z.string(), publicId: z.string() }).nullable(),
  createdAt: z.string().min(1),
  seenAt: z.string().nullable(),
  readAt: z.string().nullable(),
});

const feedPageSchema = z.object({
  items: z.array(feedItemSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

export type NotificationFeedItem = z.infer<typeof feedItemSchema>;
export type NotificationFeedPage = z.infer<typeof feedPageSchema>;

/** Page-size contract: default 20, server maximum 50. */
const PAGE_LIMIT = 20;

interface FeedQuery {
  readonly cursor?: string | null;
  readonly since?: string;
}

async function fetchNotificationFeed(
  tier: NotificationTier,
  query: FeedQuery = {},
): Promise<NotificationFeedPage> {
  const searchParams = new URLSearchParams({ limit: String(PAGE_LIMIT) });

  if (query.cursor) searchParams.set("cursor", query.cursor);
  if (query.since) searchParams.set("since", query.since);

  const page = await apiClient.get(`${tier}/notifications`, { searchParams }).json<unknown>();

  return feedPageSchema.parse(page);
}

/**
 * Newest first, one row per id. Cursor pages and `since` deltas both land in the same cached
 * array, so a row that arrives twice is rendered once.
 */
function dedupeById(items: readonly NotificationFeedItem[]): NotificationFeedItem[] {
  const byId = new Map<number, NotificationFeedItem>();

  for (const item of items) {
    byId.set(item.id, item);
  }

  // Sorting the freshly built array in place; nothing shared is mutated. `.toSorted` would
  // need an ES2023 lib bump.
  return [...byId.values()].sort(
    (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
  );
}

/**
 * The read path behind the panel. The query only runs while the panel is open; each reopen pulls
 * the rows created since the newest cached one rather than refetching every page.
 */
export function useNotificationFeed(open: boolean) {
  const tier = useNotificationTier();
  const queryClient = useQueryClient();

  const feed = useInfiniteQuery({
    queryKey: notificationKeys.list(null),
    queryFn: ({ pageParam }) => {
      if (!tier) throw new Error("Notification tier requires a session");
      return fetchNotificationFeed(tier, { cursor: pageParam });
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: open && tier !== null,
    // Cached pages never go stale on their own; the delta below is what catches them up, so a
    // reopen does not refetch every page it already holds.
    staleTime: Number.POSITIVE_INFINITY,
    select: (data) => dedupeById(data.pages.flatMap((page) => page.items)),
  });

  const newestCreatedAt = feed.data?.[0]?.createdAt;

  useEffect(() => {
    if (!open || !tier || !newestCreatedAt) return;

    let cancelled = false;

    fetchNotificationFeed(tier, { since: newestCreatedAt })
      .then((delta) => {
        if (cancelled || delta.items.length === 0) return;
        prependDelta(queryClient, delta.items);
      })
      // A failed catch-up leaves the cached rows standing; the next open tries again.
      .catch(() => {});

    return () => {
      cancelled = true;
    };
    // Keyed on the open transition alone: the delta is a catch-up on reopen, and re-running it
    // as newestCreatedAt advances would poll the feed behind the panel's back.
  }, [open]);

  return feed;
}

function prependDelta(
  queryClient: ReturnType<typeof useQueryClient>,
  items: readonly NotificationFeedItem[],
) {
  queryClient.setQueryData(
    notificationKeys.list(null),
    (current: { pages: NotificationFeedPage[]; pageParams: unknown[] } | undefined) => {
      if (!current || current.pages.length === 0) return current;

      const [head, ...rest] = current.pages;

      return {
        ...current,
        pages: [{ ...head, items: dedupeById([...items, ...head.items]) }, ...rest],
      };
    },
  );
}
