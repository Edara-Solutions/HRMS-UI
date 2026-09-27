import { useTranslation } from "react-i18next";
import type { ActionAvailability } from "@/shared/auth";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  deletePerson,
  forceRecovery,
  reissueInvitation,
  suspendPerson,
  unsuspendPerson,
} from "../api/person";
import type { PersonRecord } from "../model/person";
import type { ConfirmedCommand, useConfirmedCommand } from "../model/use-confirmed-command";
import { RestrictionNote } from "./restriction-note";

interface PersonAccountCardProps {
  person: PersonRecord;
  invitation: ActionAvailability;
  recovery: ActionAvailability;
  suspend: ActionAvailability;
  unsuspend: ActionAvailability;
  remove: ActionAvailability;
  commands: ReturnType<typeof useConfirmedCommand>;
  onDeleted: () => Promise<void>;
}

interface AccountAction {
  key: string;
  availability: ActionAvailability;
  intent: "action" | "destructive-trigger";
  label: string;
  command: ConfirmedCommand;
}

/** Invitation recovery, forced recovery, suspension and deletion stay distinct commands. */
export function PersonAccountCard({
  person,
  invitation,
  recovery,
  suspend,
  unsuspend,
  remove,
  commands,
  onDeleted,
}: PersonAccountCardProps) {
  const { t } = useTranslation("platform-people");
  const name = `${person.firstName} ${person.lastName}`;
  const suspended = person.status === "SUSPENDED";
  const actions: AccountAction[] = [
    {
      key: "invitation",
      availability: invitation,
      intent: "action",
      label: t("account.invitation.action"),
      command: {
        tone: "consequential",
        title: t("account.invitation.title", { name }),
        description: t("account.invitation.description", { name }),
        confirmLabel: t("account.invitation.action"),
        success: t("account.invitation.done", { name }),
        run: () => reissueInvitation(person.publicId),
      },
    },
    {
      key: "recovery",
      availability: recovery,
      intent: "action",
      label: t("account.recovery.action"),
      command: {
        tone: "consequential",
        title: t("account.recovery.title", { name }),
        description: t("account.recovery.description", { name }),
        confirmLabel: t("account.recovery.action"),
        success: t("account.recovery.done", { name }),
        run: () => forceRecovery(person.publicId),
      },
    },
    suspended
      ? {
          key: "unsuspend",
          availability: unsuspend,
          intent: "action",
          label: t("account.unsuspend.action"),
          command: {
            tone: "consequential",
            title: t("account.unsuspend.title", { name }),
            description: t("account.unsuspend.description", { name }),
            confirmLabel: t("account.unsuspend.action"),
            success: t("account.unsuspend.done", { name }),
            run: () => unsuspendPerson(person.publicId),
          },
        }
      : {
          key: "suspend",
          availability: suspend,
          intent: "destructive-trigger",
          label: t("account.suspend.action"),
          command: {
            tone: "destructive",
            title: t("account.suspend.title", { name }),
            description: t("account.suspend.description", { name }),
            confirmLabel: t("account.suspend.action"),
            success: t("account.suspend.done", { name }),
            run: () => suspendPerson(person.publicId),
          },
        },
    {
      key: "delete",
      availability: remove,
      intent: "destructive-trigger",
      label: t("account.delete.action"),
      command: {
        tone: "destructive",
        title: t("account.delete.title", { name }),
        description: t("account.delete.description", { name }),
        confirmLabel: t("account.delete.action"),
        typedTarget: {
          label: t("account.delete.typed", { email: person.email }),
          target: person.email,
        },
        success: t("account.delete.done", { name }),
        run: () => deletePerson(person.publicId),
        onSuccess: onDeleted,
      },
    },
  ];
  const visible = actions.filter((action) => action.availability.state !== "hidden");
  if (visible.length === 0) return null;

  return (
    <Card as="section" aria-labelledby="platform-person-account">
      <CardHeader>
        <CardTitle id="platform-person-account">{t("account.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-[18px] text-sm">
        {visible.map((action) => (
          <div
            key={action.key}
            className={
              action.key === "delete"
                ? "space-y-1.5 border-t border-[var(--color-border)] pt-4"
                : "space-y-1.5"
            }
          >
            <Button
              intent={action.intent}
              size="sm"
              disabled={action.availability.state === "disabled" || commands.busy}
              onClick={() => commands.request(action.command)}
            >
              {action.label}
            </Button>
            <RestrictionNote availability={action.availability} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
