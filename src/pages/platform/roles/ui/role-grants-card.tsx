import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ActionAvailability } from "@/shared/auth";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { updateRole } from "../api/roles";
import {
  grantableActions,
  grantChange,
  type PlatformRole,
  replacementActions,
} from "../model/grants";
import { useRoleMutation } from "../model/use-role-mutation";
import { GrantPicker } from "./grant-picker";
import { RoleOutcome, RoleRestriction } from "./role-feedback";

interface RoleGrantsCardProps {
  role: PlatformRole;
  grant: ActionAvailability;
}

/** Read-only grants for inspection; an editable replacement for a current root holder. */
export function RoleGrantsCard({ role, grant }: RoleGrantsCardProps) {
  const { t } = useTranslation("platform-people");
  return (
    <Card as="section" aria-labelledby="platform-role-grants" className="min-w-0">
      <CardHeader>
        <CardTitle id="platform-role-grants">{t("role.grants")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-[18px] text-sm">
        {role.isSystem ? (
          <p className="text-[var(--color-text-muted)]">{t("role.rootAccess")}</p>
        ) : grant.state === "hidden" ? (
          <GrantList actions={role.actions} />
        ) : (
          <GrantEditor role={role} grant={grant} />
        )}
      </CardContent>
    </Card>
  );
}

interface GrantListProps {
  actions: readonly string[];
}

function GrantList({ actions }: GrantListProps) {
  const { t } = useTranslation("platform-people");
  if (actions.length === 0)
    return <p className="text-[var(--color-text-muted)]">{t("role.noGrants")}</p>;
  return (
    <ul className="space-y-1.5">
      {actions.map((action) => (
        <li key={action} dir="ltr" className="break-all">
          {action}
        </li>
      ))}
    </ul>
  );
}

function GrantEditor({ role, grant }: RoleGrantsCardProps) {
  const { t } = useTranslation("platform-people");
  const grantable = grantableActions();
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set(role.actions));
  const [confirming, setConfirming] = useState(false);
  const replacement = replacementActions(role.actions, selected, grantable);
  const change = grantChange(role.actions, replacement);
  const save = useRoleMutation({
    run: (actions: string[]) => updateRole(role.publicId, { actions }),
    success: t("role.saved.grants"),
    onSuccess: (saved) => setSelected(new Set(saved.actions)),
    // A refused or unconfirmed replacement shows the confirmed grants again.
    onFailure: () => setSelected(new Set(role.actions)),
  });
  const unchanged = change.added === 0 && change.removed === 0;

  return (
    <>
      <RoleRestriction availability={grant} />
      <GrantPicker
        grantable={grantable}
        selected={selected}
        disabled={grant.state === "disabled" || save.isPending}
        onChange={setSelected}
      />
      {grant.state === "enabled" && (
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[var(--color-border)] pt-4">
          <p className="me-auto text-xs text-[var(--color-text-muted)]">
            {t("role.pendingChange", { ...change })}
          </p>
          <Button
            intent="cta"
            disabled={unchanged || replacement.length === 0 || save.isPending}
            isLoading={save.isPending}
            onClick={() => setConfirming(true)}
          >
            {t("role.saveGrants")}
          </Button>
        </div>
      )}
      <RoleOutcome feedback={save.feedback} />
      <ConfirmDialog
        open={confirming}
        tone="destructive"
        title={t("role.grantsConfirm.title", { role: role.name })}
        description={t("role.grantsConfirm.description", { ...change, role: role.name })}
        confirmLabel={t("role.saveGrants")}
        cancelLabel={t("state.cancel")}
        isLoading={save.isPending}
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          save.mutate(replacement, () => setConfirming(false));
        }}
      />
    </>
  );
}
