import { useNavigate } from "@tanstack/react-router";
import { CornerDownLeft, Search } from "lucide-react";
import { type KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/shared/lib/cn";
import { Dialog, DialogTitle, useDialogIds } from "@/shared/ui/dialog";
import { type PaletteGroupState, usePaletteSearch } from "../api/use-palette-search";
import {
  MIN_QUERY_LENGTH,
  matchPages,
  type PaletteHit,
  type PaletteIdentity,
  type PalettePage,
  paletteSources,
} from "../model/palette-sources";
import { shortcutLabel } from "../model/shortcut";

interface CommandPaletteProps {
  identity: PaletteIdentity;
  pages: readonly PalettePage[];
}

export function CommandPalette({ identity, pages }: CommandPaletteProps) {
  const { t } = useTranslation("command-palette", { useSuspense: false });
  const [open, setOpen] = useState(false);
  const { titleId } = useDialogIds();

  useEffect(() => {
    function handleShortcut(event: globalThis.KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    }
    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("triggerLabel")}
        aria-haspopup="dialog"
        aria-keyshortcuts="Meta+K Control+K"
        className={cn(
          "flex h-9 w-9 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[13px] text-[var(--color-text-faint)]",
          "transition-[background-color,border-color,color] duration-[var(--motion-fast)] hover:border-[var(--color-border-strong,var(--color-border))] hover:text-[var(--color-text-muted)]",
          "sm:w-64 sm:justify-start sm:px-3",
        )}
      >
        <Search size={15} className="shrink-0" />
        <span className="hidden flex-1 text-start sm:inline">{t("trigger")}</span>
        <kbd className="hidden rounded-[var(--radius-sm)] border border-[var(--color-border)] px-1.5 font-sans text-[10.5px] leading-5 sm:inline">
          {shortcutLabel()}
        </kbd>
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        titleId={titleId}
        className="max-w-xl self-start p-0 sm:mt-[12vh]"
      >
        {open && (
          <PalettePanel
            identity={identity}
            pages={pages}
            titleId={titleId}
            onClose={() => setOpen(false)}
          />
        )}
      </Dialog>
    </>
  );
}

interface PalettePanelProps extends CommandPaletteProps {
  titleId: string;
  onClose: () => void;
}

interface FlatOption {
  group: string;
  hit: PaletteHit;
}

function PalettePanel({ identity, pages, titleId, onClose }: PalettePanelProps) {
  const { t } = useTranslation("command-palette", { useSuspense: false });
  const navigate = useNavigate();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [term, setTerm] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const sources = useMemo(() => paletteSources(identity), [identity]);
  const groups = usePaletteSearch(sources, term, true);
  const pageHits = useMemo(() => matchPages(pages, term), [pages, term]);
  const options: FlatOption[] = [
    ...pageHits.map((hit) => ({ group: "pages", hit })),
    ...groups.flatMap((group) => group.hits.map((hit) => ({ group: group.key, hit }))),
  ];
  const active = options[Math.min(activeIndex, options.length - 1)];
  const optionId = (option: FlatOption) => `${listId}-${option.group}-${option.hit.id}`;

  useEffect(() => {
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  function go(hit: PaletteHit) {
    onClose();
    void navigate({ to: hit.href });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!options.length) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((current) => (current + step + options.length) % options.length);
    } else if (event.key === "Enter" && active) {
      event.preventDefault();
      go(active.hit);
    }
  }

  const searching = term.trim().length >= MIN_QUERY_LENGTH;
  const nothing = searching && !options.length && groups.every((group) => group.status === "ready");

  return (
    <div className="flex max-h-[min(70vh,560px)] flex-col">
      <DialogTitle id={titleId} className="sr-only">
        {t("title")}
      </DialogTitle>
      <div className="flex items-center gap-2.5 border-b border-[var(--color-border)] px-4">
        <Search size={16} className="shrink-0 text-[var(--color-text-faint)]" />
        <input
          ref={inputRef}
          value={term}
          onChange={(event) => {
            setTerm(event.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder={t("placeholder")}
          role="combobox"
          aria-expanded={options.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active ? optionId(active) : undefined}
          className="h-12 min-w-0 flex-1 bg-transparent text-[14px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-faint)]"
        />
      </div>
      <div
        id={listId}
        role="listbox"
        aria-label={t("title")}
        className="scrollbar-calm min-h-0 flex-1 overflow-y-auto p-2"
      >
        <PaletteGroup
          title={t("group.pages")}
          hits={pageHits}
          group="pages"
          active={active}
          optionId={optionId}
          onPick={go}
        />
        {groups.map((group) => (
          <PaletteGroup
            key={group.key}
            title={t(`group.${group.key}`)}
            hits={group.hits}
            group={group.key}
            state={group}
            active={active}
            optionId={optionId}
            onPick={go}
          />
        ))}
        {nothing && (
          <p className="px-3 py-6 text-center text-[13px] text-[var(--color-text-faint)]">
            {t("empty")}
          </p>
        )}
      </div>
      <p
        aria-live="polite"
        className="border-t border-[var(--color-border)] px-4 py-2 text-[11.5px] text-[var(--color-text-faint)]"
      >
        {searching && groups.some((group) => group.status === "loading")
          ? t("loading")
          : sources.length > 0 && !searching
            ? t("hint")
            : " "}
      </p>
    </div>
  );
}

interface PaletteGroupProps {
  title: string;
  group: string;
  hits: PaletteHit[];
  state?: PaletteGroupState;
  active: FlatOption | undefined;
  optionId: (option: FlatOption) => string;
  onPick: (hit: PaletteHit) => void;
}

function PaletteGroup({ title, group, hits, state, active, optionId, onPick }: PaletteGroupProps) {
  const { t } = useTranslation("command-palette", { useSuspense: false });
  const headingId = useId();
  const refused = state?.status === "rate-limited" || state?.status === "failed";
  if (!hits.length && !refused) return null;

  return (
    <div role="group" aria-labelledby={headingId} className="mb-1.5 last:mb-0">
      <p
        id={headingId}
        className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-faint)]"
      >
        {title}
      </p>
      {refused && (
        <div className="flex items-center justify-between gap-3 px-3 py-2 text-[12.5px] text-[var(--color-text-muted)]">
          <span>{t(state.status === "rate-limited" ? "rateLimited" : "failed")}</span>
          <button
            type="button"
            onClick={state.retry}
            className="shrink-0 rounded-[var(--radius-sm)] px-2 py-1 font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]"
          >
            {t("retry")}
          </button>
        </div>
      )}
      {hits.map((hit) => {
        const option = { group, hit };
        const selected = active?.group === group && active.hit.id === hit.id;
        return (
          <div
            key={hit.id}
            id={optionId(option)}
            role="option"
            aria-selected={selected}
            tabIndex={-1}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onPick(hit)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onPick(hit);
            }}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-[13.5px]",
              selected
                ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                : "text-[var(--color-text)] hover:bg-[var(--color-surface-2)]",
            )}
          >
            <span className="min-w-0 flex-1 truncate">{hit.label}</span>
            {hit.detail && (
              <span className="shrink-0 truncate text-[12px] text-[var(--color-text-faint)]">
                {hit.detail}
              </span>
            )}
            {selected && <CornerDownLeft size={13} className="shrink-0 rtl:-scale-x-100" />}
          </div>
        );
      })}
    </div>
  );
}
