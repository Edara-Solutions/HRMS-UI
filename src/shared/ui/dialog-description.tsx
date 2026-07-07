import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

export function DialogDescription({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("mt-1.5 text-sm text-[var(--color-text-muted)]", className)} {...props}>
      {children}
    </p>
  );
}
