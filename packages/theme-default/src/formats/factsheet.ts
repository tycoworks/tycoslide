import { SlideFormat, TEXT_STYLE } from "@tycoslide/sdk";
import { assets } from "../assets.js";
import type { FormatConfig } from "./presentation.js";

const unit = 0.025;

export const factsheetConfig: FormatConfig = {
  slide: SlideFormat.letterPortrait,
  unit,
  spacing: unit * 5,
  spacingTight: unit * 2.5,
  padding: unit * 6,
  margin: 0.5,
  footerHeight: unit * 6,
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
