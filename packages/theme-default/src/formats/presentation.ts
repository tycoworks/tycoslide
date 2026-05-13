import { HALIGN, SHADOW_TYPE, VALIGN } from "@tycoslide/core";
import type { Format } from "@tycoslide/sdk";
import { SlideFormat, TEXT_STYLE } from "@tycoslide/sdk";
import { assets } from "../assets.js";

/** Chrome-specific spatial config (not token-relevant). */
export interface ChromeConfig {
  margin: number;
  footerHeight: number;
}

const unit = 0.03125;

export const presentationFormat: Format = {
  slide: SlideFormat.s16x9,
  spacing: { base: unit * 8, tight: unit * 4 },
  padding: unit * 8,
  radius: 0.08,
  strokes: { hairline: 0.5, thin: 0.75, base: 1, thick: 2 },
  shadow: { type: SHADOW_TYPE.OUTER, opacity: 12, blur: 6, offset: 2, angle: 180 },
  hAlign: HALIGN.LEFT,
  vAlign: VALIGN.MIDDLE,
  textStyles: {
    [TEXT_STYLE.QUOTE]: {
      fontFamily: assets.fonts.inter,
      fontSize: 56,
      lineHeightMultiplier: 1.2,
      bulletIndentPt: 0,
    },
    [TEXT_STYLE.H1]: {
      fontFamily: assets.fonts.interLight,
      fontSize: 44,
      lineHeightMultiplier: 1.2,
      bulletIndentPt: 44 * 1.5,
    },
    [TEXT_STYLE.H2]: {
      fontFamily: assets.fonts.interLight,
      fontSize: 32,
      lineHeightMultiplier: 1.2,
      bulletIndentPt: 32 * 1.5,
    },
    [TEXT_STYLE.H3]: {
      fontFamily: assets.fonts.interLight,
      fontSize: 24,
      lineHeightMultiplier: 1.2,
      bulletIndentPt: 24 * 1.5,
    },
    [TEXT_STYLE.H4]: {
      fontFamily: assets.fonts.interLight,
      fontSize: 18,
      lineHeightMultiplier: 1.2,
      bulletIndentPt: 18 * 1.5,
    },
    [TEXT_STYLE.BODY]: {
      fontFamily: assets.fonts.interLight,
      fontSize: 14,
      lineHeightMultiplier: 1.2,
      bulletIndentPt: 14 * 1.5,
    },
    [TEXT_STYLE.CAPTION]: {
      fontFamily: assets.fonts.interLight,
      fontSize: 12,
      lineHeightMultiplier: 1.2,
      bulletIndentPt: 12 * 1.5,
    },
    [TEXT_STYLE.FOOTER]: {
      fontFamily: assets.fonts.interLight,
      fontSize: 8,
      lineHeightMultiplier: 1.0,
      bulletIndentPt: 8 * 1.5,
    },
    [TEXT_STYLE.CODE]: {
      fontFamily: assets.fonts.firaCode,
      fontSize: 11,
      lineHeightMultiplier: 1.6,
      bulletIndentPt: 0,
    },
  },
};

export const presentationChrome: ChromeConfig = {
  margin: 0.5,
  footerHeight: unit * 8,
};
