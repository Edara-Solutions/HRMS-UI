import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ContractViolation,
  OperationRefusal,
  platformCompanyOperations as operations,
  platformQueryKey,
  requestPlatformOperation,
  usePlatformAccess,
  usePlatformMutationRecovery,
} from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { PageHeader } from "@/shared/ui/page-header";
import { registryCursorQuery } from "../api/subscriptions";
export function PlatformSubscriptionsPage() {
  const { t } = useTranslation("platform-companies");
  const access = usePlatformAccess();
  const recover = usePlatformMutationRecovery();
  const queryClient = useQueryClient();
  const [cursor, setCursor] = useState<string>();
  const [confirming, setConfirming] = useState(false);
  const [feedback, setFeedback] = useState<string>();
  const locked = useRef(false);
  const userPublicId = access.user?.publicId ?? "";
  const { data, error, isPending, isFetching, isError, refetch } = useQuery({
    ...registryCursorQuery(userPublicId, cursor),
    enabled: access.availability(operations.cursor.key).state === "enabled",
  });
  const expire = access.availability(operations.expireTrials.key);
  const reconcile = () =>
    Promise.all(
      [
        operations.cursor,
        operations.companies,
        operations.subscription,
        operations.activation,
        operations.commercial,
      ].map((operation) =>
        queryClient.invalidateQueries({ queryKey: platformQueryKey(userPublicId, operation) }),
      ),
    );
  const mutation = useMutation({
    retry: false,
    mutationFn: () => {
      if (access.availability(operations.expireTrials.key).state !== "enabled")
        throw new Error("Authority changed");
      return requestPlatformOperation(operations.expireTrials, {});
    },
    onSuccess: (result) => setFeedback(t("expiry.done", { count: result.expiredCount })),
    // Every failed run is indeterminate, even a validation or contract error: previous transactions may have committed.
    onError: async (error) => {
      await recover(error);
      setFeedback(t("expiry.indeterminate"));
    },
    onSettled: async () => {
      await Promise.all(
        [
          operations.cursor,
          operations.companies,
          operations.subscription,
          operations.activation,
          operations.commercial,
        ].map((operation) =>
          queryClient.invalidateQueries({ queryKey: platformQueryKey(userPublicId, operation) }),
        ),
      );
      locked.current = false;
      setConfirming(false);
    },
  });
  if (!access.user) return null;
  if (error instanceof OperationRefusal && [403, 404].includes(error.status)) throw error;
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title={t("subscriptions.title")} description={t("subscriptions.description")} />
      {expire.state !== "hidden" && (
        <Card as="section">
          <CardContent className="space-y-4 p-4">
            <h2 className="font-semibold">{t("expiry.title")}</h2>
            <p className="text-sm">{t("expiry.description")}</p>
            {feedback && <p role={mutation.isError ? "alert" : "status"}>{feedback}</p>}
            <Button
              intent="destructive-trigger"
              disabled={expire.state !== "enabled" || mutation.isPending || mutation.isError}
              onClick={() => setConfirming(true)}
            >
              {t("expiry.action")}
            </Button>
            {mutation.isError && (
              <Button
                intent="action"
                disabled={mutation.isPending}
                onClick={async () => {
                  await reconcile();
                  mutation.reset();
                }}
              >
                {t("reconcile")}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
      {access.availability(operations.cursor.key).state !== "hidden" && (
        <Card>
          <CardContent className="space-y-4 p-4">
            <h2 className="font-semibold">{t("subscriptions.companies")}</h2>
            {isPending ? (
              <output>{t("loading")}</output>
            ) : isError ? (
              <div role="alert">
                {t(error instanceof ContractViolation ? "contract" : "loadFailed")}
                {!(error instanceof ContractViolation) && (
                  <Button intent="action" onClick={() => void refetch()}>
                    {t("retry")}
                  </Button>
                )}
              </div>
            ) : data.companies.length === 0 ? (
              <p>{t("empty")}</p>
            ) : (
              <ul className="space-y-3">
                {data.companies.map((company) => (
                  <li key={company.publicId}>
                    <Link
                      to="/platform/companies/$publicId"
                      params={{ publicId: company.publicId }}
                      className="underline"
                    >
                      {company.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-3">
              <Button
                intent="action"
                disabled={!cursor || isFetching}
                onClick={() => setCursor(undefined)}
              >
                {t("firstPage")}
              </Button>
              <Button
                intent="action"
                disabled={!data?.meta.hasMore || isFetching}
                onClick={() => setCursor(data?.meta.nextCursor ?? undefined)}
              >
                {t("next")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      {confirming && (
        <ConfirmDialog
          open
          title={t("expiry.title")}
          description={t("expiry.confirm")}
          confirmLabel={t("expiry.action")}
          cancelLabel={t("cancel")}
          typedConfirmation={{ label: t("expiry.typed"), target: "EXPIRE" }}
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
      )}
    </div>
  );
}
