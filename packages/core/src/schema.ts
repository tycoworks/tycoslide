// Schema module
// Domain-specific schema helpers for layout and component definitions.
// Layout authors use these instead of importing Zod directly.

import { z } from 'zod';
import { TEXT_STYLE_VALUES, GAP_VALUES, HALIGN_VALUES, VALIGN_VALUES, CONTENT_VALUES } from './core/types.js';

export const schema = {
  // Structural — how values compose
  object:   <T extends z.ZodRawShape>(shape: T)       => z.object(shape),
  array:    <T extends z.ZodTypeAny>(item: T)         => z.array(item),
  enum:     <T extends [string, ...string[]]>(v: T)   => z.enum(v),

  // Scalar — configuration values
  string:   ()                                        => z.string(),
  number:   ()                                        => z.number(),
  boolean:  ()                                        => z.boolean(),

  // Domain — common enum types (saves importing _VALUES tuples)
  textStyle: ()                                       => z.enum(TEXT_STYLE_VALUES),
  gap:       ()                                       => z.enum(GAP_VALUES),
  hAlign:    ()                                       => z.enum(HALIGN_VALUES),
  vAlign:    ()                                       => z.enum(VALIGN_VALUES),
  content:   ()                                       => z.enum(CONTENT_VALUES),
};

// ============================================
// PARAM TYPES
// ============================================

// Scalar leaf types — expressible in YAML frontmatter
type ScalarLeaf =
  | ReturnType<typeof schema.string>
  | ReturnType<typeof schema.number>
  | ReturnType<typeof schema.boolean>
  | ReturnType<typeof schema.textStyle>
  | ReturnType<typeof schema.gap>
  | ReturnType<typeof schema.hAlign>
  | ReturnType<typeof schema.vAlign>
  | ReturnType<typeof schema.content>
  | ReturnType<typeof schema.enum>
  | ReturnType<typeof schema.array>
  | ReturnType<typeof schema.object>;

/** A param expressible in YAML frontmatter. Slots excluded. */
export type ScalarParam =
  | ScalarLeaf
  | z.ZodOptional<ScalarLeaf>
  | z.ZodDefault<ScalarLeaf>;
