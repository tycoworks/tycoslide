// Master Slide Definitions
// Two masters: default (footer chrome) and minimal (margin + background only).

import { type Background, Bounds, defineMaster, HALIGN, type InferTokens, SIZE, token, VALIGN } from "tycoslide";
import type { PlainTextTokens, SlideNumberTokens } from "tycoslide-components";
import { column, image, plainText, row, slideNumber } from "tycoslide-components";

// ============================================
// DEFAULT MASTER — footer chrome + margin
// ============================================

export const defaultMasterTokens = token.shape({
  background: token.required<Background>(),
  margin: token.required<number>(),
  footerHeight: token.required<number>(),
  footerLogo: token.required<string>(),
  footerText: token.required<string>(),
  footerSpacing: token.required<number>(),
  slideNumber: token.required<SlideNumberTokens>(),
  footer: token.required<PlainTextTokens>(),
});

export type DefaultMasterTokens = InferTokens<typeof defaultMasterTokens>;

export const defaultMaster = defineMaster({
  name: "default",
  tokens: defaultMasterTokens,
  render: (tokens, slideSize) => {
    const { background, margin, footerHeight } = tokens;
    const breathing = footerHeight / 2;
    const contentBounds = new Bounds(
      margin,
      margin + breathing,
      slideSize.width - margin * 2,
      slideSize.height - margin - margin / 4 - footerHeight - breathing * 2,
    );

    const content = column(
      { spacing: 0, height: SIZE.FILL, vAlign: VALIGN.BOTTOM, padding: margin / 4, hAlign: HALIGN.CENTER },
      row(
        {
          spacing: tokens.footerSpacing,
          height: footerHeight,
          vAlign: VALIGN.MIDDLE,
          width: slideSize.width - margin * 2,
        },
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

export const minimalMasterTokens = token.shape({
  background: token.required<Background>(),
  margin: token.required<number>(),
});

export type MinimalMasterTokens = InferTokens<typeof minimalMasterTokens>;

export const minimalMaster = defineMaster({
  name: "minimal",
  tokens: minimalMasterTokens,
  render: (tokens, slideSize) => {
    const { background, margin } = tokens;
    const contentBounds = new Bounds(margin, margin, slideSize.width - margin * 2, slideSize.height - margin * 2);

    return {
      content: column({ spacing: 0, height: SIZE.FILL }),
      contentBounds,
      background,
    };
  },
});
