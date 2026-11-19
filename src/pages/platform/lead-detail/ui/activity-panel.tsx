import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { platformLeadOperations as operations, usePlatformAccess } from "@/shared/api";
import { usePreferencesStore } from "@/shared/config";
import { formatInstant } from "@/shared/lib/format-instant";
import { Button } from "@/shared/ui/button";
import { QueryPanel } from "@/shared/ui/query-panel";
import { SchemaForm } from "@/shared/ui/schema-form";
import type { crmQueries } from "../api/crm";
import type { useLeadCommands } from "../model/use-lead-commands";

interface Props {
  publicId: string;
  page: number;
  queries: ReturnType<typeof crmQueries>;
  restricted: boolean;
  commands: ReturnType<typeof useLeadCommands>;
}
export function ActivityPanel({ publicId, page, queries, restricted, commands }: Props) {
  const { t } = useTranslation("platform-leads");
  const access = usePlatformAccess();
  const locale = usePreferencesStore((state) => state.locale);
  const navigate = useNavigate();
  const { data, error, isPending, isFetching, refetch } = useQuery({
    ...queries.activities,
    enabled: access.availability(operations.activities.key).state === "enabled",
  });
  const add = access.availability(operations.addActivity.key);
  const remove = access.availability(operations.removeActivity.key);
  return (
    <QueryPanel
      title={t("activity.title")}
      pending={isPending}
      error={error}
      retry={() => void refetch()}
    >
      {data && (
        <>
          {data.items.length ? (
            <ul className="space-y-4">
              {data.items.map((item) => (
                <li
                  key={item.publicId}
                  className="space-y-2 border-b border-[var(--color-border)] pb-3"
                >
                  <p>
                    {t(`enum.${item.type}`)} · {formatInstant(item.createdAt, locale)}
                  </p>
                  {!["SYSTEM_EVENT", "FORM_SUBMISSION"].includes(item.type) && (
                    <p className="whitespace-pre-wrap break-words">{item.note}</p>
                  )}
                  {remove.state !== "hidden" && (
                    <Button
                      intent="destructive-trigger"
                      disabled={restricted || isFetching || remove.state !== "enabled"}
                      onClick={() =>
                        commands.request({
                          kind: "removeActivity",
                          targetPublicId: item.publicId,
                          name: t(`enum.${item.type}`),
                        })
                      }
                    >
                      {t("action.removeActivity")}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p>{t("activity.empty")}</p>
          )}
          <nav aria-label={t("activity.pagination")} className="flex flex-wrap gap-3">
            <Button
              intent="action"
              disabled={page <= 1 || isFetching}
              onClick={() =>
                void navigate({
                  to: "/platform/leads/$publicId",
                  params: { publicId },
                  search: { activityPage: page - 1 },
                })
              }
            >
              {t("previous")}
            </Button>
            <Button
              intent="action"
              disabled={page >= data.meta.totalPages || isFetching}
              onClick={() =>
                void navigate({
                  to: "/platform/leads/$publicId",
                  params: { publicId },
                  search: { activityPage: page + 1 },
                })
              }
            >
              {t("next")}
            </Button>
          </nav>
        </>
      )}
      {add.state !== "hidden" && (
        <SchemaForm
          schema={operations.addActivity.requestSchema.shape.body}
          fields={[
            {
              name: "type",
              label: t("activity.type"),
              required: true,
              value: "NOTE",
              options: operations.addActivity.requestSchema.shape.body.shape.type.options.map(
                ({ value }) => ({ value, label: t(`enum.${value}`) }),
              ),
            },
            { name: "note", label: t("activity.note"), type: "textarea", required: true },
          ]}
          label={t("action.addActivity")}
          invalidLabel={t("invalid")}
          disabled={restricted || !!error || isFetching || add.state !== "enabled"}
          onSubmit={(body) =>
            commands.request({ kind: "addActivity", name: t("activity.title"), body })
          }
        />
      )}
    </QueryPanel>
  );
}
