import { Link } from "@tanstack/react-router";
import { Check, Play, SkipForward } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { ActionAvailability } from "@/shared/auth";
import { usePreferencesStore } from "@/shared/config";
import { formatInstant } from "@/shared/lib/format-instant";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import type { SetupCommand } from "../api/company-setup";
import { availableCommands, type SetupStep } from "../model/setup-step";

const statusVariants = {
  PENDING: "default",
  IN_PROGRESS: "info",
  COMPLETED: "success",
  SKIPPED: "warning",
} as const satisfies Record<SetupStep["status"], string>;

const commandIcons: Record<SetupCommand, ReactNode> = {
  start: <Play aria-hidden="true" size={15} />,
  complete: <Check aria-hidden="true" size={15} />,
  skip: <SkipForward aria-hidden="true" size={15} />,
};

interface SetupStepItemProps {
  step: SetupStep;
  commandAvailability: (command: SetupCommand) => ActionAvailability;
  /** While any transition is in flight (or its contract failed) every command is blocked. */
  busy: boolean;
  /** The in-flight command on this step, which alone shows progress. */
  pendingCommand: SetupCommand | null;
  canOpenProfile: boolean;
  onCommand: (step: SetupStep, command: SetupCommand) => void;
}

export function SetupStepItem({
  step,
  commandAvailability,
  busy,
  pendingCommand,
  canOpenProfile,
  onCommand,
}: SetupStepItemProps) {
  const { t } = useTranslation("organization");
  const locale = usePreferencesStore((state) => state.locale);
  const label = t(`step.${step.stepType}`);
  const headingId = `setup-step-${step.sequence}`;
  const commands = availableCommands(step)
    .map((command) => ({ command, availability: commandAvailability(command) }))
    .filter(({ availability }) => availability.state !== "hidden");
  const reasons = [
    ...new Set(
      commands.flatMap(({ availability }) =>
        availability.state === "disabled" ? [availability.reason] : [],
      ),
    ),
  ];

  return (
    <li
      aria-labelledby={headingId}
      className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 id={headingId} className="break-words text-sm font-semibold">
            {label}
          </h3>
          {step.dependencies.length > 0 && (
            <p className="text-xs text-[var(--color-text-muted)]">
              {t("setup.dependsOn", {
                steps: new Intl.ListFormat(locale).format(
                  step.dependencies.map((dependency) => t(`step.${dependency}`)),
                ),
              })}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={statusVariants[step.status]}>{t(`stepStatus.${step.status}`)}</Badge>
          <Badge variant="default">
            {step.isRequired ? t("setup.required") : t("setup.optional")}
          </Badge>
        </div>
      </div>

      {(step.startedAt || step.completedAt) && (
        <p className="text-xs text-[var(--color-text-muted)]">
          {step.completedAt
            ? t(step.status === "SKIPPED" ? "setup.skippedAt" : "setup.completedAt", {
                date: formatInstant(step.completedAt, locale),
              })
            : step.startedAt &&
              t("setup.startedAt", { date: formatInstant(step.startedAt, locale) })}
        </p>
      )}

      {commands.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {commands.map(({ command, availability }) => (
            <Button
              key={command}
              intent={command === "complete" ? "cta" : "action"}
              size="sm"
              leadingIcon={commandIcons[command]}
              aria-label={t(`setup.command.${command}.label`, { step: label })}
              aria-describedby={reasons.length > 0 ? `${headingId}-reason` : undefined}
              disabled={busy || availability.state === "disabled"}
              isLoading={pendingCommand === command}
              onClick={() => onCommand(step, command)}
            >
              {t(`setup.command.${command}.action`)}
            </Button>
          ))}
        </div>
      )}

      {reasons.length > 0 && (
        <div
          id={`${headingId}-reason`}
          className="space-y-1 text-xs text-[var(--color-text-muted)]"
        >
          {reasons.map((reason) => (
            <p key={reason}>
              {t(`restriction.${reason}`)}{" "}
              {reason === "prerequisite" &&
                step.stepType === "SET_COMPANY_PROFILE" &&
                canOpenProfile && (
                  <Link
                    to="/company/profile"
                    className="font-medium text-[var(--color-primary)] underline-offset-4 hover:underline"
                  >
                    {t("organization.openProfile")}
                  </Link>
                )}
            </p>
          ))}
        </div>
      )}
    </li>
  );
}
