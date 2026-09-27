import { useTranslation } from "react-i18next";
import type { ActionAvailability } from "@/shared/auth";

interface RestrictionNoteProps {
  availability: ActionAvailability;
}

/** The localized safe reason for a present-but-restricted action; nothing for enabled or hidden. */
export function RestrictionNote({ availability }: RestrictionNoteProps) {
  const { t } = useTranslation("platform-people");
  if (availability.state !== "disabled") return null;
  return (
    <p className="text-xs text-[var(--color-text-muted)]">
      {t(`restriction.${availability.reason}`)}
    </p>
  );
}
