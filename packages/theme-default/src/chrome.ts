// Chrome Composition Functions
// Higher-order layout wrappers that add slide chrome (footer, top bar, margins).
// Replaces the old MasterDefinition concept — chrome is now part of the layout tree.

import type { ImageTokens, LabelTokens, Layout, SlideNumberTokens } from "@tycoslide/sdk";
import { column, HALIGN, Insets, image, LAYER, label, row, SIZE, slideNumber, VALIGN } from "@tycoslide/sdk";

// ============================================
// CHROME TOKEN INTERFACES
// ============================================

export interface FooterChromeTokens {
  margin: number;
  footerWeight: number;
  footerLogo: string;
  footerText: string;
  footerSpacing: number;
  bottomPadding: number;
  slideNumber: SlideNumberTokens;
  footer: LabelTokens;
  footerImage: ImageTokens;
}

export interface MarginChromeTokens {
  margin: number;
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
      const footerRow = row(
        {
          height: SIZE.FILL,
          weight: chrome.footerWeight,
          vAlign: VALIGN.MIDDLE,
          hAlign: HALIGN.CENTER,
          padding: new Insets(0, chrome.margin, 0, chrome.margin),
          spacing: chrome.footerSpacing,
        },
        image(chrome.footerLogo, chrome.footerImage),
        label(chrome.footerText, chrome.footer),
        slideNumber(chrome.slideNumber),
      );
      footerRow.layer = LAYER.MASTER;
      return column(
        { height: SIZE.FILL, padding: new Insets(0, 0, chrome.bottomPadding, 0) },
        column(
          {
            height: SIZE.FILL,
            padding: new Insets(chrome.margin, chrome.margin, 0, chrome.margin),
          },
          content,
        ),
        footerRow,
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
      return column({ height: SIZE.FILL, padding: chrome.margin }, content);
    },
  };
}
