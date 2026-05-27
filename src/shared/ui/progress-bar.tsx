import { cn } from "@/shared/lib/cn";

interface ProgressBarProps {
  value: number;
  color?: "primary" | "info" | "warning" | "success" | "faint";
  className?: string;
}

const colorMap = {
  primary: "bg-[var(--color-primary)]",
  info: "bg-[var(--color-info)]",
  warning: "bg-[var(--color-warning)]",
  success: "bg-[var(--color-success)]",
  faint: "bg-[var(--color-text-faint)]",
};

export function ProgressBar({ value, color = "primary", className }: ProgressBarProps) {
  return (
    <div
      className={cn("h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-2)]", className)}
    >
      <div
        className={cn("h-full rounded-full transition-all duration-700", colorMap[color])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
