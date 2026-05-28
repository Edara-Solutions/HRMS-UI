import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import type { ApexOptions } from "apexcharts";
import Chart from "react-apexcharts";
import type { revenueTrend } from "./fixtures";

interface RevenueChartProps {
  data: typeof revenueTrend;
}

export function RevenueChart({ data }: RevenueChartProps) {
  const chartOptions: ApexOptions = {
    chart: {
      type: "area",
      toolbar: { show: false },
      sparkline: { enabled: false },
      animations: {
        enabled: true,
        speed: 700,
      },
    },
    colors: ["var(--color-primary)"],
    stroke: {
      width: 2,
      curve: "smooth",
      lineCap: "round",
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.12,
        opacityTo: 0,
        stops: [0, 100],
      },
    },
    grid: {
      borderColor: "var(--color-border)",
      strokeDashArray: 0,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
      padding: { left: 0, right: 0 },
    },
    xaxis: {
      categories: data.months,
      labels: {
        style: {
          colors: "var(--color-text-faint)",
          fontSize: "10px",
          fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
          fontWeight: 500,
        },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      min: 100,
      max: 220,
      tickAmount: 4,
      labels: {
        formatter: (val: number) => `${val}K`,
        style: {
          colors: "var(--color-text-faint)",
          fontSize: "10px",
          fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
          fontWeight: 500,
        },
      },
    },
    tooltip: {
      enabled: true,
      x: { show: false },
      y: {
        formatter: (val: number) => `${val}K SAR`,
      },
      marker: { show: false },
      theme: "light",
    },
    dataLabels: { enabled: false },
    markers: {
      size: 0,
      hover: { size: 5, sizeOffset: 3 },
    },
  };

  const chartSeries = [
    {
      name: "Monthly revenue",
      data: data.data,
    },
  ];

  return (
    <Card>
      <CardHeader className="flex-col gap-3 border-b border-[var(--color-border)] pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Revenue trend</CardTitle>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Monthly recurring revenue: 2026
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3.5 text-xs text-[var(--color-text-muted)]">
          <span className="flex items-center gap-1">
            <span className="inline-block size-1.5 rounded-full bg-[var(--color-primary)]" />
            Revenue (SAR)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block size-1.5 rounded-full bg-[var(--color-border)]" />
            Target
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="min-w-0 w-full overflow-hidden">
          <Chart options={chartOptions} series={chartSeries} type="area" height={200} />
        </div>
      </CardContent>
    </Card>
  );
}
