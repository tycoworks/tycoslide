import { DASH_TYPE, HALIGN, SHADOW_TYPE, VALIGN } from "@tycoslide/core";
import type { ImageTokens } from "@tycoslide/sdk";
import { HIGHLIGHT_THEME, TEXT_STYLE } from "@tycoslide/sdk";

export { TEXT_STYLE };

export const palette = {
  white: "#FFFFFF",
  surface: "#F5F5F5",
  border: "#E5E5E5",
  textMuted: "#6B7280",
  textSecondary: "#4A4A5A",
  textPrimary: "#1A1A2E",
  brand: "#7C3AED",
  brandLight: "#A78BFA",
  teal: "#0D9488",
};

export const accents: Record<string, string> = {
  accent: palette.brand,
  soft: palette.brandLight,
  dark: palette.textPrimary,
};

export const borderWidth = 0.75;
export const cornerRadius = 0.08;
export const cornerRadiusLarge = 0.12;
export const accentBarWidth = 2;

export const subtleBorder = { color: palette.border, width: borderWidth, dashType: DASH_TYPE.SOLID };

export const shadow = {
  type: SHADOW_TYPE.OUTER,
  color: palette.textPrimary,
  opacity: 12,
  blur: 6,
  offset: 2,
  angle: 180,
};

export const alignCenter = { hAlign: HALIGN.CENTER, vAlign: VALIGN.MIDDLE } as const;

export const richTextBase = {
  linkColor: palette.brand,
  accents: accents,
} as const;

export const heroBase = { ...richTextBase, linkUnderline: false, hAlign: HALIGN.CENTER } as const;
export const labelBase = { color: palette.textPrimary } as const;

export const cardBackground = {
  fill: palette.white,
  border: subtleBorder,
  cornerRadius,
};

export const imageBase: ImageTokens = {};

export const highlightTheme = HIGHLIGHT_THEME.GITHUB_DARK;
