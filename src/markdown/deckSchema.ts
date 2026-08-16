import * as z from "zod";
import { isImageParameter, isTemplateParameter, RESERVED_KEY } from "./deckCompiler.js";
import { templateKeys } from "./textTemplate.js";
import { strict } from "./themeConfigSchema.js";
import type { CompilerLayout } from "./types.js";

/**
 * Per-layout frontmatter validation for a deck `.md`. The old tycoslide validated
 * every slide's frontmatter against a Zod schema carried by the layout program;
 * current layouts are JSON DATA, so the schema is BUILT dynamically from a layout's
 * declared `parameters` using the same key-derivation the compiler already uses
 * (`deckCompiler.ts`): an image parameter contributes its `key`; a template
 * parameter contributes one field per `{key}` placeholder in its template (NOT its
 * `shapeName`, which addresses `step.content`, not frontmatter).
 *
 * Commit-1 scope is unknown-key detection ONLY — zero behavior change:
 * - Every field is `z.coerce.string()` (values are `String()`-coerced today, so a
 *   YAML number like `year: 2026` must still pass — plain `z.string()` would regress)
 *   and `.optional()` (`required` is per-parameter, enforced in `compileStep`, not
 *   "all a template's keys present"). Value-typing and required-encoding are deliberate
 *   later commits.
 * The strict object IS the unknown-key check that used to be imperative in
 * `compileStep`; a stray frontmatter key throws instead of being silently ignored.
 */
export function deckFrontmatterSchema(layout: CompilerLayout) {
  const shape: Record<string, z.ZodType> = {};
  for (const param of layout.parameters) {
    if (isImageParameter(param)) {
      shape[param.key] = z.coerce.string().optional();
    } else if (isTemplateParameter(param)) {
      for (const key of templateKeys(param.template)) {
        shape[key] = z.coerce.string().optional();
      }
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
  slideIdx: number,
): void {
  const { [RESERVED_KEY.LAYOUT]: _layout, [RESERVED_KEY.NOTES]: _notes, ...params } = frontmatter;
  const result = deckFrontmatterSchema(layout).safeParse(params);
  if (!result.success) {
    throw new Error(`Slide ${slideIdx}: ${z.prettifyError(result.error)}`);
  }
}
