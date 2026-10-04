import { useQuery } from "@tanstack/react-query";
import { type FormEvent, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { usePlatformCommand } from "@/features/platform-communications-command";
import {
  platformCommunicationsOperations as operations,
  platformCompanyOperations,
  usePlatformAccess,
} from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogDescription, DialogTitle, useDialogIds } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { QueryPanel } from "@/shared/ui/query-panel";
import { companyOptionsQuery, createAnnouncement } from "../api/announcements";
import type { AnnouncementFormData } from "../model/announcement-form";

interface RuleDraft {
  id: number;
  scope: "company" | "platform";
  kind: "blast" | "roster" | "roles" | "permission";
  reference: string;
}
interface Props {
  close: () => void;
}
export function AnnouncementComposer({ close }: Props) {
  const { t } = useTranslation("platform-announcements");
  const access = usePlatformAccess();
  const command = usePlatformCommand();
  const ids = useDialogIds();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [rules, setRules] = useState<RuleDraft[]>([
    { id: 0, scope: "company", kind: "blast", reference: "" },
  ]);
  const nextId = useRef(1);
  const [pending, setPending] = useState<AnnouncementFormData>();
  const [invalid, setInvalid] = useState(false);
  const { data, error, isPending, refetch } = useQuery({
    ...companyOptionsQuery(access.user?.publicId ?? "", page),
    enabled: access.availability(platformCompanyOperations.companies.key).state === "enabled",
    retry: false,
  });
  const busy = command.pending || command.blocked;
  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const scheduled = String(form.get("scheduledFor") ?? "");
    const parsed = operations.createAnnouncement.requestSchema.shape.body.safeParse({
      message: {
        en: { title: form.get("enTitle"), body: form.get("enBody") },
        ar: { title: form.get("arTitle"), body: form.get("arBody") },
      },
      companies: Object.keys(selected),
      rules: rules.map((rule) => ({
        scope: rule.scope,
        selector:
          rule.kind === "roles"
            ? { kind: rule.kind, roleNames: rule.reference.split(",").map((value) => value.trim()) }
            : rule.kind === "permission"
              ? { kind: rule.kind, permissionAction: rule.reference.trim() }
              : { kind: rule.kind },
      })),
      ...(scheduled
        ? {
            scheduledFor: Number.isFinite(new Date(scheduled).getTime())
              ? new Date(scheduled).toISOString()
              : scheduled,
          }
        : {}),
    });
    setInvalid(!parsed.success);
    if (parsed.success) setPending(parsed.data);
  }
  return (
    <Dialog
      open
      onClose={() => (pending ? setPending(undefined) : close())}
      dismissible={!command.pending}
      titleId={ids.titleId}
      descriptionId={ids.descriptionId}
      className="max-w-3xl max-h-[calc(100dvh-2rem)] overflow-y-auto [overflow-wrap:anywhere] [&_button]:max-w-full [&_button]:whitespace-normal [&_select]:max-w-full"
    >
      <DialogTitle id={ids.titleId}>{t("compose")}</DialogTitle>
      <DialogDescription id={ids.descriptionId}>{t("composeHint")}</DialogDescription>
      <form onSubmit={review} hidden={!!pending} className="mt-4 space-y-4">
        {(["en", "ar"] as const).map((locale) => (
          <fieldset key={locale} className="space-y-2" dir={locale === "ar" ? "rtl" : "ltr"}>
            <legend>{t(`locale.${locale}`)}</legend>
            <label className="block">
              {t("messageTitle")}
              <Input name={`${locale}Title`} required maxLength={200} disabled={busy} />
            </label>
            <label className="block">
              {t("messageBody")}
              <textarea
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2"
                name={`${locale}Body`}
                required
                maxLength={5000}
                disabled={busy}
              />
            </label>
          </fieldset>
        ))}
        <QueryPanel
          title={t("companies")}
          pending={isPending}
          error={error}
          retry={() => void refetch()}
        >
          {data?.data.map((company) => (
            <label key={company.publicId} className="flex gap-2 py-1">
              <input
                type="checkbox"
                checked={Object.hasOwn(selected, company.publicId)}
                disabled={busy}
                onChange={(event) =>
                  setSelected((current) => {
                    const next = { ...current };
                    if (event.target.checked) next[company.publicId] = company.name;
                    else delete next[company.publicId];
                    return next;
                  })
                }
              />
              {company.name}
            </label>
          ))}
          <p>{t("selected", { count: Object.keys(selected).length })}</p>
          <div className="flex gap-2">
            <Button
              type="button"
              disabled={page === 1 || busy}
              onClick={() => setPage((current) => current - 1)}
            >
              {t("previous")}
            </Button>
            <Button
              type="button"
              disabled={!data || data.data.length < 100 || busy}
              onClick={() => setPage((current) => current + 1)}
            >
              {t("next")}
            </Button>
          </div>
        </QueryPanel>
        {rules.map((rule) => (
          <fieldset
            key={rule.id}
            className="flex flex-wrap gap-2 border border-[var(--color-border)] p-3"
          >
            <legend>{t("rule")}</legend>
            <label>
              {t("scope")}
              <select
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2"
                disabled={busy}
                value={rule.scope}
                onChange={(event) =>
                  setRules((current) =>
                    current.map((item) =>
                      item.id === rule.id
                        ? {
                            ...item,
                            scope: event.target.value === "platform" ? "platform" : "company",
                            kind: event.target.value === "platform" ? "roster" : "blast",
                            reference: "",
                          }
                        : item,
                    ),
                  )
                }
              >
                <option value="company">{t("scope.company")}</option>
                <option value="platform">{t("scope.platform")}</option>
              </select>
            </label>
            <label>
              {t("selector")}
              <select
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2"
                disabled={busy}
                value={rule.kind}
                onChange={(event) => {
                  const kind = event.target.value;
                  if (
                    kind === "blast" ||
                    kind === "roster" ||
                    kind === "roles" ||
                    kind === "permission"
                  )
                    setRules((current) =>
                      current.map((item) =>
                        item.id === rule.id ? { ...item, kind, reference: "" } : item,
                      ),
                    );
                }}
              >
                <option value={rule.scope === "company" ? "blast" : "roster"}>
                  {t(rule.scope === "company" ? "blast" : "roster")}
                </option>
                <option value="roles">{t("roles")}</option>
                <option value="permission">{t("permission")}</option>
              </select>
            </label>
            {(rule.kind === "roles" || rule.kind === "permission") && (
              <label>
                {t(rule.kind)}
                <Input
                  disabled={busy}
                  value={rule.reference}
                  onChange={(event) =>
                    setRules((current) =>
                      current.map((item) =>
                        item.id === rule.id ? { ...item, reference: event.target.value } : item,
                      ),
                    )
                  }
                  required
                />
              </label>
            )}
            <Button
              type="button"
              disabled={busy}
              onClick={() => setRules((current) => current.filter((item) => item.id !== rule.id))}
            >
              {t("remove")}
            </Button>
          </fieldset>
        ))}
        <Button
          type="button"
          disabled={busy || rules.length >= 20}
          onClick={() => {
            const id = nextId.current++;
            setRules((current) => [
              ...current,
              { id, scope: "platform", kind: "roster", reference: "" },
            ]);
          }}
        >
          {t("addRule")}
        </Button>
        <label className="block">
          {t("schedule")}
          <Input type="datetime-local" name="scheduledFor" disabled={busy} />
        </label>
        {invalid && <p role="alert">{t("invalid")}</p>}
        <Button type="submit" disabled={busy}>
          {t("review")}
        </Button>
        {command.outcome && <p role="status">{t(`result.${command.outcome.kind}`)}</p>}
        {command.blocked && command.outcome?.kind !== "contract" && (
          <Button type="button" disabled={command.pending} onClick={() => void command.reconcile()}>
            {t("reconcile")}
          </Button>
        )}
      </form>
      {pending && (
        <section className="mt-4 space-y-4">
          <h2>{t("confirm")}</h2>
          <p className="whitespace-pre-wrap">{`${pending.message.en.title}\n${pending.message.en.body}\n${pending.message.ar.title}\n${pending.message.ar.body}\n${Object.values(selected).join(", ")}\n${pending.rules?.map((rule) => `${t(`scope.${rule.scope}`)}: ${t(rule.selector.kind)} ${"roleNames" in rule.selector ? rule.selector.roleNames.join(", ") : "permissionAction" in rule.selector ? rule.selector.permissionAction : ""}`).join("\n")}\n${pending.scheduledFor ?? t("immediate")}`}</p>
          <Button disabled={command.pending} onClick={() => setPending(undefined)}>
            {t("back")}
          </Button>
          <Button
            disabled={command.pending || command.blocked}
            onClick={() => {
              const body = pending;
              void command.run(
                operations.createAnnouncement.key,
                async (check) => {
                  check();
                  return createAnnouncement(body);
                },
                close,
              );
            }}
          >
            {t("publish")}
          </Button>
          {command.outcome && <p role="status">{t(`result.${command.outcome.kind}`)}</p>}
          {command.blocked && command.outcome?.kind !== "contract" && (
            <Button disabled={command.pending} onClick={() => void command.reconcile()}>
              {t("reconcile")}
            </Button>
          )}
        </section>
      )}
    </Dialog>
  );
}
