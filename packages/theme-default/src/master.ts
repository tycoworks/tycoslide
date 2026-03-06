// Default Master Slide
// Full-slide layout with footer (copyright + slide number)

import {
  HALIGN,
  VALIGN,
  TEXT_STYLE,
  GAP,
  SIZE,
  type Master,
  Bounds,
  type Theme,
} from 'tycoslide';
import { row, column, plainText, slideNumber } from 'tycoslide-components';

function masterContent(t: Theme) {
  const { margin, unit } = t.spacing;
  const { width, height } = t.slide;
  const footerHeight = unit * 8;

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
      plainText('tycoworks', {
        style: TEXT_STYLE.FOOTER,
        hAlign: HALIGN.LEFT,
        vAlign: VALIGN.MIDDLE,
      }),
      slideNumber(),
    ),
  );

  return { content, contentBounds };
}

export const DEFAULT_MASTER: Master = {
  name: 'DEFAULT',
  getContent: masterContent,
};
