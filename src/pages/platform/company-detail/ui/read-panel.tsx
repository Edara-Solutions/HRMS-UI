import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ContractViolation, OperationRefusal } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";

interface Props {
  title: string;
  pending: boolean;
  error: unknown;
  retry: () => void;
  children: ReactNode;
}
export function ReadPanel({ title, pending, error, retry, children }: Props) {
  const { t } = useTranslation("platform-companies");
  const refusal = error instanceof OperationRefusal && [403, 404].includes(error.status);
  return (
    <Card as="section">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4 text-sm">
        {pending ? (
          <output aria-label={t("loading")} className="block space-y-4">
            {[0, 1, 2, 3].map((row) => (
              <Skeleton key={row} className="h-8 w-full" />
            ))}
          </output>
        ) : error ? (
          <div role="alert">
            <p>
              {t(
                error instanceof ContractViolation
                  ? "contract"
                  : refusal
                    ? "outcome.refused"
                    : "loadFailed",
              )}
            </p>
            {!(error instanceof ContractViolation) && !refusal && (
              <Button intent="action" onClick={retry}>
                {t("retry")}
              </Button>
            )}
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
