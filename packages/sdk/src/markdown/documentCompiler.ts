// Document Compiler
// Wires together parsing, validation, and rendering to produce
// a Presentation from a markdown source string.
//
// Frontmatter → scalar params, ::slot:: markers + body → slot params.
// Params and slots are validated separately against the layout's schemas.

import {
  type ComponentDefinition,
  type ComponentNode,
  createPresentation,
  isComponentNode,
  type LayoutConfig,
  type Presentation,
  RESERVED_FRONTMATTER_KEYS,
  type Slide,
  type SlideNode,
  type TemplateConfig,
  type Theme,
} from "@tycoslide/core";
import { z } from "zod";
import type { HeadingDepth } from "../components/label.js";
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
  /** Layout definitions (looked up by template name). */
  layouts: LayoutConfig[];
  /** Component definitions (for slot compilation and rendering). */
  components: ComponentDefinition<any, any, any>[];
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validate raw params and slots against a layout's schemas.
 * Params validated against the layout's Zod param shape.
 * Slots compiled from markdown strings into SlideNode[].
 */
export function validateLayout(
  layout: LayoutConfig,
  rawParams: Record<string, unknown>,
  rawSlots: Record<string, unknown>,
  components: ComponentDefinition<any, any, any>[],
): any {
  const paramsResult = z.object(layout.params).strict().safeParse(rawParams);
  if (!paramsResult.success) {
    const issues = paramsResult.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Layout '${layout.name}' params validation failed:\n${issues}`);
  }

  // Reject unknown slot names
  if (layout.slots?.length) {
    const declaredSlots = new Set(layout.slots);
    const unknownSlots = Object.keys(rawSlots).filter((k) => !declaredSlots.has(k));
    if (unknownSlots.length) {
      throw new Error(
        `Layout '${layout.name}' has unknown slots: [${unknownSlots.join(", ")}]. ` +
          `Declared slots: [${layout.slots.join(", ")}].`,
      );
    }
  } else if (Object.keys(rawSlots).length) {
    const slotNames = Object.keys(rawSlots).join(", ");
    throw new Error(
      `Layout '${layout.name}' does not accept slots, but found: [${slotNames}]. ` +
        `Remove ::${Object.keys(rawSlots)[0]}:: markers or use a layout with slots.`,
    );
  }

  let slotsData: Record<string, unknown> = {};
  if (layout.slots && layout.slots.length > 0) {
    const slotSchema = z.string().transform((s): SlideNode[] => compileSlot(s, components));
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

  return { params: paramsResult.data, slots: slotsData };
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
  const presentation = createPresentation({
    theme: options.theme,
    assets: options.assets,
    components: options.components,
  });

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

/** Compile a `template: name` slide — layout template with content params. */
function compileLayoutSlide(raw: RawSlide, options: CompileOptions): Slide {
  // 1. Resolve template name
  const layoutName = raw.frontmatter.template as string | undefined;

  if (!layoutName) {
    throw new Error(`Slide ${raw.index + 1}: missing 'template' field in frontmatter`);
  }

  // 2. Look up layout definition
  const layout = options.layouts.find((l) => l.name === layoutName);
  if (!layout) {
    const available = options.layouts.map((l) => l.name).join(", ");
    throw new Error(`Slide ${raw.index + 1}: unknown template '${layoutName}'. Available: ${available}`);
  }

  // 3. Look up structured layout config from theme
  const layoutConfig: TemplateConfig | undefined = options.theme.layouts?.[layoutName];
  if (!layoutConfig) {
    throw new Error(`Slide ${raw.index + 1}: theme has no config for template '${layoutName}'.`);
  }

  // 4. Build PARAMS — strip reserved frontmatter keys
  const params: Record<string, unknown> = { ...raw.frontmatter };
  const notes = params.notes as string | undefined;
  for (const key of RESERVED_FRONTMATTER_KEYS) {
    delete params[key];
  }

  // 5. Build SLOTS — from ::name:: markers and body content
  const slots: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw.slots)) {
    slots[key] = value;
  }
  // Default content → first declared slot (or error if layout has no slots)
  if (raw.body.trim()) {
    if (!layout.slots?.length) {
      throw new Error(
        `Layout '${layout.name}' does not accept body content, but body was provided. ` +
          `Move content into params or use a layout with slots (e.g., 'body', 'blank', 'two-column').`,
      );
    }
    const defaultSlotName = layout.slots[0];
    if (!slots[defaultSlotName]) {
      slots[defaultSlotName] = raw.body;
    }
  }

  // 6. Validate params and slots
  const validated = validateLayout(layout, params, slots, options.components);

  // 7. Inject tokens into slot-compiled ComponentNodes
  const { tokens } = layoutConfig;
  if (layout.slots?.length && tokens) {
    for (const slotName of layout.slots) {
      const slotNodes = validated.slots[slotName];
      if (Array.isArray(slotNodes)) {
        injectSlotTokens(slotNodes as SlideNode[], tokens);
      }
    }
  }

  // 8. Render layout — returns content only (SlideNode)
  const content = layout.render(validated.params, validated.slots, tokens);

  // 9. Assemble Slide — background from template config, layoutName for master dedup
  const slide: Slide = {
    layoutName,
    background: layoutConfig.background,
    content,
  };

  // 10. Attach speaker notes from frontmatter
  if (notes) {
    slide.notes = notes;
  }

  return slide;
}

/**
 * Walk slot-compiled nodes and inject layout tokens into ComponentNodes.
 * For each ComponentNode, if the layout tokens contain a key matching
 * node.componentName, assign complete tokens from the layout.
 * Depth-keyed token maps (used by label for heading styles) are resolved
 * inline: headingDepth in params indexes into the map. Missing depths
 * auto-fill from the nearest defined depth at or below the requested depth.
 */
function injectSlotTokens(nodes: SlideNode[], layoutTokens: Record<string, unknown>): void {
  for (const node of nodes) {
    if (isComponentNode(node)) {
      const tokenMap = layoutTokens[node.componentName];
      if (tokenMap && typeof tokenMap === "object") {
        let tokens = tokenMap as Record<string, unknown>;

        // Resolve depth-keyed tokens for heading components (auto-fill missing depths)
        const depth = ((node as ComponentNode).params as Record<string, unknown>)?.headingDepth as
          | HeadingDepth
          | undefined;
        if (depth !== undefined) {
          let entry = tokens[depth] as Record<string, unknown> | undefined;
          if (!entry) {
            // Auto-fill: find highest defined depth and use as fallback
            let fallbackDepth = depth;
            while (fallbackDepth > 0 && !tokens[fallbackDepth]) {
              fallbackDepth--;
            }
            entry = (fallbackDepth > 0 ? tokens[fallbackDepth] : undefined) as Record<string, unknown> | undefined;
          }
          if (!entry) {
            throw new Error(`Label with headingDepth=${depth} has no token entry and no lower depth to fall back to.`);
          }
          tokens = entry;
        }

        (node as ComponentNode).tokens = tokens;
      }
    }
  }
}
