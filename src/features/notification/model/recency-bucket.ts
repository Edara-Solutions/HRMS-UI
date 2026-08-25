export const RECENCY_BUCKETS = ["today", "yesterday", "earlier"] as const;

export type RecencyBucket = (typeof RECENCY_BUCKETS)[number];

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Calendar-day buckets in the viewer's timezone, so "yesterday" means yesterday to them. */
export function recencyBucketOf(createdAt: string, now: Date = new Date()): RecencyBucket {
  const today = startOfDay(now);
  const created = startOfDay(new Date(createdAt));

  if (created >= today) return "today";
  if (created >= today - DAY_MS) return "yesterday";
  return "earlier";
}
