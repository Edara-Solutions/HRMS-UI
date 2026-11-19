import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  platformCompanyOperations as operations,
  platformQueryKey,
  sendPlatformCommand,
  usePlatformAccess,
  usePlatformMutationRecovery,
} from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
/** Deleted records are absent from reads. Recovery requires a known public ID, without inferring deletion from CLOSED. */
export function RestoreCompany() {
  const { t } = useTranslation("platform-companies");
  const access = usePlatformAccess();
  const recover = usePlatformMutationRecovery();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [publicId, setPublicId] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [feedback, setFeedback] = useState<string>();
  const locked = useRef(false);
  const available = access.availability(operations.restore.key);
  const reconcile = () =>
    queryClient.invalidateQueries({
      queryKey: platformQueryKey(access.user?.publicId ?? "", operations.companies),
    });
  const mutation = useMutation({
    retry: false,
    mutationFn: async () => {
      if (access.availability(operations.restore.key).state !== "enabled")
        throw new Error("Authority changed");
      await sendPlatformCommand(operations.restore, { params: { publicId }, body: {} });
    },
    onSuccess: async () => {
      setFeedback(t("done"));
      await navigate({ to: "/platform/companies/$publicId", params: { publicId } });
    },
    onError: async (error) => {
      const outcome = await recover(error);
      setFeedback(t(`outcome.${outcome.kind}`));
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: platformQueryKey(access.user?.publicId ?? "", operations.companies),
      });
      locked.current = false;
      setConfirming(false);
    },
  });
  if (available.state === "hidden") return null;
  return (
    <Card as="section">
      <CardContent className="space-y-3 p-4">
        <h2 className="font-semibold">{t("restore.title")}</h2>
        <p className="text-sm text-[var(--color-text-muted)]">{t("restore.description")}</p>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const result = operations.restore.requestSchema.shape.params.safeParse({ publicId });
            if (result.success) {
              setFeedback(undefined);
              setConfirming(true);
            } else setFeedback(t("invalid"));
          }}
        >
          <Label htmlFor="restore-public-id">{t("restore.publicId")}</Label>
          <Input
            id="restore-public-id"
            value={publicId}
            dir="ltr"
            disabled={mutation.isPending || confirming}
            onChange={(event) => setPublicId(event.target.value)}
          />
          {feedback && <p role={mutation.isError ? "alert" : "status"}>{feedback}</p>}
          <Button
            intent="action"
            type="submit"
            disabled={available.state !== "enabled" || mutation.isPending || mutation.isError}
          >
            {t("action.restore")}
          </Button>
          {mutation.isError && (
            <Button
              intent="action"
              onClick={async () => {
                await reconcile();
                mutation.reset();
              }}
            >
              {t("reconcile")}
            </Button>
          )}
        </form>
        {confirming && (
          <ConfirmDialog
            open
            title={t("confirm.title", { action: t("action.restore"), name: publicId })}
            description={t("confirm.restore", { name: publicId })}
            confirmLabel={t("action.restore")}
            cancelLabel={t("cancel")}
            tone="consequential"
            isLoading={mutation.isPending}
            onClose={() => {
              if (!locked.current) setConfirming(false);
            }}
            onConfirm={() => {
              if (!locked.current) {
                locked.current = true;
                mutation.mutate();
              }
            }}
          />
        )}{" "}
      </CardContent>
    </Card>
  );
}
