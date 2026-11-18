import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";

interface SectionCardProps {
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
  contentClassName?: string;
}

export function SectionCard({
  title,
  description,
  action,
  children,
  contentClassName = "p-0",
}: SectionCardProps) {
  return (
    <Card as="section" aria-label={title}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 border-b border-[var(--color-border)] pb-3">
        <div className="min-w-0">
          <CardTitle>{title}</CardTitle>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{description}</p>
        </div>
        {action}
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}
