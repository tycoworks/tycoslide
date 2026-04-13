import { SlideFormat } from "@tycoslide/sdk";
import { assets } from "../assets.js";
import { TEXT_STYLE } from "../base.js";
import type { FormatConfig } from "./presentation.js";

const unit = 0.025;

export const factsheetConfig: FormatConfig = {
  slide: SlideFormat.letterPortrait,
  unit,
  spacing: unit * 6,
  spacingTight: unit * 3,
  padding: unit * 6,
  margin: 0.75,
  footerHeight: unit * 6,
  textStyles: {
    [TEXT_STYLE.TITLE]: {
      fontFamily: assets.fonts.inter,
      fontSize: 28,
      lineHeightMultiplier: 1.2,
      bulletIndentPt: 0,
    },
    [TEXT_STYLE.H1]: {
      fontFamily: assets.fonts.interLight,
      fontSize: 28,
      lineHeightMultiplier: 1.2,
      bulletIndentPt: 28 * 1.5,
    },
    [TEXT_STYLE.H2]: {
      fontFamily: assets.fonts.interLight,
      fontSize: 22,
      lineHeightMultiplier: 1.2,
      bulletIndentPt: 22 * 1.5,
    },
    [TEXT_STYLE.H3]: {
      fontFamily: assets.fonts.interLight,
      fontSize: 18,
      lineHeightMultiplier: 1.2,
      bulletIndentPt: 18 * 1.5,
    },
    [TEXT_STYLE.H4]: {
      fontFamily: assets.fonts.interLight,
      fontSize: 14,
      lineHeightMultiplier: 1.2,
      bulletIndentPt: 14 * 1.5,
    },
    [TEXT_STYLE.BODY]: {
      fontFamily: assets.fonts.interLight,
      fontSize: 11,
      lineHeightMultiplier: 1.2,
      bulletIndentPt: 11 * 1.5,
    },
    [TEXT_STYLE.SMALL]: {
      fontFamily: assets.fonts.interLight,
      fontSize: 10,
      lineHeightMultiplier: 1.2,
      bulletIndentPt: 10 * 1.5,
    },
    [TEXT_STYLE.EYEBROW]: {
      fontFamily: assets.fonts.inter,
      fontSize: 9,
      lineHeightMultiplier: 1.0,
      bulletIndentPt: 9 * 1.5,
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
