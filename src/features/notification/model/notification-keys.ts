/**
 * Query keys locked by the polling contract (HRMS_Back_End#198 §5). The list key is
 * reserved here so the feed slice lands on the same shape the count already uses.
 */
export const notificationKeys = {
  count: () => ["notifications", "count"] as const,
  list: (cursor: string | null) => ["notifications", "list", cursor] as const,
};
