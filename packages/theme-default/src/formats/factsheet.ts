import { HALIGN, VALIGN } from "@tycoslide/core";
import { SlideFormat } from "@tycoslide/sdk";
import { assets } from "../assets.js";
import { TEXT_STYLE, alignLeft, palette } from "../base.js";
import type { Format } from "../buildFormat.js";
import { factsheetMaster, MASTER, minimalMaster } from "../master.js";

const unit = 0.025;
const spacingTight = unit * 2.5;
const margin = 0.5;
const footerHeight = unit * 6;

const labelFooter = { style: TEXT_STYLE.FOOTER, color: palette.textSecondary, hAlign: HALIGN.LEFT, vAlign: VALIGN.MIDDLE };

export const factsheetFormat: Format = {
  slide: SlideFormat.letterPortrait,
  unit,
  spacing: unit * 5,
  spacingTight,
  padding: unit * 6,
  margin,
  footerHeight,
  headerTitleStyle: TEXT_STYLE.H1,
  quoteBarWidth: 1,
  quoteAttribution: { ...alignLeft, style: TEXT_STYLE.BODY, color: palette.textSecondary, hAlign: HALIGN.RIGHT },
  excludeLayouts: ["shapes", "lines", "transform"],
  primaryMaster: {
    masterName: MASTER.FACTSHEET,
    tokens: factsheetMaster.tokenMap({
      background: { color: palette.white },
      margin,
      topBarHeight: unit * 36,
      topBarFill: { fill: palette.textPrimary, fillOpacity: 100, cornerRadius: 0 },
      topBarLogo: assets.tycoslide.logomarkWhite,
      topBarLogoTokens: { padding: 0 },
      topBarLogoHeight: unit * 10,
      topBarLogoWidth: unit * 37,
      topBarLabel: "PRODUCT SHEET",
      topBarLabelTokens: {
        hAlign: HALIGN.RIGHT,
        vAlign: VALIGN.MIDDLE,
        style: TEXT_STYLE.EYEBROW,
        color: palette.white,
      },
      footerHeight,
      footerText: "\u00A9 2026 tycoslide | www.tycoslide.com",
      footerTokens: { ...labelFooter, hAlign: HALIGN.LEFT },
      slideNumber: { ...labelFooter, hAlign: HALIGN.RIGHT },
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
      fontSize: 28,
      lineHeightMultiplier: 1.2,
      bulletIndentPt: 0,
    },
    [TEXT_STYLE.H1]: {
      fontFamily: assets.fonts.inter,
      fontSize: 24,
      lineHeightMultiplier: 1.2,
      bulletIndentPt: 24 * 1.5,
    },
    [TEXT_STYLE.H2]: {
      fontFamily: assets.fonts.inter,
      fontSize: 14,
      lineHeightMultiplier: 1.3,
      bulletIndentPt: 14 * 1.5,
    },
    [TEXT_STYLE.H3]: {
      fontFamily: assets.fonts.interLight,
      fontSize: 12,
      lineHeightMultiplier: 1.3,
      bulletIndentPt: 12 * 1.5,
    },
    [TEXT_STYLE.H4]: {
      fontFamily: assets.fonts.interLight,
      fontSize: 10,
      lineHeightMultiplier: 1.3,
      bulletIndentPt: 10 * 1.5,
    },
    [TEXT_STYLE.BODY]: {
      fontFamily: assets.fonts.interLight,
      fontSize: 10,
      lineHeightMultiplier: 1.4,
      bulletIndentPt: 10 * 1.5,
    },
    [TEXT_STYLE.SMALL]: {
      fontFamily: assets.fonts.interLight,
      fontSize: 8,
      lineHeightMultiplier: 1.3,
      bulletIndentPt: 8 * 1.5,
    },
    [TEXT_STYLE.EYEBROW]: {
      fontFamily: assets.fonts.inter,
      fontSize: 8,
      lineHeightMultiplier: 1.0,
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
