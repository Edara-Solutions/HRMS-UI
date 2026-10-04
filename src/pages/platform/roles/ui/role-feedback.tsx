import { useTranslation } from "react-i18next";
import type { ActionAvailability } from "@/shared/auth";
import type { RoleFeedback } from "../model/use-role-mutation";

interface RoleRestrictionProps {
  availability: ActionAvailability;
}

interface RoleOutcomeProps {
  feedback: RoleFeedback | null;
}

/** The localized safe reason for a present-but-restricted action; nothing for enabled or hidden. */
export function RoleRestriction({ availability }: RoleRestrictionProps) {
  const { t } = useTranslation("platform-people");
  if (availability.state !== "disabled") return null;
  return (
    <p className="text-xs text-[var(--color-text-muted)]">
      {t(`restriction.${availability.reason}`)}
    </p>
  );
}

/** A command's live outcome, announced politely on success and assertively on failure. */
export function RoleOutcome({ feedback }: RoleOutcomeProps) {
  return (
    <p role={feedback?.tone === "alert" ? "alert" : "status"} className="min-h-5 text-sm">
      {feedback?.message}
    </p>
  );
}
