import type { TextStyle } from "@tycoslide/core";
import { SlideFormat } from "@tycoslide/sdk";
import { assets } from "../assets.js";
import { TEXT_STYLE } from "../base.js";

export interface FormatConfig {
  slide: { width: number; height: number };
  unit: number;
  spacing: number;
  spacingTight: number;
  padding: number;
  margin: number;
  footerHeight: number;
  textStyles: Record<string, TextStyle>;
}

const unit = 0.03125;

export const presentationConfig: FormatConfig = {
  slide: SlideFormat.s16x9,
  unit,
  spacing: unit * 8,
  spacingTight: unit * 4,
  padding: unit * 8,
  margin: 0.5,
  footerHeight: unit * 8,
  textStyles: {
    [TEXT_STYLE.TITLE]: {
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
    [TEXT_STYLE.SMALL]: {
      fontFamily: assets.fonts.interLight,
      fontSize: 12,
      lineHeightMultiplier: 1.2,
      bulletIndentPt: 12 * 1.5,
    },
    [TEXT_STYLE.EYEBROW]: {
      fontFamily: assets.fonts.inter,
      fontSize: 11,
      lineHeightMultiplier: 1.0,
      bulletIndentPt: 11 * 1.5,
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
