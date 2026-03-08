// Registry
// Generic base class, component registry, and layout registry

import { NODE_TYPE, type ElementNode, type ComponentNode, type SlideNode, type ContainerNode, type StackNode } from '../model/nodes.js';
import type { Theme, Slide } from '../model/types.js';
import type { SyntaxType } from '../model/syntax.js';
import type { RootContent } from 'mdast';
import { z } from 'zod';

import type { ScalarParam } from '../model/schema.js';

// Re-export ComponentNode for convenience
export type { ComponentNode } from '../model/nodes.js';

/** Frontmatter keys consumed by the compiler — cannot be used as layout param names. */
export const RESERVED_FRONTMATTER_KEYS = new Set(['layout', 'name', 'notes', 'variant'] as const);

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
 * Browser-backed capabilities available to components during expansion.
 * Today: render HTML to PNG. Tomorrow: SVG, LaTeX, font metrics, etc.
 */
export interface Canvas {
  renderHtml(html: string, transparent?: boolean): Promise<string>;
}

/**
 * Context passed to component expansion functions.
 */
export interface ExpansionContext {
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
 * A component definition describes how to expand a component into primitives.
 */
export interface ComponentDefinition<TProps = unknown, TTokens = undefined> {
  /** Unique name for this component (e.g., 'card', 'table') */
  name: string;
  /** Token keys that must be present in node.tokens. Set by DSL or slot injection. Empty array = no tokens. */
  tokens: string[];
  /** Optional Zod schema shape for directive attributes (used for coercion on slotted components). */
  params?: SchemaShape;
  /** Slot names — directive body is compiled as ComponentNode[] and passed as props[slotName]. */
  slots?: readonly string[];
  /** Expand props into a node tree (may contain components that get further expanded) */
  expand: (props: TProps, context: ExpansionContext, tokens: TTokens) => SlideNode | Promise<SlideNode>;
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

/** Extract the props type from a component definition's schema. Hides Zod from component authors. */
export type ComponentProps<T extends { schema: z.ZodTypeAny }> = z.infer<T['schema']>;

// ============================================
// DIRECTIVE DESERIALIZATION (private)
// ============================================

/** Deserializer: converts directive attributes + body text into a ComponentNode. */
export type DirectiveDeserializer = (attributes: Record<string, string | null | undefined>, body: string) => ComponentNode;

/**
 * Coerce string attribute values from directive markup to JS types.
 * Directive attributes are always strings; schemas expect booleans/numbers.
 */
export function coerceAttributes(attrs: Record<string, string | null | undefined>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(attrs)) {
    if (v === 'true') result[k] = true;
    else if (v === 'false') result[k] = false;
    else if (typeof v === 'string' && v !== '' && !isNaN(Number(v))) result[k] = Number(v);
    else result[k] = v;
  }
  return result;
}

/**
 * Build a deserializer for :::name directives.
 * Attributes → typed params (with coercion), body → props.body (always a string).
 * Each component's expand function decides what to do with body.
 */
function buildDeserializer(
  componentName: string,
  paramsSchema: z.ZodObject<SchemaShape> | null,
): DirectiveDeserializer {
  return (attributes, body) => {
    const coerced = coerceAttributes(attributes);
    if (body && body.trim()) {
      coerced.body = body.trim();
    }
    const props = paramsSchema ? paramsSchema.passthrough().parse(coerced) : coerced;
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
export function defineComponent<TBody extends z.ZodTypeAny, TTokens = undefined>(def: {
  name: string;
  body: TBody;
  directive?: boolean;
  tokens: TTokens extends undefined ? string[] : (keyof TTokens & string)[];
  mdast?: MdastHandler;
  expand: (props: { body: z.infer<TBody> }, context: ExpansionContext, tokens: TTokens) => SlideNode | Promise<SlideNode>;
}): ScalarComponentDefinition<TBody, TTokens>;

/**
 * Define a component with a body field (primary content) and extra params.
 * Returns a definition with `.schema` (= body type) for use in layout params.
 * Pure factory — does NOT register the component.
 */
export function defineComponent<TBody extends z.ZodTypeAny, TParams extends SchemaShape, TTokens = undefined>(def: {
  name: string;
  body: TBody;
  params: TParams;
  directive?: boolean;
  tokens: TTokens extends undefined ? string[] : (keyof TTokens & string)[];
  mdast?: MdastHandler;
  expand: (props: { body: z.infer<TBody> } & z.infer<z.ZodObject<TParams>>, context: ExpansionContext, tokens: TTokens) => SlideNode | Promise<SlideNode>;
}): ScalarComponentDefinition<TBody, TTokens>;

/**
 * Define a component with typed params inferred from a Zod shape.
 * Returns a definition with `.schema` (pre-wrapped ZodObject) for use in layout params.
 * When invoked from a :::directive, body text arrives as `props.body` (string).
 * Pure factory — does NOT register the component.
 */
export function defineComponent<TShape extends SchemaShape, TTokens = undefined>(def: {
  name: string;
  params: TShape;
  directive?: boolean;
  tokens: TTokens extends undefined ? string[] : (keyof TTokens & string)[];
  mdast?: MdastHandler;
  expand: (props: z.infer<z.ZodObject<TShape>> & { body?: string }, context: ExpansionContext, tokens: TTokens) => SlideNode | Promise<SlideNode>;
}): ScalarComponentDefinition<z.ZodObject<TShape>, TTokens>;

/**
 * Define a slotted component (body compiled as ComponentNode[]).
 * No `.schema` — slotted components aren't usable in layout params.
 * Pure factory — does NOT register the component.
 */
export function defineComponent<TTokens = undefined>(def: {
  name: string;
  params?: SchemaShape;
  slots: readonly string[];
  directive?: boolean;
  tokens: TTokens extends undefined ? string[] : (keyof TTokens & string)[];
  mdast?: MdastHandler;
  expand: (props: any, context: ExpansionContext, tokens: TTokens) => SlideNode | Promise<SlideNode>;
}): ComponentDefinition<any, TTokens>;

/**
 * Define a programmatic-only component (no directive support, no schema).
 * Pure factory — does NOT register the component.
 */
export function defineComponent<TProps, TTokens = undefined>(def: {
  name: string;
  tokens: TTokens extends undefined ? string[] : (keyof TTokens & string)[];
  mdast?: MdastHandler;
  expand: (props: TProps, context: ExpansionContext, tokens: TTokens) => SlideNode | Promise<SlideNode>;
}): ComponentDefinition<TProps, TTokens>;

// Implementation
export function defineComponent(def: any): ComponentDefinition & { schema?: z.ZodTypeAny } {
  const bodySchema: z.ZodTypeAny | null = 'body' in def ? def.body : null;
  const paramsShape: SchemaShape = def.params ?? {};
  const paramsSchema = Object.keys(paramsShape).length > 0 ? z.object(paramsShape) : null;
  const slots: readonly string[] | undefined = def.slots;

  const mdast: MdastHandler | undefined = def.mdast;

  const result: ComponentDefinition & { schema?: z.ZodTypeAny } = {
    name: def.name as string,
    expand: def.expand as ComponentDefinition['expand'],
    tokens: def.tokens as string[],
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
    super('Component');
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
   * Expand a single component node to its primitive representation.
   *
   * Tokens are read from node.tokens, which is set by:
   * - DSL component() helper (e.g., text(body, tokens))
   * - Slot injection from parent layouts/components
   *
   * Token completeness is validated here, AFTER slot injection has already run.
   * @throws Error if the component is not registered or tokens are incomplete
   */
  async expand(node: ComponentNode, context: ExpansionContext): Promise<SlideNode> {
    const def = this.get(node.componentName);
    if (!def) {
      throw new Error(`Unknown component: '${node.componentName}'. Did you forget to register it?`);
    }
    const requiredTokens = def.tokens;
    if (!requiredTokens?.length) {
      return def.expand(node.props, context, undefined as never);
    }

    // Read from node.tokens (set by DSL or slot injection)
    if (!node.tokens) {
      throw new Error(
        `Component '${node.componentName}' requires tokens but none were provided. ` +
        `Tokens must be passed by the parent (layout or composition component). ` +
        `Required: [${requiredTokens.join(', ')}]`
      );
    }
    const missing = requiredTokens.filter(
      (key: string) => node.tokens![key] === undefined || node.tokens![key] === null
    );
    if (missing.length) {
      throw new Error(
        `Component '${node.componentName}' is missing required tokens: [${missing.join(', ')}]. ` +
        `All tokens must be provided by the parent component or layout.`
      );
    }
    return def.expand(node.props, context, node.tokens as never);
  }

  /**
   * Recursively expand all components in a node tree.
   * Primitives pass through unchanged; components are expanded and their
   * results are recursively processed (in case they contain more components).
   */
  async expandTree(node: SlideNode, context: ExpansionContext): Promise<ElementNode> {
    if (isComponentNode(node)) {
      const expanded = await this.expand(node, context);
      return this.expandTree(expanded, context);
    }

    // After the ComponentNode guard above, node is either a leaf ElementNode
    // or a container/stack whose children may still contain ComponentNodes.
    if (node.type === NODE_TYPE.CONTAINER) {
      const container = node as ContainerNode<SlideNode>;
      return {
        ...container,
        children: await Promise.all(
          container.children.map(c => this.expandTree(c, context))
        ),
      } as ContainerNode;
    }
    if (node.type === NODE_TYPE.STACK) {
      const stack = node as StackNode<SlideNode>;
      return {
        ...stack,
        children: await Promise.all(
          stack.children.map(c => this.expandTree(c, context))
        ),
      } as StackNode;
    }

    // Leaf node (text, image, line, shape, slideNumber, table) — no children to resolve
    return node as ElementNode;
  }
}

export const componentRegistry = new ComponentRegistry();

/**
 * Type guard to check if a node is a component node.
 */
export function isComponentNode(node: unknown): node is ComponentNode {
  return (
    typeof node === 'object' &&
    node !== null &&
    'type' in node &&
    (node as { type: unknown }).type === NODE_TYPE.COMPONENT &&
    'componentName' in node &&
    'props' in node
  );
}

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
  /** Token keys that must be present in theme.layouts for this layout. Empty or undefined = no tokens. */
  tokens?: string[];
  render: (props: any, tokens: unknown) => Slide;
}

/**
 * A layout definition that preserves its token type for compile-time validation.
 * The `.tokenMap()` identity method validates token maps against the layout's required shape.
 * Extra properties (e.g. slot injection tokens) are allowed — only declared tokens are checked.
 */
export interface TypedLayoutDefinition<TTokens = unknown> extends LayoutDefinition {
  /** Validate a token map against this layout's required token shape. Returns the map unchanged. */
  tokenMap<T extends TTokens>(map: T): T;
}

/**
 * Define a layout with type-checked render params.
 * Pure factory — does NOT register the layout.
 * TypeScript enforces: params accepts only ScalarParam fields.
 * Slots (optional) are a string array — each becomes ComponentNode[] in render.
 */
export function defineLayout<TParams extends ScalarShape, const TSlots extends readonly string[] = readonly [], TTokens = undefined>(def: {
  name: string;
  description: string;
  params: TParams;
  slots?: TSlots;
  tokens?: TTokens extends undefined ? string[] : (keyof TTokens & string)[];
  render: (props: z.infer<z.ZodObject<TParams>> & SlotsToProps<TSlots>, tokens: TTokens extends undefined ? (Record<string, unknown> | undefined) : TTokens) => Slide;
}): TypedLayoutDefinition<TTokens extends undefined ? Record<string, unknown> : TTokens> {
  for (const key of Object.keys(def.params)) {
    if (RESERVED_FRONTMATTER_KEYS.has(key as any)) {
      throw new Error(
        `Layout '${def.name}': param '${key}' is a reserved frontmatter key (${[...RESERVED_FRONTMATTER_KEYS].join(', ')}). Use a different name.`,
      );
    }
  }
  (def as any).tokenMap = (map: any) => map;
  return def as unknown as TypedLayoutDefinition<any>;
}

/**
 * Registry for layout definitions.
 * Layouts are defined with `defineLayout()` and registered via `layoutRegistry.register()`.
 */
class LayoutRegistry extends Registry<LayoutDefinition> {
  constructor() {
    super('Layout');
  }

  /**
   * Resolve layout tokens for a given layout name and variant from the theme.
   * @throws Error if the layout is not found in theme.layouts or the variant doesn't exist
   */
  resolveTokens(layoutName: string, variant: string, theme: Theme): Record<string, unknown> {
    const config = theme.layouts?.[layoutName];
    if (!config) {
      throw new Error(
        `Layout '${layoutName}' requires tokens but theme.layouts.${layoutName} is missing.`
      );
    }

    const tokens = config.variants[variant];
    if (!tokens) {
      const available = Object.keys(config.variants).join(', ');
      throw new Error(
        `Unknown variant '${variant}' for layout '${layoutName}'. Available: ${available}`
      );
    }

    return tokens as Record<string, unknown>;
  }
}

export const layoutRegistry = new LayoutRegistry();

// ============================================
// MASTER REGISTRY
// ============================================

import { Bounds } from '../model/bounds.js';

/**
 * A master slide definition. Masters provide slide chrome (footer, slide number),
 * content bounds, and background. Registered via `masterRegistry.register()`.
 */
export interface MasterDefinition {
  name: string;
  /** Token keys that must be present in theme.masters for this master. */
  tokens: string[];
  /** Build master content from resolved tokens and slide dimensions. */
  getContent: (tokens: Record<string, unknown>, slideSize: { width: number; height: number }) => {
    content: ComponentNode;
    contentBounds: Bounds;
    background: string;
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
export function defineMaster<TTokens = undefined>(def: {
  name: string;
  tokens: TTokens extends undefined ? string[] : (keyof TTokens & string)[];
  getContent: (
    tokens: TTokens extends undefined ? Record<string, unknown> : TTokens,
    slideSize: { width: number; height: number },
  ) => {
    content: ComponentNode;
    contentBounds: Bounds;
    background: string;
  };
}): TypedMasterDefinition<TTokens extends undefined ? Record<string, unknown> : TTokens> {
  (def as any).tokenMap = (map: any) => map;
  return def as unknown as TypedMasterDefinition<any>;
}

/**
 * Registry for master slide definitions.
 * Masters are defined with `defineMaster()` and registered via `masterRegistry.register()`.
 */
class MasterRegistry extends Registry<MasterDefinition> {
  constructor() {
    super('Master');
  }

  /**
   * Resolve master tokens for a given master name and variant from the theme.
   * @throws Error if the master is not found in theme.masters or the variant doesn't exist
   */
  resolveTokens(masterName: string, variant: string, theme: Theme): Record<string, unknown> {
    const config = theme.masters?.[masterName];
    if (!config) {
      throw new Error(
        `Master '${masterName}' requires tokens but theme.masters.${masterName} is missing.`
      );
    }

    const tokens = config.variants[variant];
    if (!tokens) {
      const available = Object.keys(config.variants).join(', ');
      throw new Error(
        `Unknown variant '${variant}' for master '${masterName}'. Available: ${available}`
      );
    }

    return tokens as Record<string, unknown>;
  }
}

export const masterRegistry = new MasterRegistry();

// ============================================
// DSL HELPER
// ============================================

/**
 * Create a component node.
 * Tokens are stored separately from props to avoid naming conflicts
 * (e.g., card has both props.title: string and tokens.title: TextTokens).
 */
export function component<TProps>(name: string, props: TProps, tokens?: Record<string, unknown> | object): ComponentNode<TProps> {
  const node: ComponentNode<TProps> = {
    type: NODE_TYPE.COMPONENT,
    componentName: name,
    props,
  };
  if (tokens) node.tokens = tokens as Record<string, unknown>;
  return node;
}
