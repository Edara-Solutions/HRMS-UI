import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

export function DialogTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("text-lg font-semibold tracking-tight text-[var(--color-text)]", className)}
      {...props}
    >
      {children}
    </h2>
  );
}
