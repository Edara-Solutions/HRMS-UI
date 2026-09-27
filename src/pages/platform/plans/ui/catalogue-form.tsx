import { useTranslation } from "react-i18next";
import { platformPlanOperations as operations } from "@/shared/api";
import { type SchemaField, SchemaForm } from "@/shared/ui/schema-form";
import type { Plan, Price } from "../api/catalogue";
import { planFormSchema, planLimits, supportedPlanFeatures } from "../model/catalogue-form";

interface PlanProps {
  plan?: Plan;
  disabled: boolean;
  invalidFields?: readonly string[];
  onSubmit: (body: unknown) => void;
}
export function PlanForm({ plan, disabled, invalidFields, onSubmit }: PlanProps) {
  const { t } = useTranslation("platform-plans");
  const fields: SchemaField[] = [
    { name: "name", label: t("name"), required: true, value: plan?.name },
    {
      name: "description",
      label: t("description"),
      type: "textarea",
      nullable: true,
      value: plan?.description ?? "",
    },
    {
      name: "duration",
      label: t("duration"),
      type: "number",
      required: true,
      value: String(plan?.duration ?? 30),
    },
    {
      name: "features",
      label: t("features"),
      type: "textarea",
      required: true,
      value:
        plan?.features.filter((feature) => supportedPlanFeatures.has(feature)).join(", ") ?? "",
    },
    ...planLimits.map((name) => ({
      name: `limits.${name}`,
      required: true,
      label: t(name),
      type: "number" as const,
      value: String(plan?.limits?.[name] ?? ""),
    })),
    { name: "isPublic", label: t("public"), type: "checkbox", value: plan?.isPublic ?? false },
    { name: "isActive", label: t("active"), type: "checkbox", value: plan?.isActive ?? true },
  ];
  const schema = planFormSchema(plan);
  return (
    <>
      <p>{t("featureHelp")}</p>
      <SchemaForm
        schema={schema}
        fields={
          plan?.name === "Default Full Access"
            ? fields.filter((field) => !["name", "isPublic"].includes(field.name))
            : fields
        }
        changedOnly={!!plan}
        label={t("save")}
        invalidLabel={t("invalid")}
        disabled={disabled}
        serverInvalidFields={invalidFields}
        onSubmit={onSubmit}
      />
    </>
  );
}
interface PriceProps {
  price?: Price;
  disabled: boolean;
  invalidFields?: readonly string[];
  onSubmit: (body: unknown) => void;
}
export function PriceForm({ price, disabled, invalidFields, onSubmit }: PriceProps) {
  const { t } = useTranslation("platform-plans");
  return (
    <SchemaForm
      schema={
        price
          ? operations.updatePrice.requestSchema.shape.body
          : operations.createPrice.requestSchema.shape.body
      }
      changedOnly={!!price}
      disabled={disabled}
      serverInvalidFields={invalidFields}
      label={t("save")}
      invalidLabel={t("invalid")}
      onSubmit={onSubmit}
      fields={[
        {
          name: "currencyCode",
          label: t("currency"),
          required: true,
          value: price?.money.currencyCode ?? "",
        },
        {
          name: "amountMinor",
          label: t("amountMinor"),
          required: true,
          type: "number",
          value: String(price?.money.amountMinor ?? ""),
        },
        {
          name: "billingInterval",
          label: t("interval"),
          required: true,
          value: price?.billingInterval ?? "monthly",
          options: ["monthly", "quarterly", "biannual", "annually"].map((value) => ({
            value,
            label: t(value),
          })),
        },
        {
          name: "intervalCount",
          label: t("count"),
          type: "number",
          value: String(price?.intervalCount ?? 1),
        },
        {
          name: "countryCode",
          label: t("country"),
          nullable: true,
          value: price?.countryCode ?? "",
        },
        { name: "regionCode", label: t("region"), nullable: true, value: price?.regionCode ?? "" },
        { name: "isActive", label: t("active"), type: "checkbox", value: price?.isActive ?? true },
      ]}
    />
  );
}
