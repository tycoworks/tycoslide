// Divider Component
// Renders a horizontal line

import { SHAPE, type AlignContext, type Component, type Drawer, type Bounds, type Theme } from '../core/types.js';

export interface DividerProps {
  color?: string;
  thickness?: number;  // Line weight in points (default: theme.borders.width)
}

export class Divider implements Component {
  constructor(private theme: Theme, private props: DividerProps = {}) {}

  getMinimumHeight(_width: number): number {
    // Small fixed height - just enough for the line plus breathing room
    return this.theme.spacing.gapSmall;
  }

  getMaximumHeight(_width: number): number {
    return this.getMinimumHeight(_width);  // Divider is fixed height
  }

  prepare(bounds: Bounds, _alignContext?: AlignContext): Drawer {
    const color = this.props.color ?? this.theme.colors.textMuted;
    const thickness = this.props.thickness ?? this.theme.borders.width;

    // Center the line vertically in the bounds
    const lineY = bounds.y + bounds.h / 2;

    return (canvas) => {
      canvas.addShape(SHAPE.LINE, {
        x: bounds.x,
        y: lineY,
        w: bounds.w,
        h: 0,
        line: { color, width: thickness },
      });
    };
  }
}
