// Token module
// Domain-specific descriptors for token declarations.
// Component authors use these to declare required vs optional tokens.
// Parallel to param.ts (which wraps Zod for param declarations).

// ============================================
// DESCRIPTORS
// ============================================

/**
 * A typed token descriptor carrying value type info via phantom field.
 * Required tokens use `Opt = false`, optional use `Opt = true`.
 * The `_type` field exists only at the type level — erased at runtime.
 */
export interface TokenDescriptor<T = unknown, Opt extends boolean = false> {
  readonly _optional: Opt;
  readonly _type?: T;
}

export type TokenShape = Record<string, TokenDescriptor<any, boolean>>;

// ============================================
// TYPE INFERENCE
// ============================================

/**
 * Derive a TypeScript type from a token shape.
 * Required descriptors become required fields; optional descriptors become optional fields.
 *
 * @example
 * ```typescript
 * const cardTokens = token.shape({
 *   background: token.optional<ShapeTokens>(),
 *   padding: token.required<number>(),
 * });
 * type CardTokens = InferTokens<typeof cardTokens>;
 * // → { padding: number; background?: ShapeTokens }
 * ```
 */
export type InferTokens<S extends Record<string, TokenDescriptor<any, boolean>>> = {
  [K in keyof S as S[K] extends { _optional: true } ? never : K]: S[K] extends TokenDescriptor<infer T, any>
    ? T
    : never;
} & {
  [K in keyof S as S[K] extends { _optional: true } ? K : never]?: S[K] extends TokenDescriptor<infer T, any>
    ? T
    : never;
};

// ============================================
// TOKEN NAMESPACE
// ============================================

export const token = {
  /** Declare a required token of type T. */
  required: <T>(): TokenDescriptor<T, false> => ({ _optional: false }) as TokenDescriptor<T, false>,
  /** Declare an optional token of type T. */
  optional: <T>(): TokenDescriptor<T, true> => ({ _optional: true }) as TokenDescriptor<T, true>,
  /** Identity function for type inference — groups descriptors into a typed shape. */
  shape: <S extends TokenShape>(s: S): S => s,
};
