// Token module
// Domain-specific descriptors for token declarations.
// Component authors use these to declare required vs optional tokens.
// Parallel to schema.ts (which wraps Zod for param declarations).

// ============================================
// DESCRIPTORS
// ============================================

export type TokenRequired = { readonly _optional: false };
export type TokenOptional = { readonly _optional: true };
export type TokenSpec = TokenRequired | TokenOptional;
export type TokenShape = Record<string, TokenSpec>;

const required: TokenRequired = { _optional: false };
const optional: TokenOptional = { _optional: true };

export const token = {
  required,
  optional,

  /**
   * Build an all-required token shape from a TOKEN const object.
   * Shorthand for the common case where every token is required.
   *
   * @example
   * ```typescript
   * export const TEXT_TOKEN_SPEC = token.allRequired(TEXT_TOKEN);
   * // Equivalent to: { color: token.required, style: token.required, ... }
   * ```
   */
  allRequired<T extends Record<string, string>>(tokenConst: T): { [K in T[keyof T]]: TokenRequired } {
    return Object.fromEntries(Object.values(tokenConst).map((k) => [k, required])) as {
      [K in T[keyof T]]: TokenRequired;
    };
  },
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
// VALIDATION
// ============================================

/**
 * Validate a token map against a parsed token shape.
 * 1. All required keys must be present (not undefined/null).
 * 2. No unknown keys allowed (fail fast on typos).
 *
 * @param shape - Parsed token shape from parseTokenShape()
 * @param tokens - Actual token map to validate
 * @param label - Human-readable context for error messages (e.g. "Component 'card'")
 * @throws Error with contextual message if validation fails
 */
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
