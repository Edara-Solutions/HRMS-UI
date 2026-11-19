import { useQuery } from "@tanstack/react-query";
import { BellRing } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { usePlatformCommand } from "@/features/platform-communications-command";
import {
  ContractViolation,
  platformCommunicationsOperations as communications,
  OperationRefusal,
  operationAuthorization,
  requestPlatformOperation,
  usePlatformAccess,
} from "@/shared/api";
import { RouteAccessRefusal } from "@/shared/auth";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { EmptyState } from "@/shared/ui/empty-state";
import { EnumSelect } from "@/shared/ui/enum-select";
import { Label } from "@/shared/ui/label";
import { Skeleton } from "@/shared/ui/skeleton";
import { setRouting, settingsQueries } from "../api/notification-settings";
import {
  type RoutingChoice,
  type RoutingOverride,
  type RoutingSetting,
  routingChoice,
  sameOverride,
  toOverride,
  validateReference,
} from "../model";

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

export function PlatformNotificationSettingsPage() {
  const { t, i18n } = useTranslation("platform-notifications");
  const access = usePlatformAccess();
  const command = usePlatformCommand();
  const queries = settingsQueries(access.user?.publicId ?? "");
  const update = access.availability(communications.updateNotificationRouting.key);
  const canReadRoles = access.availability("GET /api/v1/platform/roles").state !== "hidden";
  const { data, error, isPending, isError, refetch } = useQuery({
    ...queries.settings,
    enabled: access.availability(communications.notificationSettings.key).state === "enabled",
    retry: false,
  });
  const { data: roles } = useQuery({
    ...queries.roles,
    enabled: canReadRoles && update.state !== "hidden",
  });
  const [editor, setEditor] = useState<RoutingEditor | null>(null);
  const [pending, setPending] = useState<PendingChange | null>(null);

  if (error instanceof OperationRefusal && [403, 404].includes(error.status)) throw error;
  if (!access.user) return null;

  if (access.availability(communications.notificationSettings.key).state === "hidden") {
    throw new RouteAccessRefusal("platform");
  }

  /** A Platform type this UI can name; anything else is listed neutrally and left unedited. */
  function isKnownType(setting: RoutingSetting) {
    return (
      setting.typeVersion === 1 &&
      setting.typeKey.startsWith("platform.") &&
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
    return t(`routing.describe.${override.selectorKind}`, { reference: override.selectorRef });
  }

  function startEditing(setting: RoutingSetting) {
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
  const choiceOptions = (["default", "role", "permission"] as const).flatMap((option) =>
    option === "role" && !canReadRoles
      ? []
      : [{ value: option, label: t(`routing.choice.${option}`) }],
  );

  // Permission options: union of all role actions from the roles read
  const allActions = roles?.items.flatMap((role) => role.actions) ?? [];
  const declaredActions = new Set<string>();
  for (const operation of Object.values(operationAuthorization)) {
    if (operation.audience === "platform" && operation.permission)
      declaredActions.add(operation.permission);
  }
  const uniqueActions = [...new Set(allActions)]
    .filter((action) => declaredActions.has(action))
    .sort();
  const referenceOptions =
    choice === "role"
      ? (roles?.items ?? []).map((role) => ({ value: role.name, label: role.name }))
      : choice === "permission"
        ? uniqueActions.map((action) => ({ value: action, label: action }))
        : [];

  return (
    <div className="mx-auto min-w-0 max-w-5xl space-y-6 [overflow-wrap:anywhere] [&_button]:max-w-full [&_button]:whitespace-normal [&_button]:h-auto [&_button]:min-h-9">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t("routing.title")}</h1>
        <p className="max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
          {t("routing.description")}
        </p>
      </header>
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
              const next = toOverride({ choice, reference });
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
                        disabled={update.state !== "enabled" || command.pending || command.blocked}
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
                          disabled={
                            next === undefined ||
                            sameOverride(next, setting.override) ||
                            (choice !== "default" && !validateReference(reference ?? "")) ||
                            command.pending ||
                            command.blocked ||
                            update.state !== "enabled"
                          }
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

      {command.outcome && <p role="status">{t(`result.${command.outcome.kind}`)}</p>}
      {command.blocked && command.outcome?.kind !== "contract" && (
        <Button disabled={command.pending} onClick={() => void command.reconcile()}>
          {t("state.retry")}
        </Button>
      )}
      <ConfirmDialog
        open={pending !== null}
        tone="consequential"
        title={t("routing.confirm.title", { type: pending ? typeTitle(pending.setting) : "" })}
        description={
          pending
            ? t("routing.confirm.description", {
                from: describe(pending.setting.override),
                to: describe(pending.override),
              })
            : ""
        }
        confirmLabel={t("routing.confirm.action")}
        cancelLabel={t("state.cancel")}
        isLoading={command.pending}
        confirmDisabled={command.blocked || !!error}
        onClose={() => setPending(null)}
        onConfirm={() => {
          if (!pending) return;
          const change = pending;
          void command.run(
            communications.updateNotificationRouting.key,
            async (check) => {
              const fresh = await requestPlatformOperation(communications.notificationSettings, {});
              const setting = fresh.items.find((item) => item.typeKey === change.setting.typeKey);
              if (
                !setting ||
                setting.typeVersion !== change.setting.typeVersion ||
                !sameOverride(setting.override, change.setting.override)
              )
                throw new Error("stale");
              check();
              return setRouting(change.setting.typeKey, change.override);
            },
            () => {
              setPending(null);
              setEditor(null);
            },
          );
        }}
      />
    </div>
  );
}
