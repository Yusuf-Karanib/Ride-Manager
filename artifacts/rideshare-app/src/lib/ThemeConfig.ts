/**
 * FAST24 brand palette.
 *
 * The Tailwind utility classes (e.g. `bg-midnight`, `text-sulfur`) are wired
 * up via the `@theme` block in `src/index.css`. This module mirrors the same
 * values for non-Tailwind consumers: inline styles, Leaflet markers, canvas
 * drawing, dynamic className computations, and tests.
 *
 * Always source colors from here — never hardcode hex values in components.
 */

export const fast24Theme = {
  colors: {
    midnight: "#0F172A",
    midnightSoft: "#1E293B",
    midnightDeep: "#020617",
    sulfur: "#EAFF00",
    sulfurHover: "#D9EE00",
    sulfurDim: "#B8CC00",
    paper: "#FFFFFF",
    bone: "#F8FAFC",
    alert: "#EF4444",
    success: "#22C55E",
  },
  font: {
    sans: "'Inter', system-ui, sans-serif",
    mono: "'JetBrains Mono', Menlo, monospace",
  },
  radius: {
    none: "0",
    sm: "2px",
    md: "4px",
  },
  borderWidth: {
    hairline: "1px",
    standard: "2px",
    bold: "3px",
  },
  semantic: {
    appBackground: "midnight",
    appForeground: "paper",
    primaryAction: "sulfur",
    primaryActionForeground: "midnight",
    priceDisplay: "sulfur",
    danger: "alert",
    confirm: "success",
  },
} as const;

export type Fast24Theme = typeof fast24Theme;
export type Fast24ColorName = keyof Fast24Theme["colors"];

export function color(name: Fast24ColorName): string {
  return fast24Theme.colors[name];
}
