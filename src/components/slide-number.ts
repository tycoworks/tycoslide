// SlideNumber Component
// Renders a native PowerPoint slide number field via PPTXGen.js
// Delegates measurement to Text component with "999" placeholder

import { TEXT_STYLE, VALIGN, type AlignContext, type Component, type Drawer, type Bounds, type Theme, type HorizontalAlignment, type VerticalAlignment } from '../core/types.js';
import { Text } from './text.js';
import type { TextMeasurer } from '../utils/text-measurer.js';

export interface SlideNumberProps {
  color?: string;
  hAlign?: HorizontalAlignment;
  vAlign?: VerticalAlignment;
}

export class SlideNumber implements Component {
  private placeholder: Text;

  constructor(private theme: Theme, private measurer: TextMeasurer, private props: SlideNumberProps = {}) {
    // Use "999" as placeholder for measurement (covers 3-digit slide counts)
    this.placeholder = new Text(theme, measurer, '999', {
      style: TEXT_STYLE.FOOTER,
      color: props.color,
      hAlign: props.hAlign,
      vAlign: props.vAlign,
    });
  }

  getHeight(width: number): number {
    return this.placeholder.getHeight(width);
  }

  getMinHeight(width: number): number {
    return this.placeholder.getMinHeight(width);
  }

  getWidth(height: number): number {
    return this.placeholder.getWidth(height);
  }

  prepare(bounds: Bounds, alignContext?: AlignContext): Drawer {
    const style = this.theme.textStyles[TEXT_STYLE.FOOTER];

    // Alignment: props take precedence, then alignContext
    const align = this.props.hAlign ?? alignContext?.hAlign;
    const valign: VerticalAlignment = this.props.vAlign ?? alignContext?.vAlign ?? VALIGN.TOP;

    return (canvas) => {
      canvas.addSlideNumber({
        x: bounds.x,
        y: bounds.y,
        w: bounds.w,
        h: bounds.h,
        fontSize: style.fontSize,
        color: this.props.color ?? style.color ?? this.theme.colors.textMuted,
        align,
        valign,
        margin: 0,
      });
    };
  }
}
