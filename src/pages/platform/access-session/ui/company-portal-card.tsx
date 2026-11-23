import { useTranslation } from "react-i18next";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import type { AccessSessionWorkspace } from "../model/use-access-session-workspace";

interface CompanyPortalCardProps {
  workspace: AccessSessionWorkspace;
}

export function CompanyPortalCard({ workspace }: CompanyPortalCardProps) {
  const { t } = useTranslation("platform-access-session");
  const { enter } = workspace;

  const openPortal = () => {
    const tab = window.open("", "_blank");
    if (tab) tab.opener = null;
    enter.mutate(undefined, {
      onSuccess: () => {
        if (tab) tab.location.assign("/company");
        else window.open("/company", "_blank", "noopener");
      },
      onError: () => tab?.close(),
    });
  };

  return (
    <Card as="section" aria-labelledby="company-portal-title">
      <CardContent className="flex flex-wrap items-center gap-4 p-5">
        <div className="me-auto min-w-0 space-y-1">
          <h2 id="company-portal-title" className="text-base font-semibold">
            {t("portal.title")}
          </h2>
          <p className="text-sm text-[var(--color-text-muted)]">{t("portal.description")}</p>
          {enter.isError && (
            <p role="alert" className="text-sm text-[var(--color-danger)]">
              {t("portal.failed")}
            </p>
          )}
        </div>
        <Button intent="cta" disabled={enter.isPending} onClick={openPortal}>
          {t("portal.open")}
        </Button>
      </CardContent>
    </Card>
  );
}
