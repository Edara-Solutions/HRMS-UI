import { CircleHelp } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/shared/lib/cn";
import { shortcutLabel } from "../model/shortcut";

const shortcuts = [
  { keys: () => shortcutLabel(), label: "help.open" },
  { keys: () => "↑ ↓", label: "help.move" },
  { keys: () => "Enter", label: "help.go" },
  { keys: () => "Esc", label: "help.close" },
] as const;

export function HelpMenu() {
  const { t } = useTranslation("command-palette", { useSuspense: false });
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={t("help.label")}
        aria-expanded={open}
        aria-controls={panelId}
        className={cn(
          "flex size-9 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-text-muted)] transition-colors duration-[var(--motion-fast)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]",
          open && "bg-[var(--color-surface-2)] text-[var(--color-text)]",
        )}
      >
        <CircleHelp size={17} />
      </button>
      {open && (
        <section
          id={panelId}
          aria-label={t("help.title")}
          className="popover-panel absolute end-0 top-full z-50 mt-2 w-72 origin-top-right rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-md)] rtl:origin-top-left"
        >
          <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-faint)]">
            {t("help.title")}
          </p>
          <dl className="flex flex-col gap-1">
            {shortcuts.map((shortcut) => (
              <div
                key={shortcut.label}
                className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] px-1 py-1.5 text-[13px]"
              >
                <dt className="text-[var(--color-text-muted)]">{t(shortcut.label)}</dt>
                <dd>
                  <kbd className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-1.5 font-sans text-[11px] leading-5 text-[var(--color-text)]">
                    {shortcut.keys()}
                  </kbd>
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}
