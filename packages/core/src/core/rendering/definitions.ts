// Definitions
// Component and layout definition types and factories.
// Pure data — no global singletons.

import type { RootContent } from "mdast";
import { z } from "zod";
import { type ComponentNode, component, type ElementNode, type SlideNode } from "../model/nodes.js";
import type { ScalarParam } from "../model/param.js";
import { RESERVED_FRONTMATTER_KEYS, type SyntaxType } from "../model/syntax.js";
import type { Theme } from "../model/types.js";

// Re-export ComponentNode — required for declaration emit (defineComponent return type)
export type { ComponentNode } from "../model/nodes.js";
export { validateThemeFonts } from "./themeValidator.js";

// ============================================
// COMPONENT TYPES
// ============================================

/**
 * Browser-backed capabilities available to components during rendering.
 * Today: render HTML to PNG. Tomorrow: SVG, LaTeX, font metrics, etc.
 */
export interface Canvas {
  renderHtml(html: string, transparent?: boolean): Promise<string>;
}

/**
 * Context passed to component render functions.
 */
export interface RenderContext {
  theme: Theme;
  assets?: Record<string, unknown>;
  canvas: Canvas;
  /** Recursively render a component tree to primitives. Components call this for nested content. */
  renderTree: (node: SlideNode) => Promise<ElementNode>;
}

/**
 * Declares which bare MDAST node types a component can compile.
 * Registered via the `mdast` field on `define()`.
 */
export interface MdastHandler {
  /** MDAST node types this component handles (e.g., SYNTAX.PARAGRAPH, SYNTAX.LIST) */
  nodeTypes: SyntaxType[];
  /** Transform an MDAST node into a ComponentNode. Return null to skip. */
  compile: (node: RootContent, source: string) => ComponentNode | null;
}

/**
 * A component definition describes how to render a component into primitives.
 * Render receives params and content as separate channels.
 */
export interface ComponentDefinition<TParams = unknown, TContent = unknown, TTokens = undefined> {
  /** Unique name for this component (e.g., 'card', 'table') */
  name: string;
  /** Optional Zod schema shape for directive attributes. */
  params?: SchemaShape;
  /** Whether this component accepts children (SlideNode[]) as content. */
  children?: boolean;
  /** Render params + content into a node tree (may contain components that get further rendered) */
  render: (
    params: TParams,
    content: TContent,
    context: RenderContext,
    tokens: TTokens,
  ) => SlideNode | Promise<SlideNode>;
  /** Deserialize a :::name directive into a ComponentNode. Auto-generated for content components. */
  deserialize?: DirectiveDeserializer;
  /** MDAST handler — declares which bare markdown node types this component compiles. */
  mdast?: MdastHandler;
}

/** A scalar component definition — has .schema for YAML validation and layout params. */
export type ScalarComponentDefinition<
  TSchema extends z.ZodTypeAny = z.ZodTypeAny,
  TTokens = undefined,
> = ComponentDefinition<any, any, TTokens> & {
  /** Content schema. Use in schema.array() or layout params (e.g., param.required(textComponent.schema)). */
  schema: TSchema;
  /** Params ZodObject schema (when component has both content and params). */
  paramsSchema?: z.ZodObject<any>;
};

// ============================================
// DIRECTIVE DESERIALIZATION (private)
// ============================================

/** Deserializer: converts directive attributes + body text into a ComponentNode. */
export type DirectiveDeserializer = (
  attributes: Record<string, string | null | undefined>,
  body: string,
) => ComponentNode;

/**
 * Coerce string attribute values from directive markup to JS types.
 * Directive attributes are always strings; schemas expect booleans/numbers.
 */
function coerceAttributes(attrs: Record<string, string | null | undefined>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(attrs)) {
    if (v === "true") result[k] = true;
    else if (v === "false") result[k] = false;
    else if (typeof v === "string" && v !== "" && !Number.isNaN(Number(v))) result[k] = Number(v);
    else result[k] = v;
  }
  return result;
}

/**
 * Build a deserializer for :::name directives.
 * Attributes → typed params (with coercion), body → content channel (separate from params).
 */
function buildDeserializer(
  componentName: string,
  paramsSchema: z.ZodObject<SchemaShape> | null,
): DirectiveDeserializer {
  return (attributes, body) => {
    const coerced = coerceAttributes(attributes);
    let params: Record<string, unknown>;
    if (paramsSchema) {
      try {
        params = paramsSchema.strict().parse(coerced);
      } catch (e: unknown) {
        if (e instanceof z.ZodError) {
          const issues = e.issues.map((i) => i.message).join("; ");
          throw new Error(`Invalid parameters for component '${componentName}': ${issues}`);
        }
        throw e;
      }
    } else {
      const keys = Object.keys(coerced);
      if (keys.length) {
        throw new Error(`Component '${componentName}' does not accept parameters, but received: [${keys.join(", ")}].`);
      }
      params = {};
    }
    const content = body?.trim() || undefined;
    return component(componentName, params, content);
  };
}

// ============================================
// DEFINE COMPONENT (standalone)
// ============================================

/**
 * Define a content component — has a `content` schema (primary content) and optional params.
 * Returns a definition with `.schema` (= content type) for use in layout params.
 * Pure factory — does NOT register the component.
 */
export function defineComponent<
  TContent extends z.ZodTypeAny,
  TParams extends SchemaShape = Record<string, never>,
  TTokens extends object = Record<string, unknown>,
>(def: {
  name: string;
  content: TContent;
  params?: TParams;
  directive?: boolean;
  mdast?: MdastHandler;
  render: (
    params: z.infer<z.ZodObject<TParams>>,
    content: z.infer<TContent>,
    context: RenderContext,
    tokens: TTokens,
  ) => SlideNode | Promise<SlideNode>;
}): ScalarComponentDefinition<TContent, TTokens>;

/**
 * Define a container component — accepts children (SlideNode[]) as content.
 * No `.schema` — container components aren't usable in layout params.
 * Pure factory — does NOT register the component.
 */
export function defineComponent<TParams, TTokens extends object = Record<string, unknown>>(def: {
  name: string;
  children: true;
  directive?: boolean;
  render: (
    params: TParams,
    children: SlideNode[],
    context: RenderContext,
    tokens: TTokens,
  ) => SlideNode | Promise<SlideNode>;
}): ComponentDefinition<TParams, SlideNode[], TTokens>;

/**
 * Define a params-only component (no content, no children).
 * Supports directive deserialization if params are declared.
 * Pure factory — does NOT register the component.
 */
export function defineComponent<
  TParams extends SchemaShape = Record<string, never>,
  TTokens extends object = Record<string, unknown>,
>(def: {
  name: string;
  params?: TParams;
  directive?: boolean;
  mdast?: MdastHandler;
  render: (
    params: z.infer<z.ZodObject<TParams>>,
    content: undefined,
    context: RenderContext,
    tokens: TTokens,
  ) => SlideNode | Promise<SlideNode>;
}): ScalarComponentDefinition<z.ZodObject<TParams>, TTokens>;

// Implementation
export function defineComponent(def: any): ComponentDefinition<any, any, any> & { schema?: z.ZodTypeAny } {
  const contentSchema: z.ZodTypeAny | null = "content" in def ? def.content : null;
  const paramsShape: SchemaShape = def.params ?? {};
  const paramsSchema = Object.keys(paramsShape).length > 0 ? z.object(paramsShape) : null;
  const isContainer: boolean = def.children === true;

  const mdast: MdastHandler | undefined = def.mdast;

  const result: ComponentDefinition & { schema?: z.ZodTypeAny; paramsSchema?: z.ZodObject<any> } = {
    name: def.name as string,
    render: def.render as ComponentDefinition["render"],
    params: def.params,
    children: isContainer || undefined,
    mdast,
  };

  if (isContainer) {
    // Container component: no auto-deserializer, no .schema.
    // Nothing to do — containers are DSL-only.
  } else if (contentSchema || paramsSchema) {
    // Content/scalar component: auto-generate .schema and directive deserializer
    result.schema = contentSchema ?? paramsSchema!;
    if (contentSchema && paramsSchema) {
      result.paramsSchema = paramsSchema;
    }
    if (def.directive !== false) {
      result.deserialize = buildDeserializer(def.name, paramsSchema);
    }
  } else if (def.directive !== false) {
    // No content or params, but still directive-invocable (e.g. :::line)
    result.deserialize = buildDeserializer(def.name as string, null);
  }

  return result;
}

// ============================================
// LAYOUT TYPES
// ============================================

/** Raw Zod shape — a record of field names to Zod types. */
export type SchemaShape = Record<string, z.ZodTypeAny>;

/** A Zod shape where every field is a scalar param (YAML-expressible). */
export type ScalarShape = Record<string, ScalarParam>;

/** Map slot names to their render type (each slot becomes SlideNode[]). */
type SlotsToProps<T extends readonly string[]> = { [K in T[number]]: SlideNode[] };

/**
 * A named, described, typed slide factory.
 * `params` holds scalar fields (from YAML frontmatter).
 * `slots` lists slot names (from ::name:: body markers), optional.
 * Use `defineLayout()` to create layouts.
 */
export interface LayoutConfig {
  name: string;
  params: SchemaShape;
  slots?: readonly string[];
  render: (params: any, slots: any, tokens: unknown) => SlideNode;
}

/**
 * Define a layout. Pure factory — does NOT register the layout.
 *
 * Annotate the `tokens` parameter in the render callback with your token interface
 * (e.g., `tokens: BodyLayoutTokens`) for compile-time type checking.
 */
export function defineLayout<
  TTokens extends object = Record<string, unknown>,
  TParams extends ScalarShape = ScalarShape,
  const TSlots extends readonly string[] = readonly [],
>(def: {
  name: string;
  params: TParams;
  slots?: TSlots;
  render: (params: z.infer<z.ZodObject<TParams>>, slots: SlotsToProps<TSlots>, tokens: TTokens) => SlideNode;
}): LayoutConfig {
  for (const key of Object.keys(def.params)) {
    if (RESERVED_FRONTMATTER_KEYS.has(key as any)) {
      throw new Error(
        `Layout '${def.name}': param '${key}' is a reserved frontmatter key (${[...RESERVED_FRONTMATTER_KEYS].join(", ")}). Use a different name.`,
      );
    }
  }
  return def as unknown as LayoutConfig;
}
