// Flex Distribution Algorithm
// Unified space distribution for Row (horizontal) and Column (vertical)

/**
 * Describes how a child participates in flex distribution.
 * Exactly one of these should be set (or none for equal-share flex).
 */
export interface FlexChild {
  /** Explicit size in inches - takes this exact space */
  fixedSize?: number;
  /** SIZE.FILL - takes all remaining space after fixed/flex children */
  fillsRemaining?: boolean;
  /** Intrinsic size for flex children (used when there's a fill sibling) */
  intrinsicSize?: number;
}

/**
 * Result of flex space distribution.
 */
export interface FlexResult {
  /** Computed sizes for each child */
  sizes: number[];
  /** Index of the fill child, or -1 if none */
  fillIndex: number;
}

/**
 * Distribute space among children along the main axis.
 *
 * This is the unified algorithm for both Row and Column:
 * - Row distributes width horizontally
 * - Column distributes height vertically
 *
 * Child types:
 * - Fixed: explicit size in inches, takes exactly that space
 * - Fill: takes ALL remaining space (only one allowed)
 * - Flex: shares remaining space equally (or uses intrinsicSize if fill sibling exists)
 *
 * @param children - Array describing each child's flex behavior
 * @param availableSpace - Total space to distribute (after subtracting gaps)
 * @param options - Optional configuration
 * @returns sizes array and fillIndex
 * @throws Error if multiple fill children detected
 */
export function distributeFlexSpace(
  children: FlexChild[],
  availableSpace: number,
): FlexResult {
  const n = children.length;
  const sizes: number[] = new Array(n);

  // First pass: identify fixed, fill, and flex children
  let fillIndex = -1;
  let fixedTotal = 0;
  let flexCount = 0;
  const flexIndices: number[] = [];

  for (let i = 0; i < n; i++) {
    const child = children[i];

    if (child.fillsRemaining) {
      if (fillIndex !== -1) {
        throw new Error(
          `Multiple fill children detected (indices ${fillIndex} and ${i}). ` +
          `Only one fill child is allowed.`
        );
      }
      fillIndex = i;
      sizes[i] = 0; // Will be calculated after
    } else if (child.fixedSize !== undefined) {
      sizes[i] = child.fixedSize;
      fixedTotal += child.fixedSize;
    } else {
      // Flex child - will share remaining or use intrinsic
      sizes[i] = -1; // Sentinel for "needs calculation"
      flexCount++;
      flexIndices.push(i);
    }
  }

  // Second pass: distribute remaining space
  const remainingSpace = Math.max(0, availableSpace - fixedTotal);

  if (fillIndex !== -1) {
    // Fill child present: flex children use intrinsic size, fill gets the rest
    let flexTotal = 0;
    for (const i of flexIndices) {
      const intrinsic = children[i].intrinsicSize ?? 0;
      sizes[i] = intrinsic;
      flexTotal += intrinsic;
    }
    sizes[fillIndex] = Math.max(0, remainingSpace - flexTotal);
  } else if (flexCount > 0) {
    // No fill child: distribute equally among flex children
    const equalShare = remainingSpace / flexCount;
    for (const i of flexIndices) {
      sizes[i] = equalShare;
    }
  }

  return { sizes, fillIndex };
}
