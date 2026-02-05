// Line Component
// Renders a line with optional arrows at start/end

import { DIRECTION, SHAPE, ARROW_TYPE, DASH_TYPE, type AlignContext, type Component, type Drawer, type Bounds, type Theme, type ArrowType, type DashType } from '../core/types.js';

export interface LineProps {
  color?: string;
  thickness?: number;      // Line weight in points (default: theme.borders.width)
  dashType?: DashType;     // Line dash pattern (default: solid)
  startArrow?: ArrowType;  // Arrow at start of line
  endArrow?: ArrowType;    // Arrow at end of line
}

export class Line implements Component {
  constructor(private theme: Theme, private props: LineProps = {}) {}

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
    const dashType = this.props.dashType;
    const beginArrowType = this.props.startArrow;
    const endArrowType = this.props.endArrow;

    const vertical = alignContext?.parentDirection === DIRECTION.ROW;
    const x = vertical ? bounds.x + bounds.w / 2 : bounds.x;
    const y = vertical ? bounds.y : bounds.y + bounds.h / 2;
    const w = vertical ? 0 : bounds.w;
    const h = vertical ? bounds.h : 0;

    return (canvas) => {
      canvas.addShape(SHAPE.LINE, {
        x, y, w, h,
        line: { color, width: thickness, dashType, beginArrowType, endArrowType },
      });
    };
  }
}

// Re-export types for convenience
export { ARROW_TYPE, DASH_TYPE };
