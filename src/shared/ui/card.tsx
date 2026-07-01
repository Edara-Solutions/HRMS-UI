import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  as?: "div" | "section" | "article";
  hoverable?: boolean;
}

export function Card({ className, as: Tag = "div", hoverable = false, ...props }: CardProps) {
  return (
    <Tag
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] transition-shadow duration-[var(--motion-base)]",
        hoverable && "hover:shadow-[var(--shadow-md)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("border-b border-[var(--color-border)] px-[18px] pb-3 pt-4", className)}
      {...props}
    />
  );
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-sm font-semibold leading-none tracking-tight text-[var(--color-text)]",
        className,
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-0", className)} {...props} />;
}
