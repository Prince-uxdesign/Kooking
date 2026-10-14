/**
 * Design-token mirror for docs and tests.
 * Source of truth for values is app/globals.css (@theme).
 * Keep in sync when tokens change.
 */
export const tokens = {
  color: {
    primary50: "#EFFDF3",
    primary100: "#DBFBE4",
    primary500: "#3EDC6B",
    primary600: "#2FCB5C",
    primary700: "#0E7A34",
    accent100: "#FFEBD6",
    accent500: "#FF7A1A",
    ink900: "#111311",
    ink700: "#3A3E3B",
    ink500: "#646965",
    ink400: "#9A9F9B",
    surface50: "#F8F9F8",
    surface100: "#F3F4F3",
    surface200: "#E9EBE9",
    line: "#EBEDEB",
    success: "#0E7A34",
    warning: "#B54708",
    error: "#B42318",
    info: "#175CD3",
  },
  radius: { sm: 8, md: 12, lg: 16, xl: 20, "2xl": 24, "3xl": 28, "4xl": 32, full: 9999 },
  touchTarget: 44,
  container: { sm: 560, md: 768, lg: 1120 },
} as const;

/**
 * Contrast-safe pairs. Components must use these, not ad-hoc combos.
 * Bright green fills take ink text — white on primary-500 is 1.8:1.
 */
export const textOn = {
  primary500: "#111311",
  primary600: "#111311",
  ink900: "#FFFFFF",
  surface: "#111311",
} as const;
