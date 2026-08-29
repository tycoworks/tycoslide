import * as z from "zod";
import { templateKeys } from "../textTemplate.js";
import type { CompilerLayout } from "../types.js";
import { RESERVED_KEY } from "../types.js";
import { strict } from "./strict.js";

/**
 * Per-layout frontmatter validation for a deck `.md`. Layouts are JSON data, so
 * the schema is built dynamically from a layout's `parameters` using the same
 * key-derivation the compiler uses (`deckCompiler.ts`): a parameter contributes
 * one field per `{key}` placeholder in its template, never its `shapeName`,
 * which addresses `step.content` rather than frontmatter.
 *
 * Every field is `z.coerce.string()` so a YAML number like `year: 2026` passes
 * (values are `String()`-coerced downstream), and `.optional()` because
 * `required` is per-parameter and enforced in `compileStep`, not "all a
 * template's keys present". The strict object is the point: a stray frontmatter
 * key throws instead of being silently ignored.
 */
export function deckFrontmatterSchema(layout: CompilerLayout) {
  const shape: Record<string, z.ZodType> = {};
  for (const param of layout.parameters) {
    for (const key of templateKeys(param.template)) {
      shape[key] = z.coerce.string().optional();
    }
  }
  return strict(shape);
}

/**
 * Validate one slide's frontmatter against its layout, throwing a fail-fast error
 * prefixed with the slide index (naming the unknown key + the valid set, via the
 * shared `strict` "Valid keys: …" formatter). Reserved keys (`layout`, `notes`) are
 * slide-level metadata, not parameters, so they are stripped before `safeParse`.
 */
export function validateSlideFrontmatter(
  frontmatter: Record<string, unknown>,
  layout: CompilerLayout,
  slideNo: number,
): void {
  const { [RESERVED_KEY.LAYOUT]: _layout, [RESERVED_KEY.NOTES]: _notes, ...params } = frontmatter;
  const result = deckFrontmatterSchema(layout).safeParse(params);
  if (!result.success) {
    throw new Error(`Slide ${slideNo}: ${z.prettifyError(result.error)}`);
  }
}
