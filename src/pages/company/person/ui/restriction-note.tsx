import { useTranslation } from "react-i18next";
import type { ActionAvailability } from "@/shared/auth";

/** The localized safe reason for a present-but-restricted action; nothing for enabled or hidden. */
export function RestrictionNote({ availability }: { availability: ActionAvailability }) {
  const { t } = useTranslation("people");
  if (availability.state !== "disabled") return null;
  return (
    <p className="text-xs text-[var(--color-text-muted)]">
      {t(`restriction.${availability.reason}`)}
    </p>
  );
}
