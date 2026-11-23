import { useQuery } from "@tanstack/react-query";
import { Copy, Globe, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  OperationRefusal,
  platformLeadOperations as operations,
  usePlatformAccess,
} from "@/shared/api";
import { usePreferencesStore } from "@/shared/config";
import { formatFullInstant, formatInstant } from "@/shared/lib/format-instant";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { QueryPanel } from "@/shared/ui/query-panel";
import { SchemaForm } from "@/shared/ui/schema-form";
import type { crmQueries } from "../api/crm";
import type { useLeadCommands } from "../model/use-lead-commands";

interface Props {
  name: string;
  queries: ReturnType<typeof crmQueries>;
  restricted: boolean;
  commands: ReturnType<typeof useLeadCommands>;
}

interface DnsFieldProps {
  label: string;
  value: string;
}

function DnsField({ label, value }: DnsFieldProps) {
  const { t } = useTranslation("platform-leads");
  const [feedback, setFeedback] = useState("");
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-[var(--color-text-muted)]">{label}</dt>
      <dd className="mt-1 flex items-start gap-1 rounded-[var(--radius-sm)] bg-[var(--color-surface-2)] px-2 py-1">
        <code dir="ltr" className="min-w-0 flex-1 self-center text-xs [overflow-wrap:anywhere]">
          {value}
        </code>
        <Button
          intent="utility"
          size="iconSm"
          aria-label={t("domain.copyField", { field: label })}
          title={t("domain.copyField", { field: label })}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setFeedback(t("domain.copied", { field: label }));
            } catch {
              setFeedback(t("domain.copyUnavailable"));
            }
          }}
        >
          <Copy size={14} aria-hidden="true" />
        </Button>
      </dd>
      <dd role="status" className={feedback ? "text-xs text-[var(--color-text-muted)]" : "sr-only"}>
        {feedback}
      </dd>
    </div>
  );
}

const verificationTone = {
  UNCONFIGURED: "default",
  PENDING: "warning",
  VERIFIED: "success",
  FAILED: "danger",
} as const;

export function DomainPanel({ name, queries, restricted, commands }: Props) {
  const { t } = useTranslation("platform-leads");
  const locale = usePreferencesStore((state) => state.locale);
  const access = usePlatformAccess();
  const canReadDomain = access.availability(operations.domain.key).state === "enabled";
  const canReadReadiness = access.availability(operations.readiness.key).state === "enabled";
  const { data, error, isPending, isFetching, refetch } = useQuery({
    ...queries.domain,
    enabled: canReadDomain,
  });
  const {
    data: readiness,
    error: readinessError,
    isPending: readinessPending,
    refetch: refreshReadiness,
  } = useQuery({ ...queries.readiness, enabled: canReadReadiness });
  if (!canReadDomain) return null;
  const provision = access.availability(operations.provision.key);
  const verify = access.availability(operations.verify.key);
  const absent =
    error instanceof OperationRefusal &&
    error.status === 404 &&
    !readinessError &&
    readiness?.reason === "NOT_PROVISIONED";
  const provisionForm = (
    <SchemaForm
      key={data?.domain ?? "new"}
      schema={operations.provision.requestSchema.shape.body}
      fields={[{ name: "domain", label: t("domain.name"), required: true, value: data?.domain }]}
      label={t("action.provision")}
      invalidLabel={t("invalid")}
      disabled={restricted || isFetching || provision.state !== "enabled"}
      onSubmit={(body) => commands.request({ kind: "provision", name, body })}
    />
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-[2_1_24rem]">
          <QueryPanel
            title={t("domain.title")}
            pending={isPending}
            error={absent ? null : error}
            retry={() => void refetch()}
          >
            {absent && (
              <>
                <EmptyState
                  icon={Globe}
                  title={t("domain.absent")}
                  description={t("domain.setupDescription")}
                  className="py-6"
                />
                {provision.state !== "hidden" && provisionForm}
              </>
            )}
            {data && !error && (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-2">
                    <p className="text-base font-semibold [overflow-wrap:anywhere]">
                      <bdi dir="ltr">{data.domain}</bdi>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={verificationTone[data.status]} className="h-auto min-h-5">
                        {t(`enum.${data.status}`)}
                      </Badge>
                      <Badge
                        variant={
                          data.health === "HEALTHY"
                            ? "success"
                            : data.health === "UNHEALTHY"
                              ? "danger"
                              : "default"
                        }
                        className="h-auto min-h-5"
                      >
                        {t(`enum.${data.health}`)}
                      </Badge>
                    </div>
                  </div>
                  {verify.state !== "hidden" && (
                    <Button
                      intent="action"
                      leadingIcon={<ShieldCheck aria-hidden="true" size={15} />}
                      disabled={
                        restricted ||
                        isFetching ||
                        data.status === "UNCONFIGURED" ||
                        verify.state !== "enabled"
                      }
                      onClick={() => commands.request({ kind: "verify", name: data.domain })}
                    >
                      {t("action.verify")}
                    </Button>
                  )}
                </div>
                {data.verifiedAt && (
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {t("domain.verifiedAt")}{" "}
                    <time
                      dateTime={data.verifiedAt}
                      title={formatFullInstant(data.verifiedAt, locale)}
                    >
                      {formatInstant(data.verifiedAt, locale)}
                    </time>
                  </p>
                )}
                {provision.state !== "hidden" && (
                  <details className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3 text-sm">
                    <summary className="cursor-pointer font-medium text-[var(--color-primary)]">
                      {t("domain.setup")}
                    </summary>
                    <div className="mt-3 space-y-3">
                      <p className="text-[var(--color-text-muted)]">
                        {t("domain.setupDescription")}
                      </p>
                      {provisionForm}
                    </div>
                  </details>
                )}
              </>
            )}
          </QueryPanel>
        </div>
        {canReadReadiness && (
          <div className="min-w-0 flex-[1_1_17rem]">
            <QueryPanel
              title={t("domain.readiness")}
              pending={readinessPending}
              error={readinessError}
              retry={() => void refreshReadiness()}
            >
              {readiness && (
                <Badge
                  variant={readiness.ready ? "success" : "warning"}
                  className="h-auto min-h-5 py-0.5"
                >
                  {readiness.ready
                    ? t("domain.ready")
                    : t(`enum.${readiness.reason ?? "NOT_VERIFIED"}`)}
                </Badge>
              )}
            </QueryPanel>
          </div>
        )}
      </div>
      {data && !error && (
        <QueryPanel title={t("domain.records")}>
          {data.records.length > 0 ? (
            <>
              <p className="text-sm text-[var(--color-text-muted)]">{t("domain.recordsHelp")}</p>
              <ol className="space-y-3">
                {data.records.map((record) => {
                  const check = data.checks.find(({ kind }) => kind === record.kind);
                  return (
                    <li
                      key={`${record.kind}-${record.host}`}
                      className="space-y-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-semibold">{t(`enum.${record.kind}`)}</h4>
                          <Badge>{record.recordType}</Badge>
                        </div>
                        {check && (
                          <Badge variant={verificationTone[check.status]}>
                            {t(`enum.${check.status}`)}
                          </Badge>
                        )}
                      </div>
                      <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,15rem),1fr))] gap-3">
                        <DnsField
                          key={`host:${record.host}`}
                          label={t("dns.0")}
                          value={record.host}
                        />
                        <DnsField
                          key={`value:${record.value}`}
                          label={t("dns.2")}
                          value={record.value}
                        />
                      </dl>
                    </li>
                  );
                })}
              </ol>
            </>
          ) : (
            <EmptyState icon={Globe} title={t("domain.noRecords")} />
          )}
          {data.checks
            .filter(({ kind }) => !data.records.some((record) => record.kind === kind))
            .map(({ kind, status }) => (
              <p key={kind} className="flex flex-wrap items-center gap-2 text-sm">
                {t(`enum.${kind}`)}{" "}
                <Badge variant={verificationTone[status]}>{t(`enum.${status}`)}</Badge>
              </p>
            ))}
        </QueryPanel>
      )}
    </div>
  );
}
