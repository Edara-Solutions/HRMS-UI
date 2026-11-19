import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { usePlatformCommand } from "@/features/platform-communications-command";
import {
  ContractViolation,
  platformCommunicationsOperations as operations,
  requestPlatformOperation,
  usePlatformAccess,
} from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { Input } from "@/shared/ui/input";
import { QueryPanel } from "@/shared/ui/query-panel";
import { emailQueries, migrateVariant } from "../api/emails";
import {
  type PlatformEmailType,
  type PlatformRemovalReadiness,
  variantsForType,
} from "../model/emails";
import { CommandFeedback } from "./command-feedback";

interface Props {
  type: PlatformEmailType;
}
interface PendingMigration {
  source: string;
  replacement: string;
  reason: string;
  readiness: PlatformRemovalReadiness;
}
export function VariantMigration({ type }: Props) {
  const { t } = useTranslation("platform-emails");
  const access = usePlatformAccess();
  const command = usePlatformCommand();
  const [source, setSource] = useState("");
  const [replacement, setReplacement] = useState("");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState<PendingMigration>();
  const queries = emailQueries(access.user?.publicId ?? "");
  const canRead = access.availability(operations.emailVariants.key).state === "enabled";
  const availability = access.availability(operations.migrateVariant.key);
  const {
    data: variants,
    error: variantError,
    isPending: variantsPending,
    refetch: refetchVariants,
  } = useQuery({ ...queries.variants(type.key), enabled: canRead, retry: false });
  const {
    data: readiness,
    error,
    isPending,
    refetch,
  } = useQuery({
    ...queries.readiness(source),
    enabled:
      !!source && access.availability(operations.variantRemovalReadiness.key).state === "enabled",
    retry: false,
  });
  const eligible = variantsForType(type, variants?.items ?? []);
  const replacements = eligible.filter(
    (variant) =>
      variant.key !== source &&
      type.supportedLocales.every((locale) => variant.supportedLocales.includes(locale)),
  );
  const busy = command.pending || command.blocked;
  async function migrate(check: () => void) {
    if (!pending) return;
    const [freshVariants, fresh] = await Promise.all([
      requestPlatformOperation(operations.emailVariants, { params: { key: type.key } }),
      requestPlatformOperation(operations.variantRemovalReadiness, {
        params: { key: pending.source },
      }),
    ]);
    const valid = variantsForType(type, freshVariants.items);
    if (
      !valid.some((variant) => variant.key === pending.source) ||
      !valid.some(
        (variant) =>
          variant.key === pending.replacement &&
          type.supportedLocales.every((locale) => variant.supportedLocales.includes(locale)),
      ) ||
      fresh.revisionKey !== pending.source ||
      fresh.activeAssignments !== pending.readiness.activeAssignments ||
      fresh.pendingMessages !== pending.readiness.pendingMessages ||
      fresh.removable !== pending.readiness.removable
    )
      throw new Error("stale");
    check();
    const result = await migrateVariant(pending.source, {
      toRevisionKey: pending.replacement,
      reason: pending.reason,
    });
    if (
      result.fromRevisionKey !== pending.source ||
      result.toRevisionKey !== pending.replacement ||
      result.emailTypeKey !== type.key
    )
      throw new ContractViolation({
        audience: "platform",
        key: operations.migrateVariant.key,
        phase: "response",
        status: 200,
      });
  }
  if (!canRead || type.context !== "EDARA") return null;
  return (
    <section className="space-y-3">
      <h3 className="font-semibold">{t("variantMigration.title")}</h3>
      <p>{t("variantMigration.description")}</p>
      <QueryPanel
        title={t("variantMigration.title")}
        pending={variantsPending}
        error={variantError}
        retry={() => void refetchVariants()}
      >
        <label className="block">
          {t("variantMigration.selectLegacy")}
          <select
            className="max-w-full w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2"
            value={source}
            disabled={busy}
            onChange={(event) => {
              setSource(event.target.value);
              setReplacement("");
            }}
          >
            <option value="">{t("variantMigration.placeholder")}</option>
            {eligible.map((variant) => (
              <option key={variant.key} value={variant.key}>
                {variant.key}
              </option>
            ))}
          </select>
        </label>
        {source && (
          <QueryPanel
            title={t("variantMigration.readiness.revision")}
            pending={isPending}
            error={error}
            retry={() => void refetch()}
          >
            {readiness && (
              <dl className="space-y-2">
                {(["activeAssignments", "pendingMessages", "removable"] as const).map((key) => (
                  <div key={key}>
                    <dt>{t(`variantMigration.readiness.${key}`)}</dt>
                    <dd>
                      {typeof readiness[key] === "boolean"
                        ? t(readiness[key] ? "yes" : "no")
                        : readiness[key]}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </QueryPanel>
        )}
        {availability.state !== "hidden" && (
          <>
            <label className="block">
              {t("replacement")}
              <select
                className="max-w-full w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2"
                value={replacement}
                disabled={busy}
                onChange={(event) => setReplacement(event.target.value)}
              >
                <option value="">{t("variantMigration.placeholder")}</option>
                {replacements.map((variant) => (
                  <option key={variant.key} value={variant.key}>
                    {variant.key}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              {t("reason")}
              <Input
                value={reason}
                disabled={busy}
                maxLength={500}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
            <Button
              disabled={
                busy ||
                availability.state !== "enabled" ||
                !source ||
                !replacement ||
                !readiness ||
                !!error ||
                readiness.revisionKey !== source ||
                !reason.trim()
              }
              onClick={() => {
                if (readiness)
                  setPending({ source, replacement, readiness, reason: reason.trim() });
              }}
            >
              {t("variantMigration.migrate")}
            </Button>
          </>
        )}
      </QueryPanel>
      <CommandFeedback command={command} />
      <ConfirmDialog
        open={!!pending}
        title={t("variantMigration.confirm.title")}
        description={
          pending
            ? `${pending.source} → ${pending.replacement} · ${pending.readiness.activeAssignments} · ${pending.readiness.pendingMessages} · ${pending.reason}`
            : ""
        }
        confirmLabel={t("variantMigration.migrate")}
        cancelLabel={t("cancel")}
        isLoading={command.pending}
        confirmDisabled={command.blocked || !!error || !!variantError}
        onClose={() => setPending(undefined)}
        onConfirm={() =>
          void command.run(operations.migrateVariant.key, migrate, () => setPending(undefined))
        }
      />
    </section>
  );
}
