import type { Config } from "tailwindcss";
import { themeTokens } from "./tokens";

const preset = {
  theme: {
    extend: {
      colors: {
        bg: themeTokens.color.light.bg,
        surface: themeTokens.color.light.surface,
        "surface-2": themeTokens.color.light.surface2,
        border: themeTokens.color.light.border,
        text: themeTokens.color.light.text,
        "text-muted": themeTokens.color.light.textMuted,
        "text-faint": themeTokens.color.light.textFaint,
        primary: themeTokens.color.light.primary,
        "primary-hover": themeTokens.color.light.primaryHover,
        "primary-soft": themeTokens.color.light.primarySoft,
        success: themeTokens.color.light.success,
        warning: themeTokens.color.light.warning,
        danger: themeTokens.color.light.danger,
        info: themeTokens.color.light.info,
      },
      borderRadius: themeTokens.radius,
      boxShadow: themeTokens.shadow,
      fontFamily: {
        sans: [themeTokens.font.sans],
      },
    },
  },
} satisfies Config;

export default preset;
