import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { ContractViolation, useCompanyAccess, useCompanyMutationRecovery } from "@/shared/api";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Skeleton } from "@/shared/ui/skeleton";
import {
  createSendingDomain,
  emailSettingsQueries,
  emailSettingsRoots,
  verifySendingDomain,
} from "../api/email-settings";
import { type DomainState, domainState, type SendingDomain } from "../model/email-settings";

const stateVariant = {
  "not-configured": "default",
  "dns-pending": "info",
  "verification-failed": "danger",
  stale: "warning",
  unhealthy: "warning",
  verified: "success",
  ready: "success",
} as const satisfies Record<DomainState, string>;

const domainSchema = z
  .string()
  .trim()
  .min(3)
  .max(253)
  .regex(/^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/i);

export function SendingDomainCard() {
  const { t } = useTranslation("communications");
  const access = useCompanyAccess();
  const recover = useCompanyMutationRecovery();
  const queryClient = useQueryClient();
  const userPublicId = access.user?.publicId ?? "";
  const queries = emailSettingsQueries(userPublicId);
  const manage = access.availability("POST /api/v1/company/sending-domain");
  const verify = access.availability("POST /api/v1/company/sending-domain/verify");
  const canReadReadiness =
    access.availability("GET /api/v1/company/sending-domain/readiness").state !== "hidden";
  const { data: domain, error, isPending, isError, refetch } = useQuery(queries.domain);
  const { data: readiness } = useQuery({
    ...queries.domainReadiness,
    enabled: canReadReadiness && Boolean(domain),
  });
  const [draft, setDraft] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "status" | "alert"; message: string } | null>(
    null,
  );
  const reconcile = () =>
    Promise.all(
      emailSettingsRoots(userPublicId).map((queryKey) =>
        queryClient.invalidateQueries({ queryKey }),
      ),
    );
  const command = useMutation({
    retry: false,
    mutationFn: (action: { kind: "create"; domain: string } | { kind: "verify" }) =>
      action.kind === "create" ? createSendingDomain(action.domain) : verifySendingDomain(),
    onSuccess: (result: SendingDomain, action) => {
      queryClient.setQueryData(queries.domain.queryKey, result);
      setFeedback({ tone: "status", message: t(`domain.done.${action.kind}`) });
      setDraft("");
    },
    onError: async (mutationError) => {
      const outcome = await recover(mutationError);
      setFeedback({ tone: "alert", message: t(`outcome.${outcome.kind}`) });
    },
    onSettled: reconcile,
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    const parsed = domainSchema.safeParse(draft);
    setInvalid(!parsed.success);
    if (parsed.success) command.mutate({ kind: "create", domain: parsed.data.toLowerCase() });
  }

  const state = domain === undefined ? null : domainState(domain, readiness);

  return (
    <Card as="section" aria-labelledby="sending-domain" className="min-w-0">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle id="sending-domain">{t("domain.title")}</CardTitle>
          {state && <Badge variant={stateVariant[state]}>{t(`domain.state.${state}`)}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-[18px] text-sm">
        {isPending ? (
          <Skeleton className="h-20 w-full" />
        ) : isError ? (
          <div className="space-y-2">
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
        ) : domain === null ? (
          <>
            <p className="text-[var(--color-text-muted)]">{t("domain.notConfigured")}</p>
            {manage.state !== "hidden" && (
              <form noValidate onSubmit={submit} className="flex flex-wrap items-end gap-2">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Label htmlFor="sending-domain-input">{t("domain.field")}</Label>
                  <Input
                    id="sending-domain-input"
                    dir="ltr"
                    placeholder="mail.example.com"
                    value={draft}
                    disabled={manage.state === "disabled" || command.isPending}
                    aria-invalid={invalid}
                    aria-describedby={invalid ? "sending-domain-error" : undefined}
                    onChange={(event) => setDraft(event.target.value)}
                  />
                </div>
                <Button
                  type="submit"
                  intent="cta"
                  size="sm"
                  disabled={manage.state === "disabled" || command.isPending}
                  isLoading={command.isPending}
                >
                  {t("domain.create")}
                </Button>
                {invalid && (
                  <p
                    id="sending-domain-error"
                    className="w-full text-xs text-[var(--color-danger)]"
                  >
                    {t("domain.invalid")}
                  </p>
                )}
                {manage.state === "disabled" && (
                  <p className="w-full text-xs text-[var(--color-text-muted)]">
                    {t(`restriction.${manage.reason}`)}
                  </p>
                )}
              </form>
            )}
          </>
        ) : (
          <>
            <p className="break-all font-medium" dir="ltr">
              {domain.domain}
            </p>
            <p className="text-[var(--color-text-muted)]">{t(`domain.hint.${state}`)}</p>
            {domain.dnsRecords.length > 0 && state !== "ready" && state !== "verified" && (
              <div className="scrollbar-calm overflow-x-auto">
                <table className="w-full min-w-[560px] text-start text-xs">
                  <caption className="sr-only">{t("domain.records")}</caption>
                  <thead>
                    <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
                      <th className="px-2 py-2 text-start font-medium">
                        {t("domain.column.purpose")}
                      </th>
                      <th className="px-2 py-2 text-start font-medium">
                        {t("domain.column.type")}
                      </th>
                      <th className="px-2 py-2 text-start font-medium">
                        {t("domain.column.host")}
                      </th>
                      <th className="px-2 py-2 text-start font-medium">
                        {t("domain.column.value")}
                      </th>
                      <th className="px-2 py-2 text-start font-medium">
                        {t("domain.column.check")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {domain.dnsRecords.map((record) => {
                      const check = domain.checkResults.find(
                        (result) => result.kind === record.kind,
                      );
                      return (
                        <tr
                          key={`${record.kind}-${record.host}`}
                          className="border-b border-[var(--color-border)] align-top"
                        >
                          <td className="px-2 py-2">{t(`domain.kind.${record.kind}`)}</td>
                          <td className="px-2 py-2" dir="ltr">
                            {record.recordType}
                          </td>
                          <td className="break-all px-2 py-2" dir="ltr">
                            {record.host}
                          </td>
                          <td className="break-all px-2 py-2 font-mono" dir="ltr">
                            {record.value}
                          </td>
                          <td className="px-2 py-2">
                            {t(`domain.check.${check?.status ?? "PENDING"}`)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {verify.state !== "hidden" && state !== "ready" && state !== "verified" && (
              <div className="space-y-1.5">
                <Button
                  intent="action"
                  size="sm"
                  disabled={verify.state === "disabled" || command.isPending}
                  isLoading={command.isPending}
                  onClick={() => setConfirming(true)}
                >
                  {t("domain.verify")}
                </Button>
                {verify.state === "disabled" && (
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {t(`restriction.${verify.reason}`)}
                  </p>
                )}
              </div>
            )}
          </>
        )}
        <p role={feedback?.tone === "alert" ? "alert" : "status"} className="min-h-5">
          {feedback?.message}
        </p>
      </CardContent>
      <ConfirmDialog
        open={confirming}
        tone="consequential"
        title={t("domain.verifyConfirm.title", { domain: domain?.domain ?? "" })}
        description={t("domain.verifyConfirm.description")}
        confirmLabel={t("domain.verify")}
        cancelLabel={t("state.cancel")}
        isLoading={command.isPending}
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          setFeedback(null);
          command.mutate({ kind: "verify" });
        }}
      />
    </Card>
  );
}
