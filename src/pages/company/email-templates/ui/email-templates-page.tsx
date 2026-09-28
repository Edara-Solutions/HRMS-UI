import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Mail } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ContractViolation,
  isCompanyBlocked,
  OperationRefusal,
  useCompanyAccess,
  useCompanyMutationRecovery,
} from "@/shared/api";
import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { CompanyAccessNotice } from "@/shared/ui/company-access-notice";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { EmptyState } from "@/shared/ui/empty-state";
import { EnumSelect } from "@/shared/ui/enum-select";
import { Label } from "@/shared/ui/label";
import { QueryPanel } from "@/shared/ui/query-panel";
import { Skeleton } from "@/shared/ui/skeleton";
import {
  assignTemplate,
  emailTemplateQueries,
  restoreDefaultTemplate,
  templateRoots,
} from "../api/email-templates";
import {
  assignmentFor,
  companyEmailTypes,
  type EmailType,
  eligibleVariants,
} from "../model/email-templates";
import { TemplatePreview } from "./template-preview";
import { TestSendForm } from "./test-send-form";

export function CompanyEmailTemplatesPage() {
  const { t } = useTranslation("communications");
  const access = useCompanyAccess();
  const queries = emailTemplateQueries(access.user?.publicId ?? "");
  const { data, error, isPending, isError, refetch } = useQuery({
    ...queries.types,
    enabled: access.user !== undefined,
  });
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  if (isCompanyBlocked(error)) throw error;
  if (error instanceof OperationRefusal && [403, 404].includes(error.status)) throw error;
  if (!access.user) return null;

  const types = companyEmailTypes(data?.items ?? []);
  const selected = types.find((type) => type.key === selectedKey) ?? types[0];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        to="/company/email"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      >
        <ArrowLeft aria-hidden="true" size={15} className="rtl:rotate-180" />
        {t("templates.back")}
      </Link>
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t("templates.title")}</h1>
        <p className="max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
          {t("templates.description")}
        </p>
      </header>
      {access.policy && <CompanyAccessNotice {...access.policy} />}

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
          <EmptyState icon={Mail} title={t("templates.empty")} />
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <nav aria-label={t("templates.types")}>
            <ul className="space-y-1">
              {types.map((type) => (
                <li key={type.key}>
                  <button
                    type="button"
                    aria-current={type.key === selected.key ? "true" : undefined}
                    onClick={() => setSelectedKey(type.key)}
                    className={cn(
                      "w-full rounded-[var(--radius-md)] px-3 py-2 text-start text-sm transition-colors hover:bg-[var(--color-surface-2)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]",
                      type.key === selected.key &&
                        "bg-[var(--color-primary-soft)] font-medium text-[var(--color-primary)]",
                    )}
                  >
                    <span className="block break-words">{type.description}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <VerifiedEmailTypeDetail key={selected.key} typeKey={selected.key} />
        </div>
      )}
    </div>
  );
}

interface VerifiedEmailTypeDetailProps {
  typeKey: string;
}
function VerifiedEmailTypeDetail({ typeKey }: VerifiedEmailTypeDetailProps) {
  const { t } = useTranslation("communications");
  const access = useCompanyAccess();
  const { data, error, isPending, refetch } = useQuery({
    ...emailTemplateQueries(access.user?.publicId ?? "").detail(typeKey),
    enabled: access.availability("GET /api/v1/company/email-types/{key}").state === "enabled",
    retry: false,
  });
  if (isCompanyBlocked(error)) throw error;
  if (error instanceof OperationRefusal && [403, 404].includes(error.status)) throw error;
  return (
    <QueryPanel
      title={t("templates.types")}
      pending={isPending}
      error={error}
      retry={() => void refetch()}
    >
      {data && <EmailTypeDetail type={data} />}
    </QueryPanel>
  );
}

type PendingCommand = { kind: "assign"; variantKey: string } | { kind: "default" };

function EmailTypeDetail({ type }: { type: EmailType }) {
  const { t } = useTranslation("communications");
  const access = useCompanyAccess();
  const recover = useCompanyMutationRecovery();
  const queryClient = useQueryClient();
  const userPublicId = access.user?.publicId ?? "";
  const queries = emailTemplateQueries(userPublicId);
  const assign = access.availability("POST /api/v1/company/email-template-assignments");
  const unassign = access.availability(
    "DELETE /api/v1/company/email-template-assignments/{emailTypeKey}",
  );
  const canPreview =
    access.availability("GET /api/v1/company/email-types/{key}/preview").state !== "hidden";
  const canReadVariants =
    access.availability("GET /api/v1/company/email-types/{key}/variants").state !== "hidden";
  const canReadAssignments =
    access.availability("GET /api/v1/company/email-template-assignments").state !== "hidden";
  const { data: assignments } = useQuery({ ...queries.assignments, enabled: canReadAssignments });
  const canReadEffective =
    access.availability("GET /api/v1/company/email-template-assignments/{emailTypeKey}/effective")
      .state !== "hidden";
  const { data: effective } = useQuery({
    ...queries.effective(type.key),
    enabled: canReadEffective,
  });
  const { data: variants } = useQuery({
    ...queries.variants(type.key),
    enabled: canReadVariants && assign.state !== "hidden",
  });
  const [variantKey, setVariantKey] = useState<string>();
  const [pending, setPending] = useState<PendingCommand | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "status" | "alert"; message: string } | null>(
    null,
  );
  const assignment = assignmentFor(type, assignments?.items ?? []);
  const options = eligibleVariants(type, variants?.items ?? []).filter(
    (variant) => variant.key !== assignment?.templateRevisionKey,
  );
  const command = useMutation({
    retry: false,
    mutationFn: async (action: PendingCommand) => {
      if (action.kind === "assign") await assignTemplate(type.key, action.variantKey);
      else await restoreDefaultTemplate(type.key);
    },
    onSuccess: (_result, action) => {
      setVariantKey(undefined);
      setFeedback({ tone: "status", message: t(`templates.done.${action.kind}`) });
    },
    onError: async (error) => {
      const outcome = await recover(error);
      setFeedback({ tone: "alert", message: t(`outcome.${outcome.kind}`) });
    },
    // Assigned or not, the effective template is re-read before another change is offered.
    onSettled: () =>
      Promise.all(
        templateRoots(userPublicId).map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      ),
  });

  return (
    <Card as="section" aria-labelledby="email-type" className="min-w-0">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle id="email-type" className="me-auto break-words">
            {type.description}
          </CardTitle>
          <Badge variant={type.criticality === "CRITICAL" ? "warning" : "default"}>
            {t(`templates.criticality.${type.criticality}`)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 p-[18px] text-sm">
        {canReadAssignments && (
          <section aria-labelledby="template-choice" className="space-y-3">
            <h3 id="template-choice" className="text-sm font-semibold">
              {t("templates.template")}
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <span className="break-all font-mono text-xs" dir="ltr">
                {effective?.templateKey ?? type.defaultTemplateKey}
              </span>
              <Badge variant={assignment ? "primary" : "default"}>
                {assignment ? t("templates.custom") : t("templates.default")}
              </Badge>
              {effective?.deprecated && (
                <Badge variant="warning">{t("templates.deprecated")}</Badge>
              )}
            </div>
            {assign.state !== "hidden" && (
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-56 flex-1 space-y-1.5">
                  <Label htmlFor="template-variant">{t("templates.chooseVariant")}</Label>
                  <EnumSelect
                    id="template-variant"
                    value={variantKey}
                    placeholder={
                      options.length ? t("templates.variantPlaceholder") : t("templates.noVariants")
                    }
                    disabled={
                      assign.state === "disabled" || command.isPending || options.length === 0
                    }
                    options={options.map((variant) => ({ value: variant.key, label: variant.key }))}
                    onValueChange={setVariantKey}
                  />
                </div>
                <Button
                  intent="action"
                  size="sm"
                  disabled={assign.state === "disabled" || !variantKey || command.isPending}
                  onClick={() => variantKey && setPending({ kind: "assign", variantKey })}
                >
                  {t("templates.assign")}
                </Button>
              </div>
            )}
            {assignment && unassign.state !== "hidden" && (
              <Button
                intent="utility"
                disabled={unassign.state === "disabled" || command.isPending}
                onClick={() => setPending({ kind: "default" })}
              >
                {t("templates.useDefault")}
              </Button>
            )}
            {[assign, unassign].map((availability, index) =>
              availability.state === "disabled" ? (
                <p
                  key={index === 0 ? "assign" : "unassign"}
                  className="text-xs text-[var(--color-text-muted)]"
                >
                  {t(`restriction.${availability.reason}`)}
                </p>
              ) : null,
            )}
            <p role={feedback?.tone === "alert" ? "alert" : "status"} className="min-h-5">
              {feedback?.message}
            </p>
          </section>
        )}
        {canPreview && <TemplatePreview type={type} />}
        <TestSendForm type={type} />
      </CardContent>
      <ConfirmDialog
        open={pending !== null}
        tone="consequential"
        title={t(
          pending?.kind === "default"
            ? "templates.confirm.defaultTitle"
            : "templates.confirm.assignTitle",
        )}
        description={t(
          pending?.kind === "default"
            ? "templates.confirm.defaultDescription"
            : "templates.confirm.assignDescription",
          { type: type.description, variant: pending?.kind === "assign" ? pending.variantKey : "" },
        )}
        confirmLabel={t(pending?.kind === "default" ? "templates.useDefault" : "templates.assign")}
        cancelLabel={t("state.cancel")}
        isLoading={command.isPending}
        onClose={() => setPending(null)}
        onConfirm={() => {
          if (pending) command.mutate(pending);
          setPending(null);
          setFeedback(null);
        }}
      />
    </Card>
  );
}
