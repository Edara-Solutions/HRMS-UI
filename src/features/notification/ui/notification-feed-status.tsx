import { BellOff } from "lucide-react";
import { useTranslation } from "react-i18next";

interface NotificationFeedStatusProps {
  isPending: boolean;
  isError: boolean;
  isEmpty: boolean;
}

/** What a shape shows instead of rows: still loading, could not load, or nothing to show. */
export function NotificationFeedStatus({
  isPending,
  isError,
  isEmpty,
}: NotificationFeedStatusProps) {
  const { t } = useTranslation("notification", { useSuspense: false });

  if (isPending) {
    return <FeedMessage>{t("panel.loading")}</FeedMessage>;
  }

  if (isError) {
    return <FeedMessage>{t("panel.error")}</FeedMessage>;
  }

  if (!isEmpty) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <span
        aria-hidden="true"
        className="flex size-9 items-center justify-center rounded-full bg-[var(--color-surface-2)] text-[var(--color-text-faint)]"
      >
        <BellOff size={16} />
      </span>
      <p className="text-[13px] font-medium text-[var(--color-text)]">{t("panel.empty.title")}</p>
      <p className="max-w-[240px] text-xs leading-relaxed text-[var(--color-text-faint)]">
        {t("panel.empty.hint")}
      </p>
    </div>
  );
}

interface FeedMessageProps {
  children: string;
}

function FeedMessage({ children }: FeedMessageProps) {
  return (
    <p className="px-4 py-8 text-center text-[13px] text-[var(--color-text-muted)]">{children}</p>
  );
}
