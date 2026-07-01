import { Check, ChevronDown } from "lucide-react";
import type { ButtonHTMLAttributes, CSSProperties, ReactNode, Ref, RefObject } from "react";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/shared/lib/cn";

interface SelectItemInfo {
  value: string;
  label: ReactNode;
  text: string;
}

interface SelectContextValue {
  value: string | undefined;
  setValue: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  disabled: boolean;
  triggerId: string;
  listboxId: string;
  triggerRef: RefObject<HTMLButtonElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
  highlightedValue: string | undefined;
  setHighlightedValue: (value: string | undefined) => void;
  items: SelectItemInfo[];
  registerItem: (item: SelectItemInfo) => () => void;
}

const SelectContext = createContext<SelectContextValue | null>(null);

function useSelectContext(component: string) {
  const context = use(SelectContext);
  if (!context) throw new Error(`<${component}> must be used within a <Select>`);
  return context;
}

function mergeRefs<T>(...refs: Array<Ref<T> | undefined>) {
  return (node: T) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === "function") ref(node);
      else (ref as { current: T | null }).current = node;
    }
  };
}

interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  children: ReactNode;
}

/** Compound, token-styled replacement for the native `<select>` — see SelectTrigger/SelectContent/SelectItem. */
export function Select({
  value: valueProp,
  defaultValue,
  onValueChange,
  disabled = false,
  children,
}: SelectProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const value = valueProp ?? uncontrolledValue;
  const [open, setOpen] = useState(false);
  const [highlightedValue, setHighlightedValue] = useState<string | undefined>(undefined);
  const [items, setItems] = useState<SelectItemInfo[]>([]);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const baseId = useId();

  const setValue = useCallback(
    (next: string) => {
      setUncontrolledValue(next);
      onValueChange?.(next);
    },
    [onValueChange],
  );

  const registerItem = useCallback((item: SelectItemInfo) => {
    setItems((prev) => [...prev.filter((existing) => existing.value !== item.value), item]);
    return () => {
      setItems((prev) => prev.filter((existing) => existing.value !== item.value));
    };
  }, []);

  const toggleOpen = useCallback(() => {
    if (!disabled) setOpen((prev) => !prev);
  }, [disabled]);

  const contextValue = useMemo<SelectContextValue>(
    () => ({
      value,
      setValue,
      open,
      setOpen,
      toggleOpen,
      disabled,
      triggerId: `${baseId}-trigger`,
      listboxId: `${baseId}-listbox`,
      triggerRef,
      contentRef,
      highlightedValue,
      setHighlightedValue,
      items,
      registerItem,
    }),
    [value, setValue, open, toggleOpen, disabled, baseId, highlightedValue, items, registerItem],
  );

  return <SelectContext.Provider value={contextValue}>{children}</SelectContext.Provider>;
}

interface SelectTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

export function SelectTrigger({
  className,
  children,
  onKeyDown,
  id,
  ref,
  disabled: disabledProp,
  ...props
}: SelectTriggerProps) {
  const {
    open,
    setOpen,
    toggleOpen,
    disabled: contextDisabled,
    triggerId,
    listboxId,
    triggerRef,
    items,
    value,
    setValue,
    highlightedValue,
    setHighlightedValue,
  } = useSelectContext("SelectTrigger");
  const disabled = disabledProp ?? contextDisabled;
  const typeaheadRef = useRef({ buffer: "", timeoutId: 0 });

  function selectByTypeahead(char: string) {
    window.clearTimeout(typeaheadRef.current.timeoutId);
    const buffer = typeaheadRef.current.buffer + char.toLowerCase();
    typeaheadRef.current.buffer = buffer;
    typeaheadRef.current.timeoutId = window.setTimeout(() => {
      typeaheadRef.current.buffer = "";
    }, 500);

    const match = items.find((item) => item.text.toLowerCase().startsWith(buffer));
    if (!match) return;
    if (open) setHighlightedValue(match.value);
    else setValue(match.value);
  }

  function moveHighlight(direction: 1 | -1) {
    if (items.length === 0) return;
    const currentIndex = items.findIndex((item) => item.value === (highlightedValue ?? value));
    const nextIndex =
      currentIndex === -1
        ? direction === 1
          ? 0
          : items.length - 1
        : (currentIndex + direction + items.length) % items.length;
    setHighlightedValue(items[nextIndex].value);
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: one flat switch over the combobox's keyboard contract (arrows/home/end/enter/escape/tab/typeahead) reads more clearly as a single dispatch than split across helpers.
  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;

    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp":
        event.preventDefault();
        if (!open) setOpen(true);
        else moveHighlight(event.key === "ArrowDown" ? 1 : -1);
        return;
      case "Home":
        if (open && items.length > 0) {
          event.preventDefault();
          setHighlightedValue(items[0].value);
        }
        return;
      case "End":
        if (open && items.length > 0) {
          event.preventDefault();
          setHighlightedValue(items[items.length - 1].value);
        }
        return;
      case "Enter":
      case " ":
        event.preventDefault();
        if (open) {
          if (highlightedValue !== undefined) setValue(highlightedValue);
          setOpen(false);
        } else {
          setOpen(true);
        }
        return;
      case "Escape":
        if (open) {
          event.preventDefault();
          setOpen(false);
        }
        return;
      case "Tab":
        if (open) setOpen(false);
        return;
      default:
        if (event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey) {
          selectByTypeahead(event.key);
        }
    }
  }

  return (
    <button
      ref={mergeRefs(triggerRef, ref)}
      id={id ?? triggerId}
      type="button"
      role="combobox"
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={listboxId}
      aria-activedescendant={
        open && highlightedValue !== undefined
          ? `${listboxId}-option-${highlightedValue}`
          : undefined
      }
      disabled={disabled}
      onClick={toggleOpen}
      onKeyDown={handleKeyDown}
      className={cn(
        "flex h-[34px] w-full items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] ps-3 pe-2.5 text-[13px] text-[var(--color-text)] outline-none transition-colors focus-visible:outline-none focus-visible:border-[color-mix(in_srgb,var(--color-primary)_50%,var(--color-border))] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-primary)_20%,transparent)] disabled:cursor-not-allowed disabled:opacity-60",
        open && "border-[var(--color-primary)]",
        className,
      )}
      {...props}
    >
      <span className="flex min-w-0 flex-1 items-center truncate text-start">{children}</span>
      <ChevronDown
        size={14}
        className={cn(
          "shrink-0 text-[var(--color-text-muted)] transition-transform duration-[var(--motion-fast)]",
          open && "rotate-180",
        )}
        aria-hidden="true"
      />
    </button>
  );
}

interface SelectValueProps {
  placeholder?: string;
  className?: string;
}

export function SelectValue({ placeholder, className }: SelectValueProps) {
  const { value, items } = useSelectContext("SelectValue");
  const selected = items.find((item) => item.value === value);

  if (!selected) {
    return (
      <span className={cn("truncate text-[var(--color-text-faint)]", className)}>
        {placeholder}
      </span>
    );
  }

  return <span className={cn("truncate", className)}>{selected.label}</span>;
}

const HIDDEN_CONTENT_STYLE: CSSProperties = {
  position: "fixed",
  visibility: "hidden",
  pointerEvents: "none",
};

interface SelectContentProps {
  children: ReactNode;
  className?: string;
}

export function SelectContent({ children, className }: SelectContentProps) {
  const {
    open,
    setOpen,
    triggerRef,
    contentRef,
    listboxId,
    triggerId,
    setHighlightedValue,
    value,
    items,
  } = useSelectContext("SelectContent");
  const [style, setStyle] = useState<CSSProperties>(HIDDEN_CONTENT_STYLE);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !contentRef.current) {
      setStyle(HIDDEN_CONTENT_STYLE);
      return;
    }

    const rect = triggerRef.current.getBoundingClientRect();
    const isRTL = document.documentElement.dir === "rtl";
    const contentHeight = contentRef.current.scrollHeight;
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const flip = contentHeight > spaceBelow && spaceAbove > spaceBelow;

    setStyle({
      position: "fixed",
      visibility: "visible",
      ...(flip ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }),
      ...(isRTL ? { right: window.innerWidth - rect.right } : { left: rect.left }),
      width: rect.width,
      maxHeight: Math.max(160, flip ? spaceAbove : spaceBelow),
    });
  }, [open, triggerRef, contentRef]);

  const handleClose = useEffectEvent(() => setOpen(false));

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (
        contentRef.current?.contains(event.target as Node) ||
        triggerRef.current?.contains(event.target as Node)
      )
        return;
      handleClose();
    }

    function handleScroll(event: Event) {
      // Scrolling the listbox itself (a long options list) must not close it — only ancestor scrolling should.
      if (contentRef.current?.contains(event.target as Node)) return;
      handleClose();
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("scroll", handleScroll, true);
    };
    // No dependency array (matches the sidebar UserMenu pattern): this component stays mounted
    // across open/close, so the effect must re-evaluate `open` and re-read the latest refs every render.
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: only re-run when the popup opens — keyboard/hover navigation owns highlightedValue afterwards.
  useEffect(() => {
    if (!open) {
      setHighlightedValue(undefined);
      return;
    }
    if (items.length === 0) return;
    const selectedIndex = items.findIndex((item) => item.value === value);
    setHighlightedValue(items[selectedIndex === -1 ? 0 : selectedIndex].value);
  }, [open]);

  return createPortal(
    <div
      ref={contentRef}
      id={listboxId}
      role="listbox"
      aria-labelledby={triggerId}
      aria-hidden={!open}
      style={style}
      className={cn(
        "scrollbar-calm z-[60] overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-[var(--shadow-md)]",
        className,
      )}
    >
      {children}
    </div>,
    document.body,
  );
}

interface SelectItemProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export function SelectItem({ value: itemValue, children, className }: SelectItemProps) {
  const {
    value,
    setValue,
    open,
    setOpen,
    highlightedValue,
    setHighlightedValue,
    registerItem,
    listboxId,
    triggerRef,
  } = useSelectContext("SelectItem");
  const text = typeof children === "string" ? children : "";

  // Registration must survive across open/close so SelectValue can show the label while closed —
  // only the visible row below is gated on `open`, to avoid leaving duplicate text in the DOM.
  useEffect(
    () => registerItem({ value: itemValue, label: children, text }),
    [itemValue, children, text, registerItem],
  );

  const isSelected = value === itemValue;
  const isHighlighted = highlightedValue === itemValue;

  function handleSelect() {
    setValue(itemValue);
    setOpen(false);
    triggerRef.current?.focus();
  }

  if (!open) return null;

  return (
    <div
      id={`${listboxId}-option-${itemValue}`}
      role="option"
      tabIndex={-1}
      aria-selected={isSelected}
      onMouseEnter={() => setHighlightedValue(itemValue)}
      onClick={handleSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") handleSelect();
      }}
      className={cn(
        "flex cursor-pointer items-center justify-between gap-2 rounded-[var(--radius-md)] px-2.5 py-1.5 text-[13px] text-[var(--color-text)] transition-colors",
        isHighlighted && "bg-[var(--color-surface-2)]",
        isSelected && "bg-[var(--color-primary-soft)] text-[var(--color-primary)]",
        className,
      )}
    >
      <span className="truncate">{children}</span>
      {isSelected && <Check size={14} className="shrink-0" aria-hidden="true" />}
    </div>
  );
}
