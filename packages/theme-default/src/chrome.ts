// Chrome Composition Functions
// Higher-order layout wrappers that add slide chrome (footer, top bar, margins).
// Replaces the old MasterDefinition concept — chrome is now part of the layout tree.

import { HALIGN, LAYER, SHAPE, SIZE, VALIGN } from "@tycoslide/core";
import type { ImageTokens, LabelTokens, Layout, ShapeTokens, SlideNumberTokens } from "@tycoslide/sdk";
import { column, image, label, row, shape, slideNumber, stack } from "@tycoslide/sdk";

// ============================================
// CHROME TOKEN INTERFACES
// ============================================

export interface FooterChromeTokens {
  margin: number;
  footerHeight: number;
  footerLogo: string;
  footerText: string;
  footerSpacing: number;
  slideNumber: SlideNumberTokens;
  footer: LabelTokens;
  footerImage: ImageTokens;
}

export interface MarginChromeTokens {
  margin: number;
}

export interface FactsheetChromeTokens {
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

// ============================================
// CHROME COMPOSITION
// ============================================

/**
 * Wrap a layout with footer chrome: uniform margin padding + footer row at bottom.
 * The inner layout's content fills the space above the footer.
 */
export function withFooterChrome<
  TTokens extends object,
  TParams extends Record<string, any>,
  TSlots extends readonly string[],
>(innerLayout: Layout<TTokens, TParams, TSlots>, chrome: FooterChromeTokens): Layout<TTokens, TParams, TSlots> {
  return {
    params: innerLayout.params,
    slots: innerLayout.slots,
    render: (params, slots, tokens) => {
      const content = innerLayout.render(params, slots, tokens);
      // Footer row: original footerHeight, horizontally inset by margin
      const footerRow = row(
        {
          spacing: 0,
          height: chrome.footerHeight,
          vAlign: VALIGN.MIDDLE,
          hAlign: HALIGN.CENTER,
        },
        column({ spacing: 0, width: chrome.margin }),
        image(chrome.footerLogo, chrome.footerImage),
        column({ spacing: 0, width: chrome.footerSpacing }),
        label(chrome.footerText, chrome.footer),
        column({ spacing: 0, width: chrome.footerSpacing }),
        slideNumber(chrome.slideNumber),
        column({ spacing: 0, width: chrome.margin }),
      );
      footerRow.layer = LAYER.MASTER;
      // Bottom breathing (matches old master's margin/4 padding)
      const bottomSpacer = column({ spacing: 0, height: chrome.margin / 4 });
      bottomSpacer.layer = LAYER.MASTER;
      return column(
        { spacing: 0, height: SIZE.FILL },
        // Content area with margin padding fills remaining space
        column({ spacing: 0, height: SIZE.FILL, padding: chrome.margin }, content),
        // Footer on master layer (shared/deduped across slides)
        footerRow,
        bottomSpacer,
      );
    },
  };
}

/**
 * Wrap a layout with margin-only chrome: uniform padding, no footer or other elements.
 */
export function withMarginChrome<
  TTokens extends object,
  TParams extends Record<string, any>,
  TSlots extends readonly string[],
>(innerLayout: Layout<TTokens, TParams, TSlots>, chrome: MarginChromeTokens): Layout<TTokens, TParams, TSlots> {
  return {
    params: innerLayout.params,
    slots: innerLayout.slots,
    render: (params, slots, tokens) => {
      const content = innerLayout.render(params, slots, tokens);
      return column({ spacing: 0, height: SIZE.FILL, padding: chrome.margin }, content);
    },
  };
}

/**
 * Wrap a layout with factsheet chrome: top bar + footer.
 * Content fills the space between top bar and footer.
 */
export function withFactsheetChrome<
  TTokens extends object,
  TParams extends Record<string, any>,
  TSlots extends readonly string[],
>(innerLayout: Layout<TTokens, TParams, TSlots>, chrome: FactsheetChromeTokens): Layout<TTokens, TParams, TSlots> {
  return {
    params: innerLayout.params,
    slots: innerLayout.slots,
    render: (params, slots, tokens) => {
      const content = innerLayout.render(params, slots, tokens);
      // Top bar on master layer (shared/deduped across slides)
      const topBar = stack(
        { height: chrome.topBarHeight },
        shape(chrome.topBarFill, { shape: SHAPE.RECTANGLE }),
        row(
          { spacing: 0, height: chrome.topBarHeight, vAlign: VALIGN.MIDDLE },
          column({ spacing: 0, width: chrome.margin }),
          column(
            { spacing: 0, width: chrome.topBarLogoWidth, height: chrome.topBarLogoHeight },
            image(chrome.topBarLogo, chrome.topBarLogoTokens),
          ),
          column({ spacing: 0, width: SIZE.FILL }),
          label(chrome.topBarLabel, chrome.topBarLabelTokens),
          column({ spacing: 0, width: chrome.margin }),
        ),
      );
      topBar.layer = LAYER.MASTER;
      // Footer on master layer
      const footerRow = row(
        {
          spacing: 0,
          height: chrome.footerHeight + chrome.margin,
          vAlign: VALIGN.MIDDLE,
        },
        column({ spacing: 0, width: chrome.margin }),
        label(chrome.footerText, chrome.footerTokens),
        column({ spacing: 0, width: SIZE.FILL }),
        slideNumber(chrome.slideNumber),
        column({ spacing: 0, width: chrome.margin }),
      );
      footerRow.layer = LAYER.MASTER;
      return column(
        { spacing: 0, height: SIZE.FILL },
        topBar,
        // Content area with side + vertical margins
        column({ spacing: 0, height: SIZE.FILL, padding: chrome.margin }, content),
        footerRow,
      );
    },
  };
}
