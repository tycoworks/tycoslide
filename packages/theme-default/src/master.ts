// Master Slide Definitions
// Three masters: default (footer chrome), minimal (margin + background only),
// factsheet (header chrome + footer slide number).

import {
  type Background,
  Bounds,
  defineMaster,
  HALIGN,
  type InferTokens,
  SHAPE,
  SIZE,
  token,
  VALIGN,
} from "@tycoslide/core";
import type { ImageTokens, LabelTokens, ShapeTokens, SlideNumberTokens } from "@tycoslide/sdk";
import { column, image, label, row, shape, slideNumber, stack } from "@tycoslide/sdk";

/** Pairs a master name with its token values. Layouts use this to stay format-agnostic. */
export interface MasterRef {
  masterName: string;
  tokens: Record<string, unknown>;
}

/** Registered master names. */
export const MASTER = { DEFAULT: "default", MINIMAL: "minimal", FACTSHEET: "factsheet" } as const;

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
  footer: token.required<LabelTokens>(),
  footerImage: token.required<ImageTokens>(),
});

export type DefaultMasterTokens = InferTokens<typeof defaultMasterTokens>;

export const defaultMaster = defineMaster({
  name: MASTER.DEFAULT,
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
        image(tokens.footerLogo, tokens.footerImage),
        label(tokens.footerText, tokens.footer),
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
  name: MASTER.MINIMAL,
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

// ============================================
// FACTSHEET MASTER — header chrome + footer slide number
// ============================================

export const factsheetMasterTokens = token.shape({
  background: token.required<Background>(),
  margin: token.required<number>(),
  topBarHeight: token.required<number>(),
  topBarFill: token.required<ShapeTokens>(),
  topBarLogo: token.required<string>(),
  topBarLogoTokens: token.required<ImageTokens>(),
  topBarLogoHeight: token.required<number>(),
  topBarLogoWidth: token.required<number>(),
  topBarLabel: token.required<string>(),
  topBarLabelTokens: token.required<LabelTokens>(),
  footerHeight: token.required<number>(),
  footerText: token.required<string>(),
  footerTokens: token.required<LabelTokens>(),
  slideNumber: token.required<SlideNumberTokens>(),
});

export type FactsheetMasterTokens = InferTokens<typeof factsheetMasterTokens>;

export const factsheetMaster = defineMaster({
  name: MASTER.FACTSHEET,
  tokens: factsheetMasterTokens,
  render: (tokens, slideSize) => {
    const { background, margin, topBarHeight, footerHeight } = tokens;
    const contentWidth = slideSize.width - margin * 2;

    // Content bounds: below top bar + breathing room, above footer + breathing room
    const contentTop = topBarHeight + margin;
    const bottomReserved = footerHeight + margin; // footer row + bottom breathing spacer
    const contentBounds = new Bounds(margin, contentTop, contentWidth, slideSize.height - contentTop - bottomReserved);

    const content = column(
      { spacing: 0, height: SIZE.FILL },
      // Purple top bar with logo inside
      stack(
        { height: topBarHeight },
        shape(tokens.topBarFill, { shape: SHAPE.RECTANGLE }),
        row(
          { spacing: 0, height: topBarHeight, vAlign: VALIGN.MIDDLE },
          column({ spacing: 0, width: margin }), // left spacer to align with content margin
          column(
            { spacing: 0, width: tokens.topBarLogoWidth, height: tokens.topBarLogoHeight },
            image(tokens.topBarLogo, tokens.topBarLogoTokens),
          ),
          column({ spacing: 0, width: SIZE.FILL }), // flexible spacer pushes label right
          label(tokens.topBarLabel, tokens.topBarLabelTokens),
          column({ spacing: 0, width: margin }), // right spacer
        ),
      ),
      // Spacer fills middle
      column({ spacing: 0, height: SIZE.FILL }),
      // Footer: copyright left, slide number right, vertically centered
      row(
        {
          spacing: 0,
          height: bottomReserved,
          vAlign: VALIGN.MIDDLE,
        },
        column({ spacing: 0, width: margin }), // left spacer to align with content margin
        label(tokens.footerText, tokens.footerTokens),
        column({ spacing: 0, width: SIZE.FILL }), // flexible spacer
        slideNumber(tokens.slideNumber),
        column({ spacing: 0, width: margin }), // right spacer to align with content margin
      ),
    );

    return { content, contentBounds, background };
  },
});
