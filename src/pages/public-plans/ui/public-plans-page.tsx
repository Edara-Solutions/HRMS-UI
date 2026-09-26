import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Check, Globe2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ContractViolation } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { LocaleSwitcher } from "@/shared/ui/locale-switcher";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { ThemeToggle } from "@/shared/ui/theme-toggle";
import {
  type PublicPlanSearch,
  type PublicPlansResponse,
  publicPlansQuery,
} from "../api/public-plans";

const featureLabels = {
  ANALYTICS: { ar: "التحليلات", en: "Analytics" },
  ATTENDANCE: { ar: "الحضور", en: "Attendance" },
  OVERVIEW: { ar: "نظرة عامة", en: "Overview" },
  TEAM_MANAGEMENT: { ar: "إدارة الفريق", en: "Team management" },
} as const;

const intervalLabels = {
  annually: { ar: "سنوي", en: "annually" },
  biannual: { ar: "نصف سنوي", en: "biannual" },
  monthly: { ar: "شهري", en: "monthly" },
  quarterly: { ar: "ربع سنوي", en: "quarterly" },
} as const;

const copy = {
  ar: {
    eyebrow: "خطط إدارة",
    title: "خطط واضحة تنمو مع فريقك",
    intro: "استعرض جميع الخطط المنشورة، ثم اختر سياق التسعير المناسب لبلدك وعملتك.",
    name: "البحث بالاسم",
    currency: "العملة",
    interval: "دورة الفوترة",
    country: "رمز البلد (اختياري)",
    region: "المنطقة (اختياري)",
    count: "عدد الدورات (اختياري)",
    apply: "عرض الأسعار",
    clear: "مسح عوامل التصفية",
    contextHint:
      "اختر العملة ودورة الفوترة معًا لعرض السعر المناسب. يمكنك استعراض الخطط دون اختيارهما.",
    retry: "إعادة المحاولة",
    loading: "جارٍ تحميل الخطط…",
    error: "تعذر تحميل الخطط الآن.",
    unavailableError: "دليل الخطط غير متاح مؤقتًا. حاول مرة أخرى لاحقًا.",
    empty: "لا توجد خطط منشورة حتى الآن.",
    emptyFiltered: "لا توجد خطط تطابق عوامل التصفية الحالية.",
    invalidContext: "أدخل رمز عملة من 3 أحرف، ورمز بلد من حرفين، وعدد دورات صحيحًا موجبًا.",
    unavailable: "السعر غير منشور لهذا السياق",
    duration: "المدة",
    days: "يوم",
    source: "سعر محدد حسب",
  },
  en: {
    eyebrow: "Edara plans",
    title: "Clear plans that grow with your team",
    intro: "Browse every published plan, then choose the pricing context that fits your market.",
    name: "Search by name",
    currency: "Currency",
    interval: "Billing interval",
    country: "Country code (optional)",
    region: "Region (optional)",
    count: "Interval count (optional)",
    apply: "Show prices",
    clear: "Clear filters",
    contextHint:
      "Choose currency and billing interval together to resolve prices. You can browse plans without them.",
    retry: "Try again",
    loading: "Loading plans…",
    error: "Plans could not be loaded right now.",
    unavailableError: "The plan catalogue is temporarily unavailable. Please try again later.",
    empty: "No plans have been published yet.",
    emptyFiltered: "No plans match the current filters.",
    invalidContext:
      "Use a 3-letter currency, a 2-letter country code, and a positive whole interval count.",
    unavailable: "No price published for this context",
    duration: "Duration",
    days: "days",
    source: "Price selected by",
  },
} as const;

export function PublicPlansPage() {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <PublicPlansCatalogue />
    </QueryClientProvider>
  );
}

function PublicPlansCatalogue() {
  const { i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === "ar" ? "ar" : "en";
  const text = copy[locale];
  const [draft, setDraft] = useState<PublicPlanSearch>({});
  const [search, setSearch] = useState<PublicPlanSearch>({});
  const { data, error, isError, isPending, refetch } = useQuery(publicPlansQuery(search));
  const hasFilters = Object.values(search).some((value) => value !== undefined && value !== "");
  const contextIsValid = isValidContext(draft);

  function updateDraft(field: keyof PublicPlanSearch, value: string) {
    setDraft((current) => ({
      ...current,
      [field]: field === "intervalCount" ? (value ? Number(value) : undefined) : value || undefined,
    }));
  }

  function applyPricingContext() {
    if (!contextIsValid) return;
    setSearch(draft);
  }

  return (
    <div className="min-h-dvh bg-[var(--color-bg)]">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2.5 px-4 sm:px-6">
          <Globe2 className="size-5 text-[var(--color-primary)]" aria-hidden="true" />
          <span className="text-sm font-semibold tracking-tight">Edara HRMS</span>
          <div className="ms-auto flex items-center gap-1">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <section className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-primary)]">
            {text.eyebrow}
          </p>
          <h1 className="mt-3 text-[26px] font-bold tracking-tight">{text.title}</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">{text.intro}</p>
        </section>

        <Card as="section" className="mt-8">
          <CardHeader>
            <CardTitle>{locale === "ar" ? "سياق التسعير" : "Pricing context"}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 p-[18px] sm:grid-cols-2 lg:grid-cols-6">
            <Field label={text.name}>
              <Input
                aria-label={text.name}
                value={draft.name ?? ""}
                onChange={(event) => updateDraft("name", event.target.value)}
              />
            </Field>
            <Field label={text.currency}>
              <Input
                aria-label={text.currency}
                maxLength={3}
                minLength={3}
                aria-invalid={Boolean(draft.currencyCode) && draft.currencyCode?.length !== 3}
                placeholder="USD"
                value={draft.currencyCode ?? ""}
                onChange={(event) => updateDraft("currencyCode", event.target.value.toUpperCase())}
              />
            </Field>
            <Field label={text.interval}>
              <Select
                value={draft.billingInterval}
                onValueChange={(value) => updateDraft("billingInterval", value)}
              >
                <SelectTrigger aria-label={text.interval}>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">{locale === "ar" ? "شهري" : "Monthly"}</SelectItem>
                  <SelectItem value="quarterly">
                    {locale === "ar" ? "ربع سنوي" : "Quarterly"}
                  </SelectItem>
                  <SelectItem value="biannual">
                    {locale === "ar" ? "نصف سنوي" : "Biannual"}
                  </SelectItem>
                  <SelectItem value="annually">{locale === "ar" ? "سنوي" : "Annually"}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label={text.country}>
              <Input
                aria-label={text.country}
                maxLength={2}
                minLength={2}
                aria-invalid={Boolean(draft.countryCode) && draft.countryCode?.length !== 2}
                placeholder="EG"
                value={draft.countryCode ?? ""}
                onChange={(event) => updateDraft("countryCode", event.target.value.toUpperCase())}
              />
            </Field>
            <Field label={text.region}>
              <Input
                aria-label={text.region}
                maxLength={32}
                value={draft.regionCode ?? ""}
                onChange={(event) => updateDraft("regionCode", event.target.value)}
              />
            </Field>
            <Field label={text.count}>
              <Input
                aria-label={text.count}
                min={1}
                step={1}
                aria-invalid={
                  draft.intervalCount !== undefined &&
                  (!Number.isInteger(draft.intervalCount) || draft.intervalCount < 1)
                }
                type="number"
                value={draft.intervalCount ?? ""}
                onChange={(event) => updateDraft("intervalCount", event.target.value)}
              />
            </Field>
            <div className="sm:col-span-2 lg:col-span-6">
              <p className="mb-3 text-xs text-[var(--color-text-muted)]">{text.contextHint}</p>
              <Button onClick={applyPricingContext} disabled={!contextIsValid}>
                {text.apply}
              </Button>
              {!contextIsValid && (
                <p role="alert" className="mt-3 text-xs text-[var(--color-danger)]">
                  {text.invalidContext}
                </p>
              )}
              <Button
                className="ms-2"
                intent="dismissive"
                onClick={() => {
                  setDraft({});
                  setSearch({});
                }}
              >
                {text.clear}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div aria-live="polite" className="mt-8">
          {isPending && <PlanSkeleton label={text.loading} />}
          {isError && error instanceof ContractViolation && (
            <UnavailableState label={text.unavailableError} />
          )}
          {isError && !(error instanceof ContractViolation) && (
            <ErrorState label={text.error} retry={text.retry} onRetry={() => void refetch()} />
          )}
          {data?.data.length === 0 && (
            <EmptyState label={hasFilters ? text.emptyFiltered : text.empty} />
          )}
          {data && data.data.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data.data.map((plan) => (
                <PlanCard key={plan.publicId} locale={locale} plan={plan} text={text} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface FieldProps {
  children: React.ReactNode;
  label: string;
}
function Field({ children, label }: FieldProps) {
  return (
    <div className="space-y-2 text-xs font-medium text-[var(--color-text)]">
      <span className="block">{label}</span>
      {children}
    </div>
  );
}

interface PlanCardProps {
  locale: "ar" | "en";
  plan: PublicPlansResponse["data"][number];
  text: (typeof copy)["en"] | (typeof copy)["ar"];
}
function PlanCard({ locale, plan, text }: PlanCardProps) {
  const source = plan.effectivePrice?.countryCode
    ? locale === "ar"
      ? "البلد"
      : "country"
    : plan.effectivePrice?.regionCode
      ? locale === "ar"
        ? "المنطقة"
        : "region"
      : locale === "ar"
        ? "السعر الافتراضي"
        : "default market";
  return (
    <Card as="article" className="overflow-hidden">
      <CardHeader>
        <CardTitle>
          <bdi dir="auto">{plan.name}</bdi>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-[18px]">
        <p className="min-h-10 text-sm leading-5 text-[var(--color-text-muted)]">
          <bdi dir="auto">{plan.description ?? "—"}</bdi>
        </p>
        <div>
          <p className="text-[28px] font-bold tracking-tight tabular-nums">
            {plan.effectivePrice?.money.formattedAmount ?? text.unavailable}
          </p>
          {plan.effectivePrice && (
            <div className="mt-1 space-y-1 text-xs text-[var(--color-text-faint)]">
              <p>
                {plan.effectivePrice.money.currencyCode} ·{" "}
                {intervalLabels[plan.effectivePrice.billingInterval][locale]} ·{" "}
                {plan.effectivePrice.intervalCount}
              </p>
              <p>
                {text.source} {source}
              </p>
            </div>
          )}
        </div>
        <p className="text-xs font-medium text-[var(--color-text-muted)]">
          {text.duration}: <span className="tabular-nums">{plan.duration}</span> {text.days}
        </p>
        <ul className="space-y-2">
          {plan.features.map((feature) => (
            <li className="flex items-start gap-2 text-sm" key={feature}>
              <Check
                className="mt-0.5 size-4 shrink-0 text-[var(--color-success)]"
                aria-hidden="true"
              />
              <bdi dir="auto">
                {featureLabels[feature as keyof typeof featureLabels]?.[locale] ?? feature}
              </bdi>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function PlanSkeleton({ label }: { label: string }) {
  return (
    <output className="grid gap-4 md:grid-cols-3">
      <span className="sr-only">{label}</span>
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="h-64 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] motion-safe:animate-pulse"
        />
      ))}
    </output>
  );
}
function ErrorState({
  label,
  retry,
  onRetry,
}: {
  label: string;
  retry: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-[var(--radius-lg)] border border-[var(--color-danger)] bg-[var(--color-danger-soft)] p-6"
    >
      <p className="text-sm">{label}</p>
      <Button
        className="mt-4"
        intent="action"
        leadingIcon={<RefreshCw className="size-4" />}
        onClick={onRetry}
      >
        {retry}
      </Button>
    </div>
  );
}
function UnavailableState({ label }: { label: string }) {
  return (
    <p
      role="alert"
      className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center text-sm text-[var(--color-text-muted)]"
    >
      {label}
    </p>
  );
}
function EmptyState({ label }: { label: string }) {
  return (
    <p className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center text-sm text-[var(--color-text-muted)]">
      {label}
    </p>
  );
}

function isValidContext(search: PublicPlanSearch) {
  if (Boolean(search.currencyCode) !== Boolean(search.billingInterval)) return false;
  if (search.currencyCode !== undefined && !/^[A-Z]{3}$/.test(search.currencyCode)) return false;
  if (search.countryCode !== undefined && !/^[A-Z]{2}$/.test(search.countryCode)) return false;
  if (
    search.intervalCount !== undefined &&
    (!Number.isInteger(search.intervalCount) || search.intervalCount < 1)
  )
    return false;
  return true;
}
