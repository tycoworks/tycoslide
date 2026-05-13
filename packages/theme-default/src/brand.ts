// Default theme brand identity — colors + fonts.
// Maps existing base.ts values to the SDK Palette/Brand types.

import type { Brand, Palette } from "@tycoslide/sdk";
import { HIGHLIGHT_THEME } from "@tycoslide/sdk";
import { assets } from "./assets.js";

const light: Palette = {
  heading: "#1A1A2E",
  body: "#1A1A2E",
  secondary: "#4A4A5A",
  muted: "#6B7280",
  accent: "#7C3AED",
  accentSoft: "#A78BFA",
  background: "#FFFFFF",
  surface: "#F5F5F5",
  divider: "#E5E5E5",
  shadow: "#1A1A2E",
  highlightTheme: HIGHLIGHT_THEME.GITHUB_DARK,
};

const dark: Palette = {
  heading: "#FFFFFF",
  body: "#E5E5E5",
  secondary: "#A0A0B0",
  muted: "#6B7280",
  accent: "#A78BFA",
  accentSoft: "#7C3AED",
  background: "#1A1A2E",
  surface: "#2A2A3E",
  divider: "#3A3A4E",
  shadow: "#000000",
  highlightTheme: HIGHLIGHT_THEME.GITHUB_DARK,
};

export const brand: Brand = {
  colors: { light, dark },
  fonts: {
    heading: assets.fonts.inter,
    body: assets.fonts.interLight,
    code: assets.fonts.firaCode,
  },
};
