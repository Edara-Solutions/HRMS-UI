import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import type { ApexOptions } from "apexcharts";
import { useEffect, useRef, useState } from "react";
import Chart from "react-apexcharts";
import type { headcountTrend } from "./fixtures";

interface HeadcountChartProps {
  data: typeof headcountTrend;
}

export function HeadcountChart({ data }: HeadcountChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState<number | string>("100%");

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width;
      if (w > 0) setChartWidth(Math.round(w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
      min: 180,
      max: 280,
      tickAmount: 4,
      labels: {
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
        formatter: (val: number) => `${val} employees`,
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
      name: "Active employees",
      data: data.data,
    },
  ];

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between border-b border-[var(--color-border)] pb-3">
        <div>
          <CardTitle>Headcount trend</CardTitle>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Rolling 12 months — Jan 2025 through Dec 2025
          </p>
        </div>
        <div className="flex items-center gap-3.5 text-xs text-[var(--color-text-muted)]">
          <span className="flex items-center gap-1">
            <span className="inline-block size-1.5 rounded-full bg-[var(--color-primary)]" />
            Active employees
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block size-1.5 rounded-full bg-[var(--color-border)]" />
            Target
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div ref={containerRef} className="min-w-0 w-full overflow-hidden">
          <Chart options={chartOptions} series={chartSeries} type="area" height={200} width={chartWidth} />
        </div>
      </CardContent>
    </Card>
  );
}
