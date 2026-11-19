import type { UseQueryResult } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ActionAvailability } from "@/shared/auth";
import { usePreferencesStore } from "@/shared/config";
import { formatInstant } from "@/shared/lib/format-instant";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { EnumSelect } from "@/shared/ui/enum-select";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Skeleton } from "@/shared/ui/skeleton";
import { assignRole, revokeAssignment } from "../api/person";
import {
  assignableRoles,
  assignmentExpiry,
  type PersonRecord,
  type PlatformRole,
  type RoleAssignment,
} from "../model/person";
import type { useConfirmedCommand } from "../model/use-confirmed-command";
import { RestrictionNote } from "./restriction-note";

type Commands = ReturnType<typeof useConfirmedCommand>;

interface PersonRolesCardProps {
  person: PersonRecord;
  assignments: UseQueryResult<{ items: RoleAssignment[] }>;
  roles: readonly PlatformRole[] | undefined;
  assign: ActionAvailability;
  revoke: ActionAvailability;
  commands: Commands;
}

/** Platform roles union; a person may hold several. Mutations need root standing (M06). */
export function PersonRolesCard({
  person,
  assignments,
  roles,
  assign,
  revoke,
  commands,
}: PersonRolesCardProps) {
  const { t } = useTranslation("platform-people");
  const held = assignments.data?.items ?? [];

  return (
    <Card as="section" aria-labelledby="platform-person-roles">
      <CardHeader>
        <CardTitle id="platform-person-roles">{t("roles.assignedTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-[18px] text-sm">
        {assignments.isPending ? (
          <Skeleton className="h-10 w-full" />
        ) : assignments.isError ? (
          <p>{t("state.loadFailed")}</p>
        ) : (
          <AssignmentList
            person={person}
            held={held}
            roles={roles}
            revoke={revoke}
            commands={commands}
          />
        )}
        <RestrictionNote availability={revoke} />
        {assign.state !== "hidden" && roles !== undefined && (
          <AssignRoleForm
            person={person}
            assignable={assignableRoles(roles, held)}
            assign={assign}
            commands={commands}
          />
        )}
      </CardContent>
    </Card>
  );
}

interface AssignmentListProps {
  person: PersonRecord;
  held: readonly RoleAssignment[];
  roles: readonly PlatformRole[] | undefined;
  revoke: ActionAvailability;
  commands: Commands;
}

function AssignmentList({ person, held, roles, revoke, commands }: AssignmentListProps) {
  const { t } = useTranslation("platform-people");
  const locale = usePreferencesStore((state) => state.locale);
  const name = `${person.firstName} ${person.lastName}`;
  if (held.length === 0) return <p className="text-[var(--color-text-muted)]">{t("roles.none")}</p>;

  return (
    <ul className="divide-y divide-[var(--color-border)]">
      {held.map((assignment) => {
        const role =
          roles?.find((candidate) => candidate.publicId === assignment.rolePublicId)?.name ??
          t("roles.unknown");
        return (
          <li key={assignment.publicId} className="flex flex-wrap items-center gap-2 py-2">
            <div className="me-auto min-w-0">
              <p className="break-words font-medium">{role}</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {assignment.expiresAt
                  ? t("roles.expires", { date: formatInstant(assignment.expiresAt, locale) })
                  : t("roles.noExpiry")}
              </p>
            </div>
            {revoke.state !== "hidden" && (
              <Button
                intent="destructive-trigger"
                size="sm"
                aria-label={t("roles.revokeLabel", { role })}
                disabled={revoke.state === "disabled" || commands.busy}
                onClick={() =>
                  commands.request({
                    tone: "destructive",
                    title: t("roles.revokeConfirm.title", { role, name }),
                    description: t("roles.revokeConfirm.description", { role, name }),
                    confirmLabel: t("roles.revokeConfirm.action"),
                    success: t("roles.revoked", { role, name }),
                    run: () => revokeAssignment(assignment.publicId),
                  })
                }
              >
                {t("roles.revokeConfirm.action")}
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

interface AssignRoleFormProps {
  person: PersonRecord;
  assignable: readonly PlatformRole[];
  assign: ActionAvailability;
  commands: Commands;
}

function AssignRoleForm({ person, assignable, assign, commands }: AssignRoleFormProps) {
  const { t } = useTranslation("platform-people");
  const name = `${person.firstName} ${person.lastName}`;
  const [roleId, setRoleId] = useState<string>();
  const [localExpiry, setLocalExpiry] = useState("");
  const [expiryError, setExpiryError] = useState(false);
  const chosen = assignable.find((role) => role.publicId === roleId);
  const locked = assign.state === "disabled" || commands.busy;
  const hint = expiryError
    ? t("roles.expiryPast")
    : chosen?.isSystem
      ? t("roles.rootNeverExpires")
      : t("roles.expiryHint");

  function request(role: PlatformRole) {
    const expiry = assignmentExpiry(role, localExpiry, new Date());
    setExpiryError(expiry.kind === "past");
    if (expiry.kind === "past") return;
    const { expiresAt } = expiry;
    commands.request({
      tone: "destructive",
      title: t("roles.assignConfirm.title", { role: role.name, name }),
      description: t(
        role.isSystem ? "roles.assignConfirm.root" : "roles.assignConfirm.description",
        {
          role: role.name,
          name,
        },
      ),
      confirmLabel: t("roles.assignConfirm.action"),
      success: t("roles.assigned", { role: role.name, name }),
      run: () => assignRole(person.publicId, role.publicId, expiresAt),
      onSuccess: () => {
        setRoleId(undefined);
        setLocalExpiry("");
      },
    });
  }

  return (
    <div className="space-y-2 border-t border-[var(--color-border)] pt-4">
      <Label htmlFor="platform-assign-role">{t("roles.assign")}</Label>
      <EnumSelect
        id="platform-assign-role"
        value={chosen?.publicId}
        placeholder={t("roles.choose")}
        disabled={locked}
        options={assignable.map((role) => ({ value: role.publicId, label: role.name }))}
        onValueChange={setRoleId}
      />
      <Label htmlFor="platform-assign-expiry">{t("roles.expiry")}</Label>
      <Input
        id="platform-assign-expiry"
        type="datetime-local"
        dir="ltr"
        value={chosen?.isSystem ? "" : localExpiry}
        disabled={locked || chosen?.isSystem}
        aria-invalid={expiryError}
        aria-describedby="platform-assign-expiry-hint"
        onChange={(event) => setLocalExpiry(event.target.value)}
      />
      <p
        id="platform-assign-expiry-hint"
        className={
          expiryError
            ? "text-xs text-[var(--color-danger)]"
            : "text-xs text-[var(--color-text-muted)]"
        }
      >
        {hint}
      </p>
      <Button
        intent="action"
        size="sm"
        disabled={locked || !chosen}
        onClick={() => chosen && request(chosen)}
      >
        {t("roles.assignConfirm.action")}
      </Button>
      <RestrictionNote availability={assign} />
    </div>
  );
}
