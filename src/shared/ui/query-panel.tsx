import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ContractViolation } from "../public-api";
import { Button } from "./button";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Skeleton } from "./skeleton";

interface Props {
  title: string;
  pending?: boolean;
  error?: unknown;
  retry?: () => void;
  children: ReactNode;
}
/** Bounded read states shared by CRM and review panels. Raw server failures are never rendered. */
export function QueryPanel({ title, pending, error, retry, children }: Props) {
  const { t } = useTranslation("common");
  let content = children;
  if (pending)
    content = (
      <output aria-label={t("loading")} className="block space-y-3">
        {[0, 1, 2].map((row) => (
          <Skeleton key={row} className="h-6 w-full" />
        ))}
      </output>
    );
  else if (error) {
    // A neutral panel needs only a bounded HTTP status, never an authenticated
    // transport import (the presentation chunk is also used by public pages).
    const refused =
      error instanceof Error &&
      "status" in error &&
      typeof error.status === "number" &&
      [403, 404].includes(error.status);
    const contract = error instanceof ContractViolation;
    content = (
      <div role="alert" className="space-y-3">
        <p>{t(contract ? "query.contract" : refused ? "query.refused" : "query.failed")}</p>
        {!contract && !refused && retry && (
          <Button intent="action" onClick={retry}>
            {t("retry")}
          </Button>
        )}
      </div>
    );
  }
  return (
    <Card as="section">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4">{content}</CardContent>
    </Card>
  );
}
