import { HALIGN, SHADOW_TYPE, VALIGN } from "@tycoslide/core";
import type { Format } from "@tycoslide/sdk";
import { SlideFormat, TEXT_STYLE } from "@tycoslide/sdk";
import { assets } from "../assets.js";
import type { ChromeConfig } from "./presentation.js";

const unit = 0.025;

export const factsheetFormat: Format = {
  slide: SlideFormat.letterPortrait,
  spacing: { base: unit * 5, tight: unit * 2.5 },
  padding: unit * 6,
  radius: 0.08,
  strokes: { hairline: 0.5, thin: 0.75, base: 1, thick: 2 },
  shadow: { type: SHADOW_TYPE.OUTER, opacity: 12, blur: 6, offset: 2, angle: 180 },
  hAlign: HALIGN.LEFT,
  vAlign: VALIGN.MIDDLE,
  textStyles: {
    [TEXT_STYLE.QUOTE]: {
      fontFamily: assets.fonts.inter,
      fontSize: 28,
      lineHeightMultiplier: 1.2,
      bulletIndentPt: 0,
    },
    [TEXT_STYLE.H1]: {
      fontFamily: assets.fonts.inter,
      fontSize: 20,
      lineHeightMultiplier: 1.2,
      bulletIndentPt: 20 * 1.5,
    },
    [TEXT_STYLE.H2]: {
      fontFamily: assets.fonts.inter,
      fontSize: 16,
      lineHeightMultiplier: 1.3,
      bulletIndentPt: 16 * 1.5,
    },
    [TEXT_STYLE.H3]: {
      fontFamily: assets.fonts.interLight,
      fontSize: 14,
      lineHeightMultiplier: 1.3,
      bulletIndentPt: 14 * 1.5,
    },
    [TEXT_STYLE.H4]: {
      fontFamily: assets.fonts.interLight,
      fontSize: 11,
      lineHeightMultiplier: 1.3,
      bulletIndentPt: 11 * 1.5,
    },
    [TEXT_STYLE.BODY]: {
      fontFamily: assets.fonts.interLight,
      fontSize: 10,
      lineHeightMultiplier: 1.4,
      bulletIndentPt: 10 * 1.5,
    },
    [TEXT_STYLE.CAPTION]: {
      fontFamily: assets.fonts.interLight,
      fontSize: 8,
      lineHeightMultiplier: 1.3,
      bulletIndentPt: 8 * 1.5,
    },
    [TEXT_STYLE.FOOTER]: {
      fontFamily: assets.fonts.interLight,
      fontSize: 7,
      lineHeightMultiplier: 1.0,
      bulletIndentPt: 7 * 1.5,
    },
    [TEXT_STYLE.CODE]: {
      fontFamily: assets.fonts.firaCode,
      fontSize: 9,
      lineHeightMultiplier: 1.6,
      bulletIndentPt: 0,
    },
  },
};

export const factsheetChrome: ChromeConfig = {
  margin: 0.5,
  footerHeight: unit * 6,
};
