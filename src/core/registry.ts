// Registry
// Generic base class, component registry, and layout registry

import { NODE_TYPE, type ElementNode, type ComponentNode, type SlideNode } from './nodes.js';
import type { Theme } from './types.js';
import type { ContainerDirective } from './mdast.js';
import type { Slide } from '../presentation.js';
import { z } from 'zod';
import { parse as parseYaml } from 'yaml';
import type { ScalarParam } from '../schema.js';

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

/** Content vs layout component discriminator. */
export enum ComponentType {
  CONTENT = 'content',
  LAYOUT = 'layout',
}

/**
 * A component definition describes how to expand a component into primitives.
 */
export interface ComponentDefinition<TProps = unknown, TTokens = undefined> {
  /** Unique name for this component (e.g., 'card', 'table') */
  name: string;
  /** Whether this is a content component (usable in layout params) or a layout/container component (programmatic only). */
  type: ComponentType;
  /** Optional theme token resolver — returns default token values for this component. */
  defaults?: (theme: Theme) => TTokens;
  /** Expand props into a node tree (may contain components that get further expanded) */
  expand: (props: TProps, context: ExpansionContext, tokens: TTokens) => SlideNode | Promise<SlideNode>;
  /** How this component is invoked from a markdown directive (if at all). */
  directive?: DirectiveInvocation;
}

/** A content component with a body field (primary content) and optional extra params. */
export type BodyComponentDefinition<
  TBody extends z.ZodTypeAny,
  TTokens = undefined,
> = ComponentDefinition<{ body: z.infer<TBody> } & Record<string, unknown>, TTokens> & {
  type: ComponentType.CONTENT;
  /** YAML-facing type — the body type. Use in schema.array() or layout params. */
  schema: TBody;
};

/** A content component with typed params inferred from a Zod shape, for use in layout params. */
export type ParamsComponentDefinition<TShape extends SchemaShape, TTokens = undefined> =
  ComponentDefinition<z.infer<z.ZodObject<TShape>>, TTokens> & {
    type: ComponentType.CONTENT;
    /** YAML-facing type — use in schema.array() or layout params. */
    schema: z.ZodObject<TShape>;
  };

// ============================================
// DIRECTIVE INVOCATION
// ============================================

/**
 * How a component is invoked from a :::name container directive in markdown.
 */
interface DirectiveInvocation {
  /** Compile a :::name container directive into a ComponentNode. */
  compile: (directive: ContainerDirective, source: string, body: string) => ComponentNode;
}

/**
 * Directive configuration for defineContent/defineLayout.
 * - Omitted or `undefined`: auto-generate compile from schema (content components only).
 * - `{ compile: fn }`: use custom compile function.
 * - `false`: explicitly opt out of directive support.
 */
type DirectiveConfig = Partial<DirectiveInvocation> | false;

// ============================================
// AUTO-GENERATION (private)
// ============================================

/**
 * Auto-generate a compile function for :::name directives.
 * Body components: raw directive body → props.body, directive attributes → params.
 * Params-only components: YAML-parse body → params object.
 */
function autoGenerateCompile(
  componentName: string,
  bodySchema: z.ZodTypeAny | null,
  paramsSchema: z.ZodObject<SchemaShape> | null,
): DirectiveInvocation['compile'] {
  return (directive, _source, body) => {
    if (bodySchema) {
      // Body component: raw body → body field, attributes → params
      const parsedBody = bodySchema.parse(body);
      let parsedParams = {};
      if (paramsSchema) {
        parsedParams = paramsSchema.parse(directive.attributes ?? {});
      }
      return component(componentName, { body: parsedBody, ...parsedParams });
    } else {
      // Params-only: YAML-parse body as object
      let raw: unknown;
      try {
        raw = parseYaml(body) ?? {};
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`in :::${componentName} directive: ${msg}`);
      }
      const props = paramsSchema!.parse(raw);
      return component(componentName, props);
    }
  };
}

/**
 * Resolve a DirectiveConfig into a DirectiveInvocation (or undefined).
 * Shared by defineContent and defineLayout.
 */
function resolveDirective(
  config: DirectiveConfig | undefined,
  componentName: string,
  bodySchema: z.ZodTypeAny | null,
  paramsSchema: z.ZodObject<SchemaShape> | null,
): DirectiveInvocation | undefined {
  if (config === false) return undefined;
  if (typeof config === 'object' && config?.compile) return config as DirectiveInvocation;
  return { compile: autoGenerateCompile(componentName, bodySchema, paramsSchema) };
}

/** Type discriminator for component nodes */
export const COMPONENT_TYPE = NODE_TYPE.COMPONENT;

/**
 * Registry for component definitions.
 * Use `.defineContent()` for content components (have .schema, usable in layout params).
 * Use `.defineLayout()` for layout/container components (programmatic only, no .schema).
 */
class ComponentRegistry extends Registry<ComponentDefinition<any, any>> {
  private _defaultComponentName: string | null = null;

  constructor() {
    super('Component', 'expand');
  }

  /**
   * Set the default component for bare MDAST in slots.
   * Called by the slot compiler (markdown pipeline policy).
   */
  setDefaultComponent(name: string): void {
    this._defaultComponentName = name;
  }

  /**
   * Get the default component name for bare MDAST in slots.
   * @throws Error if no default has been set
   */
  getDefaultComponentName(): string {
    if (!this._defaultComponentName) {
      throw new Error('No default component set. Register one with setDefaultComponent().');
    }
    return this._defaultComponentName;
  }

  /**
   * Define and register a content component with a body field (primary content) only.
   * Returns a definition with `.schema` (= body type) for use in layout params.
   */
  defineContent<TBody extends z.ZodTypeAny, TTokens = undefined>(def: {
    name: string;
    body: TBody;
    defaults?: (theme: Theme) => TTokens;
    expand: (props: { body: z.infer<TBody> }, context: ExpansionContext, tokens: TTokens) => SlideNode | Promise<SlideNode>;
    directive?: DirectiveConfig;
  }): BodyComponentDefinition<TBody, TTokens>;

  /**
   * Define and register a content component with a body field (primary content) and extra params.
   * Returns a definition with `.schema` (= body type) for use in layout params.
   */
  defineContent<TBody extends z.ZodTypeAny, TParams extends SchemaShape, TTokens = undefined>(def: {
    name: string;
    body: TBody;
    params: TParams;
    defaults?: (theme: Theme) => TTokens;
    expand: (props: { body: z.infer<TBody> } & z.infer<z.ZodObject<TParams>>, context: ExpansionContext, tokens: TTokens) => SlideNode | Promise<SlideNode>;
    directive?: DirectiveConfig;
  }): BodyComponentDefinition<TBody, TTokens>;

  /**
   * Define and register a content component with typed params inferred from a Zod shape.
   * Returns a definition with `.schema` (pre-wrapped ZodObject) for use in layout params.
   */
  defineContent<TShape extends SchemaShape, TTokens = undefined>(def: {
    name: string;
    params: TShape;
    defaults?: (theme: Theme) => TTokens;
    expand: (props: z.infer<z.ZodObject<TShape>>, context: ExpansionContext, tokens: TTokens) => SlideNode | Promise<SlideNode>;
    directive?: DirectiveConfig;
  }): ParamsComponentDefinition<TShape, TTokens>;

  // Implementation — overload signatures above provide type safety for callers.
  // `any` param is unavoidable: overloaded `expand` signatures have contravariant
  // parameter types, so no single structural type is a supertype of all three.
  defineContent(def: any): BodyComponentDefinition<z.ZodTypeAny> | ParamsComponentDefinition<SchemaShape> {
    const bodySchema: z.ZodTypeAny | null = 'body' in def ? def.body : null;
    const paramsShape: SchemaShape = def.params ?? {};
    const paramsSchema = Object.keys(paramsShape).length > 0 ? z.object(paramsShape) : null;

    const result = {
      name: def.name as string,
      type: ComponentType.CONTENT as const,
      expand: def.expand as ComponentDefinition['expand'],
      defaults: def.defaults as ComponentDefinition['defaults'],
      schema: bodySchema ?? z.object(paramsShape),
      directive: resolveDirective(def.directive, def.name, bodySchema, paramsSchema),
    };

    this.register(result);
    return result as BodyComponentDefinition<z.ZodTypeAny> | ParamsComponentDefinition<SchemaShape>;
  }

  /**
   * Define and register a layout/container component (programmatic only, no .schema).
   * Layout components cannot be used in layout params — they have no YAML-facing schema.
   */
  defineLayout<TProps, TTokens = undefined>(def: {
    name: string;
    defaults?: (theme: Theme) => TTokens;
    expand: (props: TProps, context: ExpansionContext, tokens: TTokens) => SlideNode | Promise<SlideNode>;
    directive?: DirectiveConfig;
  }): ComponentDefinition<TProps, TTokens> {
    const rawDirective = def.directive;

    // Layout components can't auto-generate compile (no schema)
    if (rawDirective && typeof rawDirective !== 'object') {
      throw new Error(
        `componentRegistry.defineLayout('${def.name}'): directive: true requires ` +
        `an explicit 'compile' function (layout components have no schema for auto-generation).`,
      );
    }

    const directive = (typeof rawDirective === 'object' && rawDirective?.compile)
      ? rawDirective as DirectiveInvocation
      : undefined;

    const result: ComponentDefinition<TProps, TTokens> = {
      name: def.name,
      type: ComponentType.LAYOUT,
      expand: def.expand,
      defaults: def.defaults,
      directive,
    };

    this.register(result);
    return result;
  }

  /**
   * Find the block handler for a given directive name.
   * Block directives use the component name as the directive name (:::card → 'card').
   */
  getBlockHandler(name: string): (ComponentDefinition & { directive: DirectiveInvocation }) | undefined {
    const def = this.get(name);
    if (def?.directive?.compile) {
      return def as ComponentDefinition & { directive: DirectiveInvocation };
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

/** A Zod shape where every field is a scalar param (YAML-expressible). */
export type ScalarShape = Record<string, ScalarParam>;

/** Infer the TypeScript type from a raw Zod shape. Use instead of importing z from zod. */
export type InferProps<TShape extends SchemaShape> = z.infer<z.ZodObject<TShape>>;

/** Map slot names to their render type (each slot becomes ComponentNode[]). */
type SlotsToProps<T extends readonly string[]> = { [K in T[number]]: ComponentNode[] };

/**
 * A named, described, typed slide factory.
 * `params` holds scalar fields (from YAML frontmatter).
 * `slots` lists slot names (from ::name:: body markers), optional.
 * Use `layoutRegistry.define()` to create layouts with type-checked render params.
 */
export interface LayoutDefinition {
  name: string;
  description: string;
  params: SchemaShape;
  slots?: readonly string[];
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
   * Define and register a layout.
   * TypeScript enforces: params accepts only ScalarParam fields.
   * Slots (optional) are a string array — each becomes ComponentNode[] in render.
   */
  define<TParams extends ScalarShape, const TSlots extends readonly string[] = readonly []>(def: {
    name: string;
    description: string;
    params: TParams;
    slots?: TSlots;
    render: (props: z.infer<z.ZodObject<TParams>> & SlotsToProps<TSlots>) => Slide;
  }): LayoutDefinition {
    this.register(def);
    return def;
  }
}

export const layoutRegistry = new LayoutRegistry();

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
