import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { accessSessionOperations, classifyMutationFailure, usePlatformAccess } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { EnumSelect } from "@/shared/ui/enum-select";
import { Label } from "@/shared/ui/label";
import {
  type AccessSessionReason,
  accessSessionReasons,
  openAccessSession,
} from "../api/company-detail";

interface SupportSessionCardProps {
  companyPublicId: string;
  companyName: string;
  blocked: boolean;
}

export function SupportSessionCard({
  companyPublicId,
  companyName,
  blocked,
}: SupportSessionCardProps) {
  const { t } = useTranslation("platform-companies");
  const access = usePlatformAccess();
  const navigate = useNavigate();
  const reasonId = useId();
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState<AccessSessionReason | undefined>();
  const [failure, setFailure] = useState<string | null>(null);
  const open = useMutation({
    mutationFn: (selected: AccessSessionReason) => openAccessSession(companyPublicId, selected),
    retry: false,
  });
  const availability = access.availability(accessSessionOperations.open.key);
  if (availability.state === "hidden") return null;

  function confirm() {
    if (!reason || open.isPending) return;
    setFailure(null);
    open.mutate(reason, {
      onSuccess: (session) =>
        void navigate({
          to: "/platform/access-sessions/$sessionPublicId",
          params: { sessionPublicId: session.publicId },
        }),
      onError: (error) => {
        setConfirming(false);
        setFailure(`support.failure.${classifyMutationFailure(error).kind}`);
      },
    });
  }

  return (
    <Card as="section" aria-labelledby="support-session-title">
      <CardHeader>
        <CardTitle id="support-session-title">{t("support.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        <p className="text-sm text-[var(--color-text-muted)]">{t("support.description")}</p>
        <Button
          intent="action"
          disabled={blocked || open.isPending || availability.state !== "enabled"}
          onClick={() => {
            setReason(undefined);
            setConfirming(true);
          }}
        >
          {t("support.open")}
        </Button>
        {failure && (
          <p role="alert" className="text-sm">
            {t(failure)}
          </p>
        )}
      </CardContent>
      <ConfirmDialog
        open={confirming}
        tone="consequential"
        title={t("support.confirmTitle", { name: companyName })}
        description={t("support.confirmDescription")}
        confirmLabel={t("support.confirm")}
        cancelLabel={t("support.cancel")}
        isLoading={open.isPending}
        confirmDisabled={!reason}
        onClose={() => setConfirming(false)}
        onConfirm={confirm}
      >
        <div className="mt-4 space-y-1.5">
          <Label htmlFor={reasonId}>{t("support.reason")}</Label>
          <EnumSelect
            id={reasonId}
            value={reason}
            placeholder={t("support.reasonPlaceholder")}
            options={accessSessionReasons.map((value) => ({
              value,
              label: t(`support.reasons.${value}`),
            }))}
            onValueChange={setReason}
          />
        </div>
      </ConfirmDialog>
    </Card>
  );
}
