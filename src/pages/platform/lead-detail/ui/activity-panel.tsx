import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, History, MessageSquareText, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { platformLeadOperations as operations, usePlatformAccess } from "@/shared/api";
import { usePreferencesStore } from "@/shared/config";
import { formatFullInstant, formatInstant } from "@/shared/lib/format-instant";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { QueryPanel } from "@/shared/ui/query-panel";
import type { crmQueries } from "../api/crm";
import { summarizeActivity } from "../model/activity-summary";
import type { useLeadCommands } from "../model/use-lead-commands";
import { ActivityForm } from "./activity-form";

interface Props {
  publicId: string;
  leadName: string;
  page: number;
  queries: ReturnType<typeof crmQueries>;
  restricted: boolean;
  commands: ReturnType<typeof useLeadCommands>;
}

export function ActivityPanel({ publicId, leadName, page, queries, restricted, commands }: Props) {
  const { t } = useTranslation("platform-leads");
  const locale = usePreferencesStore((state) => state.locale);
  const access = usePlatformAccess();
  const navigate = useNavigate();
  const { data, error, isPending, isFetching, refetch } = useQuery({
    ...queries.activities,
    enabled: access.availability(operations.activities.key).state === "enabled",
  });
  const add = access.availability(operations.addActivity.key);
  const remove = access.availability(operations.removeActivity.key);
  const disabled = restricted || isFetching || !!error;
  const items = data?.items ?? [];
  const totalPages = Math.max(1, data?.meta.totalPages ?? 1);
  const number = new Intl.NumberFormat(locale);
  const changePage = (activityPage: number) =>
    void navigate({
      to: "/platform/leads/$publicId",
      params: { publicId },
      search: { activityPage },
    });

  return (
    <div className="flex flex-row-reverse flex-wrap items-start gap-4">
      {add.state !== "hidden" && (
        <div className="min-w-0 flex-[1_1_19rem]">
          <ActivityForm
            key={commands.activityFormVersion}
            disabled={disabled || add.state !== "enabled"}
            onSubmit={(body) => commands.request({ kind: "addActivity", name: leadName, body })}
          />
        </div>
      )}
      <div className="min-w-0 flex-[2_1_26rem]">
        <QueryPanel
          title={t("activity.title")}
          pending={isPending}
          error={error}
          retry={() => void refetch()}
        >
          {data &&
            (items.length > 0 ? (
              <>
                <ol className="divide-y divide-[var(--color-border)]">
                  {items.map((item) => {
                    const { title, detail, manual } = summarizeActivity(item, t);
                    const Icon = manual ? MessageSquareText : History;
                    const timestamp = formatInstant(item.createdAt, locale);
                    return (
                      <li
                        key={item.publicId}
                        className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <span
                          aria-hidden="true"
                          className={
                            manual
                              ? "grid size-8 shrink-0 place-items-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                              : "grid size-8 shrink-0 place-items-center rounded-full bg-[var(--color-surface-2)] text-[var(--color-text-muted)]"
                          }
                        >
                          <Icon size={15} />
                        </span>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                            <p className="text-sm font-semibold">{title}</p>
                            <time
                              dateTime={item.createdAt}
                              title={formatFullInstant(item.createdAt, locale)}
                              className="text-xs tabular-nums text-[var(--color-text-muted)]"
                            >
                              {timestamp}
                            </time>
                          </div>
                          {detail && (
                            <p
                              dir="auto"
                              className="whitespace-pre-wrap text-sm leading-relaxed [overflow-wrap:anywhere]"
                            >
                              {detail}
                            </p>
                          )}
                        </div>
                        {remove.state !== "hidden" && (
                          <Button
                            intent="destructive-trigger"
                            size="iconSm"
                            aria-label={t("activity.removeLabel", { title, timestamp })}
                            title={t("action.removeActivity")}
                            disabled={disabled || remove.state !== "enabled"}
                            onClick={() =>
                              commands.request({
                                kind: "removeActivity",
                                targetPublicId: item.publicId,
                                name: title,
                              })
                            }
                          >
                            <Trash2 size={15} aria-hidden="true" />
                          </Button>
                        )}
                      </li>
                    );
                  })}
                </ol>
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-[var(--color-border)] pt-3 text-xs text-[var(--color-text-muted)]">
                  <span>
                    {t("activity.range", {
                      first: number.format((page - 1) * data.meta.pageSize + 1),
                      last: number.format((page - 1) * data.meta.pageSize + items.length),
                      total: number.format(data.meta.totalItems),
                    })}
                  </span>
                  {totalPages > 1 && (
                    <nav aria-label={t("activity.pagination")} className="flex items-center gap-2">
                      <Button
                        variant="nav"
                        size="iconSm"
                        aria-label={t("previous")}
                        disabled={page <= 1 || isFetching}
                        onClick={() => changePage(page - 1)}
                      >
                        <ChevronLeft size={15} aria-hidden="true" className="rtl:rotate-180" />
                      </Button>
                      <span className="tabular-nums">
                        {t("leads.pageOf", {
                          current: number.format(page),
                          total: number.format(totalPages),
                        })}
                      </span>
                      <Button
                        variant="nav"
                        size="iconSm"
                        aria-label={t("next")}
                        disabled={page >= totalPages || isFetching}
                        onClick={() => changePage(page + 1)}
                      >
                        <ChevronRight size={15} aria-hidden="true" className="rtl:rotate-180" />
                      </Button>
                    </nav>
                  )}
                </div>
              </>
            ) : (
              <EmptyState
                icon={History}
                title={t(page > 1 ? "activity.emptyPage" : "activity.empty")}
                description={page === 1 ? t("activity.emptyDescription") : undefined}
                action={
                  page > 1 && (
                    <Button intent="navigation" onClick={() => changePage(1)}>
                      {t("activity.latest")}
                    </Button>
                  )
                }
              />
            ))}
        </QueryPanel>
      </div>
    </div>
  );
}
