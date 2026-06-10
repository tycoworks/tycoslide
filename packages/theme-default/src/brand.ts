// Default theme brand identity — colors + fonts.
// Maps existing base.ts values to the SDK Palette/Brand types.

import type { Brand, Palette } from "@tycoslide/sdk";
import { HIGHLIGHT_THEME } from "@tycoslide/sdk";
import { fonts } from "./fonts.js";

const light: Palette = {
  text: { heading: "#1A1A2E", body: "#1A1A2E", description: "#4A4A5A", subtle: "#696878" },
  brand: { primary: "#7C3AED", soft: "#A78BFA" },
  fill: { background: "#FFFFFF", surface: "#F5F5F5", divider: "#E5E5E5", shadow: "#1A1A2E" },
  highlightTheme: HIGHLIGHT_THEME.GITHUB_LIGHT,
};

const dark: Palette = {
  text: { heading: "#FFFFFF", body: "#E5E5E5", description: "#A0A0B0", subtle: "#9898A8" },
  brand: { primary: "#A78BFA", soft: "#7C3AED" },
  fill: { background: "#1A1A2E", surface: "#2A2A3E", divider: "#3A3A4E", shadow: "#000000" },
  highlightTheme: HIGHLIGHT_THEME.GITHUB_DARK,
};

export const brand: Brand = {
  colors: { light, dark },
  fonts: {
    heading: fonts.inter,
    body: fonts.interLight,
    code: fonts.firaCode,
  },
};
