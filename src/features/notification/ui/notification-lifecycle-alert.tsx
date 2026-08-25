import { useTranslation } from "react-i18next";

interface NotificationLifecycleAlertProps {
  failed: boolean;
}

/** A seen, read, or mark-all write that did not land, said once wherever the reader is looking. */
export function NotificationLifecycleAlert({ failed }: NotificationLifecycleAlertProps) {
  const { t } = useTranslation("notification", { useSuspense: false });

  if (!failed) {
    return null;
  }

  return (
    <p
      role="alert"
      className="shrink-0 border-b border-[var(--color-border)] bg-[var(--color-danger-soft)] px-4 py-2 text-xs text-[var(--color-danger)]"
    >
      {t("panel.actionError")}
    </p>
  );
}
