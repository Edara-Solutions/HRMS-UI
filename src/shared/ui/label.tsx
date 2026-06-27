import type { LabelHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  htmlFor: string;
}

export function Label({ className, htmlFor, children, ...props }: LabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn("text-sm font-medium text-[var(--color-text)]", className)}
      {...props}
    >
      {children}
    </label>
  );
}
