// Registry
// Generic base class, component registry, and layout registry

import { NODE_TYPE, type ElementNode, type ComponentNode, type SlideNode } from './nodes.js';
import { MARKDOWN, type Theme } from './types.js';
import type { Slide } from '../presentation.js';
import { z } from 'zod';

// Re-export ComponentNode for convenience
export type { ComponentNode } from './nodes.js';

// ============================================
// GENERIC REGISTRY BASE CLASS
// ============================================

/**
 * A generic registry for named definitions.
 * Provides idempotent registration, lookup, and enumeration.
 */
export class Registry<TDef extends { name: string }> {
  private definitions = new Map<string, TDef>();

  constructor(private label: string, private identityKey: keyof TDef) {}

  /**
   * Register a definition.
   * Idempotent: re-registering the same implementation is a no-op.
   * @throws Error if a definition with this name has a different implementation
   */
  register(definition: TDef): void {
    const existing = this.definitions.get(definition.name);
    if (existing) {
      if (existing[this.identityKey] === definition[this.identityKey]) {
        return;
      }
      throw new Error(`${this.label} '${definition.name}' already registered with different implementation`);
    }
    this.definitions.set(definition.name, definition);
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

  clear(): void {
    this.definitions.clear();
  }
}

// ============================================
// COMPONENT REGISTRY
// ============================================

/**
 * Context passed to component expansion functions.
 */
export interface ExpansionContext {
  theme: Theme;
  slideIndex?: number;
}

/**
 * A component definition describes how to expand a component into primitives.
 */
export interface ComponentDefinition<TProps = unknown, TTokens = undefined> {
  /** Unique name for this component (e.g., 'card', 'table') */
  name: string;
  /** Optional theme token resolver — returns default token values for this component. */
  defaults?: (theme: Theme) => TTokens;
  /** Expand props into a node tree (may contain components that get further expanded) */
  expand: (props: TProps, context: ExpansionContext, tokens: TTokens) => SlideNode | Promise<SlideNode>;
  /** How this component is invoked from markdown (if at all). */
  markdown?: MarkdownInvocation;
}

/** A component definition with typed params inferred from a Zod shape, for use in layout params. */
export type ParamsComponentDefinition<TShape extends SchemaShape, TTokens = undefined> =
  ComponentDefinition<z.infer<z.ZodObject<TShape>>, TTokens> & {
    /** YAML-facing input type — use in schema.array() or layout params. */
    input: z.ZodObject<TShape>;
  };

/** A component definition with a simple YAML-facing input type (e.g., z.string()). */
export type InputComponentDefinition<TProps, TInput extends z.ZodTypeAny, TTokens = undefined> =
  ComponentDefinition<TProps, TTokens> & {
    /** YAML-facing input type for use in layout params. */
    input: TInput;
  };

// ============================================
// MARKDOWN INVOCATION TYPES
// ============================================

/** Component handles native markdown syntax (e.g., | table |, # heading). */
export interface MarkdownSyntax {
  type: typeof MARKDOWN.SYNTAX;
  nodeType: string | string[];
  compile: (node: unknown, source: string) => ComponentNode | null;
}

/** Component is invoked via :::name block directive. */
export interface MarkdownBlock {
  type: typeof MARKDOWN.BLOCK;
}

/** How a component is invoked from markdown. */
export type MarkdownInvocation = MarkdownSyntax | MarkdownBlock;

/** Type discriminator for component nodes */
export const COMPONENT_TYPE = NODE_TYPE.COMPONENT;

/**
 * Registry for component definitions.
 * Use `.define()` to create, register, and return a component definition in one call.
 */
class ComponentRegistry extends Registry<ComponentDefinition<any, any>> {
  constructor() {
    super('Component', 'expand');
  }

  /**
   * Define and register a component with typed params inferred from a Zod shape.
   * The params are the single source of truth — no separate Props interface needed.
   *
   * The returned definition has an `.input` property (pre-wrapped ZodObject)
   * that layout authors can reference directly: `schema.array(cardComponent.input)`
   */
  define<TShape extends SchemaShape, TTokens = undefined>(def: {
    name: string;
    params: TShape;
    defaults?: (theme: Theme) => TTokens;
    expand: (props: z.infer<z.ZodObject<TShape>>, context: ExpansionContext, tokens: TTokens) => SlideNode | Promise<SlideNode>;
    markdown?: MarkdownInvocation;
  }): ParamsComponentDefinition<TShape, TTokens>;

  /**
   * Define and register a component with a simple YAML-facing input type.
   * Use for components where the YAML input differs from the full programmatic props
   * (e.g., markdown accepts a string from YAML but the expand function takes TextComponentProps).
   */
  define<TProps, TInput extends z.ZodTypeAny, TTokens = undefined>(def: {
    name: string;
    input: TInput;
    defaults?: (theme: Theme) => TTokens;
    expand: (props: TProps, context: ExpansionContext, tokens: TTokens) => SlideNode | Promise<SlideNode>;
    markdown?: MarkdownInvocation;
  }): InputComponentDefinition<TProps, TInput, TTokens>;

  /**
   * Define and register a component for programmatic-only use (no YAML schema).
   */
  define<TProps, TTokens = undefined>(def: {
    name: string;
    defaults?: (theme: Theme) => TTokens;
    expand: (props: TProps, context: ExpansionContext, tokens: TTokens) => SlideNode | Promise<SlideNode>;
    markdown?: MarkdownInvocation;
  }): ComponentDefinition<TProps, TTokens>;

  define(def: any): any {
    if ('params' in def && 'input' in def) {
      throw new Error(`componentRegistry.define('${def.name}'): cannot specify both 'params' and 'input'`);
    }

    const md: MarkdownInvocation | undefined = def.markdown;

    // Validate: BLOCK requires .input (params or input overload)
    if (md?.type === MARKDOWN.BLOCK && !('params' in def) && !('input' in def)) {
      throw new Error(
        `componentRegistry.define('${def.name}'): markdown type 'block' requires 'params' or 'input' ` +
        `— there is no schema to parse the :::${def.name} directive body against.`,
      );
    }

    // Validate: no duplicate SYNTAX handlers for the same MDAST node type
    if (md?.type === MARKDOWN.SYNTAX) {
      const nodeTypes = Array.isArray(md.nodeType) ? md.nodeType : [md.nodeType];
      for (const nt of nodeTypes) {
        const existing = this.getSyntaxHandler(nt);
        if (existing) {
          throw new Error(
            `componentRegistry.define('${def.name}'): MDAST node type '${nt}' is already handled ` +
            `by component '${existing.name}'.`,
          );
        }
      }
    }

    // Validate: no duplicate BLOCK handlers for the same directive name
    if (md?.type === MARKDOWN.BLOCK) {
      const existing = this.getBlockHandler(def.name);
      if (existing) {
        throw new Error(
          `componentRegistry.define('${def.name}'): directive ':::${def.name}' is already handled ` +
          `by component '${existing.name}'.`,
        );
      }
    }

    let result: any;
    if ('params' in def) {
      const input = z.object(def.params);
      result = { name: def.name, expand: def.expand, input, markdown: md, defaults: def.defaults };
    } else if ('input' in def) {
      result = { name: def.name, expand: def.expand, input: def.input, markdown: md, defaults: def.defaults };
    } else {
      result = { name: def.name, expand: def.expand, markdown: md, defaults: def.defaults };
    }
    this.register(result);
    return result;
  }

  /**
   * Find the SYNTAX handler for a given MDAST node type.
   * Returns the component definition if one registered for this node type, or undefined.
   */
  getSyntaxHandler(nodeType: string): (ComponentDefinition & { markdown: MarkdownSyntax }) | undefined {
    for (const def of this.getAll()) {
      const md = def.markdown;
      if (md?.type === MARKDOWN.SYNTAX) {
        const types = Array.isArray(md.nodeType) ? md.nodeType : [md.nodeType];
        if (types.includes(nodeType)) {
          return def as ComponentDefinition & { markdown: MarkdownSyntax };
        }
      }
    }
    return undefined;
  }

  /**
   * Find the BLOCK handler for a given directive name.
   * Block directives use the component name as the directive name (:::card → 'card').
   */
  getBlockHandler(name: string): (ComponentDefinition & { markdown: MarkdownBlock; input: z.ZodTypeAny }) | undefined {
    const def = this.get(name);
    if (def?.markdown?.type === MARKDOWN.BLOCK && 'input' in def) {
      return def as ComponentDefinition & { markdown: MarkdownBlock; input: z.ZodTypeAny };
    }
    return undefined;
  }

  /**
   * Expand a single component node to its primitive representation.
   * @throws Error if the component is not registered
   */
  async expand(node: ComponentNode, context: ExpansionContext): Promise<SlideNode> {
    const def = this.get(node.componentName);
    if (!def) {
      throw new Error(`Unknown component: '${node.componentName}'. Did you forget to register it?`);
    }
    if (def.defaults) {
      const defaults = def.defaults(context.theme) as Record<string, unknown>;
      const componentConfig = context.theme.components?.[node.componentName] ?? {};

      // Separate variants from base overrides
      const { variants: variantDefs, ...baseOverrides } = componentConfig as
        Record<string, unknown> & { variants?: Record<string, Record<string, unknown>> };

      // Start with defaults + base overrides
      let tokens = { ...defaults, ...baseOverrides };

      // Apply variant if requested via props
      const variantName = (node.props as any)?.variant;
      if (variantName && typeof variantName === 'string') {
        const variantOverrides = variantDefs?.[variantName];
        if (!variantOverrides) {
          const available = variantDefs ? Object.keys(variantDefs).join(', ') : '(none)';
          throw new Error(
            `Unknown variant '${variantName}' for component '${node.componentName}'. Available: ${available}`
          );
        }
        tokens = { ...tokens, ...variantOverrides };
      }

      return def.expand(node.props, context, tokens as any);
    }
    return def.expand(node.props, context, undefined as any);
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

    const elementNode = node as ElementNode;

    if ('children' in elementNode && Array.isArray((elementNode as any).children)) {
      const withChildren = elementNode as ElementNode & { children: SlideNode[] };
      return {
        ...withChildren,
        children: await Promise.all(
          withChildren.children.map(c => this.expandTree(c, context))
        ),
      } as ElementNode;
    }

    return elementNode;
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
    (node as any).type === COMPONENT_TYPE &&
    'componentName' in node &&
    'props' in node
  );
}

// ============================================
// LAYOUT REGISTRY
// ============================================

/** Raw Zod shape — a record of field names to Zod types. */
export type SchemaShape = Record<string, z.ZodTypeAny>;

/** Infer the TypeScript type from a raw Zod shape. Use instead of importing z from zod. */
export type InferProps<TShape extends SchemaShape> = z.infer<z.ZodObject<TShape>>;

/**
 * A named, described, typed slide factory.
 * The params field is a raw shape — the framework wraps it in z.object() internally.
 * Use `layoutRegistry.define()` to create layouts with type-checked render params.
 */
export interface LayoutDefinition {
  name: string;
  description: string;
  params: SchemaShape;
  render: (props: any) => Slide;
}

/**
 * Registry for layout definitions.
 * Use `.define()` to create, register, and return a layout definition in one call.
 */
class LayoutRegistry extends Registry<LayoutDefinition> {
  constructor() {
    super('Layout', 'render');
  }

  /**
   * Define and register a layout with type-safe render params inferred from the params schema.
   * The params define both runtime validation AND TypeScript types — single source of truth.
   */
  define<TShape extends SchemaShape>(def: {
    name: string;
    description: string;
    params: TShape;
    render: (props: z.infer<z.ZodObject<TShape>>) => Slide;
  }): LayoutDefinition {
    this.register(def);
    return def;
  }
}

export const layoutRegistry = new LayoutRegistry();

/**
 * Validate raw frontmatter props against a layout's Zod schema.
 * Wraps the raw shape in z.object() before parsing.
 * @returns The validated props (post-transform)
 * @throws Error with formatted message on validation failure
 */
export function validateLayoutProps(
  layout: LayoutDefinition,
  raw: Record<string, unknown>,
): any {
  const result = z.object(layout.params).safeParse(raw);
  if (result.success) {
    return result.data;
  }
  const issues = result.error.issues
    .map(i => `  - ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  throw new Error(`Layout '${layout.name}' validation failed:\n${issues}`);
}

// ============================================
// SLIDE REGISTRY
// ============================================

/**
 * A named, pre-built slide with typed frontmatter params.
 * Referenced from markdown via `slide: name` in frontmatter.
 * Unlike layouts (structural templates), slides are complete content units
 * reused across presentations (e.g., "challenge", "whatIsMaterialize").
 */
export interface SlideDefinition {
  name: string;
  description: string;
  params: SchemaShape;
  render: (props: any) => Slide;
}

/**
 * Registry for slide definitions.
 * Use `.define()` to create, register, and return a slide definition in one call.
 */
class SlideRegistry extends Registry<SlideDefinition> {
  constructor() { super('Slide', 'render'); }

  /**
   * Define and register a slide with type-safe params inferred from the schema.
   */
  define<TShape extends SchemaShape>(def: {
    name: string;
    description: string;
    params: TShape;
    render: (props: z.infer<z.ZodObject<TShape>>) => Slide;
  }): SlideDefinition {
    this.register(def);
    return def;
  }
}

export const slideRegistry = new SlideRegistry();

/**
 * Validate raw frontmatter props against a slide's Zod schema.
 */
export function validateSlideProps(
  slide: SlideDefinition,
  raw: Record<string, unknown>,
): any {
  const result = z.object(slide.params).safeParse(raw);
  if (result.success) return result.data;
  const issues = result.error.issues
    .map(i => `  - ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  throw new Error(`Slide '${slide.name}' validation failed:\n${issues}`);
}

// ============================================
// DSL HELPER
// ============================================

/**
 * Create a component node.
 */
export function component<TProps>(name: string, props: TProps): ComponentNode<TProps> {
  return {
    type: COMPONENT_TYPE,
    componentName: name,
    props,
  };
}
