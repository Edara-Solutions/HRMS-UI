import { useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  CircleDashed,
  Globe,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { Skeleton } from "@/shared/ui/skeleton";
import {
  type Company,
  type CompanyConfig,
  useCompany,
  useCompanyConfigs,
} from "../api/company-detail";
import { SITE_STATUS_FLAG_LABEL, SUBSCRIPTION_STATUS_BADGE } from "../api/company-labels";
import { type CompanySendingDomain, useCompanySendingDomain } from "../api/company-sending-domain";
import { EditCompanyConfigModal } from "./edit-company-config-modal";
import { EditCompanyModal } from "./edit-company-modal";

function formatDate(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const SITE_STATUS_FLAG_KEYS = [
  "isFrozen",
  "isReadOnly",
  "isBlocked",
  "isUnderMaintenance",
] as const;

// --- Profile ------------------------------------------------------------------

function CompanyProfileCard({ company, onEdit }: { company: Company; onEdit: () => void }) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Profile</CardTitle>
        <Button intent="utility" leadingIcon={<Pencil size={13} />} onClick={onEdit}>
          Edit
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
          <div>
            <dt className="text-[var(--color-text-faint)]">Company code</dt>
            <dd className="mt-1 font-mono text-[var(--color-text)]">{company.companyCode}</dd>
          </div>
          <div>
            <dt className="text-[var(--color-text-faint)]">Status</dt>
            <dd className="mt-1">
              <Badge variant={company.isActive ? "success" : "danger"}>
                {company.isActive ? "Active" : "Inactive"}
              </Badge>
            </dd>
          </div>
          <div>
            <dt className="text-[var(--color-text-faint)]">Phone</dt>
            <dd className="mt-1 flex items-center gap-1 text-[var(--color-text)]">
              <Phone size={11} className="shrink-0 text-[var(--color-text-muted)]" />
              {company.phoneNumber}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--color-text-faint)]">Country</dt>
            <dd className="mt-1 flex items-center gap-1 text-[var(--color-text)]">
              <MapPin size={11} className="shrink-0 text-[var(--color-text-muted)]" />
              {company.country}
            </dd>
          </div>
          {company.website && (
            <div className="col-span-2">
              <dt className="text-[var(--color-text-faint)]">Website</dt>
              <dd className="mt-1 flex items-center gap-1 text-[var(--color-text)]">
                <Globe size={11} className="shrink-0 text-[var(--color-text-muted)]" />
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate hover:text-[var(--color-primary)]"
                >
                  {company.website.replace(/^https?:\/\//, "")}
                </a>
              </dd>
            </div>
          )}
          {company.addressLine && (
            <div className="col-span-2">
              <dt className="text-[var(--color-text-faint)]">Address</dt>
              <dd className="mt-1 text-[var(--color-text)]">{company.addressLine}</dd>
            </div>
          )}
          <div>
            <dt className="text-[var(--color-text-faint)]">Created</dt>
            <dd className="mt-1 tabular-nums text-[var(--color-text-muted)]">
              {formatDate(company.createdAt)}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--color-text-faint)]">Updated</dt>
            <dd className="mt-1 tabular-nums text-[var(--color-text-muted)]">
              {formatDate(company.updatedAt)}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

// --- Subscription / config ------------------------------------------------------

function CompanyConfigCard({
  config,
  onEdit,
}: {
  config: CompanyConfig | undefined;
  onEdit: () => void;
}) {
  const activeFlags = config ? SITE_STATUS_FLAG_KEYS.filter((key) => config.siteStatus[key]) : [];

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Subscription</CardTitle>
        {config && (
          <Button intent="utility" leadingIcon={<Pencil size={13} />} onClick={onEdit}>
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-4">
        {!config ? (
          <EmptyState
            icon={Building2}
            title="No subscription configured"
            description="This company has no plan or trial set up yet."
          />
        ) : (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
            <div>
              <dt className="text-[var(--color-text-faint)]">Status</dt>
              <dd className="mt-1">
                <Badge variant={SUBSCRIPTION_STATUS_BADGE[config.subscriptionStatus].variant}>
                  {SUBSCRIPTION_STATUS_BADGE[config.subscriptionStatus].label}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-[var(--color-text-faint)]">Plan</dt>
              <dd className="mt-1 text-[var(--color-text)]">{config.plan?.name ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-[var(--color-text-faint)]">Trial ends</dt>
              <dd className="mt-1 tabular-nums text-[var(--color-text-muted)]">
                {formatDate(config.trialEndDate)}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--color-text-faint)]">Subscription ends</dt>
              <dd className="mt-1 tabular-nums text-[var(--color-text-muted)]">
                {formatDate(config.subscriptionEndDate)}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-[var(--color-text-faint)]">Site access</dt>
              <dd className="mt-1">
                {activeFlags.length === 0 ? (
                  <span className="text-[var(--color-text-muted)]">Normal</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {activeFlags.map((key) => (
                      <Badge key={key} variant="warning">
                        {SITE_STATUS_FLAG_LABEL[key]}
                      </Badge>
                    ))}
                  </div>
                )}
              </dd>
            </div>
            {config.siteStatus.note && (
              <div className="col-span-2">
                <dt className="text-[var(--color-text-faint)]">Site status note</dt>
                <dd className="mt-1 text-[var(--color-text)]">{config.siteStatus.note}</dd>
              </div>
            )}
            {config.subscriptionNotes && (
              <div className="col-span-2">
                <dt className="text-[var(--color-text-faint)]">Notes</dt>
                <dd className="mt-1 text-[var(--color-text)]">{config.subscriptionNotes}</dd>
              </div>
            )}
          </dl>
        )}
      </CardContent>
    </Card>
  );
}

interface CompanyEmailReadinessCardProps {
  companyPublicId: string;
  onOpenSettings: () => void;
}

function domainReadiness(domain: CompanySendingDomain): {
  label: string;
  variant: "success" | "warning" | "danger";
} {
  if (domain.status === "VERIFIED" && domain.health === "HEALTHY") {
    return { label: "Verified sending domain", variant: "success" };
  }
  if (domain.status === "FAILED" || domain.health === "UNHEALTHY") {
    return { label: "DNS needs attention", variant: "danger" };
  }
  return { label: "DNS verification pending", variant: "warning" };
}

const DNS_RECORD_KIND_LABEL: Record<CompanySendingDomain["dnsRecords"][number]["kind"], string> = {
  OWNERSHIP_TXT: "Ownership TXT",
  DKIM: "DKIM",
  RETURN_PATH: "Return path",
};

function DnsCheckIcon({
  status,
}: {
  status: CompanySendingDomain["checkResults"][number]["status"];
}) {
  if (status === "VERIFIED") {
    return <CheckCircle2 size={15} className="text-[var(--color-success)]" aria-hidden="true" />;
  }
  if (status === "FAILED") {
    return <XCircle size={15} className="text-[var(--color-danger)]" aria-hidden="true" />;
  }
  return <CircleDashed size={15} className="text-[var(--color-warning)]" aria-hidden="true" />;
}

function DnsCheckTimeline({ domain }: { domain: CompanySendingDomain }) {
  const checksByKind = new Map(domain.checkResults.map((check) => [check.kind, check]));

  return (
    <section className="min-w-0" aria-labelledby="dns-check-timeline-title">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h4
          id="dns-check-timeline-title"
          className="text-sm font-semibold text-[var(--color-text)]"
        >
          DNS check timeline
        </h4>
        <p className="text-xs tabular-nums text-[var(--color-text-muted)]">
          Last updated {formatDate(domain.updatedAt)}
        </p>
      </div>
      <ol className="mt-3 border-s border-[var(--color-border)] ps-5">
        {domain.dnsRecords.map((record) => {
          const check = checksByKind.get(record.kind);
          const status = check?.status ?? "PENDING";
          return (
            <li key={record.kind} className="relative py-2.5 first:pt-0 last:pb-0">
              <span
                className="absolute -start-[31px] top-2.5 grid size-5 place-items-center rounded-[var(--radius-sm)] bg-[var(--color-surface)] first:top-0"
                aria-hidden="true"
              >
                <DnsCheckIcon status={status} />
              </span>
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text)]">
                    {DNS_RECORD_KIND_LABEL[record.kind]}
                  </p>
                  <p className="mt-0.5 break-all font-mono text-xs text-[var(--color-text-muted)]">
                    {record.recordType} · {record.host}
                  </p>
                </div>
                <Badge
                  variant={
                    status === "VERIFIED" ? "success" : status === "FAILED" ? "danger" : "warning"
                  }
                >
                  {status.charAt(0) + status.slice(1).toLowerCase()}
                </Badge>
              </div>
              {check?.failureDetail ? (
                <p className="mt-1 text-xs leading-5 text-[var(--color-danger)]">
                  {check.failureDetail}
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function CompanyEmailReadinessCard({
  companyPublicId,
  onOpenSettings,
}: CompanyEmailReadinessCardProps) {
  const domainQuery = useCompanySendingDomain(companyPublicId);
  const domain = domainQuery.data;

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Email readiness</CardTitle>
        <Button intent="utility" leadingIcon={<Mail size={13} />} onClick={onOpenSettings}>
          Email settings
        </Button>
      </CardHeader>
      <CardContent className="p-4">
        {domainQuery.isPending ? (
          <Skeleton className="h-36 w-full" />
        ) : domainQuery.isError ? (
          <div className="space-y-2 text-sm">
            <Badge variant="danger">Domain status unavailable</Badge>
            <p className="text-[var(--color-text-muted)]">
              The verified sending domain could not be loaded. Refresh the page or open Email
              settings to review the Company configuration.
            </p>
          </div>
        ) : !domain ? (
          <div className="space-y-2 text-sm">
            <Badge variant="warning">Sending domain not configured</Badge>
            <p className="text-[var(--color-text-muted)]">
              Company email cannot be dispatched until a sending domain is provisioned and its DNS
              records are verified.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <section className="min-w-0" aria-labelledby="verified-sending-domain-title">
              <div className="flex items-start gap-3">
                <span
                  className="grid size-8 shrink-0 place-items-center rounded-[var(--radius-md)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                  aria-hidden="true"
                >
                  <ShieldCheck size={16} />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-faint)]">
                    Sending domain
                  </p>
                  <h4
                    id="verified-sending-domain-title"
                    className="mt-1 break-all font-mono text-sm font-semibold text-[var(--color-text)]"
                  >
                    {domain.domain}
                  </h4>
                  <div className="mt-2">
                    <Badge variant={domainReadiness(domain).variant}>
                      {domainReadiness(domain).label}
                    </Badge>
                  </div>
                </div>
              </div>

              <dl className="mt-5 space-y-3 border-t border-[var(--color-border)] pt-4 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[var(--color-text-muted)]">Domain status</dt>
                  <dd className="font-medium text-[var(--color-text)]">{domain.status}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[var(--color-text-muted)]">DNS health</dt>
                  <dd className="font-medium text-[var(--color-text)]">{domain.health}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[var(--color-text-muted)]">Verified</dt>
                  <dd className="tabular-nums text-[var(--color-text)]">
                    {formatDate(domain.verifiedAt)}
                  </dd>
                </div>
              </dl>

              {domain.lastFailure ? (
                <p className="mt-4 border-s border-[var(--color-danger)] ps-3 text-xs leading-5 text-[var(--color-danger)]">
                  {domain.lastFailure}
                </p>
              ) : null}
            </section>
            <DnsCheckTimeline domain={domain} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Page ---------------------------------------------------------------------

type CompanyDetailPanel = "none" | "edit-company" | "edit-config";

export function AdminCompanyDetailPage() {
  const { publicId } = useParams({ from: "/admin/companies/$publicId" });
  const navigate = useNavigate();
  const [panel, setPanel] = useState<CompanyDetailPanel>("none");
  const closePanel = () => setPanel("none");

  const { data: company, isPending, isError } = useCompany(publicId);
  const configsQuery = useCompanyConfigs();
  const config = configsQuery.data?.data.find((item) => item.company?.publicId === publicId);

  function openEmailSettings() {
    void navigate({
      to: "/admin/companies/$publicId/email-settings",
      params: { publicId },
    });
  }

  function backToCompanies() {
    void navigate({ to: "/admin/companies", search: { page: 1, pageSize: 10 } });
  }

  if (isPending) {
    return (
      <div className="mx-auto max-w-[1000px] space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !company) {
    return (
      <div className="mx-auto max-w-[1000px]">
        <EmptyState
          icon={Building2}
          title="Couldn't load this company"
          description="It may have been removed, or something went wrong. Please try again."
          action={
            <Button
              intent="navigation"
              leadingIcon={<ArrowLeft size={14} />}
              onClick={backToCompanies}
            >
              Back to companies
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1000px]">
      {/* Header */}
      <div className="mb-6">
        <Button
          intent="navigation"
          leadingIcon={<ArrowLeft size={14} />}
          onClick={backToCompanies}
          className="mb-3"
        >
          Back to companies
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[26px] font-bold tracking-tight text-[var(--color-text)]">
              {company.name}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--color-text-muted)]">
              <code className="font-mono">{company.companyCode}</code>
              <span>{company.country}</span>
            </p>
          </div>
          <Button intent="action" leadingIcon={<Mail size={14} />} onClick={openEmailSettings}>
            Email settings
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CompanyProfileCard company={company} onEdit={() => setPanel("edit-company")} />
        <CompanyConfigCard config={config} onEdit={() => setPanel("edit-config")} />
        <CompanyEmailReadinessCard companyPublicId={publicId} onOpenSettings={openEmailSettings} />
      </div>

      <EditCompanyModal company={panel === "edit-company" ? company : null} onClose={closePanel} />

      <EditCompanyConfigModal
        config={panel === "edit-config" ? (config ?? null) : null}
        onClose={closePanel}
      />
    </div>
  );
}
