// Card Component
// Styled container with optional background, border, image, and title/description
// Implemented using Box with arithmetic layout

import { DIRECTION, SHAPE, TEXT_STYLE, type AlignContext, type Component, type Drawer, type Bounds, type Theme, type TextStyleName } from '../core/types.js';
import { box, type Box } from '../core/box.js';
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
  private _box?: Box;

  constructor(private theme: Theme, private props: CardProps = {}) {}

  private getBox(): Box {
    if (!this._box) {
      const gapSmall = this.theme.spacing.gapSmall;
      const children: Box[] = [];

      // Image at top — content-sized (default flexShrink:1 absorbs all shrinkage)
      if (this.props.image) {
        children.push(box({ content: new Image(this.theme, this.props.image) }));
      }

      // Title (won't shrink — text is always preserved)
      if (this.props.title) {
        const style = this.props.titleStyle ?? TEXT_STYLE.H4;
        const color = this.props.titleColor ?? this.theme.colors.accent1;
        children.push(box({ flexShrink: 0, content: new Text(this.theme, this.props.title, { style, color }) }));
      }

      // Description (won't shrink — text is always preserved)
      if (this.props.description) {
        const style = this.props.descriptionStyle ?? TEXT_STYLE.SMALL;
        const color = this.props.descriptionColor ?? this.theme.colors.text;
        children.push(box({ flexShrink: 0, content: new Text(this.theme, this.props.description, { style, color }) }));
      }

      this._box = box({
        direction: DIRECTION.COLUMN,
        gap: gapSmall,
        children,
      });
    }
    return this._box;
  }

  private getPadding(): number {
    const showBackground = this.props.background !== false;
    return showBackground ? (this.props.padding ?? this.theme.spacing.gap) : 0;
  }

  getHeight(width: number): number {
    const padding = this.getPadding();
    const innerW = width - padding * 2;
    const contentH = this.getBox().getHeight(innerW);
    log('card getHeight: w=%f padding=%f innerW=%f contentH=%f total=%f', width, padding, innerW, contentH, padding * 2 + contentH);
    return padding * 2 + contentH;
  }

  getMinHeight(width: number): number {
    const padding = this.getPadding();
    const innerW = width - padding * 2;
    const contentMinH = this.getBox().getMinHeight?.(innerW) ?? this.getBox().getHeight(innerW);
    return padding * 2 + contentMinH;
  }

  getWidth(height: number): number {
    const padding = this.getPadding();
    const innerH = height - padding * 2;
    return padding * 2 + (this.getBox().getWidth?.(innerH) ?? 0);
  }

  prepare(bounds: Bounds, alignContext?: AlignContext): Drawer {
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

    // Get content drawer from Box
    const contentDrawer = this.getBox().prepare(innerBounds, alignContext);

    return (canvas) => {
      // Draw background chrome
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

      // Draw content
      contentDrawer(canvas);
    };
  }
}
