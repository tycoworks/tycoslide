// Default Master Slide
// Simple footer with copyright placeholder and slide number

import {
  HALIGN,
  VALIGN,
  TEXT_STYLE,
  GAP,
  SIZE,
  CONTENT,
  type Master,
  Bounds,
  type Theme,
} from 'tycoslide';
import { row, column, text, slideNumber } from 'tycoslide-components';

const unit = 0.03125;
export const FOOTER_HEIGHT = unit * 8; // 0.25"

function masterContent(t: Theme) {
  const { margin } = t.spacing;
  const { width, height } = t.slide;

  const contentBounds = new Bounds(
    margin,
    margin,
    width - margin * 2,
    height - margin * 2 - FOOTER_HEIGHT,
  );

  const content = row(
    { gap: GAP.TIGHT, height: FOOTER_HEIGHT, vAlign: VALIGN.MIDDLE },
    column(
      { width: SIZE.FILL, vAlign: VALIGN.MIDDLE },
      text('Your Company Name', {
        content: CONTENT.PLAIN,
        style: TEXT_STYLE.FOOTER,
        hAlign: HALIGN.LEFT,
        vAlign: VALIGN.MIDDLE,
      }),
    ),
    slideNumber(),
  );

  return { content, contentBounds };
}

export const DEFAULT_MASTER: Master = {
  name: 'DEFAULT',
  getContent: masterContent,
};
