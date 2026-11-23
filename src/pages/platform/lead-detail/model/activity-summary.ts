import type { TFunction } from "i18next";
import type { z } from "zod";
import { platformLeadOperations as operations } from "@/shared/api";

type Activity = z.output<(typeof operations.activities.responses)[200]>["items"][number];
const leadFields = operations.lead.responses[200].shape.lead.shape;

const sourceEvents = [
  ["Lead created from source=", "created"],
  ["Duplicate lead submission detected; attempts incremented. Source=", "attempt"],
  ["Lead rejoined after previous LOST status; attempts incremented. Source=", "rejoined"],
] as const;

const systemEvents = [
  ["Lead unarchived after a new matching attempt.", "unarchivedAfterAttempt"],
  ["Lead archived.", "archived"],
  ["Lead unarchived.", "unarchived"],
  ["Owner changed: ", "ownerChanged"],
  ["Lead conversion requested with plan ", "conversionRequested"],
  ["Lead conversion request rejected: ", "conversionRejected"],
  ["Lead converted to onboarding company ", "converted"],
  ["Owner onboarding invitation reissued by Platform operator ", "invitationReissued"],
] as const;

export function isAutomatedActivity(type: Activity["type"]) {
  return type === "SYSTEM_EVENT" || type === "FORM_SUBMISSION";
}

export function summarizeActivity(activity: Activity, t: TFunction<"platform-leads">) {
  const typeLabel = t(`enum.${activity.type}`);
  if (!isAutomatedActivity(activity.type)) {
    return { title: typeLabel, detail: activity.note.trim(), manual: true };
  }

  const transition = /^Status changed: ([A-Z_]+) -> ([A-Z_]+)(?: \(Reason: ([A-Z_]+)\))?$/.exec(
    activity.note,
  );
  if (transition) {
    const from = leadFields.status.safeParse(transition[1]);
    const to = leadFields.status.safeParse(transition[2]);
    const reason = leadFields.lostReason.safeParse(transition[3]);
    if (from.success && to.success) {
      const change = { from: t(`enum.${from.data}`), to: t(`enum.${to.data}`) };
      return {
        title: t("activity.event.statusChanged"),
        detail:
          reason.success && reason.data
            ? t("activity.transitionWithReason", { ...change, reason: t(`enum.${reason.data}`) })
            : t("activity.transition", change),
        manual: false,
      };
    }
  }

  const sourceEvent = sourceEvents.find(([prefix]) => activity.note.startsWith(prefix));
  if (sourceEvent) {
    const [prefix, event] = sourceEvent;
    const source = leadFields.source.safeParse(activity.note.slice(prefix.length));
    return {
      title: t(`activity.event.${event}`),
      detail: source.success
        ? t("activity.event.source", { source: t(`enum.${source.data}`) })
        : "",
      manual: false,
    };
  }

  const event = systemEvents.find(([prefix]) => activity.note.startsWith(prefix));
  return { title: event ? t(`activity.event.${event[1]}`) : typeLabel, detail: "", manual: false };
}
