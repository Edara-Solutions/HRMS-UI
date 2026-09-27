import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { platformPlanOperations as operations, usePlatformAccess } from "@/shared/api";
import { QueryPanel } from "@/shared/ui/query-panel";
import { SchemaForm } from "@/shared/ui/schema-form";
import { effectiveQuery, type Market } from "../api/catalogue";

interface Props {
  publicId: string;
  search: Partial<Market>;
}
export function MarketInspection({ publicId, search }: Props) {
  const { t } = useTranslation("platform-plans");
  const access = usePlatformAccess();
  const navigate = useNavigate();
  const parsed = operations.effective.requestSchema.shape.query.safeParse(search);
  const allowed = access.availability(operations.effective.key).state === "enabled";
  const { data, error, isPending, refetch } = useQuery({
    ...effectiveQuery(
      access.user?.publicId ?? "",
      publicId,
      parsed.success ? parsed.data : { currencyCode: "", billingInterval: "monthly" },
    ),
    enabled: allowed && parsed.success,
    retry: false,
  });
  if (!allowed) return null;
  return (
    <QueryPanel title={t("effective")}>
      <p>{t("marketHelp")}</p>
      <SchemaForm
        key={JSON.stringify(search)}
        schema={operations.effective.requestSchema.shape.query}
        label={t("inspect")}
        invalidLabel={t("invalid")}
        onSubmit={(body) => {
          const result = operations.effective.requestSchema.shape.query.parse(body);
          void navigate({ to: "/platform/plans/$publicId", params: { publicId }, search: result });
        }}
        fields={[
          {
            name: "currencyCode",
            label: t("currency"),
            required: true,
            value: search.currencyCode ?? "",
          },
          {
            name: "billingInterval",
            label: t("interval"),
            required: true,
            value: search.billingInterval ?? "monthly",
            options: ["monthly", "quarterly", "biannual", "annually"].map((value) => ({
              value,
              label: t(value),
            })),
          },
          { name: "countryCode", label: t("country"), value: search.countryCode ?? "" },
          { name: "regionCode", label: t("region"), value: search.regionCode ?? "" },
          {
            name: "intervalCount",
            label: t("count"),
            type: "number",
            value: String(search.intervalCount ?? ""),
          },
        ]}
      />
      {parsed.success && (
        <QueryPanel
          title={t("resolved")}
          pending={isPending}
          error={error}
          retry={() => void refetch()}
        >
          {data && (
            <p>
              <bdi>{data.money.formattedAmount}</bdi> · {t(`source.${data.source}`)} ·{" "}
              {t(data.billingInterval)} × {data.intervalCount}
            </p>
          )}
        </QueryPanel>
      )}
    </QueryPanel>
  );
}
