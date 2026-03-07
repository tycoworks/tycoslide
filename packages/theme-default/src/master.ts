// Default Master Slide
// Full-slide layout with footer (copyright + slide number)

import {
  VALIGN,
  GAP,
  SIZE,
  type Master,
  Bounds,
  type Theme,
} from 'tycoslide';
import { row, column, plainText, slideNumber } from 'tycoslide-components';
import type { PlainTextTokens, SlideNumberTokens } from 'tycoslide-components';

function masterContent(t: Theme) {
  const { width, height, margin } = t.slide;
  const masterTokens = t.master as { footerHeight: number; slideNumber: SlideNumberTokens; footer: PlainTextTokens };
  const { footerHeight } = masterTokens;

  const contentBounds = new Bounds(
    margin,
    margin,
    width - margin * 2,
    height - margin * 2 - footerHeight,
  );

  const content = column(
    { height: SIZE.FILL, vAlign: VALIGN.BOTTOM, padding: margin },
    row(
      { gap: GAP.TIGHT, height: footerHeight, vAlign: VALIGN.MIDDLE },
      plainText('tycoworks', masterTokens.footer),
      slideNumber(masterTokens.slideNumber),
    ),
  );

  return { content, contentBounds };
}

export const DEFAULT_MASTER: Master = {
  name: 'DEFAULT',
  background: 'FFFFFF',
  getContent: masterContent,
};
