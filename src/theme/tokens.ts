export const themeTokens = {
  color: {
    light: {
      bg: "#F7F6F2",
      surface: "#FBFBF8",
      surface2: "#F1EEE8",
      border: "#D9D5CD",
      text: "#22211D",
      textMuted: "#6E6B64",
      textFaint: "#A29E95",
      primary: "#123A6F",
      primaryHover: "#0E2F5A",
      primarySoft: "#DDE8F5",
      success: "#3E7B4E",
      warning: "#A56A16",
      danger: "#B34557",
      info: "#356FA8",
    },
    dark: {
      bg: "#171614",
      surface: "#1D1C1A",
      surface2: "#252320",
      border: "#383631",
      text: "#E8E5DE",
      textMuted: "#B4AEA3",
      textFaint: "#8A847A",
      primary: "#8FB8E8",
      primaryHover: "#A5C8F0",
      primarySoft: "#1F2F43",
    },
  },
  font: {
    sans: "Inter, Noto Sans Arabic, ui-sans-serif, system-ui, sans-serif",
  },
  spacing: {
    baseUnit: 4,
    scale: [4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96],
  },
  radius: {
    sm: "6px",
    md: "8px",
    lg: "12px",
    xl: "16px",
    full: "999px",
  },
  shadow: {
    sm: "0 1px 2px rgba(20,20,20,0.05)",
    md: "0 6px 20px rgba(20,20,20,0.07)",
    lg: "0 18px 40px rgba(20,20,20,0.10)",
  },
  motion: {
    durationFast: 120,
    durationBase: 180,
    durationSlow: 240,
    easing: "cubic-bezier(0.16, 1, 0.3, 1)",
  },
} as const;

export type ThemeTokens = typeof themeTokens;
