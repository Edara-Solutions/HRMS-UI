import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  ContractViolation,
  isCompanyBlocked,
  OperationRefusal,
  useCompanyAccess,
} from "@/shared/api";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { CompanyAccessNotice } from "@/shared/ui/company-access-notice";
import { Skeleton } from "@/shared/ui/skeleton";
import { emailSettingsQueries } from "../api/email-settings";
import { SenderSettingsCard } from "./sender-settings-card";
import { SendingDomainCard } from "./sending-domain-card";

export function CompanyEmailSettingsPage() {
  const { t } = useTranslation("communications");
  const access = useCompanyAccess();
  const queries = emailSettingsQueries(access.user?.publicId ?? "");
  const can = (operation: Parameters<typeof access.availability>[0]) =>
    access.availability(operation).state !== "hidden";
  const {
    data: settings,
    error,
    isPending,
    isError,
    refetch,
  } = useQuery({
    ...queries.settings,
    enabled: access.user !== undefined,
  });
  const { data: readiness } = useQuery({
    ...queries.readiness,
    enabled: can("GET /api/v1/company/email-readiness"),
  });

  if (isCompanyBlocked(error)) throw error;
  if (error instanceof OperationRefusal && [403, 404].includes(error.status)) throw error;
  if (!access.user) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">{t("email.title")}</h1>
          <p className="max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
            {t("email.description")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {readiness && (
            <Badge variant={readiness.ready ? "success" : "warning"}>
              {readiness.ready
                ? t("email.ready")
                : t(`email.notReady.${readiness.reason ?? "UNKNOWN"}`)}
            </Badge>
          )}
          {can("GET /api/v1/company/email-types") && (
            <Link
              to="/company/email/templates"
              className="text-sm font-medium text-[var(--color-primary)] underline-offset-4 hover:underline"
            >
              {t("email.templatesLink")}
            </Link>
          )}
        </div>
      </header>
      {access.policy && <CompanyAccessNotice {...access.policy} />}
      <div className="grid gap-6 lg:grid-cols-2">
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
        ) : (
          <SenderSettingsCard settings={settings} />
        )}
        {can("GET /api/v1/company/sending-domain") && <SendingDomainCard />}
      </div>
    </div>
  );
}
