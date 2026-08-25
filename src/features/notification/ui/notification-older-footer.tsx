import { useTranslation } from "react-i18next";
import { Button } from "@/shared/ui/button";
import type { NotificationCenter } from "../lib/use-notification-center";

interface NotificationOlderFooterProps {
  center: NotificationCenter;
}

/** The next page of the feed, offered only while there is one — the same footer in every shape. */
export function NotificationOlderFooter({ center }: NotificationOlderFooterProps) {
  const { t } = useTranslation("notification", { useSuspense: false });

  if (!center.hasNextPage) {
    return null;
  }

  return (
    <footer className="shrink-0 border-t border-[var(--color-border)] p-2">
      <Button
        variant="ghost"
        size="block"
        isLoading={center.isFetchingNextPage}
        onClick={center.fetchNextPage}
      >
        {t("panel.showOlder")}
      </Button>
    </footer>
  );
}
