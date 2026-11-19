import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ActionAvailability } from "@/shared/auth";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { deleteRole } from "../api/roles";
import type { PlatformRole } from "../model/grants";
import { useRoleMutation } from "../model/use-role-mutation";
import { RoleOutcome, RoleRestriction } from "./role-feedback";

interface RoleDeleteCardProps {
  role: PlatformRole;
  remove: ActionAvailability;
}

export function RoleDeleteCard({ role, remove }: RoleDeleteCardProps) {
  const { t } = useTranslation("platform-people");
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const removal = useRoleMutation({
    run: () => deleteRole(role.publicId),
    success: t("role.deleted", { role: role.name }),
    onSuccess: () => navigate({ to: "/platform/roles" }),
  });

  return (
    <Card as="section" aria-labelledby="platform-role-delete">
      <CardHeader>
        <CardTitle id="platform-role-delete">{t("role.deleteTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 p-[18px] text-sm">
        <p className="text-[var(--color-text-muted)]">{t("role.deleteHint")}</p>
        <RoleRestriction availability={remove} />
        <Button
          intent="destructive-trigger"
          size="sm"
          disabled={remove.state === "disabled" || removal.isPending}
          onClick={() => setConfirming(true)}
        >
          {t("role.delete")}
        </Button>
        <RoleOutcome feedback={removal.feedback} />
      </CardContent>
      <ConfirmDialog
        open={confirming}
        tone="destructive"
        title={t("role.deleteConfirm.title", { role: role.name })}
        description={t("role.deleteConfirm.description", { role: role.name })}
        confirmLabel={t("role.delete")}
        cancelLabel={t("state.cancel")}
        isLoading={removal.isPending}
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          removal.mutate(undefined, () => setConfirming(false));
        }}
      />
    </Card>
  );
}
