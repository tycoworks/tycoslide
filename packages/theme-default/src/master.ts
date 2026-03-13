// Master Slide Definitions
// Two masters: default (footer chrome) and minimal (margin + background only).

import { type Background, Bounds, defineMaster, GAP, HALIGN, SIZE, token, VALIGN } from "tycoslide";
import type { PlainTextTokens, SlideNumberTokens } from "tycoslide-components";
import { column, image, plainText, row, slideNumber } from "tycoslide-components";

// ============================================
// DEFAULT MASTER — footer chrome + margin
// ============================================

export const DEFAULT_MASTER_TOKEN = {
  BACKGROUND: "background",
  MARGIN: "margin",
  FOOTER_HEIGHT: "footerHeight",
  FOOTER_LOGO: "footerLogo",
  FOOTER_TEXT: "footerText",
  SLIDE_NUMBER: "slideNumber",
  FOOTER: "footer",
} as const;

export interface DefaultMasterTokens {
  [DEFAULT_MASTER_TOKEN.BACKGROUND]: Background;
  [DEFAULT_MASTER_TOKEN.MARGIN]: number;
  [DEFAULT_MASTER_TOKEN.FOOTER_HEIGHT]: number;
  [DEFAULT_MASTER_TOKEN.FOOTER_LOGO]: string;
  [DEFAULT_MASTER_TOKEN.FOOTER_TEXT]: string;
  [DEFAULT_MASTER_TOKEN.SLIDE_NUMBER]: SlideNumberTokens;
  [DEFAULT_MASTER_TOKEN.FOOTER]: PlainTextTokens;
}

export const defaultMaster = defineMaster<DefaultMasterTokens>({
  name: "default",
  tokens: token.allRequired(DEFAULT_MASTER_TOKEN),
  getContent: (tokens, slideSize) => {
    const { background, margin, footerHeight } = tokens;
    const breathing = footerHeight / 2;
    const contentBounds = new Bounds(
      margin,
      margin + breathing,
      slideSize.width - margin * 2,
      slideSize.height - margin - margin / 4 - footerHeight - breathing * 2,
    );

    const content = column(
      { height: SIZE.FILL, vAlign: VALIGN.BOTTOM, padding: margin / 4, hAlign: HALIGN.CENTER },
      row(
        { gap: GAP.TIGHT, height: footerHeight, vAlign: VALIGN.MIDDLE, width: slideSize.width - margin * 2 },
        image(tokens.footerLogo),
        plainText(tokens.footerText, tokens.footer),
        slideNumber(tokens.slideNumber),
      ),
    );

    return { content, contentBounds, background };
  },
});

// ============================================
// MINIMAL MASTER — margin + background, no chrome
// ============================================

export const MINIMAL_MASTER_TOKEN = {
  BACKGROUND: "background",
  MARGIN: "margin",
} as const;

export interface MinimalMasterTokens {
  [MINIMAL_MASTER_TOKEN.BACKGROUND]: Background;
  [MINIMAL_MASTER_TOKEN.MARGIN]: number;
}

export const minimalMaster = defineMaster<MinimalMasterTokens>({
  name: "minimal",
  tokens: token.allRequired(MINIMAL_MASTER_TOKEN),
  getContent: (tokens, slideSize) => {
    const { background, margin } = tokens;
    const contentBounds = new Bounds(margin, margin, slideSize.width - margin * 2, slideSize.height - margin * 2);

    return {
      content: column({ height: SIZE.FILL }),
      contentBounds,
      background,
    };
  },
});
