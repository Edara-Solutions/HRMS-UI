import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  OperationRefusal,
  platformLeadOperations as operations,
  usePlatformAccess,
} from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { QueryPanel } from "@/shared/ui/query-panel";
import { SchemaForm } from "@/shared/ui/schema-form";
import type { crmQueries } from "../api/crm";
import type { useLeadCommands } from "../model/use-lead-commands";

interface Props {
  publicId: string;
  name: string;
  queries: ReturnType<typeof crmQueries>;
  restricted: boolean;
  commands: ReturnType<typeof useLeadCommands>;
}
export function DomainPanel({ name, queries, restricted, commands }: Props) {
  const { t } = useTranslation("platform-leads");
  const access = usePlatformAccess();
  const enabled = access.availability(operations.domain.key).state === "enabled";
  const { data, error, isPending, isFetching, refetch } = useQuery({ ...queries.domain, enabled });
  const {
    data: readiness,
    error: readinessError,
    isPending: readinessPending,
    refetch: refreshReadiness,
  } = useQuery({
    ...queries.readiness,
    enabled: access.availability(operations.readiness.key).state === "enabled",
  });
  if (!enabled) return null;
  const provision = access.availability(operations.provision.key);
  const verify = access.availability(operations.verify.key);
  const absent =
    error instanceof OperationRefusal &&
    error.status === 404 &&
    readiness?.reason === "NOT_PROVISIONED";
  return (
    <div className="space-y-4">
      <QueryPanel
        title={t("domain.title")}
        pending={isPending}
        error={absent ? null : error}
        retry={() => void refetch()}
      >
        {absent && <p>{t("domain.absent")}</p>}
        {data && (
          <>
            <p className="break-words">
              {data.domain} · {t(`enum.${data.status}`)} · {t(`enum.${data.health}`)}
            </p>
            <ul className="space-y-3">
              {data.records.map((record) => (
                <li
                  key={`${record.kind}-${record.host}`}
                  className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3"
                >
                  <p>{t(`enum.${record.kind}`)}</p>
                  <dl>
                    {[
                      { label: "dns.0", value: record.host },
                      { label: "dns.1", value: record.recordType },
                      { label: "dns.2", value: record.value },
                    ].map(({ value, label }) => (
                      <div key={label}>
                        <dt className="text-xs text-[var(--color-text-muted)]">{t(label)}</dt>
                        <dd dir="ltr" className="break-all">
                          {value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </li>
              ))}
            </ul>
            {data.checks.map((check) => (
              <p key={check.kind}>
                {t(`enum.${check.kind}`)} · {t(`enum.${check.status}`)}
              </p>
            ))}
          </>
        )}
        {provision.state !== "hidden" && (
          <SchemaForm
            key={data?.domain ?? "new"}
            schema={operations.provision.requestSchema.shape.body}
            fields={[
              { name: "domain", label: t("domain.name"), required: true, value: data?.domain },
            ]}
            label={t("action.provision")}
            invalidLabel={t("invalid")}
            disabled={
              restricted || isFetching || (!absent && !!error) || provision.state !== "enabled"
            }
            onSubmit={(body) => commands.request({ kind: "provision", name, body })}
          />
        )}
        {verify.state !== "hidden" && (
          <Button
            intent="action"
            disabled={
              restricted ||
              isFetching ||
              !!error ||
              !data ||
              data.status === "UNCONFIGURED" ||
              verify.state !== "enabled"
            }
            onClick={() => commands.request({ kind: "verify", name })}
          >
            {t("action.verify")}
          </Button>
        )}
      </QueryPanel>
      <QueryPanel
        title={t("domain.readiness")}
        pending={readinessPending}
        error={readinessError}
        retry={() => void refreshReadiness()}
      >
        {readiness && (
          <p>
            {readiness.ready ? t("domain.ready") : t(`enum.${readiness.reason ?? "NOT_VERIFIED"}`)}
          </p>
        )}
      </QueryPanel>
    </div>
  );
}
