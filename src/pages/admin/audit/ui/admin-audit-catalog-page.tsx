import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { ArrowLeft, Search, X } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AuditFilterCombobox,
  auditFilterComboboxState,
  auditGroupLabel,
  auditNamespace,
  auditPageSize,
} from "@/features/audit-filters";
import { type AuditEventMetadata, auditEventCatalog } from "@/shared/audit-catalog";
import { cn } from "@/shared/lib/cn";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { useAuditCompanyOptions } from "../api/audit-companies";

/** The dotted prefix an event type shares with its siblings — `company.lifecycle`. */
function familyOf(eventType: string): string {
  return eventType.split(".").slice(0, -1).join(".");
}

interface AuditEventFamilyGroup {
  family: string;
  events: AuditEventMetadata[];
}

function groupByFamily(events: readonly AuditEventMetadata[]): AuditEventFamilyGroup[] {
  const families = new Map<string, AuditEventMetadata[]>();
  for (const event of events) {
    const family = familyOf(event.eventType);
    const members = families.get(family);
    if (members) members.push(event);
    else families.set(family, [event]);
  }
  return [...families].map(([family, members]) => ({ family, events: members }));
}

/** Whether a reader searching for these words meant this event — its name or its description. */
function describesEvent(event: AuditEventMetadata, query: string): boolean {
  if (query.length === 0) return true;
  const needle = query.toLowerCase();
  return (
    event.eventType.toLowerCase().includes(needle) ||
    event.description.toLowerCase().includes(needle)
  );
}

const actorLabelKeys = {
  USER: "chrome.actorUser",
  PLATFORM_ADMIN: "chrome.platformAdmin",
  SYSTEM: "chrome.actorSystem",
  ANONYMOUS: "chrome.actorAnonymous",
  ATTRIBUTION_FAILED: "chrome.actorAnonymous",
  ERASED_USER: "chrome.actorUser",
} as const satisfies Record<AuditEventMetadata["actors"][number], string>;

/**
 * Every catalog value a reader sees, keyed by the value itself. One map per field keeps the
 * page free of a ternary cascade that would have to be read to be trusted.
 */
const catalogLabelKeys = {
  scope: { PLATFORM: "chrome.scopePlatform", COMPANY: "chrome.scopeCompany" },
  audience: { PLATFORM: "chrome.audiencePlatform", COMPANY: "chrome.audienceCompany" },
  outcomePolicy: {
    SUCCESS_ONLY: "chrome.outcomePolicySuccessOnly",
    ALLOW_FAILURE: "chrome.outcomePolicyAllowFailure",
  },
  personalData: { none: "chrome.personalDataNone", erase: "chrome.personalDataErase" },
  lifecycle: { ACTIVE: "chrome.lifecycleActive", DEPRECATED: "chrome.lifecycleDeprecatedShort" },
} as const satisfies {
  [Field in keyof Omit<AuditEventMetadata, "eventType" | "description" | "actors">]: Record<
    AuditEventMetadata[Field],
    string
  >;
};

interface CatalogFieldProps {
  label: string;
  children: ReactNode;
}

function CatalogField({ label, children }: CatalogFieldProps) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-faint)]">
        {label}
      </dt>
      <dd className="mt-0.5 text-[12px] text-[var(--color-text)]">{children}</dd>
    </div>
  );
}

interface CatalogEntryProps {
  event: AuditEventMetadata;
  companyPublicId?: string;
}

function CatalogEntry({ event, companyPublicId }: CatalogEntryProps) {
  const { t } = useTranslation(auditNamespace);
  const labelled = t(event.eventType);

  const occurrencesSearch = {
    limit: auditPageSize,
    eventType: [event.eventType],
    view: "timeline" as const,
    ...(companyPublicId ? { companyPublicId } : {}),
  };

  return (
    <li className="border-b border-[var(--color-border)] px-4 py-4 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[13px] font-medium text-[var(--color-text)]">{labelled}</p>
        {event.lifecycle === "DEPRECATED" ? (
          <Badge variant="warn">{t("chrome.lifecycleDeprecatedShort")}</Badge>
        ) : null}
      </div>
      <p className="mt-0.5 font-mono text-[11px] text-[var(--color-text-faint)]">
        {event.eventType}
      </p>
      <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-[var(--color-text-muted)]">
        {event.description}
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-6">
        <CatalogField label={t("chrome.catalogActors")}>
          {event.actors.map((kind) => (
            <span key={kind} className="me-1 inline-block">
              {t(actorLabelKeys[kind])}
            </span>
          ))}
        </CatalogField>
        <CatalogField label={t("chrome.catalogScope")}>
          {t(catalogLabelKeys.scope[event.scope])}
        </CatalogField>
        <CatalogField label={t("chrome.catalogAudience")}>
          {t(catalogLabelKeys.audience[event.audience])}
        </CatalogField>
        <CatalogField label={t("chrome.catalogOutcomePolicy")}>
          {t(catalogLabelKeys.outcomePolicy[event.outcomePolicy])}
        </CatalogField>
        <CatalogField label={t("chrome.catalogLifecycle")}>
          {t(catalogLabelKeys.lifecycle[event.lifecycle])}
        </CatalogField>
        <CatalogField label={t("chrome.catalogPersonalData")}>
          {t(catalogLabelKeys.personalData[event.personalData])}
        </CatalogField>
      </dl>
      <div className="mt-3">
        <Link
          to="/admin/audit"
          search={occurrencesSearch}
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] text-[12px] font-medium text-[var(--color-primary)] transition-colors hover:text-[var(--color-text)]"
        >
          {t("chrome.catalogViewLive")}
        </Link>
      </div>
    </li>
  );
}

/**
 * The Audit Event Catalog as a navigation hub: every event the platform can record, who records
 * it, where it applies, and a path into the live trail slices that answer "when". The company
 * lens narrows both the listing and every occurrence link to one tenant's world.
 */
export function AdminAuditCatalogPage() {
  const { t } = useTranslation(auditNamespace);
  const navigate = useNavigate();
  const { companyPublicId } = useSearch({ from: "/admin/audit/catalog" });
  const companyOptions = useAuditCompanyOptions();
  const [search, setSearch] = useState("");
  const query = useDebouncedValue(search, 200);

  const selectedCompany = companyOptions.data?.find((company) => company.value === companyPublicId);

  const families = useMemo(() => {
    const visible =
      companyPublicId === undefined
        ? auditEventCatalog
        : auditEventCatalog.filter((event) => event.audience === "COMPANY");
    return groupByFamily(visible.filter((event) => describesEvent(event, query)));
  }, [query, companyPublicId]);
  const matchCount = families.reduce((total, { events }) => total + events.length, 0);

  function changeLens(value?: string) {
    void navigate({
      to: "/admin/audit/catalog",
      search: value ? { companyPublicId: value } : {},
    });
  }

  return (
    <div className="mx-auto max-w-[1100px]">
      <Link
        to="/admin/audit"
        search={{ limit: auditPageSize }}
        className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-primary)]"
      >
        <ArrowLeft size={14} aria-hidden="true" className="rtl:rotate-180" />
        {t("chrome.backToTrail")}
      </Link>

      <div className="mb-6 mt-3">
        <h1 className="text-[26px] font-bold tracking-tight text-[var(--color-text)]">
          {t("chrome.catalogTitle")}
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-[var(--color-text-muted)]">
          {t("chrome.catalogSubtitle")}
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-80">
          <Search
            size={13}
            aria-hidden="true"
            className="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)]"
          />
          <Input
            type="search"
            value={search}
            className="ps-8 pe-8"
            aria-label={t("chrome.catalogSearch")}
            placeholder={t("chrome.catalogSearch")}
            onChange={(event) => setSearch(event.target.value)}
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label={t("chrome.catalogEmpty")}
              className="absolute end-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-[var(--color-text-faint)] transition-colors duration-150 ease-out hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
            >
              <X size={12} aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <AuditFilterCombobox
          id="admin-audit-catalog-company"
          label={t("chrome.filterCompany")}
          searchPlaceholder={t("chrome.filterActorSearch")}
          summary={selectedCompany?.label ?? t("chrome.catalogLensAll")}
          value={companyPublicId}
          options={companyOptions.data ?? []}
          state={auditFilterComboboxState(companyOptions)}
          onSelect={(option) => changeLens(option.value)}
          onClear={() => changeLens(undefined)}
        />
        <span className="text-[11px] tabular-nums text-[var(--color-text-muted)]">
          {t("chrome.catalogCount", { count: matchCount })}
        </span>
      </div>

      {matchCount === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-[var(--color-text-muted)]">
            {t("chrome.catalogEmpty")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {families.map(({ family, events }) => (
            <Card key={family} className="overflow-hidden">
              <p
                className={cn(
                  "border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2.5",
                  "text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]",
                )}
              >
                {auditGroupLabel(t, family)}
              </p>
              <ul>
                {events.map((event) => (
                  <CatalogEntry
                    key={event.eventType}
                    event={event}
                    companyPublicId={companyPublicId}
                  />
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
