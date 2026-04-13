import { DASH_TYPE, HALIGN, SHADOW_TYPE, VALIGN } from "@tycoslide/core";
import type { ImageTokens } from "@tycoslide/sdk";
import { HIGHLIGHT_THEME } from "@tycoslide/sdk";

export const TEXT_STYLE = {
  TITLE: "title",
  H1: "h1",
  H2: "h2",
  H3: "h3",
  H4: "h4",
  BODY: "body",
  SMALL: "small",
  EYEBROW: "eyebrow",
  FOOTER: "footer",
  CODE: "code",
} as const;

export const palette = {
  white: "#FFFFFF",
  surface: "#F5F5F5",
  border: "#E5E5E5",
  textMuted: "#6B7280",
  textSecondary: "#4A4A5A",
  navy: "#1A1A2E",
  purple: "#7C3AED",
  lavender: "#A78BFA",
  teal: "#0D9488",
};

export const accents: Record<string, string> = {
  blue: palette.navy,
  green: palette.teal,
  red: palette.purple,
  yellow: palette.lavender,
  purple: palette.purple,
};

export const borderWidth = 0.75;
export const cornerRadius = 0.08;
export const cornerRadiusLarge = 0.12;
export const accentBarWidth = 2;

export const subtleBorder = { color: palette.border, width: borderWidth, dashType: DASH_TYPE.SOLID };

export const shadow = {
  type: SHADOW_TYPE.OUTER,
  color: palette.navy,
  opacity: 12,
  blur: 6,
  offset: 2,
  angle: 180,
};

export const alignLeft = { hAlign: HALIGN.LEFT, vAlign: VALIGN.MIDDLE } as const;
export const alignCenter = { hAlign: HALIGN.CENTER, vAlign: VALIGN.MIDDLE } as const;

export const richTextBase = {
  linkColor: palette.purple,
  linkUnderline: true,
  accents: accents,
} as const;

export const heroBase = { ...richTextBase, linkUnderline: false, ...alignCenter } as const;
export const labelBase = { color: palette.navy, ...alignLeft } as const;

export const cardBackground = {
  fill: palette.white,
  fillOpacity: 100,
  border: subtleBorder,
  cornerRadius,
};

export const imageBase: ImageTokens = { padding: 0 };

export const highlightTheme = HIGHLIGHT_THEME.GITHUB_DARK;
