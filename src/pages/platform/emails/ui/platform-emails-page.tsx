import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Mail } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ContractViolation,
  OperationRefusal,
  platformCommunicationsOperations as operations,
  usePlatformAccess,
} from "@/shared/api";
import { RouteAccessRefusal } from "@/shared/auth";
import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { QueryPanel } from "@/shared/ui/query-panel";
import { Skeleton } from "@/shared/ui/skeleton";
import { emailQueries } from "../api/emails";
import { contextLabel, criticalityLabel, platformEmailTypes } from "../model/emails";
import { TemplatePreview } from "./template-preview";
import { TestSendForm } from "./test-send-form";
import { VariantMigration } from "./variant-migration";

export function PlatformEmailsPage() {
  const { t } = useTranslation("platform-emails");
  const access = usePlatformAccess();
  const queries = emailQueries(access.user?.publicId ?? "");
  const { data, error, isPending, isError, refetch } = useQuery({
    ...queries.types,
    enabled: access.availability(operations.emailTypes.key).state === "enabled",
    retry: false,
  });
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  if (!access.user) return null;
  if (access.availability(operations.emailTypes.key).state === "hidden")
    throw new RouteAccessRefusal("platform");
  if (isCompanyBlocked(error)) throw error;
  if (error instanceof OperationRefusal && [403, 404].includes(error.status)) throw error;

  const types = platformEmailTypes(data?.items ?? []);
  const selected = types.find((type) => type.key === selectedKey) ?? types[0];

  return (
    <div className="mx-auto min-w-0 max-w-6xl space-y-6 [overflow-wrap:anywhere] [&_button]:max-w-full [&_button]:whitespace-normal [&_button]:h-auto [&_button]:min-h-9">
      <Link
        to="/platform"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      >
        <ArrowLeft aria-hidden="true" size={15} className="rtl:rotate-180" />
        {t("back")}
      </Link>
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
          {t("description")}
        </p>
      </header>

      {isPending ? (
        <Skeleton className="h-80 w-full" />
      ) : isError ? (
        <div className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4 text-sm">
          <p>
            {error instanceof ContractViolation
              ? t("state.contractUnavailable")
              : t("state.loadFailed")}
          </p>
          {!(error instanceof ContractViolation) && (
            <Button intent="action" size="sm" onClick={() => void refetch()}>
              {t("state.retry")}
            </Button>
          )}
        </div>
      ) : types.length === 0 || !selected ? (
        <Card>
          <EmptyState icon={Mail} title={t("empty")} />
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <nav aria-label={t("types.label")}>
            <ul className="space-y-2">
              {types.map((type) => (
                <li key={type.key}>
                  <button
                    type="button"
                    aria-label={type.description}
                    aria-current={type.key === selected.key ? "true" : undefined}
                    onClick={() => setSelectedKey(type.key)}
                    className={cn(
                      "w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-start text-sm transition-colors hover:bg-[var(--color-surface-2)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]",
                      type.key === selected.key &&
                        "border-[var(--color-primary)] bg-[var(--color-primary-soft)]",
                    )}
                  >
                    <span className="block break-words font-semibold text-[var(--color-text)]">
                      {type.description}
                    </span>
                    <span className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant="primary">{contextLabel(type.context, t)}</Badge>
                      <Badge variant={type.criticality === "CRITICAL" ? "warning" : "default"}>
                        {criticalityLabel(type.criticality, t)}
                      </Badge>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <EmailTypeDetail key={selected.key} type={selected} />
        </div>
      )}
    </div>
  );
}

function EmailTypeDetail({ type }: { type: ReturnType<typeof platformEmailTypes>[number] }) {
  const { t } = useTranslation("platform-emails");
  const access = usePlatformAccess();
  const {
    data: current,
    error,
    isPending,
    refetch,
  } = useQuery({
    ...emailQueries(access.user?.publicId ?? "").detail(type.key),
    enabled: access.availability(operations.emailType.key).state === "enabled",
    retry: false,
  });
  const canPreview =
    access.availability("GET /api/v1/platform/email-types/{key}/preview").state === "enabled";
  return (
    <Card as="section" aria-labelledby="email-type" className="min-w-0">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle id="email-type" className="me-auto break-words">
            {type.description}
          </CardTitle>
          <Badge variant={type.criticality === "CRITICAL" ? "warning" : "default"}>
            {criticalityLabel(type.criticality, t)}
          </Badge>
          <Badge variant="default">{contextLabel(type.context, t)}</Badge>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-[var(--color-text-muted)]">
          <span>
            {t("detail.payloadVersion")}: {type.payloadVersion}
          </span>
          <span>
            {t("detail.defaultTemplate")}:{" "}
            <code className="font-mono">{type.defaultTemplateKey}</code>
          </span>
          <span>
            {t("detail.locales")}: {type.supportedLocales.join(", ")}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 p-[18px] text-sm">
        <QueryPanel
          title={t("types.label")}
          pending={isPending}
          error={error}
          retry={() => void refetch()}
        >
          {current && (
            <>
              {canPreview && <TemplatePreview type={current} />}
              <TestSendForm type={current} />
              <VariantMigration type={current} />
            </>
          )}
        </QueryPanel>
      </CardContent>
    </Card>
  );
}

function isCompanyBlocked(error: unknown): error is OperationRefusal {
  return error instanceof OperationRefusal && error.mode === "BLOCKED";
}
