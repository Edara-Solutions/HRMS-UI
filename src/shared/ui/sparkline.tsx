import { cn } from "@/shared/lib/cn";
import type { ApexOptions } from "apexcharts";
import Chart from "react-apexcharts";

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

const sparklineValueFormatter = new Intl.NumberFormat("en");

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
  const chartColor = colorMap[color];

  const chartOptions: ApexOptions = {
    chart: {
      type: "line",
      toolbar: { show: false },
      sparkline: { enabled: true },
      animations: {
        enabled: true,
        speed: 450,
      },
    },
    colors: [chartColor],
    dataLabels: { enabled: false },
    grid: {
      padding: {
        bottom: 0,
        left: 0,
        right: 0,
        top: 0,
      },
    },
    markers: {
      size: 0,
      hover: {
        size: 4,
        sizeOffset: 2,
      },
    },
    stroke: {
      curve: "smooth",
      lineCap: "round",
      width: 1.8,
    },
    tooltip: {
      enabled: true,
      marker: { show: false },
      theme: "light",
      x: { show: false },
      y: {
        formatter: (value: number) => sparklineValueFormatter.format(value),
      },
    },
    xaxis: {
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { show: false },
      tooltip: { enabled: false },
    },
    yaxis: {
      max: max + range * 0.12,
      min: min - range * 0.12,
      show: false,
    },
  };

  const chartSeries = [
    {
      name: "Trend",
      data,
    },
  ];

  return (
    <div className={cn("shrink-0", className)} style={{ height, width }} aria-hidden="true">
      <Chart
        options={chartOptions}
        series={chartSeries}
        type="line"
        height={height}
        width={width}
      />
    </div>
  );
}
