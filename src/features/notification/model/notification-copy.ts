import type { TFunction } from "i18next";
import type { SupportedLocale } from "@/shared/i18n";
import {
  ANNOUNCEMENT_TYPE_KEYS,
  announcementParamsSchema,
  knownNotificationEntry,
  NEUTRAL_NOTIFICATION,
  type NotificationTypeEntry,
} from "./notification-catalog";
import type { NotificationTier } from "./notification-tier";

export interface NotificationCopy {
  readonly title: string;
  readonly body: string;
}

interface CopySource {
  readonly typeKey: string;
  readonly typeVersion?: number;
  readonly params: Record<string, unknown>;
}

/** Every row renders: a type or version the audience mirror does not know gets neutral copy. */
export function resolveNotificationCopy(
  tier: NotificationTier | null,
  source: CopySource,
  t: TFunction,
  locale: SupportedLocale,
): NotificationCopy {
  const entry = knownNotificationEntry(tier, source);

  if (!entry) {
    return neutralCopy(t);
  }

  if (ANNOUNCEMENT_TYPE_KEYS.has(source.typeKey)) {
    const authored = announcementParamsSchema.safeParse(source.params);

    if (authored.success) {
      const { message } = authored.data;
      return message[locale] ?? message.en;
    }
  }

  const values = localizeEnumParams(entry, readParams(entry, source.params), t);

  return {
    title: t(`${entry.copyKey}.title`, values),
    body: t(`${entry.copyKey}.body`, values),
  };
}

function neutralCopy(t: TFunction): NotificationCopy {
  return {
    title: t(`${NEUTRAL_NOTIFICATION.copyKey}.title`),
    body: t(`${NEUTRAL_NOTIFICATION.copyKey}.body`),
  };
}

/** A param shape we cannot read must not take the panel down — the copy renders uninterpolated. */
function readParams(entry: NotificationTypeEntry, raw: Record<string, unknown>) {
  const parsed = entry.paramsSchema.safeParse(raw);
  return parsed.success ? parsed.data : {};
}

function localizeEnumParams(
  entry: NotificationTypeEntry,
  params: Record<string, unknown>,
  t: TFunction,
): Record<string, unknown> {
  if (!entry.enumParams) {
    return params;
  }

  const localized: Record<string, unknown> = { ...params };

  for (const name of entry.enumParams) {
    const value = localized[name];

    if (typeof value === "string") {
      localized[name] = t(`values.${name}.${value}`, { defaultValue: value });
    }
  }

  return localized;
}
