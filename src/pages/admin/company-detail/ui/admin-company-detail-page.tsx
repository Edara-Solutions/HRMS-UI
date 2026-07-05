import { useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, Building2, Globe, MapPin, Pencil, Phone } from "lucide-react";
import { useState } from "react";
import type { Company, CompanyConfig } from "../api/company-detail";
import { useCompany, useCompanyConfigs } from "../api/company-detail";
import { EditCompanyConfigModal } from "./edit-company-config-modal";
import { EditCompanyModal } from "./edit-company-modal";
import { SITE_STATUS_FLAG_LABEL, SUBSCRIPTION_STATUS_BADGE } from "../api/company-labels";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { Skeleton } from "@/shared/ui/skeleton";

function formatDate(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const SITE_STATUS_FLAG_KEYS = Object.keys(SITE_STATUS_FLAG_LABEL) as Array<
  keyof typeof SITE_STATUS_FLAG_LABEL
>;

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
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CompanyProfileCard company={company} onEdit={() => setPanel("edit-company")} />
        <CompanyConfigCard config={config} onEdit={() => setPanel("edit-config")} />
      </div>

      <EditCompanyModal company={panel === "edit-company" ? company : null} onClose={closePanel} />

      <EditCompanyConfigModal
        config={panel === "edit-config" ? (config ?? null) : null}
        onClose={closePanel}
      />
    </div>
  );
}

