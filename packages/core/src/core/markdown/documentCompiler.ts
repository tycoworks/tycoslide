// Document Compiler
// Wires together parsing, validation, and rendering to produce
// a Presentation from a markdown source string.
//
// Frontmatter → scalar params, ::slot:: markers + body → slot params.
// Params and slots are validated separately against the layout's schemas.

import { z } from "zod";
import type { ComponentNode, SlideNode } from "../model/nodes.js";
import type { Slide, Theme } from "../model/types.js";
import { Presentation } from "../rendering/presentation.js";
import {
  isComponentNode,
  type LayoutDefinition,
  layoutRegistry,
  RESERVED_FRONTMATTER_KEYS,
} from "../rendering/registry.js";
import { parseSlideDocument, type RawSlide } from "./slideParser.js";
import { compileSlot } from "./slotCompiler.js";

/** Build a name from frontmatter for identifying slides in error messages and shared references. */
export function buildSlideName(raw: RawSlide): string {
  // Explicit name in frontmatter takes priority
  if (typeof raw.frontmatter.name === "string" && raw.frontmatter.name.length > 0) {
    return raw.frontmatter.name;
  }

  // Auto-generate from frontmatter fields
  const parts: string[] = [];
  for (const [key, value] of Object.entries(raw.frontmatter)) {
    if (key === "name") continue; // already handled above
    if (typeof value === "string") {
      const truncated = value.length > 50 ? `${value.slice(0, 50)}...` : value;
      parts.push(`${key}: ${truncated}`);
    } else if (Array.isArray(value)) {
      parts.push(`${key}: [${value.length} items]`);
    }
  }
  return parts.join(", ");
}

// ============================================
// TYPES
// ============================================

/** Options for compiling a slide document. */
export interface CompileOptions {
  /** Theme to apply to the presentation. */
  theme: Theme;
  /** Nested assets object for resolving `$dot.path` references in frontmatter. */
  assets?: Record<string, unknown>;
}

// ============================================
// VALIDATION
// ============================================

/** Zod schema for a single slot: string → SlideNode[] via compileSlot. */
const slotSchema = z.string().transform((s): SlideNode[] => compileSlot(s));

/**
 * Validate raw params and slots against a layout's schemas.
 * Params validated against the layout's Zod param shape.
 * Slots compiled from markdown strings into SlideNode[].
 */
export function validateLayout(
  layout: LayoutDefinition,
  rawParams: Record<string, unknown>,
  rawSlots: Record<string, unknown>,
): any {
  const paramsResult = z.object(layout.params).safeParse(rawParams);
  if (!paramsResult.success) {
    const issues = paramsResult.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Layout '${layout.name}' params validation failed:\n${issues}`);
  }

  let slotsData: Record<string, unknown> = {};
  if (layout.slots && layout.slots.length > 0) {
    const shape: Record<string, z.ZodTypeAny> = {};
    for (const name of layout.slots) {
      shape[name] = slotSchema;
    }
    const slotsResult = z.object(shape).safeParse(rawSlots);
    if (!slotsResult.success) {
      const issues = slotsResult.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
      throw new Error(`Layout '${layout.name}' slots validation failed:\n${issues}`);
    }
    slotsData = slotsResult.data as Record<string, unknown>;
  }

  return { ...paramsResult.data, ...slotsData };
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Compile a markdown slide document into a Presentation.
 *
 * Layouts must be registered before calling (e.g., via `registerThemeLayouts()`).
 * Each slide's frontmatter is validated against the layout's Zod schema.
 *
 * @param source - Markdown source with frontmatter and `---` slide delimiters
 * @param options - Theme and optional default layout
 * @returns Presentation ready for measurement and PPTX rendering
 */
export function compileDocument(source: string, options: CompileOptions): Presentation {
  const parsed = parseSlideDocument(source);
  const presentation = new Presentation(options.theme, options.assets);

  for (const raw of parsed.slides) {
    presentation.add(compileSlide(raw, options));
  }

  return presentation;
}

// ============================================
// SLIDE COMPILATION
// ============================================

function compileSlide(raw: RawSlide, options: CompileOptions): Slide {
  const slide = compileLayoutSlide(raw, options);
  slide.name = buildSlideName(raw);
  return slide;
}

/** Compile a `layout: name` slide — layout template with content params. */
function compileLayoutSlide(raw: RawSlide, options: CompileOptions): Slide {
  // 1. Resolve layout name
  const layoutName = raw.frontmatter.layout as string | undefined;

  if (!layoutName) {
    throw new Error(`Slide ${raw.index + 1}: missing 'layout' field in frontmatter`);
  }

  // 2. Look up layout definition
  const layout = layoutRegistry.get(layoutName);
  if (!layout) {
    const available = layoutRegistry.getRegisteredNames().join(", ");
    throw new Error(`Slide ${raw.index + 1}: unknown layout '${layoutName}'. Available: ${available}`);
  }

  // 3. Extract variant from frontmatter (before stripping reserved keys)
  const variant = raw.frontmatter.variant as string | undefined;

  if (!variant) {
    throw new Error(`Slide ${raw.index + 1}: missing 'variant' field in frontmatter`);
  }

  // 4. Build PARAMS — strip reserved frontmatter keys
  const params: Record<string, unknown> = { ...raw.frontmatter };
  const notes = params.notes as string | undefined;
  for (const key of RESERVED_FRONTMATTER_KEYS) {
    delete params[key];
  }

  // 5. Resolve layout tokens (if the layout declares them)
  let resolvedTokens: Record<string, unknown> | undefined;
  if (layout.tokens?.length) {
    resolvedTokens = layoutRegistry.resolveTokens(layoutName, variant, options.theme);
  }

  // 6. Build SLOTS — from ::name:: markers and body only
  const slots: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw.slots)) {
    slots[key] = value;
  }
  if (raw.body.trim()) {
    slots.body = raw.body;
  }

  // 7. Validate params and slots separately, merge for render
  // Asset references ($dot.path) flow through as strings here.
  // They are resolved later by the image component's expand function.
  const validated = validateLayout(layout, params, slots);

  // 8. Inject layout tokens into slot-compiled ComponentNodes
  if (resolvedTokens && layout.slots?.length) {
    for (const slotName of layout.slots) {
      const slotNodes = validated[slotName];
      if (Array.isArray(slotNodes)) {
        injectSlotTokens(slotNodes as SlideNode[], resolvedTokens);
      }
    }
  }

  // 9. Render (pass tokens if layout declares them)
  const slide = layout.render(validated, resolvedTokens);

  // 10. Attach speaker notes from frontmatter
  if (notes) {
    slide.notes = notes;
  }

  return slide;
}

/**
 * Walk slot-compiled nodes and inject layout tokens into ComponentNodes.
 * For each ComponentNode, if the layout tokens contain a key matching
 * node.componentName, set node.tokens with layout defaults merged under
 * any node-specific token overrides (e.g., heading style: 'h2' from mdast compile).
 * This is how slot-compiled text/list nodes get their visual tokens from the layout.
 */
function injectSlotTokens(nodes: SlideNode[], layoutTokens: Record<string, unknown>): void {
  for (const node of nodes) {
    if (isComponentNode(node)) {
      const tokenMap = layoutTokens[node.componentName];
      if (tokenMap && typeof tokenMap === "object") {
        // Layout defaults first, then node-specific overrides (e.g., heading style)
        (node as ComponentNode).tokens = {
          ...(tokenMap as Record<string, unknown>),
          ...(node.tokens ?? {}),
        };
      }
    }
  }
}
