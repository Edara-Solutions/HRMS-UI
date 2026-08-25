import type { TFunction } from "i18next";
import type { SupportedLocale } from "@/shared/i18n";
import {
  ANNOUNCEMENT_TYPE_KEY,
  announcementParamsSchema,
  NOTIFICATION_CATALOG,
  type NotificationTypeEntry,
} from "./notification-catalog";

export interface NotificationCopy {
  readonly title: string;
  readonly body: string;
}

interface CopySource {
  readonly typeKey: string;
  readonly params: Record<string, unknown>;
}

/** `null` when the type key is not in the mirror — an unknown row is skipped, never guessed at. */
export function resolveNotificationCopy(
  source: CopySource,
  t: TFunction,
  locale: SupportedLocale,
): NotificationCopy | null {
  const entry = NOTIFICATION_CATALOG.get(source.typeKey);

  if (!entry) {
    return null;
  }

  if (source.typeKey === ANNOUNCEMENT_TYPE_KEY) {
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
