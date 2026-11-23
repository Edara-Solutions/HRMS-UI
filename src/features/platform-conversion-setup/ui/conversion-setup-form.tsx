import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { platformLeadOperations as operations } from "@/shared/api";
import { usePreferencesStore } from "@/shared/config";
import { DateTimePicker } from "@/shared/ui/date-time-picker";
import { QueryPanel } from "@/shared/ui/query-panel";
import { type SchemaField, SchemaForm } from "@/shared/ui/schema-form";
import { useConversionPlans } from "../api/plans";
import { type SetupStep, validSetup, validTrialEndDate } from "../model/setup";
import { CustomSetupEditor } from "./custom-setup-editor";

interface Props {
  selectPlan?: boolean;
  disabled?: boolean;
  label: string;
  title?: string;
  description?: string;
  onSubmit: (body: unknown) => void;
}

const approvalSchema = operations.approve.requestSchema.shape.body;
const immediateSchema = approvalSchema.extend({
  planPublicId: operations.submit.requestSchema.shape.body.shape.planPublicId,
});

export function ConversionSetupForm({
  selectPlan = false,
  disabled,
  label,
  title,
  description,
  onSubmit,
}: Props) {
  const { t } = useTranslation(["platform-leads", "common"]);
  const locale = usePreferencesStore((state) => state.locale);
  const trialId = useId();
  const { data, error, isPending, refetch } = useConversionPlans(selectPlan);
  const [custom, setCustom] = useState(false);
  const [steps, setSteps] = useState<SetupStep[]>([
    { stepType: "SET_COMPANY_PROFILE", isRequired: true, sequence: 1, dependencies: [] },
  ]);
  const [trialEnd, setTrialEnd] = useState<string>();
  const [invalid, setInvalid] = useState(false);
  const schema = selectPlan ? immediateSchema : approvalSchema;
  const formDisabled = disabled || (selectPlan && !data?.length);
  const validateTrialEnd = (value: string | undefined) =>
    validTrialEndDate(value) ? undefined : t("setup.trialEndInvalid");

  const fields: SchemaField[] = [];
  if (selectPlan) {
    fields.push({
      name: "planPublicId",
      label: t("plan.title"),
      required: true,
      options: (data ?? []).map((plan) => ({ value: plan.publicId, label: plan.name })),
    });
  }
  fields.push({
    name: "trialEndDate",
    label: t("setup.trialEnd"),
    control: (
      <>
        <input type="hidden" name="trialEndDate" value={trialEnd ?? ""} />
        <DateTimePicker
          id={trialId}
          label={t("setup.trialEnd")}
          description={t("setup.trialEndDescription")}
          locale={locale}
          value={trialEnd}
          disabled={formDisabled}
          boundary="to"
          showDateEdge={false}
          validate={validateTrialEnd}
          onChange={(value) => {
            setTrialEnd(value);
            setInvalid(false);
          }}
          text={{
            placeholder: t("setup.trialEndPlaceholder"),
            hour: t("setup.hour"),
            minute: t("setup.minute"),
            minuteHint: t("setup.minuteHint"),
            period: t("setup.period"),
            previousMonth: t("common:datePicker.previousMonth"),
            nextMonth: t("common:datePicker.nextMonth"),
            clear: t("common:datePicker.clear"),
            cancel: t("common:datePicker.cancel"),
            apply: t("setup.applyTrialEnd"),
          }}
        />
      </>
    ),
  });
  if (!custom) {
    fields.push({
      name: "templateKey",
      label: t("setup.preset"),
      type: "number",
      required: true,
      value: "1",
      options: [1, 2, 3].map((value) => ({
        value: String(value),
        label: t("setup.presetNumber", { value }),
      })),
    });
  }

  return (
    <QueryPanel
      title={title ?? t("setup.title")}
      pending={selectPlan && isPending}
      error={selectPlan ? error : null}
      retry={() => void refetch()}
    >
      {description && <p className="text-sm text-[var(--color-text-muted)]">{description}</p>}
      <SchemaForm
        schema={custom ? schema.omit({ templateKey: true }) : schema}
        fields={fields}
        label={label}
        invalidLabel={t("invalid")}
        disabled={formDisabled}
        onSubmit={(body) => {
          if (!body || typeof body !== "object") return;
          if ((custom && !validSetup(steps)) || validateTrialEnd(trialEnd)) {
            setInvalid(true);
            return;
          }
          setInvalid(false);
          onSubmit(custom ? { ...body, templateKey: -1, setupSteps: steps } : body);
        }}
      >
        <div className="space-y-4 border-t border-[var(--color-border)] pt-4 sm:col-span-2">
          <label className="flex min-w-0 items-center gap-3 text-sm font-semibold">
            <input
              type="checkbox"
              className="size-4 shrink-0 accent-[var(--color-primary)]"
              checked={custom}
              disabled={formDisabled}
              onChange={(event) => {
                setCustom(event.target.checked);
                setInvalid(false);
              }}
            />
            {t("setup.custom")}
          </label>
          {custom && (
            <CustomSetupEditor
              steps={steps}
              disabled={formDisabled}
              onChange={(value) => {
                setSteps(value);
                setInvalid(false);
              }}
            />
          )}
          {selectPlan && !data?.length && (
            <p className="text-sm text-[var(--color-text-muted)]">{t("plan.unavailable")}</p>
          )}
          {invalid && (
            <p role="alert" className="text-sm text-[var(--color-danger)]">
              {validateTrialEnd(trialEnd) ?? t("setup.invalidSteps")}
            </p>
          )}
        </div>
      </SchemaForm>
    </QueryPanel>
  );
}
