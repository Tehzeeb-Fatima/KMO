/**
 * JS/TS mirror of tokens.css — for contexts that need raw values
 * (inline SVG charts, canvas, email templates) rather than Tailwind classes.
 * Keep in sync with ./tokens.css manually; tokens.css is the source of truth
 * for anything Tailwind-generated.
 */
export const colors = {
  primary: "#4A2266",
  primaryLight: "#6B2FA0",
  primaryDark: "#2B1638",
  primaryActive: "#45305C",
  primaryTint: "#F5F0FA",
  primaryTint2: "#E4D9EE",

  accent: "#C4552F",
  accentLight: "#E8952A",
  accentTint: "#FBEFE9",

  success: "#2E7A4F",
  successDark: "#1F5B39",
  successTint: "#EEF7F1",
  successBorder: "#CFE7D9",

  warning: "#B06A0E",
  warningTint: "#FDF4E7",

  danger: "#8F3A1E",
  dangerTint: "#FBEFE9",

  info: "#4A2266",
  infoTint: "#F5F0FA",

  ink: "#241B2B",
  inkDark: "#2B1638",
  inkSecondary: "#3A2D48",
  muted: "#6E6478",
  muted2: "#8D82A0",
  mutedTable: "#9C8C7E",

  bg: "#EDE9F2",
  surface: "#FFFFFF",
  surfaceAlt: "#FBF7F5",
  surfaceLavender: "#F5F0FA",

  border: "#EADFDA",
  borderStrong: "#E0D3CD",
  borderPrimary: "#D5C4E2",

  sidebarBg: "#2B1638",
  sidebarActive: "#45305C",
  sidebarIcon: "#5E3A7C",
  sidebarMuted: "#B9A3CD",
} as const;

export const fonts = {
  sans: "'Plus Jakarta Sans', system-ui, sans-serif",
  mono: "'IBM Plex Mono', ui-monospace, monospace",
} as const;

export const radius = {
  sm: "4px",
  md: "8px",
  lg: "12px",
  xl: "14px",
  pill: "999px",
} as const;

export type StatusVariant = "success" | "warning" | "danger" | "info";

export const statusColors: Record<StatusVariant, { bg: string; text: string }> = {
  success: { bg: colors.successTint, text: colors.successDark },
  warning: { bg: colors.warningTint, text: colors.warning },
  danger: { bg: colors.dangerTint, text: colors.danger },
  info: { bg: colors.infoTint, text: colors.info },
};
