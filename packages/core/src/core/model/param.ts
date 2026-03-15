// Param module
// Declaration helpers for component and layout input schemas.
// Contains both `schema` (Zod type builders) and `param` (declaration wrappers).
// End users import these instead of Zod directly.

import { z } from "zod";

// ============================================
// SCHEMA NAMESPACE — base type builders
// ============================================

/**
 * Domain-specific schema helpers — wraps Zod so end users never import it directly.
 * Use these to build the type shapes that `param` wraps.
 */
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
// PARAM NAMESPACE — declaration wrappers
// ============================================

/**
 * Param declaration helpers — mirrors the `token` namespace for consistency.
 * Component and layout authors use these to declare validated input schemas.
 *
 * @example
 * ```typescript
 * const cardParams = param.shape({
 *   image: param.optional(imageComponent.schema),
 *   title: param.optional(textComponent.schema),
 * });
 * ```
 */
export const param = {
  /** Identity function for type inference — groups fields into a typed param shape. */
  shape: <S extends z.ZodRawShape>(s: S): S => s,
  /** Mark a field as required (identity — required is the Zod default). */
  required: <T extends z.ZodTypeAny>(s: T): T => s,
  /** Mark a field as optional. */
  optional: <T extends z.ZodTypeAny>(s: T) => s.optional(),
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
