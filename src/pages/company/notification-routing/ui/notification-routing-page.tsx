import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ContractViolation,
  isCompanyBlocked,
  OperationRefusal,
  useCompanyAccess,
  useCompanyMutationRecovery,
} from "@/shared/api";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { CompanyAccessNotice } from "@/shared/ui/company-access-notice";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { EmptyState } from "@/shared/ui/empty-state";
import { EnumSelect } from "@/shared/ui/enum-select";
import { Label } from "@/shared/ui/label";
import { Skeleton } from "@/shared/ui/skeleton";
import { routingQueries, setRouting } from "../api/notification-routing";
import {
  type RoutingChoice,
  type RoutingOverride,
  type RoutingSetting,
  routingChoice,
  sameOverride,
  toOverride,
} from "../model/notification-routing";

/** The one type being edited, with the selector and reference chosen so far. */
interface RoutingEditor {
  typeKey: string;
  choice: RoutingChoice;
  reference?: string;
}

interface PendingChange {
  setting: RoutingSetting;
  override: RoutingOverride;
}

export function CompanyNotificationRoutingPage() {
  const { t, i18n } = useTranslation("communications");
  const access = useCompanyAccess();
  const recover = useCompanyMutationRecovery();
  const queryClient = useQueryClient();
  const queries = routingQueries(access.user?.publicId ?? "");
  const update = access.availability("PUT /api/v1/company/notification-settings/{typeKey}");
  const canReadRoles = access.availability("GET /api/v1/company/roles").state !== "hidden";
  const canReadPermissions =
    access.availability("GET /api/v1/company/permissions").state !== "hidden";
  const { data, error, isPending, isError, refetch } = useQuery({
    ...queries.settings,
    enabled: access.user !== undefined,
  });
  const { data: roles } = useQuery({
    ...queries.roles,
    enabled: canReadRoles && update.state !== "hidden",
  });
  const { data: permissions } = useQuery({
    ...queries.permissions,
    enabled: canReadPermissions && update.state !== "hidden",
  });
  const [editor, setEditor] = useState<RoutingEditor | null>(null);
  const [pending, setPending] = useState<PendingChange | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "status" | "alert"; message: string } | null>(
    null,
  );
  const save = useMutation({
    retry: false,
    mutationFn: (change: PendingChange) => setRouting(change.setting.typeKey, change.override),
    onSuccess: (_result, change) =>
      setFeedback({
        tone: "status",
        message: t("routing.saved", { type: typeTitle(change.setting) }),
      }),
    onError: async (mutationError) => {
      const outcome = await recover(mutationError);
      setFeedback({ tone: "alert", message: t(`outcome.${outcome.kind}`) });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queries.settings.queryKey }),
  });

  if (isCompanyBlocked(error)) throw error;
  if (error instanceof OperationRefusal && [403, 404].includes(error.status)) throw error;
  if (!access.user) return null;

  /** A Company type this UI can name; anything else is listed neutrally and left unedited. */
  function isKnownType(setting: RoutingSetting) {
    return (
      setting.typeKey.startsWith("company.") &&
      i18n.exists(`notifications.${setting.typeKey}.title`, { ns: "notification" })
    );
  }

  function typeTitle(setting: RoutingSetting) {
    return isKnownType(setting)
      ? t(`notifications.${setting.typeKey}.title`, { ns: "notification" })
      : t("routing.unknownType");
  }

  function describe(override: RoutingOverride) {
    if (override === null) return t("routing.choice.default");
    if (override.selectorKind === "blast") return t("routing.choice.blast");
    return t(`routing.describe.${override.selectorKind}`, { reference: override.selectorRef });
  }

  function startEditing(setting: RoutingSetting) {
    setFeedback(null);
    setEditor({
      typeKey: setting.typeKey,
      choice: routingChoice(setting.override),
      reference:
        setting.override && "selectorRef" in setting.override
          ? setting.override.selectorRef
          : undefined,
    });
  }

  const choice = editor?.choice ?? "default";
  const reference = editor?.reference;
  const choiceOptions = (["default", "role", "permission", "blast"] as const).flatMap((option) =>
    (option === "role" && !canReadRoles) || (option === "permission" && !canReadPermissions)
      ? []
      : [{ value: option, label: t(`routing.choice.${option}`) }],
  );
  const referenceOptions =
    choice === "role"
      ? (roles?.items ?? []).map((role) => ({ value: role.name, label: role.name }))
      : choice === "permission"
        ? (permissions ?? []).flatMap((group) =>
            group.permissions.map((permission) => ({
              value: permission.action,
              label: permission.description ?? permission.action,
            })),
          )
        : [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t("routing.title")}</h1>
        <p className="max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
          {t("routing.description")}
        </p>
      </header>
      {access.policy && <CompanyAccessNotice {...access.policy} />}
      {update.state === "disabled" && (
        <p className="text-sm text-[var(--color-text-muted)]">
          {t(`restriction.${update.reason}`)}
        </p>
      )}

      <Card as="section" aria-labelledby="routing-heading" className="min-w-0">
        <h2 id="routing-heading" className="sr-only">
          {t("routing.title")}
        </h2>
        {isPending ? (
          <output className="block space-y-2 p-4" aria-label={t("state.loading")}>
            {[0, 1, 2].map((row) => (
              <Skeleton key={row} className="h-12 w-full" />
            ))}
          </output>
        ) : isError ? (
          <div className="space-y-3 p-4 text-sm">
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
        ) : data.items.length === 0 ? (
          <EmptyState icon={BellRing} title={t("routing.empty")} />
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {data.items.map((setting) => {
              const known = isKnownType(setting);
              const isEditing = editor?.typeKey === setting.typeKey;
              const next = toOverride(choice, reference);
              return (
                <li key={setting.typeKey} className="space-y-3 px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="me-auto min-w-0">
                      <p className="break-words font-medium">{typeTitle(setting)}</p>
                      <p className="break-words text-xs text-[var(--color-text-muted)]">
                        {describe(setting.override)}
                      </p>
                    </div>
                    <Badge variant={setting.importance === "high" ? "warning" : "default"}>
                      {t(`routing.importance.${setting.importance}`)}
                    </Badge>
                    {known && update.state !== "hidden" && !isEditing && (
                      <Button
                        intent="action"
                        size="sm"
                        disabled={update.state === "disabled" || save.isPending}
                        aria-label={t("routing.changeLabel", { type: typeTitle(setting) })}
                        onClick={() => startEditing(setting)}
                      >
                        {t("routing.change")}
                      </Button>
                    )}
                  </div>
                  {isEditing && (
                    <div className="flex flex-wrap items-end gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
                      <div className="w-52 space-y-1.5">
                        <Label htmlFor={`routing-choice-${setting.typeKey}`}>
                          {t("routing.audience")}
                        </Label>
                        <EnumSelect
                          id={`routing-choice-${setting.typeKey}`}
                          value={choice}
                          options={choiceOptions}
                          onValueChange={(value) => {
                            setEditor({ typeKey: setting.typeKey, choice: value });
                          }}
                        />
                      </div>
                      {(choice === "role" || choice === "permission") && (
                        <div className="min-w-52 flex-1 space-y-1.5">
                          <Label htmlFor={`routing-reference-${setting.typeKey}`}>
                            {t(`routing.reference.${choice}`)}
                          </Label>
                          <EnumSelect
                            id={`routing-reference-${setting.typeKey}`}
                            value={reference}
                            placeholder={t("routing.chooseReference")}
                            options={referenceOptions}
                            onValueChange={(value) =>
                              setEditor({ typeKey: setting.typeKey, choice, reference: value })
                            }
                          />
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button intent="dismissive" size="sm" onClick={() => setEditor(null)}>
                          {t("state.cancel")}
                        </Button>
                        <Button
                          intent="cta"
                          size="sm"
                          disabled={next === undefined || sameOverride(next, setting.override)}
                          onClick={() => {
                            if (next === undefined) return;
                            setPending({ setting, override: next });
                          }}
                        >
                          {t("routing.review")}
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <p role={feedback?.tone === "alert" ? "alert" : "status"} className="min-h-5 text-sm">
        {feedback?.message}
      </p>

      <ConfirmDialog
        open={pending !== null}
        tone={pending?.override?.selectorKind === "blast" ? "destructive" : "consequential"}
        title={t("routing.confirm.title", { type: pending ? typeTitle(pending.setting) : "" })}
        description={
          pending
            ? t(
                pending.override?.selectorKind === "blast"
                  ? "routing.confirm.blast"
                  : "routing.confirm.description",
                { from: describe(pending.setting.override), to: describe(pending.override) },
              )
            : ""
        }
        confirmLabel={t("routing.confirm.action")}
        cancelLabel={t("state.cancel")}
        isLoading={save.isPending}
        onClose={() => setPending(null)}
        onConfirm={() => {
          if (pending) save.mutate(pending);
          setPending(null);
          setEditor(null);
        }}
      />
    </div>
  );
}
