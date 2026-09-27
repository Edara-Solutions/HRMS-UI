import { useTranslation } from "react-i18next";
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
  return (
    <fieldset disabled={disabled} className="space-y-3">
      <legend className="font-medium">{t("setup.custom")}</legend>
      {setupStepTypes.map((stepType) => {
        const step = steps.find((item) => item.stepType === stepType);
        const change = (update: Partial<SetupStep>) =>
          onChange(
            steps.map((item) => (item.stepType === stepType ? { ...item, ...update } : item)),
          );
        return (
          <div
            key={stepType}
            className="space-y-2 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3"
          >
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!step}
                onChange={(event) =>
                  onChange(
                    event.target.checked
                      ? [
                          ...steps,
                          {
                            stepType,
                            isRequired: false,
                            sequence: steps.length + 1,
                            dependencies: [],
                          },
                        ]
                      : steps.filter((item) => item.stepType !== stepType),
                  )
                }
              />
              {t(`enum.${stepType}`)}
            </label>
            {step && (
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={step.isRequired}
                    onChange={(event) => change({ isRequired: event.target.checked })}
                  />
                  {t("setup.required")}
                </label>
                <div>
                  <Label htmlFor={`sequence-${stepType}`}>{t("setup.sequence")}</Label>
                  <Input
                    id={`sequence-${stepType}`}
                    type="number"
                    min={1}
                    value={step.sequence}
                    onChange={(event) => change({ sequence: Number(event.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor={`dependencies-${stepType}`}>{t("setup.dependencies")}</Label>
                  <select
                    id={`dependencies-${stepType}`}
                    multiple
                    value={step.dependencies}
                    onChange={(event) =>
                      change({
                        dependencies: Array.from(
                          event.target.selectedOptions,
                          (option) => option.value,
                        ),
                      })
                    }
                    className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2"
                  >
                    {setupStepTypes.map((value) =>
                      value !== stepType ? (
                        <option key={value} value={value}>
                          {t(`enum.${value}`)}
                        </option>
                      ) : null,
                    )}
                  </select>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </fieldset>
  );
}
