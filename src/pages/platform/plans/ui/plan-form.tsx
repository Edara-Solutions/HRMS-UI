import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import type { Plan } from "../api/catalogue";
import {
  planFeatures,
  planFormSchema,
  planLimits,
  supportedPlanFeatures,
} from "../model/catalogue-form";

interface Props {
  plan?: Plan;
  disabled: boolean;
  invalidFields?: readonly string[];
  onSubmit: (body: unknown) => void;
  onCancel: () => void;
}

type LimitName = (typeof planLimits)[number];

function initialLimits(plan?: Plan): Record<LimitName, string> {
  return {
    MAX_USERS: String(plan?.limits?.MAX_USERS ?? ""),
    MAX_DEPARTMENTS: String(plan?.limits?.MAX_DEPARTMENTS ?? ""),
    MAX_POSITIONS: String(plan?.limits?.MAX_POSITIONS ?? ""),
  };
}

export function PlanForm({ plan, disabled, invalidFields = [], onSubmit, onCancel }: Props) {
  const { t } = useTranslation("platform-plans");
  const [name, setName] = useState(plan?.name ?? "");
  const [description, setDescription] = useState(plan?.description ?? "");
  const [duration, setDuration] = useState(String(plan?.duration ?? 30));
  const [features, setFeatures] = useState<string[]>(
    plan?.features.filter((feature) => supportedPlanFeatures.has(feature)) ?? ["OVERVIEW"],
  );
  const [limits, setLimits] = useState<Record<LimitName, string>>(() => initialLimits(plan));
  const [isPublic, setIsPublic] = useState(plan?.isPublic ?? true);
  const [isActive, setIsActive] = useState(plan?.isActive ?? true);
  const [rejected, setRejected] = useState<ReadonlySet<string>>(new Set());
  const systemPlan = plan?.name === "Default Full Access";
  const unknownFeatures =
    plan?.features.filter((feature) => !supportedPlanFeatures.has(feature)) ?? [];
  const featureChangesDisabled = unknownFeatures.length > 0;
  const fieldInvalid = (name: string) => rejected.has(name) || invalidFields.includes(name);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disabled) return;
    const nextLimits = Object.fromEntries(
      planLimits.flatMap((key) => (limits[key].trim() ? [[key, Number(limits[key])]] : [])),
    );
    const body: Record<string, unknown> = plan
      ? {}
      : {
          name: name.trim(),
          description: description.trim() || null,
          duration: Number(duration),
          features,
          limits: nextLimits,
          isPublic,
          isActive,
        };
    if (plan) {
      if (!systemPlan && name.trim() !== plan.name) body.name = name.trim();
      if (description.trim() !== (plan.description ?? ""))
        body.description = description.trim() || null;
      if (
        !featureChangesDisabled &&
        [...features].sort().join() !==
          plan.features
            .filter((feature) => supportedPlanFeatures.has(feature))
            .sort()
            .join()
      )
        body.features = features;
      if (planLimits.some((key) => limits[key] !== String(plan.limits?.[key] ?? "")))
        body.limits = nextLimits;
      if (!systemPlan && isPublic !== plan.isPublic) body.isPublic = isPublic;
      if (isActive !== plan.isActive) body.isActive = isActive;
    }
    const parsed = planFormSchema(plan).safeParse(body);
    const issues = new Set(
      parsed.success ? [] : parsed.error.issues.map((issue) => issue.path.join(".")),
    );
    if (!plan && features.length === 0) issues.add("features");
    if ("features" in body && features.length === 0) issues.add("features");
    setRejected(issues);
    if (parsed.success && issues.size === 0 && Object.keys(body).length > 0) onSubmit(parsed.data);
  };

  return (
    <form className="mt-5 space-y-6" onSubmit={submit} noValidate>
      {rejected.size > 0 && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {t("invalid")}
        </p>
      )}
      {systemPlan && (
        <p className="rounded-[var(--radius-md)] bg-[var(--color-surface-2)] p-3 text-sm text-[var(--color-text-muted)]">
          {t("systemHelp")}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="plan-name">{t("name")}</Label>
          <Input
            id="plan-name"
            required
            maxLength={255}
            value={name}
            disabled={disabled || systemPlan}
            aria-invalid={fieldInvalid("name")}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="plan-description">{t("description")}</Label>
          <Textarea
            id="plan-description"
            rows={3}
            value={description}
            disabled={disabled}
            aria-invalid={fieldInvalid("description")}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="plan-duration">{t("duration")}</Label>
          <Input
            id="plan-duration"
            type="number"
            min={1}
            value={duration}
            disabled={disabled}
            readOnly={!!plan}
            aria-invalid={fieldInvalid("duration")}
            onChange={(event) => setDuration(event.target.value)}
          />
          {plan && (
            <p className="text-xs text-[var(--color-text-muted)]">{t("durationReadOnly")}</p>
          )}
        </div>
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">{t("featuresColumn")}</legend>
        <div className="flex flex-wrap gap-2">
          {planFeatures.map((feature) => (
            <Button
              key={feature}
              type="button"
              variant="ghost"
              size="sm"
              pressed={features.includes(feature)}
              disabled={disabled || featureChangesDisabled}
              onClick={() =>
                setFeatures((current) =>
                  current.includes(feature)
                    ? current.filter((value) => value !== feature)
                    : [...current, feature],
                )
              }
            >
              {t(`feature.${feature}`)}
            </Button>
          ))}
        </div>
        {fieldInvalid("features") && (
          <p role="alert" className="text-xs text-[var(--color-danger)]">
            {t("selectFeature")}
          </p>
        )}
        {featureChangesDisabled && (
          <p className="text-xs text-[var(--color-text-muted)]">
            {t("unknownFeaturesHelp", { features: unknownFeatures.join(", ") })}
          </p>
        )}
      </fieldset>
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">{t("limits")}</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {planLimits.map((key) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={`plan-${key}`}>{t(key)}</Label>
              <Input
                id={`plan-${key}`}
                type="number"
                min={0}
                inputMode="numeric"
                value={limits[key]}
                disabled={disabled}
                aria-invalid={fieldInvalid(`limits.${key}`)}
                onChange={(event) =>
                  setLimits((current) => ({ ...current, [key]: event.target.value }))
                }
              />
            </div>
          ))}
        </div>
        <p className="text-xs text-[var(--color-text-muted)]">{t("limitsHelp")}</p>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">{t("visibility")}</legend>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              pressed={isPublic}
              disabled={disabled || systemPlan}
              onClick={() => setIsPublic(true)}
            >
              {t("public")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              pressed={!isPublic}
              disabled={disabled || systemPlan}
              onClick={() => setIsPublic(false)}
            >
              {t("private")}
            </Button>
          </div>
        </fieldset>
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">{t("status")}</legend>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              pressed={isActive}
              disabled={disabled}
              onClick={() => setIsActive(true)}
            >
              {t("active")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              pressed={!isActive}
              disabled={disabled}
              onClick={() => setIsActive(false)}
            >
              {t("inactive")}
            </Button>
          </div>
        </fieldset>
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--color-border)] pt-4">
        <Button type="button" intent="dismissive" disabled={disabled} onClick={onCancel}>
          {t("cancel")}
        </Button>
        <Button type="submit" intent="cta" disabled={disabled}>
          {plan ? t("save") : t("createPlan")}
        </Button>
      </div>
    </form>
  );
}
