import { Pencil, Plus, UserRound } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { platformLeadOperations as operations, usePlatformAccess } from "@/shared/api";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogDescription, DialogTitle, useDialogIds } from "@/shared/ui/dialog";
import { EmptyState } from "@/shared/ui/empty-state";
import { QueryPanel } from "@/shared/ui/query-panel";
import { type SchemaField, SchemaForm } from "@/shared/ui/schema-form";
import type { LeadDetail } from "../api/crm";
import type { useLeadCommands } from "../model/use-lead-commands";

interface Props {
  detail: LeadDetail;
  restricted: boolean;
  commands: ReturnType<typeof useLeadCommands>;
}

type Contact = LeadDetail["contacts"][number];
type ContactEditor = { kind: "add" } | { kind: "edit"; contact: Contact };

export function ContactPanel({ detail, restricted, commands }: Props) {
  const { t } = useTranslation("platform-leads");
  const access = usePlatformAccess();
  const [editor, setEditor] = useState<ContactEditor | null>(null);
  const { titleId, descriptionId } = useDialogIds();
  const add = access.availability(operations.addContact.key);
  const edit = access.availability(operations.updateContact.key);
  const remove = access.availability(operations.removeContact.key);
  const contacts = [...detail.contacts].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
  const fields = (contact?: Contact): SchemaField[] =>
    (["name", "email", "phone", "jobTitle"] as const).map((name) => ({
      name,
      label: t(`contact.${name}`),
      value: contact?.[name] ?? "",
      nullable: !!contact,
      type: name === "email" ? "email" : "text",
    }));

  const editing = editor?.kind === "edit" ? editor.contact : undefined;
  const editorAvailability = editing ? edit : add;
  const leadName = detail.lead.companyName ?? t("unnamed");
  const closeEditor = () => setEditor(null);

  return (
    <>
      <QueryPanel title={t("contact.title")}>
        {add.state !== "hidden" && (
          <div className="flex justify-end">
            <Button
              intent="action"
              leadingIcon={<Plus size={15} aria-hidden="true" />}
              disabled={restricted || add.state !== "enabled"}
              onClick={() => setEditor({ kind: "add" })}
            >
              {t("action.addContact")}
            </Button>
          </div>
        )}
        {contacts.length ? (
          contacts.map((contact) => {
            const name = contact.name?.trim() || t("contact.unnamed");
            const requestUpdate = (body: unknown) =>
              commands.request({
                kind: "updateContact",
                targetPublicId: contact.publicId,
                name,
                body,
              });
            return (
              <article
                key={contact.publicId}
                className="min-w-0 space-y-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3"
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h4 dir="auto" className="font-semibold">
                    {name}
                  </h4>
                  {contact.isPrimary && (
                    <Badge variant="primary" className="h-auto min-h-5">
                      {t("contact.isPrimary")}
                    </Badge>
                  )}
                </div>
                {contact.jobTitle?.trim() && (
                  <p dir="auto" className="text-sm text-[var(--color-text-muted)]">
                    {contact.jobTitle}
                  </p>
                )}
                <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-3 text-sm [&_dt]:text-[var(--color-text-muted)]">
                  <div className="min-w-0">
                    <dt>{t("contact.email")}</dt>
                    <dd>
                      <bdi dir={contact.email?.trim() ? "ltr" : "auto"}>
                        {contact.email?.trim() || t("notProvided")}
                      </bdi>
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt>{t("contact.phone")}</dt>
                    <dd>
                      <bdi dir={contact.phone?.trim() ? "ltr" : "auto"}>
                        {contact.phone?.trim() || t("notProvided")}
                      </bdi>
                    </dd>
                  </div>
                </dl>
                {(edit.state !== "hidden" || (!contact.isPrimary && remove.state !== "hidden")) && (
                  <div className="flex flex-wrap items-center gap-2">
                    {edit.state !== "hidden" && (
                      <Button
                        intent="utility"
                        leadingIcon={<Pencil size={14} aria-hidden="true" />}
                        disabled={restricted || edit.state !== "enabled"}
                        onClick={() => setEditor({ kind: "edit", contact })}
                      >
                        {t("contact.edit")}
                      </Button>
                    )}
                    {!contact.isPrimary && edit.state !== "hidden" && (
                      <Button
                        intent="action"
                        size="sm"
                        disabled={restricted || edit.state !== "enabled"}
                        onClick={() => requestUpdate({ isPrimary: true })}
                      >
                        {t("contact.makePrimary")}
                      </Button>
                    )}
                    {!contact.isPrimary && remove.state !== "hidden" && (
                      <Button
                        intent="destructive-trigger"
                        size="sm"
                        disabled={restricted || remove.state !== "enabled"}
                        onClick={() =>
                          commands.request({
                            kind: "removeContact",
                            targetPublicId: contact.publicId,
                            name,
                          })
                        }
                      >
                        {t("action.removeContact")}
                      </Button>
                    )}
                  </div>
                )}
                {contact.isPrimary && remove.state === "enabled" && !restricted && (
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {t("contact.replaceBeforeDelete")}
                  </p>
                )}
              </article>
            );
          })
        ) : (
          <EmptyState icon={UserRound} title={t("contact.empty")} />
        )}
      </QueryPanel>
      <Dialog
        open={!!editor}
        onClose={closeEditor}
        dismissible={!commands.busy}
        titleId={titleId}
        descriptionId={descriptionId}
        className="max-h-[90dvh] max-w-2xl overflow-y-auto"
      >
        {editor && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <DialogTitle id={titleId}>
                {t(editing ? "contact.edit" : "action.addContact")}
              </DialogTitle>
              <DialogDescription id={descriptionId}>
                {editing
                  ? editing.name?.trim() || t("contact.unnamed")
                  : t("confirm.addContact", { name: leadName })}
              </DialogDescription>
            </div>
            <SchemaForm
              key={editing?.publicId ?? "new"}
              schema={
                (editing ? operations.updateContact : operations.addContact).requestSchema.shape
                  .body
              }
              fields={
                editing
                  ? fields(editing)
                  : [
                      ...fields(),
                      {
                        name: "isPrimary",
                        label: t("contact.isPrimary"),
                        type: "checkbox",
                        value: !detail.primaryContact,
                      },
                    ]
              }
              changedOnly={!!editing}
              label={t(editing ? "action.updateContact" : "action.addContact")}
              invalidLabel={t("invalid")}
              disabled={restricted || editorAvailability.state !== "enabled"}
              onCancel={closeEditor}
              cancelLabel={t("cancel")}
              cancelDisabled={commands.busy}
              onSubmit={(body) =>
                commands.execute(
                  editing
                    ? {
                        kind: "updateContact",
                        name: editing.name ?? t("contact.unnamed"),
                        targetPublicId: editing.publicId,
                        body,
                      }
                    : { kind: "addContact", name: leadName, body },
                  closeEditor,
                )
              }
            />
            {commands.busy && (
              <p role="status" className="text-sm text-[var(--color-text-muted)]">
                {t("contact.saving")}
              </p>
            )}
            {commands.failed && (
              <div className="space-y-2 text-sm">
                <p role="alert">{commands.feedback}</p>
                <Button intent="action" onClick={() => void commands.reconcile()}>
                  {t("reconcile")}
                </Button>
              </div>
            )}
          </div>
        )}
      </Dialog>
    </>
  );
}
