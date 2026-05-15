// Geometric Primitives
// Immutable value types for layout: positioned rectangles and per-side insets

/** Per-side padding/inset specification (inches). Immutable. */
export class Insets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;

  constructor(uniform: number);
  constructor(top: number, right: number, bottom: number, left: number);
  constructor(a: number, b?: number, c?: number, d?: number) {
    if (b !== undefined) {
      this.top = a;
      this.right = b;
      this.bottom = c!;
      this.left = d!;
    } else {
      this.top = this.right = this.bottom = this.left = a;
    }
  }
}

export class Bounds {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;

  constructor(width: number, height: number, margin?: number);
  constructor(x: number, y: number, w: number, h: number);
  constructor(a: number, b: number, c?: number, d?: number) {
    if (d !== undefined) {
      // Explicit position: new Bounds(x, y, w, h)
      this.x = a;
      this.y = b;
      this.w = c!;
      this.h = d;
    } else {
      // From dimensions: new Bounds(width, height, margin?)
      const m = c ?? 0;
      this.x = m;
      this.y = m;
      this.w = a - m * 2;
      this.h = b - m * 2;
    }
  }

  /** Translate position by dx/dy, keeping same dimensions */
  offset(dx: number, dy: number): Bounds {
    return new Bounds(this.x + dx, this.y + dy, this.w, this.h);
  }
}
