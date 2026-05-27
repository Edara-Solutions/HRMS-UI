import { cn } from "@/shared/lib/cn";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: "primary" | "warning" | "danger" | "faint";
  className?: string;
}

const colorMap = {
  primary: "var(--color-primary)",
  warning: "var(--color-warning)",
  danger: "var(--color-danger)",
  faint: "var(--color-text-faint)",
};

export function Sparkline({
  data,
  width = 72,
  height = 24,
  color = "primary",
  className,
}: SparklineProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={colorMap[color]}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
