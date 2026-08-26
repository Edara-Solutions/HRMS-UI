/** Query keys locked by the polling contract (HRMS_Back_End#198 §5). */
export const notificationKeys = {
  count: () => ["notifications", "count"] as const,
  list: (cursor: string | null) => ["notifications", "list", cursor] as const,
};
