import { useTranslation } from "react-i18next";
import type { MutationOutcome } from "@/shared/api";

interface CommandFailureProps {
  failure: MutationOutcome["kind"] | null;
}

export function CommandFailure({ failure }: CommandFailureProps) {
  const { t } = useTranslation("platform-access-session");
  if (!failure) return null;
  return (
    <p role="alert" className="text-sm text-[var(--color-danger)]">
      {t(`access.failure.${failure}`)}
    </p>
  );
}
