import { useTranslation } from "react-i18next";
import { platformLeadOperations as operations } from "@/shared/api";
import { QueryPanel } from "@/shared/ui/query-panel";
import { SchemaForm } from "@/shared/ui/schema-form";
import { useConversionPlans } from "../api/plans";

interface Props {
  disabled?: boolean;
  label: string;
  onSubmit: (body: unknown) => void;
}
export function ConversionPlanForm({ disabled, label, onSubmit }: Props) {
  const { t } = useTranslation("platform-leads");
  const { data, error, isPending, refetch } = useConversionPlans();
  return (
    <QueryPanel
      title={t("plan.title")}
      pending={isPending}
      error={error}
      retry={() => void refetch()}
    >
      {data?.length ? (
        <SchemaForm
          schema={operations.changePlan.requestSchema.shape.body}
          fields={[
            {
              name: "planPublicId",
              label: t("plan.title"),
              required: true,
              options: data.map((plan) => ({ value: plan.publicId, label: plan.name })),
            },
          ]}
          label={label}
          invalidLabel={t("invalid")}
          disabled={disabled}
          onSubmit={onSubmit}
        />
      ) : (
        <p>{t("plan.unavailable")}</p>
      )}
    </QueryPanel>
  );
}
