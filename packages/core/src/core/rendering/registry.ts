// Registry
// Generic base class, component registry, and layout registry

import type { RootContent } from "mdast";
import { z } from "zod";
import type { Bounds } from "../model/bounds.js";
import {
  type ComponentNode,
  component,
  type ElementNode,
  isComponentNode,
  isLayoutNode,
  type LayoutNode,
  type SlideNode,
} from "../model/nodes.js";
import type { ScalarParam } from "../model/param.js";
import { RESERVED_FRONTMATTER_KEYS, type SyntaxType } from "../model/syntax.js";
import { type InferTokens, parseTokenShape, type TokenShape, validateTokens } from "../model/token.js";
import type { Background, Slide, Theme } from "../model/types.js";
import { validateThemeFonts } from "./themeValidator.js";

// Re-export ComponentNode — required for declaration emit (defineComponent return type)
export type { ComponentNode } from "../model/nodes.js";

// ============================================
// GENERIC REGISTRY BASE CLASS
// ============================================

/**
 * A generic registry for named definitions.
 * Provides idempotent registration, lookup, and enumeration.
 */
export class Registry<TDef extends { name: string }> {
  private definitions = new Map<string, TDef>();

  constructor(private label: string) {}

  /**
   * Register one or more definitions.
   * Idempotent: re-registering the same object is a no-op.
   * @throws Error if a different definition with the same name is already registered
   */
  register(input: TDef | readonly TDef[]): void {
    if (Array.isArray(input)) {
      for (const def of input) this.register(def);
      return;
    }
    const def = input as TDef;
    const existing = this.definitions.get(def.name);
    if (existing) {
      if (existing === def) return;
      throw new Error(`${this.label} '${def.name}' already registered`);
    }
    this.definitions.set(def.name, def);
  }

  has(name: string): boolean {
    return this.definitions.has(name);
  }

  get(name: string): TDef | undefined {
    return this.definitions.get(name);
  }

  getAll(): TDef[] {
    return Array.from(this.definitions.values());
  }

  getRegisteredNames(): string[] {
    return Array.from(this.definitions.keys());
  }
}

// ============================================
// COMPONENT REGISTRY
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
  /** Declared token shape — required vs optional descriptors. Empty = no tokens. */
  tokens: TokenShape;
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
  /** Optional token transform — runs during slot injection, after layout tokens are merged but before render.
   * Receives merged tokens and the node's params. Returns the final tokens for render. */
  resolveTokens?: (tokens: Record<string, unknown>, params: Record<string, unknown>) => Record<string, unknown>;
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
  TShape extends TokenShape = TokenShape,
>(def: {
  name: string;
  content: TContent;
  params?: TParams;
  directive?: boolean;
  tokens: TShape;
  mdast?: MdastHandler;
  resolveTokens?: (tokens: Record<string, unknown>, params: Record<string, unknown>) => Record<string, unknown>;
  render: (
    params: z.infer<z.ZodObject<TParams>>,
    content: z.infer<TContent>,
    context: RenderContext,
    tokens: InferTokens<TShape>,
  ) => SlideNode | Promise<SlideNode>;
}): ScalarComponentDefinition<TContent, InferTokens<TShape>>;

/**
 * Define a container component — accepts children (SlideNode[]) as content.
 * No `.schema` — container components aren't usable in layout params.
 * Pure factory — does NOT register the component.
 */
export function defineComponent<TParams, TShape extends TokenShape = TokenShape>(def: {
  name: string;
  children: true;
  directive?: boolean;
  tokens: TShape;
  resolveTokens?: (tokens: Record<string, unknown>, params: Record<string, unknown>) => Record<string, unknown>;
  render: (
    params: TParams,
    children: SlideNode[],
    context: RenderContext,
    tokens: InferTokens<TShape>,
  ) => SlideNode | Promise<SlideNode>;
}): ComponentDefinition<TParams, SlideNode[], InferTokens<TShape>>;

/**
 * Define a params-only component (no content, no children).
 * Supports directive deserialization if params are declared.
 * Pure factory — does NOT register the component.
 */
export function defineComponent<
  TParams extends SchemaShape = Record<string, never>,
  TShape extends TokenShape = TokenShape,
>(def: {
  name: string;
  params?: TParams;
  directive?: boolean;
  tokens: TShape;
  mdast?: MdastHandler;
  resolveTokens?: (tokens: Record<string, unknown>, params: Record<string, unknown>) => Record<string, unknown>;
  render: (
    params: z.infer<z.ZodObject<TParams>>,
    content: undefined,
    context: RenderContext,
    tokens: InferTokens<TShape>,
  ) => SlideNode | Promise<SlideNode>;
}): ScalarComponentDefinition<z.ZodObject<TParams>, InferTokens<TShape>>;

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
    tokens: (def.tokens as TokenShape) ?? {},
    params: def.params,
    children: isContainer || undefined,
    mdast,
    resolveTokens: def.resolveTokens,
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
// COMPONENT REGISTRY
// ============================================

/**
 * Registry for component definitions.
 * Components are defined with `defineComponent()` and registered via `componentRegistry.register()`.
 */
class ComponentRegistry extends Registry<ComponentDefinition<any, any, any>> {
  constructor() {
    super("Component");
  }

  /**
   * Register one or more component definitions.
   * Validates MDAST node type uniqueness — no two components may claim the same node type.
   */
  override register(input: ComponentDefinition<any, any, any> | readonly ComponentDefinition<any, any, any>[]): void {
    if (Array.isArray(input)) {
      for (const def of input) this.register(def);
      return;
    }
    const def = input as ComponentDefinition<any, any, any>;
    if (def.mdast) {
      for (const nodeType of def.mdast.nodeTypes) {
        const existing = this.getMdastHandler(nodeType);
        if (existing && existing.name !== def.name) {
          throw new Error(
            `MDAST node type '${nodeType}' already handled by '${existing.name}'. ` +
              `Cannot register '${def.name}' for the same type.`,
          );
        }
      }
    }
    super.register(def);
  }

  /**
   * Find the component that handles a given bare MDAST node type.
   * Returns undefined if no component has registered for this type.
   */
  getMdastHandler(nodeType: string): ComponentDefinition | undefined {
    for (const def of this.getAll()) {
      if (def.mdast?.nodeTypes.includes(nodeType as SyntaxType)) return def;
    }
    return undefined;
  }

  /**
   * Find a component that supports :::name directive invocation.
   * Returns the definition if it has a deserializer.
   */
  getDirectiveHandler(name: string): ComponentDefinition | undefined {
    const def = this.get(name);
    if (def?.deserialize) {
      return def;
    }
    return undefined;
  }

  /**
   * Render a single component node to its primitive representation.
   *
   * Tokens are read from node.tokens, which is set by:
   * - DSL component() helper (e.g., text(body, tokens))
   * - Slot injection from parent layouts/components
   *
   * Token completeness is validated here, AFTER slot injection has already run.
   * @throws Error if the component is not registered or tokens are incomplete
   */
  async render(node: ComponentNode, context: RenderContext): Promise<SlideNode> {
    const def = this.get(node.componentName);
    if (!def) {
      throw new Error(`Unknown component: '${node.componentName}'. Did you forget to register it?`);
    }
    const shape = parseTokenShape(def.tokens);
    if (!shape.allKeys.size) {
      return def.render(node.params, node.content, context, undefined as any);
    }

    // Read from node.tokens (set by DSL or slot injection)
    if (!node.tokens) {
      if (shape.requiredKeys.length) {
        throw new Error(
          `Component '${node.componentName}' requires tokens but none were provided. ` +
            `Tokens must be passed by the parent (layout or composition component). ` +
            `Required: [${shape.requiredKeys.join(", ")}]`,
        );
      }
      return def.render(node.params, node.content, context, undefined as any);
    }

    validateTokens(shape, node.tokens, `Component '${node.componentName}'`);
    return def.render(node.params, node.content, context, node.tokens as any);
  }

  /**
   * Recursively render all components in a node tree.
   * Primitives pass through unchanged; components are rendered and their
   * results are recursively processed (in case they contain more components).
   */
  async renderTree(node: SlideNode, context: RenderContext): Promise<ElementNode> {
    if (isComponentNode(node)) {
      const rendered = await this.render(node, context);
      return this.renderTree(rendered, context);
    }

    // After the ComponentNode guard above, node is either a leaf ElementNode
    // or a layout node whose children may still contain ComponentNodes.
    if (isLayoutNode(node as ElementNode)) {
      const layout = node as LayoutNode;
      return {
        ...layout,
        children: await Promise.all(layout.children.map((c) => this.renderTree(c, context))),
      } as LayoutNode;
    }

    // Leaf node (text, image, line, shape, slideNumber, table) — no children to resolve
    return node as ElementNode;
  }
}

export const componentRegistry = new ComponentRegistry();

// ============================================
// LAYOUT REGISTRY
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
 * Use `defineLayout()` to create layout definitions.
 */
export interface LayoutDefinition {
  name: string;
  description: string;
  params: SchemaShape;
  slots?: readonly string[];
  /** Declared token shape — required vs optional descriptors. Use `{}` for no tokens. */
  tokens: TokenShape;
  render: (params: any, slots: any, tokens: unknown) => Slide;
}

/**
 * A layout definition that preserves its token type for compile-time validation.
 * The `.tokenMap()` method validates required tokens at theme construction time.
 * Returns the token map unchanged for storage in Theme.layouts.
 */
export interface TypedLayoutDefinition<TTokens = unknown> extends LayoutDefinition {
  /** Validate a token map against this layout's required token shape. Returns the map for theme storage. */
  tokenMap<T extends TTokens>(map: T): T;
}

/**
 * Define a layout with type-checked render params.
 * Pure factory — does NOT register the layout.
 * TypeScript enforces: params accepts only ScalarParam fields.
 * Slots (optional) are a string array — each becomes ComponentNode[] in render.
 */
export function defineLayout<
  TParams extends ScalarShape,
  const TSlots extends readonly string[] = readonly [],
  TShape extends TokenShape = TokenShape,
>(def: {
  name: string;
  description: string;
  params: TParams;
  slots?: TSlots;
  tokens: TShape;
  render: (params: z.infer<z.ZodObject<TParams>>, slots: SlotsToProps<TSlots>, tokens: InferTokens<TShape>) => Slide;
}): TypedLayoutDefinition<InferTokens<TShape>> {
  for (const key of Object.keys(def.params)) {
    if (RESERVED_FRONTMATTER_KEYS.has(key as any)) {
      throw new Error(
        `Layout '${def.name}': param '${key}' is a reserved frontmatter key (${[...RESERVED_FRONTMATTER_KEYS].join(", ")}). Use a different name.`,
      );
    }
  }
  (def as any).tokenMap = (map: any) => map;
  return def as unknown as TypedLayoutDefinition<any>;
}

export const layoutRegistry = new Registry<LayoutDefinition>("Layout");

// ============================================
// MASTER REGISTRY
// ============================================

/**
 * A master slide definition. Masters provide slide chrome (footer, slide number),
 * content bounds, and background. Registered via `masterRegistry.register()`.
 */
export interface MasterDefinition {
  name: string;
  /** Declared token shape — required vs optional descriptors. */
  tokens: TokenShape;
  /** Build master content from resolved tokens and slide dimensions. */
  render: (
    tokens: Record<string, unknown>,
    slideSize: { width: number; height: number },
  ) => {
    content: ComponentNode;
    contentBounds: Bounds;
    background: Background;
  };
}

/**
 * A master definition that preserves its token type for compile-time validation.
 * The `.tokenMap()` identity method validates token maps against the master's required shape.
 */
export interface TypedMasterDefinition<TTokens = unknown> extends MasterDefinition {
  /** Validate a token map against this master's required token shape. Returns the map unchanged. */
  tokenMap<T extends TTokens>(map: T): T;
}

/**
 * Define a master slide with type-checked tokens.
 * Pure factory — does NOT register the master.
 */
export function defineMaster<TShape extends TokenShape = TokenShape>(def: {
  name: string;
  tokens: TShape;
  render: (
    tokens: InferTokens<TShape>,
    slideSize: { width: number; height: number },
  ) => {
    content: ComponentNode;
    contentBounds: Bounds;
    background: Background;
  };
}): TypedMasterDefinition<InferTokens<TShape>> {
  (def as any).tokenMap = (map: any) => map;
  return def as unknown as TypedMasterDefinition<any>;
}

export const masterRegistry = new Registry<MasterDefinition>("Master");

// ============================================
// DEFINE THEME
// ============================================

/**
 * Define a theme. Validates font configuration and returns the theme object.
 * All font paths must be non-empty, use a supported format, and be registered in theme.fonts.
 */
export function defineTheme(theme: Theme): Theme {
  validateThemeFonts(theme);
  return theme;
}
