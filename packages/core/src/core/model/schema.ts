// Schema module
// Domain-specific schema helpers for layout and component definitions.
// Layout authors use these instead of importing Zod directly.

import { z } from "zod";

export const schema = {
  // Structural — how values compose
  object: <T extends z.ZodRawShape>(shape: T) => z.object(shape),
  array: <T extends z.ZodTypeAny>(item: T) => z.array(item),
  enum: <T extends [string, ...string[]]>(v: T) => z.enum(v),

  // Scalar — configuration values
  string: () => z.string(),
  number: () => z.number(),
  boolean: () => z.boolean(),
};

// ============================================
// PARAM TYPES
// ============================================

// Scalar leaf types — expressible in YAML frontmatter
type ScalarLeaf =
  | ReturnType<typeof schema.string>
  | ReturnType<typeof schema.number>
  | ReturnType<typeof schema.boolean>
  | ReturnType<typeof schema.enum>
  | ReturnType<typeof schema.array>
  | ReturnType<typeof schema.object>;

/** A param expressible in YAML frontmatter. Slots excluded. */
export type ScalarParam = ScalarLeaf | z.ZodOptional<ScalarLeaf> | z.ZodDefault<ScalarLeaf>;
