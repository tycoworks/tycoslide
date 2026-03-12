// Master Slide Definitions
// Two masters: default (footer chrome) and minimal (margin + background only).

import { type Background, Bounds, defineMaster, GAP, HALIGN, SIZE, VALIGN } from "tycoslide";
import type { PlainTextTokens, SlideNumberTokens } from "tycoslide-components";
import { column, image, plainText, row, slideNumber } from "tycoslide-components";

// ============================================
// DEFAULT MASTER — footer chrome + margin
// ============================================

interface DefaultMasterTokens {
  background: Background;
  margin: number;
  footerHeight: number;
  footerLogo: string;
  footerText: string;
  slideNumber: SlideNumberTokens;
  footer: PlainTextTokens;
}

export const defaultMaster = defineMaster<DefaultMasterTokens>({
  name: "default",
  tokens: ["background", "margin", "footerHeight", "footerLogo", "footerText", "slideNumber", "footer"],
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

interface MinimalMasterTokens {
  background: Background;
  margin: number;
}

export const minimalMaster = defineMaster<MinimalMasterTokens>({
  name: "minimal",
  tokens: ["background", "margin"],
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
