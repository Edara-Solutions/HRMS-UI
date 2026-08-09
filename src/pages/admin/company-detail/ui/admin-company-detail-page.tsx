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
import { useMemo, useState } from "react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { type PageTabItem, PageTabs } from "@/shared/ui/page-tabs";
import { Skeleton } from "@/shared/ui/skeleton";
import {
  type Company,
  type CompanyProfile,
  type CompanySetupChecklist,
  type CompanySetupStep,
  type SetupStepStatus,
  type SetupStepType,
  useCompany,
  useCompanyProfile,
  useCompanySetup,
} from "../api/company-detail";
import { type CompanySendingDomain, useCompanySendingDomain } from "../api/company-sending-domain";
import { CompanyAccessActivationCard, CompanySubscriptionCard } from "./activation-repair-card";
import { EditCompanyModal } from "./edit-company-modal";

function formatDate(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// --- Profile ------------------------------------------------------------------

function Field({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-[var(--color-text-faint)]">{label}</dt>
      <dd className="mt-1 text-[var(--color-text)]">{value}</dd>
    </div>
  );
}

function CompanyCoreCard({ company, onEdit }: { company: Company; onEdit: () => void }) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Company record</CardTitle>
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

function CompanyManagedProfileCard({ companyPublicId }: { companyPublicId: string }) {
  const profileQuery = useCompanyProfile(companyPublicId);
  const profile = profileQuery.data;

  if (profileQuery.isPending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Managed profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-28 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (profileQuery.isError || !profile) {
    return (
      <Card>
        <EmptyState
          icon={Building2}
          title="Profile unavailable"
          description="The company-managed profile could not be loaded."
        />
      </Card>
    );
  }

  return <CompanyManagedProfileDetails profile={profile} />;
}

function CompanyManagedProfileDetails({ profile }: { profile: CompanyProfile }) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Managed profile</CardTitle>
        <Badge variant={profile.status === "COMPLETE" ? "success" : "warning"}>
          {profile.status === "COMPLETE" ? "Complete" : "Incomplete"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
          <Field label="Profile name" value={profile.name} />
          <Field label="Email" value={profile.email ?? "-"} />
          <Field label="Phone" value={profile.phone ?? "-"} />
          <Field label="Country" value={profile.country ?? "-"} />
          <Field label="City" value={profile.city ?? "-"} />
          <Field label="Tax number" value={profile.taxNumber ?? "-"} />
          <Field label="Commercial number" value={profile.commercialNumber ?? "-"} />
          <Field label="Address" value={profile.addressLine ?? "-"} wide />
          <Field label="Created" value={formatDate(profile.createdAt)} />
          <Field label="Updated" value={formatDate(profile.updatedAt)} />
        </dl>
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

const setupStepLabels: Record<SetupStepType, string> = {
  SET_COMPANY_PROFILE: "Company profile",
  SET_ROLES: "Roles",
  SET_JOBS: "Jobs",
  SET_BRANCHES: "Branches",
  SET_SHIFTS: "Shifts",
  SET_DEPARTMENTS: "Departments",
};

const setupStepStatusVariants: Record<SetupStepStatus, "default" | "info" | "success" | "warning"> =
  {
    PENDING: "default",
    IN_PROGRESS: "info",
    COMPLETED: "success",
    SKIPPED: "warning",
  };

function setupStepStatusLabel(value: SetupStepStatus) {
  return value.toLowerCase().replaceAll("_", " ");
}

function setupDependencyLabels(step: CompanySetupStep) {
  if (step.dependencies.length === 0) return "None";
  return step.dependencies.map((dependency) => setupStepLabels[dependency]).join(", ");
}

function CompanySetupTab({ companyPublicId }: { companyPublicId: string }) {
  const setupQuery = useCompanySetup(companyPublicId);
  const setup = setupQuery.data;
  const steps = useMemo(
    () => (setup?.steps ?? []).slice().sort((left, right) => left.sequence - right.sequence),
    [setup],
  );

  if (setupQuery.isPending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Company setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (setupQuery.isError || !setup) {
    return (
      <Card>
        <EmptyState
          icon={Building2}
          title="Setup unavailable"
          description="The company setup checklist could not be loaded."
        />
      </Card>
    );
  }

  return <CompanySetupDetails setup={setup} steps={steps} />;
}

function CompanySetupDetails({
  setup,
  steps,
}: {
  setup: CompanySetupChecklist;
  steps: CompanySetupStep[];
}) {
  const completedCount = steps.filter((step) => step.status === "COMPLETED").length;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Company setup</CardTitle>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Template v{setup.templateVersion} for {setup.companyPublicId}
            </p>
          </div>
          <Badge variant={completedCount === steps.length ? "success" : "info"}>
            {completedCount} / {steps.length} complete
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        {steps.map((step) => (
          <section
            key={step.publicId}
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-[var(--color-text)]">
                  {setupStepLabels[step.stepType]}
                </h4>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  Sequence {step.sequence} · Dependencies: {setupDependencyLabels(step)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={setupStepStatusVariants[step.status]}>
                  {setupStepStatusLabel(step.status)}
                </Badge>
                <Badge variant={step.isRequired ? "warning" : "default"}>
                  {step.isRequired ? "Required" : "Optional"}
                </Badge>
              </div>
            </div>
            <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Started" value={formatDate(step.startedAt)} />
              <Field label="Completed" value={formatDate(step.completedAt)} />
              <Field label="Created" value={formatDate(step.createdAt)} />
              <Field label="Updated" value={formatDate(step.updatedAt)} />
            </dl>
          </section>
        ))}
      </CardContent>
    </Card>
  );
}

// --- Page ---------------------------------------------------------------------

type CompanyDetailPanel = "none" | "edit-company";
type CompanyDetailTab = "profile" | "setup" | "subscription" | "access";

const companyDetailTabs: Array<PageTabItem<CompanyDetailTab>> = [
  { value: "profile", label: "Profile" },
  { value: "setup", label: "Setup" },
  { value: "subscription", label: "Subscription" },
  { value: "access", label: "Access & activation" },
];

export function AdminCompanyDetailPage() {
  const { publicId } = useParams({ from: "/admin/companies/$publicId" });
  const navigate = useNavigate();
  const [panel, setPanel] = useState<CompanyDetailPanel>("none");
  const [activeTab, setActiveTab] = useState<CompanyDetailTab>("profile");
  const closePanel = () => setPanel("none");

  const { data: company, isPending, isError } = useCompany(publicId);

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

      <PageTabs
        items={companyDetailTabs}
        value={activeTab}
        onValueChange={setActiveTab}
        ariaLabel="Company detail sections"
      />

      {activeTab === "profile" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <CompanyCoreCard company={company} onEdit={() => setPanel("edit-company")} />
          <CompanyManagedProfileCard companyPublicId={publicId} />
          <CompanyEmailReadinessCard
            companyPublicId={publicId}
            onOpenSettings={openEmailSettings}
          />
        </div>
      )}

      {activeTab === "setup" && <CompanySetupTab companyPublicId={publicId} />}

      {activeTab === "subscription" && <CompanySubscriptionCard companyPublicId={publicId} />}

      {activeTab === "access" && <CompanyAccessActivationCard companyPublicId={publicId} />}

      <EditCompanyModal company={panel === "edit-company" ? company : null} onClose={closePanel} />
    </div>
  );
}
