import { useId } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { type SetupStep, setupStepTypes } from "../model/setup";

interface Props {
  steps: SetupStep[];
  onChange: (steps: SetupStep[]) => void;
  disabled?: boolean;
}

export function CustomSetupEditor({ steps, onChange, disabled }: Props) {
  const { t } = useTranslation("platform-leads");
  const id = useId();

  function toggleStep(stepType: SetupStep["stepType"], checked: boolean) {
    if (checked) {
      const lastSequence = Math.max(
        0,
        ...steps.map(({ sequence }) => sequence).filter(Number.isFinite),
      );
      onChange([
        ...steps,
        { stepType, isRequired: false, sequence: lastSequence + 1, dependencies: [] },
      ]);
      return;
    }
    onChange(
      steps
        .filter((step) => step.stepType !== stepType)
        .map((step) => ({
          ...step,
          dependencies: step.dependencies.filter((dependency) => dependency !== stepType),
        })),
    );
  }

  return (
    <fieldset
      disabled={disabled}
      className="min-w-0 space-y-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 sm:p-4"
    >
      <legend className="sr-only">{t("setup.custom")}</legend>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">{t("setup.chooseSteps")}</h4>
        <Badge variant="primary" className="h-auto min-h-5">
          {t("setup.stepCount", { count: steps.length })}
        </Badge>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-2">
        {setupStepTypes.map((stepType) => {
          const selected = steps.some((step) => step.stepType === stepType);
          return (
            <label
              key={stepType}
              className={cn(
                "flex min-w-0 cursor-pointer items-center gap-2 rounded-[var(--radius-md)] border p-2.5 text-sm font-medium focus-within:ring-2 focus-within:ring-[var(--color-primary)]",
                selected
                  ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
                  : "border-[var(--color-border)] bg-[var(--color-surface)]",
              )}
            >
              <input
                type="checkbox"
                className="size-4 shrink-0 accent-[var(--color-primary)]"
                checked={selected}
                onChange={(event) => toggleStep(stepType, event.target.checked)}
              />
              {t(`enum.${stepType}`)}
            </label>
          );
        })}
      </div>
      {steps.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">{t("setup.configureSteps")}</h4>
          <ol className="space-y-2">
            {steps.map((step) => {
              const stepLabel = t(`enum.${step.stepType}`);
              const sequenceId = `${id}-sequence-${step.stepType}`;
              const choices = steps.filter(
                (candidate) =>
                  candidate.stepType !== step.stepType &&
                  (candidate.sequence < step.sequence ||
                    step.dependencies.includes(candidate.stepType)),
              );
              const change = (update: Partial<SetupStep>) =>
                onChange(
                  steps.map((item) =>
                    item.stepType === step.stepType ? { ...item, ...update } : item,
                  ),
                );
              return (
                <li
                  key={step.stepType}
                  className="space-y-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h5 className="text-sm font-semibold">{stepLabel}</h5>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={step.isRequired}
                        className="size-4 accent-[var(--color-primary)]"
                        onChange={(event) => change({ isRequired: event.target.checked })}
                      />
                      {t("setup.required")}
                    </label>
                  </div>
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="w-28 max-w-full space-y-1">
                      <Label htmlFor={sequenceId} className="text-xs">
                        {t("setup.sequence")}
                      </Label>
                      <Input
                        id={sequenceId}
                        type="number"
                        min={1}
                        value={step.sequence || ""}
                        onChange={(event) => change({ sequence: Number(event.target.value) })}
                      />
                    </div>
                    <fieldset className="min-w-0 flex-[1_1_13rem] space-y-1">
                      <legend className="text-xs font-medium">{t("setup.dependencies")}</legend>
                      {choices.length ? (
                        <div className="flex flex-wrap gap-2">
                          {choices.map((candidate) => {
                            const checked = step.dependencies.includes(candidate.stepType);
                            return (
                              <label
                                key={candidate.stepType}
                                className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] px-2 py-1 text-xs"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  className="accent-[var(--color-primary)]"
                                  onChange={(event) =>
                                    change({
                                      dependencies: event.target.checked
                                        ? [...step.dependencies, candidate.stepType]
                                        : step.dependencies.filter(
                                            (dependency) => dependency !== candidate.stepType,
                                          ),
                                    })
                                  }
                                />
                                {t(`enum.${candidate.stepType}`)}
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {t("setup.noPriorSteps")}
                        </p>
                      )}
                    </fieldset>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </fieldset>
  );
}
