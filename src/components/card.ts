// Card Component
// Styled container with optional background, border, image, and title/description
// Uses grid primitives (stackV) instead of Box

import { SHAPE, TEXT_STYLE, GAP, JUSTIFY, type Component, type Drawer, type Bounds, type Theme, type TextStyleName, type AlignContext } from '../core/types.js';
import { column } from '../core/layout.js';
import { Text } from './text.js';
import { Image } from './image.js';
import { log } from '../utils/log.js';

export interface CardProps {
  image?: string;              // Path to image rendered above text
  title?: string;
  titleStyle?: TextStyleName;
  titleColor?: string;
  description?: string;
  descriptionStyle?: TextStyleName;
  descriptionColor?: string;
  background?: boolean;        // Whether to show background/border (default: true)
  fill?: string;
  fillOpacity?: number;
  borderColor?: string;
  borderWidth?: number;
  cornerRadius?: number;
  padding?: number;
}

export class Card implements Component {
  private column: Component;

  constructor(private theme: Theme, private props: CardProps = {}) {
    // Build text content (title + description) with small gap
    const textChildren: Component[] = [];

    if (props.title) {
      textChildren.push(new Text(theme, props.title, {
        style: props.titleStyle ?? TEXT_STYLE.H4,
        color: props.titleColor ?? theme.colors.accent1,
      }));
    }

    if (props.description) {
      textChildren.push(new Text(theme, props.description, {
        style: props.descriptionStyle ?? TEXT_STYLE.SMALL,
        color: props.descriptionColor ?? theme.colors.text,
      }));
    }

    // Build nested structure: outer column with optional image + text content
    // GAP.NORMAL between image and text, GAP.SMALL between title and description
    const textContent = column(theme, { gap: GAP.SMALL }, ...textChildren);
    if (props.image) {
      // With image: use proportional layout [1, 0] so image fills space and text anchors at bottom
      // This ensures consistent text Y position across cards with different image aspect ratios
      this.column = column(theme, [1, 0], [
        new Image(theme, props.image),
        textContent,
      ], { gap: GAP.NORMAL });
    } else {
      // No image: just text content, centered
      this.column = column(theme, { gap: GAP.NORMAL, justify: JUSTIFY.CENTER }, textContent);
    }
  }

  private getPadding(): number {
    const showBackground = this.props.background !== false;
    return showBackground ? (this.props.padding ?? this.theme.spacing.padding) : 0;
  }

  private measure(width: number, min: boolean): number {
    const padding = this.getPadding();
    const innerW = width - padding * 2;
    const contentH = min ? this.column.getMinHeight(innerW) : this.column.getHeight(innerW);

    log('card %s: w=%f padding=%f innerW=%f contentH=%f total=%f',
      min ? 'getMinHeight' : 'getHeight', width, padding, innerW, contentH, padding * 2 + contentH);
    return padding * 2 + contentH;
  }

  getHeight(width: number): number { return this.measure(width, false); }
  getMinHeight(width: number): number { return this.measure(width, true); }

  getWidth(height: number): number {
    const padding = this.getPadding();
    const innerH = height - padding * 2;
    return padding * 2 + this.column.getWidth(innerH);
  }

  prepare(bounds: Bounds, _alignContext?: AlignContext): Drawer {
    const showBackground = this.props.background !== false;
    const padding = this.getPadding();

    // Chrome properties from props or theme defaults
    const fill = this.props.fill ?? this.theme.colors.secondary;
    const fillOpacity = this.props.fillOpacity ?? this.theme.colors.subtleOpacity;
    const borderColor = this.props.borderColor ?? this.theme.colors.secondary;
    const borderWidth = this.props.borderWidth ?? this.theme.borders.width;
    const cornerRadius = this.props.cornerRadius ?? this.theme.borders.radius;

    // Inner bounds for content (after padding)
    const innerBounds = bounds.inset(padding);

    log('card prepare: bounds=[%f,%f %fx%f] padding=%f inner=[%f,%f %fx%f]',
      bounds.x, bounds.y, bounds.w, bounds.h, padding,
      innerBounds.x, innerBounds.y, innerBounds.w, innerBounds.h);

    // Column handles measuring, fitting, and positioning children
    const drawColumn = this.column.prepare(innerBounds);

    return (canvas) => {
      if (showBackground) {
        canvas.addShape(SHAPE.ROUND_RECT, {
          x: bounds.x,
          y: bounds.y,
          w: bounds.w,
          h: bounds.h,
          fill: { color: fill, transparency: 100 - fillOpacity },
          line: { color: borderColor, width: borderWidth },
          rectRadius: cornerRadius,
        });
      }
      drawColumn(canvas);
    };
  }
}
