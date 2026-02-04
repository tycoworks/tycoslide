// Divider Component
// Renders a horizontal or vertical line

import { DIRECTION, SHAPE, type AlignContext, type Component, type Drawer, type Bounds, type Theme } from '../core/types.js';

export interface DividerProps {
  color?: string;
  thickness?: number;  // Line weight in points (default: theme.borders.width)
}

export class Divider implements Component {
  constructor(private theme: Theme, private props: DividerProps = {}) {}

  getHeight(_width: number): number {
    return this.theme.spacing.gapSmall;
  }

  getMinHeight(width: number): number { return this.getHeight(width); }

  getWidth(_height: number): number {
    return this.theme.spacing.gapSmall;
  }

  prepare(bounds: Bounds, alignContext?: AlignContext): Drawer {
    const color = this.props.color ?? this.theme.colors.textMuted;
    const thickness = this.props.thickness ?? this.theme.borders.width;

    const vertical = alignContext?.parentDirection === DIRECTION.ROW;
    const x = vertical ? bounds.x + bounds.w / 2 : bounds.x;
    const y = vertical ? bounds.y : bounds.y + bounds.h / 2;
    const w = vertical ? 0 : bounds.w;
    const h = vertical ? bounds.h : 0;

    return (canvas) => {
      canvas.addShape(SHAPE.LINE, { x, y, w, h, line: { color, width: thickness } });
    };
  }
}
