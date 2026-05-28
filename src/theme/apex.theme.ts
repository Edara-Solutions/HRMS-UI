import type { ApexOptions } from "apexcharts";
import { themeTokens } from "./tokens";

const enFormatter = new Intl.NumberFormat("en");
const arFormatter = new Intl.NumberFormat("ar");

const numberFormatters: Record<string, Intl.NumberFormat> = {
  en: enFormatter,
  ar: arFormatter,
};

function getNumberFormatter(locale: string): Intl.NumberFormat {
  return numberFormatters[locale] ?? numberFormatters.en;
}

export function createApexTheme(locale: string): ApexOptions {
  return {
    chart: {
      fontFamily: themeTokens.font.sans,
      toolbar: { show: false },
      animations: {
        enabled: true,
        speed: themeTokens.motion.durationSlow,
      },
    },
    colors: [
      themeTokens.color.light.primary,
      themeTokens.color.light.info,
      themeTokens.color.light.success,
    ],
    dataLabels: { enabled: false },
    grid: {
      borderColor: themeTokens.color.light.border,
      strokeDashArray: 3,
    },
    tooltip: {
      y: {
        formatter: (value) => getNumberFormatter(locale).format(value),
      },
    },
    xaxis: {
      labels: {
        style: {
          colors: themeTokens.color.light.textMuted,
          fontFamily: themeTokens.font.sans,
        },
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: themeTokens.color.light.textMuted,
          fontFamily: themeTokens.font.sans,
        },
      },
    },
  };
}
