import { useTranslation } from "react-i18next";
import type { ActionAvailability } from "@/shared/auth";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { deletePerson, reissueInvitation, resetPersonPassword } from "../api/person";
import type { PersonRecord } from "../model/person";
import type { useConfirmedCommand } from "../model/use-confirmed-command";
import { RestrictionNote } from "./restriction-note";

interface PersonAccountCardProps {
  person: PersonRecord;
  invitation: ActionAvailability;
  passwordReset: ActionAvailability;
  remove: ActionAvailability;
  commands: ReturnType<typeof useConfirmedCommand>;
  onDeleted: () => Promise<void>;
}

export function PersonAccountCard({
  person,
  invitation,
  passwordReset,
  remove,
  commands,
  onDeleted,
}: PersonAccountCardProps) {
  const { t } = useTranslation("people");
  const name = `${person.firstName} ${person.lastName}`;
  if ([invitation, passwordReset, remove].every((action) => action.state === "hidden")) return null;

  return (
    <Card as="section" aria-labelledby="person-account">
      <CardHeader>
        <CardTitle id="person-account">{t("account.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-[18px] text-sm">
        {invitation.state !== "hidden" && (
          <div className="space-y-1.5">
            <Button
              intent="action"
              size="sm"
              disabled={invitation.state === "disabled" || commands.busy}
              onClick={() =>
                commands.request({
                  tone: "consequential",
                  title: t("account.invitation.title", { name }),
                  description: t("account.invitation.description", { name }),
                  confirmLabel: t("account.invitation.action"),
                  success: t("account.invitation.done", { name }),
                  run: () => reissueInvitation(person.publicId),
                })
              }
            >
              {t("account.invitation.action")}
            </Button>
            <RestrictionNote availability={invitation} />
          </div>
        )}
        {passwordReset.state !== "hidden" && (
          <div className="space-y-1.5">
            <Button
              intent="action"
              size="sm"
              disabled={passwordReset.state === "disabled" || commands.busy}
              onClick={() =>
                commands.request({
                  tone: "consequential",
                  title: t("account.reset.title", { name }),
                  description: t("account.reset.description", { name }),
                  confirmLabel: t("account.reset.action"),
                  success: t("account.reset.done", { name }),
                  run: () => resetPersonPassword(person.publicId),
                })
              }
            >
              {t("account.reset.action")}
            </Button>
            <RestrictionNote availability={passwordReset} />
          </div>
        )}
        {remove.state !== "hidden" && (
          <div className="space-y-1.5 border-t border-[var(--color-border)] pt-4">
            <Button
              intent="destructive-trigger"
              size="sm"
              disabled={remove.state === "disabled" || commands.busy}
              onClick={() =>
                commands.request({
                  tone: "destructive",
                  title: t("account.delete.title", { name }),
                  description: t("account.delete.description", { name }),
                  confirmLabel: t("account.delete.action"),
                  typedTarget: {
                    label: t("account.delete.typed", { code: person.employeeCode }),
                    target: person.employeeCode,
                  },
                  success: t("account.delete.done", { name }),
                  run: () => deletePerson(person.publicId),
                  onSuccess: onDeleted,
                })
              }
            >
              {t("account.delete.action")}
            </Button>
            <RestrictionNote availability={remove} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
