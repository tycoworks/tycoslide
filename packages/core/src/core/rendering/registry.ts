// Registry
// Generic base class, component registry, and layout registry

import type { RootContent } from "mdast";
import { z } from "zod";
import {
  component,
  type ComponentNode,
  type ContainerNode,
  type ElementNode,
  isComponentNode,
  NODE_TYPE,
  type SlideNode,
  type StackNode,
} from "../model/nodes.js";
import type { ScalarParam } from "../model/param.js";
import { RESERVED_FRONTMATTER_KEYS, type SyntaxType } from "../model/syntax.js";
import { type InferTokens, parseTokenShape, type TokenShape, validateTokens } from "../model/token.js";
import type { Bounds } from "../model/bounds.js";
import type { Background, Slide, Theme } from "../model/types.js";

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
 */
export interface ComponentDefinition<TProps = unknown, TTokens = undefined> {
  /** Unique name for this component (e.g., 'card', 'table') */
  name: string;
  /** Declared token shape — required vs optional descriptors. Empty = no tokens. */
  tokens: TokenShape;
  /** Optional Zod schema shape for directive attributes (used for coercion on slotted components). */
  params?: SchemaShape;
  /** Slot names — directive body is compiled as ComponentNode[] and passed as props[slotName]. */
  slots?: readonly string[];
  /** Render props into a node tree (may contain components that get further rendered) */
  render: (props: TProps, context: RenderContext, tokens: TTokens) => SlideNode | Promise<SlideNode>;
  /** Deserialize a :::name directive into a ComponentNode. Auto-generated for content components. */
  deserialize?: DirectiveDeserializer;
  /** MDAST handler — declares which bare markdown node types this component compiles. */
  mdast?: MdastHandler;
}

/** A scalar component definition — has .schema for YAML validation and layout params. */
export type ScalarComponentDefinition<
  TSchema extends z.ZodTypeAny = z.ZodTypeAny,
  TTokens = undefined,
> = ComponentDefinition<any, TTokens> & {
  /** YAML-facing schema. Use in schema.array() or layout params. */
  schema: TSchema;
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
 * Attributes → typed params (with coercion), body → props.body (always a string).
 * Each component's render function decides what to do with body.
 */
function buildDeserializer(
  componentName: string,
  paramsSchema: z.ZodObject<SchemaShape> | null,
): DirectiveDeserializer {
  return (attributes, body) => {
    const coerced = coerceAttributes(attributes);
    let props: Record<string, unknown>;
    if (paramsSchema) {
      try {
        props = paramsSchema.strict().parse(coerced);
      } catch (e: unknown) {
        if (e instanceof z.ZodError) {
          const issues = e.issues.map((i) => i.message).join("; ");
          throw new Error(`Invalid parameters for component '${componentName}': ${issues}`);
        }
        throw e;
      }
    } else {
      props = coerced;
    }
    if (body?.trim()) {
      props.body = body.trim();
    }
    return component(componentName, props);
  };
}

// ============================================
// DEFINE COMPONENT (standalone)
// ============================================

/**
 * Define a component with a body field (primary content) only.
 * Returns a definition with `.schema` (= body type) for use in layout params.
 * Pure factory — does NOT register the component.
 */
export function defineComponent<TBody extends z.ZodTypeAny, TShape extends TokenShape = TokenShape>(def: {
  name: string;
  body: TBody;
  directive?: boolean;
  tokens: TShape;

  mdast?: MdastHandler;
  render: (
    props: { body: z.infer<TBody> },
    context: RenderContext,
    tokens: InferTokens<TShape>,
  ) => SlideNode | Promise<SlideNode>;
}): ScalarComponentDefinition<TBody, InferTokens<TShape>>;

/**
 * Define a component with a body field (primary content) and extra params.
 * Returns a definition with `.schema` (= body type) for use in layout params.
 * Pure factory — does NOT register the component.
 */
export function defineComponent<TBody extends z.ZodTypeAny, TParams extends SchemaShape, TShape extends TokenShape = TokenShape>(def: {
  name: string;
  body: TBody;
  params: TParams;
  directive?: boolean;
  tokens: TShape;

  mdast?: MdastHandler;
  render: (
    props: { body: z.infer<TBody> } & z.infer<z.ZodObject<TParams>>,
    context: RenderContext,
    tokens: InferTokens<TShape>,
  ) => SlideNode | Promise<SlideNode>;
}): ScalarComponentDefinition<TBody, InferTokens<TShape>>;

/**
 * Define a component with typed params inferred from a Zod shape.
 * Returns a definition with `.schema` (pre-wrapped ZodObject) for use in layout params.
 * When invoked from a :::directive, body text arrives as `props.body` (string).
 * Pure factory — does NOT register the component.
 */
export function defineComponent<TParams extends SchemaShape, TShape extends TokenShape = TokenShape>(def: {
  name: string;
  params: TParams;
  directive?: boolean;
  tokens: TShape;

  mdast?: MdastHandler;
  render: (
    props: z.infer<z.ZodObject<TParams>> & { body?: string },
    context: RenderContext,
    tokens: InferTokens<TShape>,
  ) => SlideNode | Promise<SlideNode>;
}): ScalarComponentDefinition<z.ZodObject<TParams>, InferTokens<TShape>>;

/**
 * Define a slotted component (body compiled as ComponentNode[]).
 * No `.schema` — slotted components aren't usable in layout params.
 * Pure factory — does NOT register the component.
 */
export function defineComponent<TShape extends TokenShape = TokenShape>(def: {
  name: string;
  params?: SchemaShape;
  slots: readonly string[];
  directive?: boolean;
  tokens: TShape;

  mdast?: MdastHandler;
  render: (props: any, context: RenderContext, tokens: InferTokens<TShape>) => SlideNode | Promise<SlideNode>;
}): ComponentDefinition<any, InferTokens<TShape>>;

/**
 * Define a programmatic-only component (no directive support, no schema).
 * Pure factory — does NOT register the component.
 */
export function defineComponent<TProps, TShape extends TokenShape = TokenShape>(def: {
  name: string;
  tokens: TShape;

  mdast?: MdastHandler;
  render: (props: TProps, context: RenderContext, tokens: InferTokens<TShape>) => SlideNode | Promise<SlideNode>;
}): ComponentDefinition<TProps, InferTokens<TShape>>;

// Implementation
export function defineComponent(def: any): ComponentDefinition<any, any> & { schema?: z.ZodTypeAny } {
  const bodySchema: z.ZodTypeAny | null = "body" in def ? def.body : null;
  const paramsShape: SchemaShape = def.params ?? {};
  const paramsSchema = Object.keys(paramsShape).length > 0 ? z.object(paramsShape) : null;
  const slots: readonly string[] | undefined = def.slots;

  const mdast: MdastHandler | undefined = def.mdast;

  const result: ComponentDefinition & { schema?: z.ZodTypeAny } = {
    name: def.name as string,
    render: def.render as ComponentDefinition["render"],
    tokens: (def.tokens as TokenShape) ?? {},
    params: def.params,
    slots,
    mdast,
  };

  if (slots?.length) {
    // Slotted component: no auto-deserializer, no .schema.
    // If directive: false, clear slots so getDirectiveHandler() won't match.
    if (def.directive === false) {
      result.slots = undefined;
    }
  } else if (bodySchema || paramsSchema) {
    // Scalar component: auto-generate .schema and directive deserializer
    result.schema = bodySchema ?? z.object(paramsShape);
    if (def.directive !== false) {
      result.deserialize = buildDeserializer(def.name, paramsSchema);
    }
  }
  // else: programmatic only — no directive support, no schema

  return result;
}

// ============================================
// COMPONENT REGISTRY
// ============================================

/**
 * Registry for component definitions.
 * Components are defined with `defineComponent()` and registered via `componentRegistry.register()`.
 */
class ComponentRegistry extends Registry<ComponentDefinition<any, any>> {
  constructor() {
    super("Component");
  }

  /**
   * Register one or more component definitions.
   * Validates MDAST node type uniqueness — no two components may claim the same node type.
   */
  override register(input: ComponentDefinition<any, any> | readonly ComponentDefinition<any, any>[]): void {
    if (Array.isArray(input)) {
      for (const def of input) this.register(def);
      return;
    }
    const def = input as ComponentDefinition<any, any>;
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
   * Returns the definition if it has a deserializer or markdown-accessible slots.
   */
  getDirectiveHandler(name: string): ComponentDefinition | undefined {
    const def = this.get(name);
    if (def?.deserialize || def?.slots?.length) {
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
      return def.render(node.props, context, undefined as never);
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
      return def.render(node.props, context, undefined as never);
    }

    validateTokens(shape, node.tokens, `Component '${node.componentName}'`);
    return def.render(node.props, context, node.tokens as never);
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
    // or a container/stack whose children may still contain ComponentNodes.
    if (node.type === NODE_TYPE.CONTAINER) {
      const container = node as ContainerNode<SlideNode>;
      return {
        ...container,
        children: await Promise.all(container.children.map((c) => this.renderTree(c, context))),
      } as ContainerNode;
    }
    if (node.type === NODE_TYPE.STACK) {
      const stack = node as StackNode<SlideNode>;
      return {
        ...stack,
        children: await Promise.all(stack.children.map((c) => this.renderTree(c, context))),
      } as StackNode;
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
  render: (props: any, tokens: unknown) => Slide;
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
  render: (
    props: z.infer<z.ZodObject<TParams>> & SlotsToProps<TSlots>,
    tokens: InferTokens<TShape>,
  ) => Slide;
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
 * Define a theme. Thin factory for consistency with defineComponent/defineLayout/defineMaster.
 */
export function defineTheme(theme: Theme): Theme {
  return theme;
}
