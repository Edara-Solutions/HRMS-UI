import { cn } from "@/shared/lib/cn";
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { createContext, use, useId, useMemo, useState } from "react";

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (id: string) => void;
  baseId: string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = use(TabsContext);
  if (!context) {
    throw new Error("Tabs components must be used within a <Tabs> provider");
  }
  return context;
}

interface TabsProps extends HTMLAttributes<HTMLDivElement> {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
}

export function Tabs({
  defaultValue,
  value,
  onValueChange,
  className,
  children,
  ...props
}: TabsProps) {
  const baseId = useId();
  const [internalValue, setInternalValue] = useState(defaultValue);
  const activeTab = value ?? internalValue;

  const contextValue = useMemo(() => {
    function setActiveTab(id: string) {
      setInternalValue(id);
      onValueChange?.(id);
    }
    return { activeTab, setActiveTab, baseId };
  }, [activeTab, onValueChange, baseId]);

  return (
    <TabsContext.Provider value={contextValue}>
      <div className={cn("space-y-4", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

interface TabsListProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function TabsList({ className, children, ...props }: TabsListProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex h-10 items-center gap-1 rounded-[var(--radius-md)] bg-[var(--color-surface-2)] p-1",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface TabsTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  children: ReactNode;
}

export function TabsTrigger({ value, className, children, ...props }: TabsTriggerProps) {
  const { activeTab, setActiveTab, baseId } = useTabsContext();
  const isActive = activeTab === value;

  return (
    <button
      role="tab"
      id={`${baseId}-trigger-${value}`}
      aria-controls={`${baseId}-content-${value}`}
      aria-selected={isActive}
      type="button"
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium transition-colors",
        isActive
          ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm"
          : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
        className,
      )}
      onClick={() => setActiveTab(value)}
      {...props}
    >
      {children}
    </button>
  );
}

interface TabsContentProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
  children: ReactNode;
}

export function TabsContent({ value, className, children, ...props }: TabsContentProps) {
  const { activeTab, baseId } = useTabsContext();
  const isActive = activeTab === value;

  if (!isActive) return null;

  return (
    <div
      role="tabpanel"
      id={`${baseId}-content-${value}`}
      aria-labelledby={`${baseId}-trigger-${value}`}
      className={cn("outline-none", className)}
      {...props}
    >
      {children}
    </div>
  );
}
