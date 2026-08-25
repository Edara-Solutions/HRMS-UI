import { Bell } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { useUnreadNotificationCount } from "../api/unread-count";

const BADGE_COUNT_CAP = 99;

export function NotificationBell() {
  const { data } = useUnreadNotificationCount();
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <div className="relative">
      <Button
        intent="toggle"
        size="iconSm"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        leadingIcon={<Bell size={16} />}
        iconOnly
      />
      {unreadCount > 0 && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-1 -end-1 inline-flex h-4 min-w-4 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-1 text-[10px] font-semibold leading-none tabular-nums text-[var(--color-on-primary)] ring-2 ring-[var(--color-bg)]"
        >
          {formatBadgeCount(unreadCount)}
        </span>
      )}
    </div>
  );
}

function formatBadgeCount(count: number) {
  return count > BADGE_COUNT_CAP ? `${BADGE_COUNT_CAP}+` : String(count);
}
