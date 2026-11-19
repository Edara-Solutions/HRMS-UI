import { useTranslation } from "react-i18next";
import { platformLeadOperations as operations, usePlatformAccess } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { QueryPanel } from "@/shared/ui/query-panel";
import { type SchemaField, SchemaForm } from "@/shared/ui/schema-form";
import type { LeadDetail } from "../api/crm";
import type { useLeadCommands } from "../model/use-lead-commands";

interface Props {
  detail: LeadDetail;
  restricted: boolean;
  commands: ReturnType<typeof useLeadCommands>;
}
export function ContactPanel({ detail, restricted, commands }: Props) {
  const { t } = useTranslation("platform-leads");
  const access = usePlatformAccess();
  const fields = (contact?: LeadDetail["contacts"][number]): SchemaField[] => [
    ...["name", "email", "phone", "jobTitle"].map((name) => ({
      name,
      label: t(`contact.${name}`),
      value: contact
        ? name === "name"
          ? (contact.name ?? "")
          : name === "email"
            ? (contact.email ?? "")
            : name === "phone"
              ? (contact.phone ?? "")
              : (contact.jobTitle ?? "")
        : "",
      nullable: !!contact,
    })),
    {
      name: "isPrimary",
      label: t("contact.isPrimary"),
      type: "checkbox",
      value: contact?.isPrimary ?? false,
    },
  ];
  const add = access.availability(operations.addContact.key);
  return (
    <QueryPanel title={t("contact.title")}>
      {detail.contacts.length ? (
        detail.contacts.map((contact) => (
          <article
            key={contact.publicId}
            className="space-y-3 border-b border-[var(--color-border)] pb-4"
          >
            <h3 className="font-medium">
              {contact.name ?? t("unnamed")}{" "}
              {contact.isPrimary && <span>· {t("contact.isPrimary")}</span>}
            </h3>
            <p className="break-words">
              {contact.email ?? t("notProvided")} · {contact.phone ?? t("notProvided")} ·{" "}
              {contact.jobTitle ?? t("notProvided")}
            </p>
            {access.availability(operations.updateContact.key).state !== "hidden" && (
              <details>
                <summary>{t("action.updateContact")}</summary>
                <SchemaForm
                  schema={operations.updateContact.requestSchema.shape.body}
                  fields={fields(contact)}
                  changedOnly
                  label={t("action.updateContact")}
                  invalidLabel={t("invalid")}
                  disabled={
                    restricted ||
                    access.availability(operations.updateContact.key).state !== "enabled"
                  }
                  onSubmit={(body) =>
                    commands.request({
                      kind: "updateContact",
                      targetPublicId: contact.publicId,
                      name: contact.name ?? t("unnamed"),
                      body,
                    })
                  }
                />
              </details>
            )}
            {access.availability(operations.removeContact.key).state !== "hidden" && (
              <Button
                intent="destructive-trigger"
                disabled={
                  restricted ||
                  access.availability(operations.removeContact.key).state !== "enabled"
                }
                onClick={() =>
                  commands.request({
                    kind: "removeContact",
                    targetPublicId: contact.publicId,
                    name: contact.name ?? contact.publicId,
                  })
                }
              >
                {t("action.removeContact")}
              </Button>
            )}
          </article>
        ))
      ) : (
        <p>{t("contact.empty")}</p>
      )}
      {add.state !== "hidden" && (
        <details>
          <summary>{t("action.addContact")}</summary>
          <SchemaForm
            schema={operations.addContact.requestSchema.shape.body}
            fields={fields()}
            label={t("action.addContact")}
            invalidLabel={t("invalid")}
            disabled={restricted || add.state !== "enabled"}
            onSubmit={(body) =>
              commands.request({
                kind: "addContact",
                name: detail.lead.companyName ?? t("unnamed"),
                body,
              })
            }
          />
        </details>
      )}
    </QueryPanel>
  );
}
