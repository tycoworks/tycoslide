// Document Compiler
// Wires together parsing, validation, and rendering to produce
// a Presentation from a markdown source string.
//
// Phase 3d: Generic parameter mapping — no layout-specific logic.
// Frontmatter fields pass through, # heading → title, ::slot:: → named
// params, markdown body → body param. Zod validation catches mismatches.

import { parseSlideDocument, type RawSlide } from './slideParser.js';
import { layoutRegistry, validateLayoutProps } from '../core/registry.js';
import { Presentation, type Slide } from '../presentation.js';
import type { Theme } from '../core/types.js';

// ============================================
// TYPES
// ============================================

/** Options for compiling a slide document. */
export interface CompileOptions {
  /** Theme to apply to the presentation. */
  theme: Theme;
  /** Default layout name when slide frontmatter omits `layout:`. */
  defaultLayout?: string;
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Compile a markdown slide document into a Presentation.
 *
 * Layouts must be registered before calling (e.g., via `registerMaterializeLayouts()`).
 * Each slide's frontmatter is validated against the layout's Zod schema.
 *
 * @param source - Markdown source with frontmatter and `---` slide delimiters
 * @param options - Theme and optional default layout
 * @returns Presentation ready for measurement and PPTX rendering
 */
export function compileDocument(source: string, options: CompileOptions): Presentation {
  const parsed = parseSlideDocument(source);
  const presentation = new Presentation(options.theme);

  for (const raw of parsed.slides) {
    const slide = compileSlide(raw, options);
    presentation.add(slide);
  }

  return presentation;
}

// ============================================
// SLIDE COMPILATION
// ============================================

function compileSlide(raw: RawSlide, options: CompileOptions): Slide {
  // 1. Resolve layout name
  const layoutName = (raw.frontmatter.layout as string | undefined)
    ?? options.defaultLayout;

  if (!layoutName) {
    throw new Error(
      `Slide ${raw.index + 1}: missing 'layout' field in frontmatter`,
    );
  }

  // 2. Look up layout definition
  const layout = layoutRegistry.get(layoutName);
  if (!layout) {
    const available = layoutRegistry.getRegisteredNames().join(', ');
    throw new Error(
      `Slide ${raw.index + 1}: unknown layout '${layoutName}'. Available: ${available}`,
    );
  }

  // 3. Build raw params — merge sources in priority order
  const params: Record<string, unknown> = { ...raw.frontmatter };
  delete params.layout;

  // Title: from # heading if not in frontmatter
  if (raw.title !== undefined && params.title === undefined) {
    params.title = raw.title;
  }

  // Slots: ::name:: content → param of same name
  for (const [key, value] of Object.entries(raw.slots)) {
    if (params[key] === undefined) {
      params[key] = value;
    }
  }

  // Body: markdown body → `body` param
  if (raw.body.trim() && params.body === undefined) {
    params.body = raw.body;
  }

  // 4. Validate against layout's Zod schema
  const validated = validateLayoutProps(layout, params);

  // 5. Render
  const slide = layout.render(validated);

  // 6. Attach speaker notes
  if (raw.notes) {
    slide.notes = raw.notes;
  }

  return slide;
}
