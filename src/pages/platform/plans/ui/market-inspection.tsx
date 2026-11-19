import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ContractViolation,
  platformPlanOperations as operations,
  usePlatformAccess,
} from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { SectionCard } from "@/shared/ui/section-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Skeleton } from "@/shared/ui/skeleton";
import { effectiveQuery, type Market } from "../api/catalogue";

const INTERVALS = ["monthly", "quarterly", "biannual", "annually"] as const;

interface Props {
  publicId: string;
  search: Partial<Market>;
}

export function MarketInspection({ publicId, search }: Props) {
  const { t } = useTranslation("platform-plans");
  const access = usePlatformAccess();
  const navigate = useNavigate();
  const id = useId();
  const schema = operations.effective.requestSchema.shape.query;
  const parsed = schema.safeParse(search);
  const allowed = access.availability(operations.effective.key).state === "enabled";
  const [draft, setDraft] = useState({
    currencyCode: search.currencyCode ?? "",
    billingInterval: search.billingInterval ?? "monthly",
    countryCode: search.countryCode ?? "",
    regionCode: search.regionCode ?? "",
    intervalCount: String(search.intervalCount ?? ""),
  });
  const edit = (patch: Partial<typeof draft>) => setDraft((current) => ({ ...current, ...patch }));
  const [invalid, setInvalid] = useState(false);
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

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = schema.safeParse({
      currencyCode: draft.currencyCode.trim(),
      billingInterval: draft.billingInterval,
      countryCode: draft.countryCode.trim() || undefined,
      regionCode: draft.regionCode.trim() || undefined,
      intervalCount: draft.intervalCount.trim() ? Number(draft.intervalCount) : undefined,
    });
    setInvalid(!result.success);
    if (result.success)
      void navigate({
        to: "/platform/plans/$publicId",
        params: { publicId },
        search: result.data,
      });
  }

  const field = (name: string) => `${id}-${name}`;

  return (
    <SectionCard
      title={t("effective")}
      description={t("marketHelp")}
      contentClassName="space-y-4 p-4 sm:p-5"
    >
      <form
        noValidate
        aria-label={t("effective")}
        onSubmit={submit}
        className="grid grid-cols-[minmax(0,1fr)] items-end gap-3 sm:grid-cols-[repeat(2,minmax(0,1fr))] lg:grid-cols-[repeat(5,minmax(0,1fr))_auto]"
      >
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor={field("currency")}>{t("currency")}</Label>
          <Input
            id={field("currency")}
            value={draft.currencyCode}
            maxLength={3}
            autoCapitalize="characters"
            aria-invalid={invalid && !draft.currencyCode.trim()}
            onChange={(event) => edit({ currencyCode: event.target.value.toUpperCase() })}
          />
        </div>
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor={field("interval")}>{t("interval")}</Label>
          <Select
            value={draft.billingInterval}
            onValueChange={(value) =>
              edit({ billingInterval: value as typeof draft.billingInterval })
            }
          >
            <SelectTrigger id={field("interval")} aria-label={t("interval")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INTERVALS.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor={field("country")}>{t("country")}</Label>
          <Input
            id={field("country")}
            value={draft.countryCode}
            maxLength={2}
            onChange={(event) => edit({ countryCode: event.target.value.toUpperCase() })}
          />
        </div>
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor={field("region")}>{t("region")}</Label>
          <Input
            id={field("region")}
            value={draft.regionCode}
            onChange={(event) => edit({ regionCode: event.target.value })}
          />
        </div>
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor={field("count")}>{t("count")}</Label>
          <Input
            id={field("count")}
            type="number"
            min={1}
            value={draft.intervalCount}
            placeholder="1"
            onChange={(event) => edit({ intervalCount: event.target.value })}
          />
        </div>
        <Button
          type="submit"
          variant="secondary"
          className="justify-self-start whitespace-nowrap"
          leadingIcon={<Search size={14} aria-hidden="true" />}
        >
          {t("inspect")}
        </Button>
      </form>
      {invalid && (
        <p role="alert" className="text-xs text-[var(--color-danger)]">
          {t("inspectInvalid")}
        </p>
      )}
      <section
        aria-label={t("resolved")}
        className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3"
      >
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-faint)]">
          {t("resolved")}
        </p>
        {!parsed.success && (
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">{t("resolvedEmpty")}</p>
        )}
        {parsed.success && isPending && <Skeleton className="mt-2 h-6 w-48" />}
        {parsed.success && error && (
          <div role="alert" className="mt-1 flex flex-wrap items-center gap-3 text-sm">
            <span className="text-[var(--color-text-muted)]">
              {error instanceof ContractViolation ? t("contract") : t("planUnavailableHelp")}
            </span>
            {!(error instanceof ContractViolation) && (
              <Button variant="ghost" size="xs" onClick={() => void refetch()}>
                {t("retry")}
              </Button>
            )}
          </div>
        )}
        {parsed.success && data && (
          <p className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-xl font-semibold tabular-nums text-[var(--color-text)]">
              <bdi>{data.money.formattedAmount}</bdi>
            </span>
            <span className="text-sm text-[var(--color-text-muted)]">
              {t("billingEvery", { interval: t(data.billingInterval), count: data.intervalCount })}{" "}
              · {t(`source.${data.source}`)}
            </span>
          </p>
        )}
      </section>
    </SectionCard>
  );
}
