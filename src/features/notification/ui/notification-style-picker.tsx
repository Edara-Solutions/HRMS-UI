import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { type KeyboardEvent, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { type NotificationListStyle, usePreferencesStore } from "@/shared/config";
import { getDirection } from "@/shared/i18n";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { nextRovingChoice } from "../lib/roving-choice";
import { NOTIFICATION_LIST_STYLES } from "../model/notification-list-style";
import { NotificationStylePreview } from "./notification-style-preview";

interface NotificationStylePickerProps {
  onBack: () => void;
}

/** The style choice, shown in place of the feed inside whichever shape is open. */
export function NotificationStylePicker({ onBack }: NotificationStylePickerProps) {
  const { t } = useTranslation("notification", { useSuspense: false });
  const locale = usePreferencesStore((preferences) => preferences.locale);
  const selected = usePreferencesStore((preferences) => preferences.notificationListStyle);
  const setStyle = usePreferencesStore((preferences) => preferences.setNotificationListStyle);
  const optionsRef = useRef<HTMLDivElement>(null);

  const direction = getDirection(locale);
  const BackIcon = direction === "rtl" ? ArrowRight : ArrowLeft;

  // The picker is remounted by the very choice it applies — the shape around it changes — so
  // it takes focus back to the chosen option, and arrow keys keep walking where they left off.
  useEffect(() => {
    focusOption(optionsRef.current, selected);
  }, [selected]);

  // Arrow keys walk the group, as they do in any radio group; the buttons themselves carry a
  // roving tab stop so Tab leaves the group rather than stepping through it.
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const nextStyle = nextRovingChoice(event.key, direction, NOTIFICATION_LIST_STYLES, selected);
    if (!nextStyle) return;

    event.preventDefault();
    setStyle(nextStyle);
    focusOption(optionsRef.current, nextStyle);
  }

  return (
    <>
      <header className="flex shrink-0 items-center gap-2 border-b border-[var(--color-border)] px-3 py-2.5">
        <Button
          intent="toggle"
          size="iconXs"
          title={t("picker.back")}
          aria-label={t("picker.back")}
          onClick={onBack}
          leadingIcon={<BackIcon size={14} />}
          iconOnly
        />
        <h2 className="text-sm font-semibold tracking-tight text-[var(--color-text)]">
          {t("picker.title")}
        </h2>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">{t("picker.hint")}</p>
        <div
          ref={optionsRef}
          role="radiogroup"
          aria-label={t("picker.title")}
          onKeyDown={onKeyDown}
          className="mt-3 flex flex-col gap-2"
        >
          {NOTIFICATION_LIST_STYLES.map((style) => (
            <StyleOption
              key={style}
              style={style}
              name={t(`style.${style}.name`)}
              hint={t(`style.${style}.hint`)}
              selected={style === selected}
              onSelect={() => setStyle(style)}
            />
          ))}
        </div>
      </div>
    </>
  );
}

interface StyleOptionProps {
  style: NotificationListStyle;
  name: string;
  hint: string;
  selected: boolean;
  onSelect: () => void;
}

function StyleOption({ style, name, hint, selected, onSelect }: StyleOptionProps) {
  return (
    <button
      type="button"
      role="radio"
      data-style={style}
      aria-checked={selected}
      tabIndex={selected ? 0 : -1}
      onClick={onSelect}
      className={cn(
        "flex w-full cursor-pointer flex-col gap-2 rounded-[var(--radius-md)] border p-2.5 text-start transition-colors duration-[var(--motion-fast)] ease-[var(--motion-easing)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]",
        selected
          ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
          : "border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)]",
      )}
    >
      <NotificationStylePreview style={style} />
      <span className="flex items-start gap-2">
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-medium text-[var(--color-text)]">{name}</span>
          <span className="mt-0.5 block text-xs leading-snug text-[var(--color-text-muted)]">
            {hint}
          </span>
        </span>
        {selected ? (
          <Check
            size={14}
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-[var(--color-primary)]"
          />
        ) : null}
      </span>
    </button>
  );
}

function focusOption(options: HTMLDivElement | null, style: NotificationListStyle) {
  options?.querySelector<HTMLButtonElement>(`[data-style="${style}"]`)?.focus();
}
