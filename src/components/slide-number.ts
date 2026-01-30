// SlideNumber Component
// Renders a native PowerPoint slide number field via PPTXGen.js

import { TEXT_STYLE, FONT_WEIGHT, type AlignContext, type Component, type Drawer, type Bounds, type Theme, type TextAlignment, type VerticalAlignment, type FontWeight } from '../core/types.js';
import { getFontFromFamily, getLineHeight } from '../utils/font-utils.js';

export interface SlideNumberProps {
  color?: string;
  fontSize?: number;
  fontFace?: string;
  bold?: boolean;
  align?: TextAlignment;
  valign?: VerticalAlignment;
}

export class SlideNumber implements Component {
  constructor(private theme: Theme, private props: SlideNumberProps = {}) {}

  private getStyleAndFont() {
    const style = this.theme.textStyles[TEXT_STYLE.FOOTER];
    const weight: FontWeight = this.props.bold ? FONT_WEIGHT.BOLD : (style.defaultWeight ?? FONT_WEIGHT.NORMAL);
    const font = getFontFromFamily(style.fontFamily, weight);
    const fontSize = this.props.fontSize ?? style.fontSize;
    return { style, font, fontSize };
  }

  getMinimumHeight(_width: number): number {
    const { font, fontSize } = this.getStyleAndFont();
    return getLineHeight(font.path, fontSize);
  }

  getMaximumHeight(width: number): number {
    return this.getMinimumHeight(width);
  }

  getMinimumWidth(_height: number): number {
    // Enough for "99" in footer font size
    const { font, fontSize } = this.getStyleAndFont();
    return getLineHeight(font.path, fontSize) * 2;
  }

  prepare(bounds: Bounds, _alignContext?: AlignContext): Drawer {
    const { style, font, fontSize } = this.getStyleAndFont();

    return (canvas) => {
      canvas.addSlideNumber({
        x: bounds.x,
        y: bounds.y,
        w: bounds.w,
        h: bounds.h,
        fontFace: this.props.fontFace ?? font.name,
        fontSize,
        color: this.props.color ?? style.color ?? this.theme.colors.textMuted,
        bold: this.props.bold,
        align: this.props.align,
        valign: this.props.valign,
      });
    };
  }
}
