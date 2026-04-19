import { HALIGN, VALIGN } from "@tycoslide/core";
import { SlideFormat } from "@tycoslide/sdk";
import { assets } from "../assets.js";
import { TEXT_STYLE, imageBase, palette } from "../base.js";
import type { Format } from "../buildFormat.js";
import { defaultMaster, MASTER, minimalMaster } from "../master.js";

const unit = 0.03125;
const spacingTight = unit * 4;
const margin = 0.5;
const footerHeight = unit * 8;

const labelFooter = { style: TEXT_STYLE.FOOTER, color: palette.textSecondary, hAlign: HALIGN.LEFT, vAlign: VALIGN.MIDDLE };

export const presentationFormat: Format = {
  slide: SlideFormat.s16x9,
  unit,
  spacing: unit * 8,
  spacingTight,
  padding: unit * 8,
  margin,
  footerHeight,
  headerTitleStyle: TEXT_STYLE.H3,
  primaryMaster: {
    masterName: MASTER.DEFAULT,
    tokens: defaultMaster.tokenMap({
      background: { color: palette.surface },
      margin,
      footerHeight,
      footerLogo: assets.tycoslide.logo,
      footerText: "tycoslide",
      footerSpacing: spacingTight,
      slideNumber: { ...labelFooter, hAlign: HALIGN.RIGHT },
      footer: labelFooter,
      footerImage: imageBase,
    }),
  },
  lightMinimalMaster: {
    masterName: MASTER.MINIMAL,
    tokens: minimalMaster.tokenMap({
      background: { color: palette.surface },
      margin,
    }),
  },
  darkMinimalMaster: {
    masterName: MASTER.MINIMAL,
    tokens: minimalMaster.tokenMap({
      background: { color: palette.textPrimary },
      margin,
    }),
  },
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
