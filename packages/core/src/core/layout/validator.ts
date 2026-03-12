// Layout Validator
// Post-layout validation to check:
// 1. Content extending beyond slide bounds (overflow)
// 2. Sibling content overlapping (except intentional Stack overlaps)
// 3. Children positioned outside parent bounds (layout error)

import type { PositionedNode } from "../model/nodes.js";
import { NODE_TYPE } from "../model/nodes.js";

// ============================================
// TYPES
// ============================================

/** Describes a single overflow violation (content beyond slide bounds) */
export interface OverflowViolation {
  nodeType: string;
  x: number;
  y: number;
  width: number;
  height: number;
  overflowLeft: number;
  overflowTop: number;
  overflowRight: number;
  overflowBottom: number;
}

/** Describes an overlap violation between sibling nodes */
export interface OverlapViolation {
  parentNodeType: string; // 'row' | 'column' - never 'stack'
  node1Type: string;
  node1Index: number;
  node1Bounds: { x: number; y: number; width: number; height: number };
  node2Type: string;
  node2Index: number;
  node2Bounds: { x: number; y: number; width: number; height: number };
  overlapArea: { x: number; y: number; width: number; height: number };
}

/** Describes a child positioned outside its parent bounds */
export interface BoundsViolation {
  parentNodeType: string;
  childNodeType: string;
  childIndex: number;
  parentBounds: { x: number; y: number; width: number; height: number };
  childBounds: { x: number; y: number; width: number; height: number };
  escapeTop: number; // How much child extends above parent
  escapeLeft: number; // How much child extends left of parent
  escapeRight: number; // How much child extends right of parent
  escapeBottom: number; // How much child extends below parent
}

/** Slide dimensions for validation */
export interface SlideBounds {
  width: number;
  height: number;
}

/** Combined validation results */
export interface ValidationResult {
  overflows: OverflowViolation[];
  overlaps: OverlapViolation[];
  boundsEscapes: BoundsViolation[];
}

// ============================================
// VALIDATION ERRORS
// ============================================

/** Build a human-readable slide prefix like "Slide 3 (layout: body, eyebrow: RECAP): " */
function slidePrefix(slideIndex?: number, slideName?: string): string {
  if (slideIndex === undefined) return "";
  const suffix = slideName ? ` (${slideName})` : "";
  return `Slide ${slideIndex + 1}${suffix}: `;
}

/**
 * Error thrown when positioned content extends beyond slide boundaries.
 */
export class LayoutOverflowError extends Error {
  readonly violations: OverflowViolation[];
  readonly slideIndex?: number;

  constructor(options: {
    violations: OverflowViolation[];
    slideIndex?: number;
    slideName?: string;
  }) {
    const { violations, slideIndex, slideName } = options;
    const prefix = slidePrefix(slideIndex, slideName);

    const details = violations.map((v) => {
      const parts: string[] = [];
      if (v.overflowRight > 0) parts.push(`${v.overflowRight.toFixed(2)}" right`);
      if (v.overflowBottom > 0) parts.push(`${v.overflowBottom.toFixed(2)}" bottom`);
      if (v.overflowLeft > 0) parts.push(`${v.overflowLeft.toFixed(2)}" left`);
      if (v.overflowTop > 0) parts.push(`${v.overflowTop.toFixed(2)}" top`);
      return `${v.nodeType} at (${v.x.toFixed(2)}, ${v.y.toFixed(2)}) overflows ${parts.join(", ")}`;
    });

    const message = `${prefix}Content extends beyond slide bounds:\n  ${details.join("\n  ")}`;

    super(message);
    this.name = "LayoutOverflowError";
    this.violations = violations;
    this.slideIndex = slideIndex;
  }
}

/**
 * Error thrown when sibling content unintentionally overlaps.
 * This excludes Stack nodes where overlap is intentional.
 */
export class LayoutOverlapError extends Error {
  readonly violations: OverlapViolation[];
  readonly slideIndex?: number;

  constructor(options: {
    violations: OverlapViolation[];
    slideIndex?: number;
    slideName?: string;
  }) {
    const { violations, slideIndex, slideName } = options;
    const prefix = slidePrefix(slideIndex, slideName);

    const details = violations.map(
      (v) =>
        `${v.node1Type}[${v.node1Index}] overlaps ${v.node2Type}[${v.node2Index}] ` +
        `by ${v.overlapArea.width.toFixed(2)}"x${v.overlapArea.height.toFixed(2)}" ` +
        `in ${v.parentNodeType}`,
    );

    const message = `${prefix}Unintentional content overlap detected:\n  ${details.join("\n  ")}`;

    super(message);
    this.name = "LayoutOverlapError";
    this.violations = violations;
    this.slideIndex = slideIndex;
  }
}

/**
 * Error thrown when a child is positioned outside its parent bounds.
 * This indicates a layout algorithm bug.
 */
export class LayoutBoundsError extends Error {
  readonly violations: BoundsViolation[];
  readonly slideIndex?: number;

  constructor(options: {
    violations: BoundsViolation[];
    slideIndex?: number;
    slideName?: string;
  }) {
    const { violations, slideIndex, slideName } = options;
    const prefix = slidePrefix(slideIndex, slideName);

    const details = violations.map((v) => {
      const parts: string[] = [];
      if (v.escapeTop > 0) parts.push(`${v.escapeTop.toFixed(2)}" above`);
      if (v.escapeLeft > 0) parts.push(`${v.escapeLeft.toFixed(2)}" left`);
      if (v.escapeRight > 0) parts.push(`${v.escapeRight.toFixed(2)}" right`);
      if (v.escapeBottom > 0) parts.push(`${v.escapeBottom.toFixed(2)}" below`);
      return (
        `${v.childNodeType}[${v.childIndex}] escapes ${v.parentNodeType} bounds by ${parts.join(", ")} ` +
        `(child at y=${v.childBounds.y.toFixed(2)}, parent starts at y=${v.parentBounds.y.toFixed(2)})`
      );
    });

    const message = `${prefix}Child positioned outside parent bounds (layout bug):\n  ${details.join("\n  ")}`;

    super(message);
    this.name = "LayoutBoundsError";
    this.violations = violations;
    this.slideIndex = slideIndex;
  }
}

// ============================================
// BATCH VALIDATION
// ============================================

/** Per-slide validation result for batch error collection */
export interface SlideValidationResult {
  slideIndex: number;
  slideName?: string;
  result: ValidationResult;
}

/** Format all errors from multiple slides into a human-readable message.
 *  Reuses the existing per-slide error classes for formatting. */
function formatBatchErrors(slideErrors: SlideValidationResult[], totalSlides?: number): string {
  const count =
    totalSlides !== undefined ? `${slideErrors.length} of ${totalSlides} slides` : `${slideErrors.length} slide(s)`;
  const header = `Layout validation failed (${count}):`;

  const sections = slideErrors.map(({ slideIndex, slideName, result }) => {
    const messages: string[] = [];
    if (result.boundsEscapes.length > 0) {
      messages.push(new LayoutBoundsError({ violations: result.boundsEscapes, slideIndex, slideName }).message);
    }
    if (result.overflows.length > 0) {
      messages.push(new LayoutOverflowError({ violations: result.overflows, slideIndex, slideName }).message);
    }
    if (result.overlaps.length > 0) {
      messages.push(new LayoutOverlapError({ violations: result.overlaps, slideIndex, slideName }).message);
    }
    return messages.map((m) => `  ${m}`).join("\n");
  });

  return `${header}\n\n${sections.join("\n\n")}`;
}

/**
 * Aggregate error thrown when multiple slides have validation failures.
 * Contains all per-slide errors collected during batch processing.
 */
export class LayoutValidationError extends Error {
  readonly slideErrors: SlideValidationResult[];

  constructor(slideErrors: SlideValidationResult[], totalSlides?: number) {
    super(formatBatchErrors(slideErrors, totalSlides));
    this.name = "LayoutValidationError";
    this.slideErrors = slideErrors;
  }
}

// ============================================
// LAYOUT VALIDATOR CLASS
// ============================================

/**
 * Validates positioned node trees for layout errors.
 *
 * Checks for:
 * - Overflow: content extending beyond slide bounds
 * - Overlap: siblings overlapping (excludes intentional Stack overlaps)
 * - Bounds escapes: children positioned outside parent bounds (layout bug)
 *
 * @example
 * ```typescript
 * const validator = new LayoutValidator({ width: 10, height: 7.5 });
 * validator.validateOrThrow(positionedTree, slideIndex);
 * ```
 */
export class LayoutValidator {
  /** Tolerance for floating-point comparisons (in inches) */
  private static readonly TOLERANCE = 0.01;

  constructor(private readonly slideBounds: SlideBounds) {}

  /**
   * Validate the positioned tree and return all violations.
   * Does not throw - use for inspection or custom error handling.
   */
  validate(root: PositionedNode): ValidationResult {
    const overflows: OverflowViolation[] = [];
    const overlaps: OverlapViolation[] = [];
    const boundsEscapes: BoundsViolation[] = [];

    this.validateNode(root, overflows, overlaps, boundsEscapes);

    return { overflows, overlaps, boundsEscapes };
  }

  /**
   * Check if the positioned tree is valid (no violations).
   */
  isValid(root: PositionedNode): boolean {
    const result = this.validate(root);
    return result.overflows.length === 0 && result.overlaps.length === 0 && result.boundsEscapes.length === 0;
  }

  /**
   * Validate the positioned tree and throw if violations are found.
   *
   * @throws LayoutBoundsError if children are outside parent bounds (most severe)
   * @throws LayoutOverflowError if content extends beyond slide bounds
   * @throws LayoutOverlapError if siblings unintentionally overlap
   */
  validateOrThrow(root: PositionedNode, slideIndex?: number, slideName?: string): void {
    const { overflows, overlaps, boundsEscapes } = this.validate(root);

    // Bounds escapes are the most severe - layout bug
    if (boundsEscapes.length > 0) {
      throw new LayoutBoundsError({ violations: boundsEscapes, slideIndex, slideName });
    }

    if (overflows.length > 0) {
      throw new LayoutOverflowError({ violations: overflows, slideIndex, slideName });
    }

    if (overlaps.length > 0) {
      throw new LayoutOverlapError({ violations: overlaps, slideIndex, slideName });
    }
  }

  // ============================================
  // PRIVATE VALIDATION METHODS
  // ============================================

  /**
   * Recursively validate a positioned node and its children.
   */
  private validateNode(
    node: PositionedNode,
    overflows: OverflowViolation[],
    overlaps: OverlapViolation[],
    boundsEscapes: BoundsViolation[],
  ): void {
    // Check bounds overflow (content beyond slide edges)
    this.checkSlideOverflow(node, overflows);

    // Check for sibling overlaps (skips Stack nodes internally)
    this.checkSiblingOverlaps(node, overlaps);

    // Check for children escaping parent bounds (skips Stack nodes internally)
    this.checkBoundsEscapes(node, boundsEscapes);

    // Recurse into children
    if (node.children) {
      for (const child of node.children) {
        this.validateNode(child, overflows, overlaps, boundsEscapes);
      }
    }
  }

  /**
   * Check if a node extends beyond the slide bounds.
   */
  private checkSlideOverflow(node: PositionedNode, violations: OverflowViolation[]): void {
    const { x, y, width, height } = node;
    const slide = this.slideBounds;
    const tolerance = LayoutValidator.TOLERANCE;

    const overflowLeft = x < 0 ? -x : 0;
    const overflowTop = y < 0 ? -y : 0;
    const overflowRight = x + width > slide.width ? x + width - slide.width : 0;
    const overflowBottom = y + height > slide.height ? y + height - slide.height : 0;

    if (
      overflowLeft > tolerance ||
      overflowTop > tolerance ||
      overflowRight > tolerance ||
      overflowBottom > tolerance
    ) {
      violations.push({
        nodeType: node.node.type,
        x,
        y,
        width,
        height,
        overflowLeft,
        overflowTop,
        overflowRight,
        overflowBottom,
      });
    }
  }

  /**
   * Check for overlapping siblings within a container.
   * Skips Stack nodes where overlap is intentional.
   */
  private checkSiblingOverlaps(parent: PositionedNode, violations: OverlapViolation[]): void {
    // Skip Stack nodes - overlap is intentional
    if (parent.node.type === NODE_TYPE.STACK) return;

    // Skip if no children or only one child
    if (!parent.children || parent.children.length < 2) return;

    const tolerance = LayoutValidator.TOLERANCE;

    // Check all pairs of siblings for overlap
    for (let i = 0; i < parent.children.length; i++) {
      for (let j = i + 1; j < parent.children.length; j++) {
        const a = parent.children[i];
        const b = parent.children[j];

        // AABB intersection test
        const xOverlap = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
        const yOverlap = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));

        if (xOverlap > tolerance && yOverlap > tolerance) {
          violations.push({
            parentNodeType: parent.node.type,
            node1Type: a.node.type,
            node1Index: i,
            node1Bounds: { x: a.x, y: a.y, width: a.width, height: a.height },
            node2Type: b.node.type,
            node2Index: j,
            node2Bounds: { x: b.x, y: b.y, width: b.width, height: b.height },
            overlapArea: {
              x: Math.max(a.x, b.x),
              y: Math.max(a.y, b.y),
              width: xOverlap,
              height: yOverlap,
            },
          });
        }
      }
    }
  }

  /**
   * Check for children positioned outside their parent bounds.
   *
   * Only detects TOP and LEFT escapes - these cause visual overlap with siblings:
   * - escapeTop: child positioned above parent causes overlap with sibling above
   * - escapeLeft: child positioned left of parent causes overlap with sibling left
   *
   * Does NOT detect bottom/right escapes - these are overflow, not positioning bugs.
   * Skips Stack nodes where children occupy the same bounds as parent by design.
   */
  private checkBoundsEscapes(parent: PositionedNode, violations: BoundsViolation[]): void {
    // Skip Stack nodes - children occupy same bounds as parent
    if (parent.node.type === NODE_TYPE.STACK) return;

    // Skip if no children
    if (!parent.children || parent.children.length === 0) return;

    const tolerance = LayoutValidator.TOLERANCE;

    for (let i = 0; i < parent.children.length; i++) {
      const child = parent.children[i];

      // Calculate how much child escapes parent bounds (only top/left matter for overlap)
      const escapeTop = parent.y - child.y; // Positive if child is above parent
      const escapeLeft = parent.x - child.x; // Positive if child is left of parent

      // Only report TOP or LEFT escapes (these cause sibling overlap)
      if (escapeTop > tolerance || escapeLeft > tolerance) {
        const escapeRight = Math.max(0, child.x + child.width - (parent.x + parent.width));
        const escapeBottom = Math.max(0, child.y + child.height - (parent.y + parent.height));

        violations.push({
          parentNodeType: parent.node.type,
          childNodeType: child.node.type,
          childIndex: i,
          parentBounds: { x: parent.x, y: parent.y, width: parent.width, height: parent.height },
          childBounds: { x: child.x, y: child.y, width: child.width, height: child.height },
          escapeTop: Math.max(0, escapeTop),
          escapeLeft: Math.max(0, escapeLeft),
          escapeRight,
          escapeBottom,
        });
      }
    }
  }
}
