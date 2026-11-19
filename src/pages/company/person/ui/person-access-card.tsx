import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ActionAvailability } from "@/shared/auth";
import { usePreferencesStore } from "@/shared/config";
import { formatInstant } from "@/shared/lib/format-instant";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { EnumSelect } from "@/shared/ui/enum-select";
import { Label } from "@/shared/ui/label";
import { Skeleton } from "@/shared/ui/skeleton";
import { assignPersonRole, revokePersonRole, transferOwnership } from "../api/person";
import type { PersonRecord, PersonTarget, RoleAssignment, RoleSummary } from "../model/person";
import type { useConfirmedCommand } from "../model/use-confirmed-command";
import { RestrictionNote } from "./restriction-note";

interface PersonAccessCardProps {
  person: PersonRecord;
  assignment: RoleAssignment | null | undefined;
  assignmentPending: boolean;
  roles: readonly RoleSummary[] | undefined;
  target: PersonTarget;
  assign: ActionAvailability;
  revoke: ActionAvailability;
  transfer: ActionAvailability;
  commands: ReturnType<typeof useConfirmedCommand>;
  onTransferred: () => Promise<void>;
}

export function PersonAccessCard({
  person,
  assignment,
  assignmentPending,
  roles,
  target,
  assign,
  revoke,
  transfer,
  commands,
  onTransferred,
}: PersonAccessCardProps) {
  const { t } = useTranslation("people");
  const locale = usePreferencesStore((state) => state.locale);
  const name = `${person.firstName} ${person.lastName}`;
  // The Owner role changes hands only through ownership transfer, never by assignment.
  const assignable = (roles ?? []).filter(
    (role) => !role.isOwner && role.publicId !== assignment?.rolePublicId,
  );
  const [roleId, setRoleId] = useState<string>();
  const chosen = assignable.find((role) => role.publicId === roleId);

  return (
    <Card as="section" aria-labelledby="person-access">
      <CardHeader>
        <CardTitle id="person-access">{t("access.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-[18px] text-sm">
        {assignmentPending ? (
          <Skeleton className="h-10 w-full" />
        ) : assignment ? (
          <div className="space-y-1">
            <p className="font-medium">{assignment.roleName}</p>
            <p className="text-xs text-[var(--color-text-muted)]">
              {t("access.since", { date: formatInstant(assignment.assignedAt, locale) })}
            </p>
          </div>
        ) : (
          <p className="text-[var(--color-text-muted)]">{t("access.noRole")}</p>
        )}

        {assign.state !== "hidden" && roles !== undefined && (
          <div className="space-y-2">
            <Label htmlFor="assign-role">
              {assignment ? t("access.changeRole") : t("access.assignRole")}
            </Label>
            <EnumSelect
              id="assign-role"
              value={chosen?.publicId}
              placeholder={t("access.chooseRole")}
              disabled={assign.state === "disabled" || commands.busy}
              options={assignable.map((role) => ({ value: role.publicId, label: role.name }))}
              onValueChange={setRoleId}
            />
            <Button
              intent="action"
              size="sm"
              disabled={assign.state === "disabled" || !chosen || commands.busy}
              onClick={() =>
                chosen &&
                commands.request({
                  tone: "consequential",
                  title: t("access.assignConfirm.title", { role: chosen.name, name }),
                  description: t(
                    assignment ? "access.assignConfirm.replace" : "access.assignConfirm.first",
                    { role: chosen.name, name, current: assignment?.roleName ?? "" },
                  ),
                  confirmLabel: t("access.assignConfirm.action"),
                  success: t("access.assigned", { role: chosen.name, name }),
                  run: () => assignPersonRole(person.publicId, chosen.publicId),
                  onSuccess: () => setRoleId(undefined),
                })
              }
            >
              {t("access.assignConfirm.action")}
            </Button>
            <RestrictionNote availability={assign} />
          </div>
        )}

        {assignment && revoke.state !== "hidden" && (
          <div className="space-y-2">
            <Button
              intent="destructive-trigger"
              size="sm"
              disabled={revoke.state === "disabled" || commands.busy}
              onClick={() =>
                commands.request({
                  tone: "destructive",
                  title: t("access.revokeConfirm.title", { name }),
                  description: t("access.revokeConfirm.description", {
                    role: assignment.roleName,
                    name,
                  }),
                  confirmLabel: t("access.revokeConfirm.action"),
                  success: t("access.revoked", { name }),
                  run: () => revokePersonRole(person.publicId),
                })
              }
            >
              {t("access.revokeConfirm.action")}
            </Button>
            <RestrictionNote availability={revoke} />
          </div>
        )}

        {!target.owner && transfer.state !== "hidden" && (
          <div className="space-y-2 border-t border-[var(--color-border)] pt-4">
            <p className="text-[var(--color-text-muted)]">{t("access.transferHint")}</p>
            <Button
              intent="destructive-trigger"
              size="sm"
              disabled={transfer.state === "disabled" || commands.busy}
              onClick={() =>
                commands.request({
                  tone: "destructive",
                  title: t("access.transferConfirm.title", { name }),
                  description: t("access.transferConfirm.description", { name }),
                  confirmLabel: t("access.transferConfirm.action"),
                  typedTarget: {
                    label: t("access.transferConfirm.typed", { code: person.employeeCode }),
                    target: person.employeeCode,
                  },
                  success: t("access.transferred", { name }),
                  run: () => transferOwnership(person.publicId),
                  onSuccess: onTransferred,
                })
              }
            >
              {t("access.transferConfirm.action")}
            </Button>
            <RestrictionNote availability={transfer} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
