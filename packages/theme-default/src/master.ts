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

function masterContent(t: Theme) {
  const { width, height, margin } = t.slide;
  const { background, footerHeight, footerText, slideNumber: slideNumberTokens, footer: footerTokens } = t.master;

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
      plainText(footerText, footerTokens),
      slideNumber(slideNumberTokens),
    ),
  );

  return { content, contentBounds, background };
}

export const DEFAULT_MASTER: Master = {
  name: 'DEFAULT',
  getContent: masterContent,
};
