// Yoga Layout Utilities
// Helpers for yoga-layout integration

import Yoga, { Node as YogaNode } from 'yoga-layout';

// Unit conversion (72 points per inch)
export const POINTS_PER_INCH = 72;
export const ptToIn = (pt: number): number => pt / POINTS_PER_INCH;
export const inToPt = (inches: number): number => inches * POINTS_PER_INCH;

// Yoga-specific aliases
export const toYoga = inToPt;
export const fromYoga = ptToIn;

/**
 * Create a new Yoga node
 */
export function createNode(): YogaNode {
  return Yoga.Node.create();
}

/**
 * Free a Yoga node and all its children
 */
export function freeNode(node: YogaNode): void {
  node.freeRecursive();
}

export { Yoga, type YogaNode };
