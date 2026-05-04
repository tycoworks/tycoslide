// Master Slide Builders
// Builder functions that produce format-specific MasterDefinition objects.
// Tokens and slide dimensions are baked in at theme definition time.

import { type Background, Bounds, HALIGN, type MasterDefinition, SHAPE, SIZE, VALIGN } from "@tycoslide/core";
import type { ImageTokens, LabelTokens, ShapeTokens, SlideNumberTokens } from "@tycoslide/sdk";
import { column, image, label, row, shape, slideNumber, stack } from "@tycoslide/sdk";

/** Registered master names. */
export const MASTER = {
  DEFAULT: "default",
  LIGHT_MINIMAL: "light-minimal",
  DARK_MINIMAL: "dark-minimal",
  FACTSHEET: "factsheet",
} as const;

// ============================================
// DEFAULT MASTER — footer chrome + margin
// ============================================

export interface DefaultMasterTokens {
  background: Background;
  margin: number;
  footerHeight: number;
  footerLogo: string;
  footerText: string;
  footerSpacing: number;
  slideNumber: SlideNumberTokens;
  footer: LabelTokens;
  footerImage: ImageTokens;
}

export function buildDefaultMaster(
  name: string,
  tokens: DefaultMasterTokens,
  slideSize: { width: number; height: number },
): MasterDefinition {
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

  return { name, content, contentBounds, background };
}

// ============================================
// MINIMAL MASTER — margin + background, no chrome
// ============================================

export interface MinimalMasterTokens {
  background: Background;
  margin: number;
}

export function buildMinimalMaster(
  name: string,
  tokens: MinimalMasterTokens,
  slideSize: { width: number; height: number },
): MasterDefinition {
  const { background, margin } = tokens;
  const contentBounds = new Bounds(margin, margin, slideSize.width - margin * 2, slideSize.height - margin * 2);

  return {
    name,
    content: column({ spacing: 0, height: SIZE.FILL }),
    contentBounds,
    background,
  };
}

// ============================================
// FACTSHEET MASTER — header chrome + footer slide number
// ============================================

export interface FactsheetMasterTokens {
  background: Background;
  margin: number;
  topBarHeight: number;
  topBarFill: ShapeTokens;
  topBarLogo: string;
  topBarLogoTokens: ImageTokens;
  topBarLogoHeight: number;
  topBarLogoWidth: number;
  topBarLabel: string;
  topBarLabelTokens: LabelTokens;
  footerHeight: number;
  footerText: string;
  footerTokens: LabelTokens;
  slideNumber: SlideNumberTokens;
}

export function buildFactsheetMaster(
  name: string,
  tokens: FactsheetMasterTokens,
  slideSize: { width: number; height: number },
): MasterDefinition {
  const { background, margin, topBarHeight, footerHeight } = tokens;
  const contentWidth = slideSize.width - margin * 2;

  // Content bounds: below top bar + breathing room, above footer + breathing room
  const contentTop = topBarHeight + margin;
  const bottomReserved = footerHeight + margin;
  const contentBounds = new Bounds(margin, contentTop, contentWidth, slideSize.height - contentTop - bottomReserved);

  const content = column(
    { spacing: 0, height: SIZE.FILL },
    // Purple top bar with logo inside
    stack(
      { height: topBarHeight },
      shape(tokens.topBarFill, { shape: SHAPE.RECTANGLE }),
      row(
        { spacing: 0, height: topBarHeight, vAlign: VALIGN.MIDDLE },
        column({ spacing: 0, width: margin }),
        column(
          { spacing: 0, width: tokens.topBarLogoWidth, height: tokens.topBarLogoHeight },
          image(tokens.topBarLogo, tokens.topBarLogoTokens),
        ),
        column({ spacing: 0, width: SIZE.FILL }),
        label(tokens.topBarLabel, tokens.topBarLabelTokens),
        column({ spacing: 0, width: margin }),
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
      column({ spacing: 0, width: margin }),
      label(tokens.footerText, tokens.footerTokens),
      column({ spacing: 0, width: SIZE.FILL }),
      slideNumber(tokens.slideNumber),
      column({ spacing: 0, width: margin }),
    ),
  );

  return { name, content, contentBounds, background };
}
