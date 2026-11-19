import { useState } from "react";
import { useTranslation } from "react-i18next";
import { platformLeadOperations as operations } from "@/shared/api";
import { QueryPanel } from "@/shared/ui/query-panel";
import { type SchemaField, SchemaForm } from "@/shared/ui/schema-form";
import { useConversionPlans } from "../api/plans";
import { type SetupStep, validSetup, validTrialEndDate } from "../model/setup";
import { CustomSetupEditor } from "./custom-setup-editor";

interface Props {
  selectPlan?: boolean;
  disabled?: boolean;
  label: string;
  onSubmit: (body: unknown) => void;
}
export function ConversionSetupForm({ selectPlan = false, disabled, label, onSubmit }: Props) {
  const { t } = useTranslation("platform-leads");
  const { data, error, isPending, refetch } = useConversionPlans(selectPlan);
  const [custom, setCustom] = useState(false);
  const [steps, setSteps] = useState<SetupStep[]>([
    { stepType: "SET_COMPANY_PROFILE", isRequired: true, sequence: 1, dependencies: [] },
  ]);
  const [invalid, setInvalid] = useState(false);
  const schema = operations.approve.requestSchema.shape.body;
  const fields: SchemaField[] = [
    {
      name: "templateKey",
      label: t("setup.preset"),
      type: "number",
      required: true,
      value: "1",
      options: [1, 2, 3].map((value) => ({
        value: String(value),
        label: t("setup.presetNumber", { value }),
      })),
    },
    { name: "trialEndDate", label: t("setup.trialEnd"), type: "datetime-local" },
  ];
  if (selectPlan)
    fields.unshift({
      name: "planPublicId",
      label: t("plan.title"),
      required: true,
      options: (data ?? []).map((plan) => ({ value: plan.publicId, label: plan.name })),
    });
  return (
    <QueryPanel
      title={t("setup.title")}
      pending={selectPlan && isPending}
      error={selectPlan ? error : null}
      retry={() => void refetch()}
    >
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={custom}
          disabled={disabled}
          onChange={(event) => setCustom(event.target.checked)}
        />
        {t("setup.custom")}
      </label>
      {custom && <CustomSetupEditor steps={steps} onChange={setSteps} disabled={disabled} />}
      <SchemaForm
        key={custom ? "custom" : "preset"}
        schema={
          selectPlan
            ? schema.extend({
                planPublicId: operations.submit.requestSchema.shape.body.shape.planPublicId,
              })
            : schema
        }
        fields={
          custom
            ? fields
                .filter((field) => field.name !== "templateKey")
                .concat({
                  name: "templateKey",
                  label: t("setup.customKey"),
                  type: "number",
                  required: true,
                  value: "-1",
                  options: [{ value: "-1", label: t("setup.custom") }],
                })
            : fields
        }
        label={label}
        invalidLabel={t("invalid")}
        disabled={disabled || (selectPlan && !data?.length)}
        onSubmit={(body) => {
          if (!body || typeof body !== "object") return;
          const trial =
            "trialEndDate" in body && typeof body.trialEndDate === "string"
              ? body.trialEndDate
              : undefined;
          if ((custom && !validSetup(steps)) || !validTrialEndDate(trial)) {
            setInvalid(true);
            return;
          }
          setInvalid(false);
          onSubmit(custom ? { ...body, templateKey: -1, setupSteps: steps } : body);
        }}
      />
      {selectPlan && !data?.length && <p>{t("plan.unavailable")}</p>}
      {invalid && <p role="alert">{t("invalid")}</p>}
    </QueryPanel>
  );
}
