// Layout Errors
// Custom error types for layout computation

/**
 * Error thrown when content exceeds its container bounds.
 * Only thrown when strict mode is enabled.
 */
export class LayoutOverflowError extends Error {
  /** Type of node that overflowed */
  readonly nodeType: string;
  /** Available height in inches */
  readonly availableHeight: number;
  /** Content height in inches */
  readonly contentHeight: number;
  /** Amount of overflow in inches */
  readonly overflow: number;
  /** X position of the container */
  readonly x: number;
  /** Y position of the container */
  readonly y: number;

  constructor(options: {
    nodeType: string;
    availableHeight: number;
    contentHeight: number;
    x: number;
    y: number;
    message?: string;
  }) {
    const overflow = options.contentHeight - options.availableHeight;
    const defaultMessage = `Content overflow: ${options.nodeType} content (${options.contentHeight.toFixed(2)}") exceeds available height (${options.availableHeight.toFixed(2)}") by ${overflow.toFixed(2)}" at position (${options.x.toFixed(2)}, ${options.y.toFixed(2)})`;

    super(options.message ?? defaultMessage);
    this.name = 'LayoutOverflowError';
    this.nodeType = options.nodeType;
    this.availableHeight = options.availableHeight;
    this.contentHeight = options.contentHeight;
    this.overflow = overflow;
    this.x = options.x;
    this.y = options.y;
  }
}

/**
 * Options for layout computation
 */
export interface LayoutOptions {
  /**
   * When true (default), throws LayoutOverflowError if content exceeds bounds.
   * When false, content is silently clipped.
   */
  strict?: boolean;
}

/**
 * Check for overflow and throw if strict mode is enabled (default: true)
 */
export function checkOverflow(
  nodeType: string,
  contentHeight: number,
  availableHeight: number,
  x: number,
  y: number,
  options?: LayoutOptions
): void {
  // Default to strict: true - overflow throws by default
  const strict = options?.strict ?? true;
  if (strict && availableHeight > 0 && contentHeight > availableHeight) {
    throw new LayoutOverflowError({
      nodeType,
      availableHeight,
      contentHeight,
      x,
      y,
    });
  }
}
