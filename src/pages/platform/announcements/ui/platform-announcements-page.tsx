import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { platformCommunicationsOperations as operations, usePlatformAccess } from "@/shared/api";
import { RouteAccessRefusal } from "@/shared/auth";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { PageHeader } from "@/shared/ui/page-header";
import { QueryPanel } from "@/shared/ui/query-panel";
import { announcementsQuery } from "../api/announcements";
import { AnnouncementComposer } from "./announcement-composer";

export function PlatformAnnouncementsPage() {
  const { t, i18n } = useTranslation("platform-announcements");
  const access = usePlatformAccess();
  const [composing, setComposing] = useState(false);
  const { data, error, isPending, refetch } = useQuery({
    ...announcementsQuery(access.user?.publicId ?? ""),
    enabled: access.availability(operations.announcements.key).state === "enabled",
    retry: false,
  });
  if (!access.user) return null;
  if (access.availability(operations.announcements.key).state === "hidden")
    throw new RouteAccessRefusal("platform");
  const create = access.availability(operations.createAnnouncement.key);
  const locale = i18n.language === "ar" ? "ar" : "en";
  return (
    <div className="mx-auto min-w-0 max-w-6xl space-y-6 [overflow-wrap:anywhere] [&_button]:max-w-full [&_button]:whitespace-normal [&_button]:h-auto [&_button]:min-h-9">
      <PageHeader
        title={t("title")}
        description={t("intro")}
        action={
          create.state !== "hidden" && (
            <Button
              intent="cta"
              disabled={isPending || !!error || create.state !== "enabled"}
              onClick={() => setComposing(true)}
            >
              {t("compose")}
            </Button>
          )
        }
      />
      <QueryPanel title={t("list")} pending={isPending} error={error} retry={() => void refetch()}>
        {!data?.items.length && <p>{t("empty")}</p>}
        <ul className="divide-y divide-[var(--color-border)]">
          {data?.items.map((item) => (
            <li key={item.publicId} className="space-y-3 py-4">
              <h3 className="font-semibold" dir={locale === "ar" ? "rtl" : "ltr"}>
                {item.message[locale].title}
              </h3>
              <p className="whitespace-pre-wrap" dir={locale === "ar" ? "rtl" : "ltr"}>
                {item.message[locale].body}
              </p>
              <Badge
                variant={
                  item.status === "FAILED"
                    ? "danger"
                    : item.status === "PARTIAL"
                      ? "warning"
                      : "default"
                }
              >
                {t(`status.${item.status}`)}
              </Badge>
              <dl className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    "dueAt",
                    "scheduledFor",
                    "dispatchFinishedAt",
                    "companiesReached",
                    "recipientsReached",
                    "pendingUnits",
                    "failedUnits",
                    "skippedUnits",
                  ] as const
                ).map((key) => (
                  <div key={key}>
                    <dt className="text-sm text-[var(--color-text-muted)]">{t(key)}</dt>
                    <dd>{item[key] ?? t("notFinished")}</dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      </QueryPanel>
      {composing && <AnnouncementComposer close={() => setComposing(false)} />}
    </div>
  );
}
