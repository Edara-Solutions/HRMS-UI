import { useTranslation } from "react-i18next";
import { platformPlanOperations as operations } from "@/shared/api";
import { SchemaForm } from "@/shared/ui/schema-form";
import type { Price } from "../api/catalogue";

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
