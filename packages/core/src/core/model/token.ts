// Token module
// Domain-specific descriptors for token declarations.
// Component authors use these to declare required vs optional tokens.
// Parallel to schema.ts (which wraps Zod for param declarations).

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
export type InferTokens<S extends Record<string, TokenDescriptor<any, boolean>>> =
  { [K in keyof S as S[K] extends { _optional: true } ? never : K]:
      S[K] extends TokenDescriptor<infer T, any> ? T : never } &
  { [K in keyof S as S[K] extends { _optional: true } ? K : never]?:
      S[K] extends TokenDescriptor<infer T, any> ? T : never };

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

// ============================================
// PARSING UTILITY
// ============================================

/**
 * Parse a TokenShape into its required keys and full key set.
 * Used by defineComponent, defineLayout, and defineMaster to avoid duplicating parsing logic.
 */
export interface ParsedTokenShape {
  requiredKeys: string[];
  allKeys: Set<string>;
}

/**
 * Parse a TokenShape into its required keys and full key set.
 * Used by defineComponent, defineLayout, and defineMaster to avoid duplicating parsing logic.
 */
export function parseTokenShape(shape: TokenShape): ParsedTokenShape {
  const entries = Object.entries(shape);
  return {
    requiredKeys: entries.filter(([, v]) => !v._optional).map(([k]) => k),
    allKeys: new Set(entries.map(([k]) => k)),
  };
}

// ============================================
// VARIANT RESOLUTION
// ============================================

/**
 * Resolve tokens for a named variant from a theme config block.
 * Used by documentCompiler (layout tokens) and presentation (master tokens).
 *
 * @param variantConfig - The theme config for this layout/master (e.g. theme.layouts.body)
 * @param name - Layout or master name (for error messages)
 * @param variant - Variant name to resolve
 * @param tokenShape - Token shape from the definition (for validation), or undefined if no tokens declared
 * @param label - "Layout" or "Master" (for error messages)
 */
export function resolveVariantTokens(
  variantConfig: { variants: Record<string, unknown> } | undefined,
  name: string,
  variant: string,
  tokenShape: TokenShape | undefined,
  label: string,
): Record<string, unknown> {
  if (!variantConfig) {
    throw new Error(`${label} '${name}' requires tokens but theme.${label.toLowerCase()}s.${name} is missing.`);
  }
  const tokens = variantConfig.variants[variant];
  if (!tokens) {
    const available = Object.keys(variantConfig.variants).join(", ");
    throw new Error(`Unknown variant '${variant}' for ${label.toLowerCase()} '${name}'. Available: ${available}`);
  }
  if (tokenShape) {
    const shape = parseTokenShape(tokenShape);
    if (shape.allKeys.size) {
      validateTokens(shape, tokens as Record<string, unknown>, `${label} '${name}' variant '${variant}'`);
    }
  }
  return tokens as Record<string, unknown>;
}

// ============================================
// VALIDATION
// ============================================

export function validateTokens(shape: ParsedTokenShape, tokens: Record<string, unknown>, label: string): void {
  const missing = shape.requiredKeys.filter(
    (key) => tokens[key] === undefined || tokens[key] === null,
  );
  if (missing.length) {
    throw new Error(`${label} is missing required tokens: [${missing.join(", ")}].`);
  }

  const unknown = Object.keys(tokens).filter((k) => !shape.allKeys.has(k));
  if (unknown.length) {
    throw new Error(
      `${label} received unknown tokens: [${unknown.join(", ")}]. ` +
        `Valid tokens: [${[...shape.allKeys].join(", ")}]`,
    );
  }
}
