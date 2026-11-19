import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description: string;
  /** Optional primary action for the page (a Button). */
  action?: ReactNode;
}

/** A page's level-one heading, one explanatory line and its primary action. */
export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">{description}</p>
      </div>
      {action}
    </header>
  );
}
