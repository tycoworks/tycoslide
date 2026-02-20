// Registry
// Generic base class, component registry, and layout registry

import { NODE_TYPE, type ElementNode, type ComponentNode, type SlideNode } from './nodes.js';
import type { Theme, ComponentName, ContentComponentName, LayoutComponentName } from './types.js';
import type { Slide } from '../presentation.js';
import { z } from 'zod';

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
  assets?: Record<string, unknown>;
}

/**
 * A component definition describes how to expand a component into primitives.
 */
export interface ComponentDefinition<TProps = unknown, TTokens = undefined> {
  /** Unique name for this component (e.g., 'card', 'table') */
  name: ComponentName;
  /** Token keys that must be present in theme.components for this component. */
  tokens?: string[];
  /** Expand props into a node tree (may contain components that get further expanded) */
  expand: (props: TProps, context: ExpansionContext, tokens: TTokens) => SlideNode | Promise<SlideNode>;
  /** Deserialize a :::name directive into a ComponentNode. Auto-generated for content components. */
  deserialize?: DirectiveDeserializer;
}

/** A content component definition — has .schema for YAML validation and layout params. */
export type ContentComponentDefinition<
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
export type DirectiveDeserializer = (attributes: Record<string, string | null | undefined>, body: string) => ComponentNode;

/**
 * Coerce string attribute values from directive markup to JS types.
 * Directive attributes are always strings; schemas expect booleans/numbers.
 */
function coerceAttributes(attrs: Record<string, string | null | undefined>): Record<string, unknown> {
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
  componentName: ContentComponentName,
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


/**
 * Registry for component definitions.
 * Use `.defineContent()` for content components (have .schema, usable in layout params).
 * Use `.defineLayout()` for layout/container components (programmatic only, no .schema).
 */
class ComponentRegistry extends Registry<ComponentDefinition<any, any>> {
  private _defaultComponentName: ContentComponentName | null = null;

  constructor() {
    super('Component', 'expand');
  }

  /**
   * Set the default content component for bare MDAST in slots.
   * Called by the slot compiler (markdown pipeline policy).
   */
  setDefaultContent(name: ContentComponentName): void {
    this._defaultComponentName = name;
  }

  /**
   * Get the default content component for bare MDAST in slots.
   * @throws Error if no default has been set
   */
  getDefaultContent(): ContentComponentName {
    if (!this._defaultComponentName) {
      throw new Error('No default content component set. Register one with setDefaultContent().');
    }
    return this._defaultComponentName;
  }

  /**
   * Define and register a content component with a body field (primary content) only.
   * Returns a definition with `.schema` (= body type) for use in layout params.
   */
  defineContent<TBody extends z.ZodTypeAny, TTokens = undefined>(def: {
    name: ContentComponentName;
    body: TBody;
    tokens?: TTokens extends undefined ? string[] : (keyof TTokens & string)[];
    expand: (props: { body: z.infer<TBody> }, context: ExpansionContext, tokens: TTokens) => SlideNode | Promise<SlideNode>;
  }): ContentComponentDefinition<TBody, TTokens>;

  /**
   * Define and register a content component with a body field (primary content) and extra params.
   * Returns a definition with `.schema` (= body type) for use in layout params.
   */
  defineContent<TBody extends z.ZodTypeAny, TParams extends SchemaShape, TTokens = undefined>(def: {
    name: ContentComponentName;
    body: TBody;
    params: TParams;
    tokens?: TTokens extends undefined ? string[] : (keyof TTokens & string)[];
    expand: (props: { body: z.infer<TBody> } & z.infer<z.ZodObject<TParams>>, context: ExpansionContext, tokens: TTokens) => SlideNode | Promise<SlideNode>;
  }): ContentComponentDefinition<TBody, TTokens>;

  /**
   * Define and register a content component with typed params inferred from a Zod shape.
   * Returns a definition with `.schema` (pre-wrapped ZodObject) for use in layout params.
   * When invoked from a :::directive, body text arrives as `props.body` (string).
   * Use `namedField ?? body` in expand to bridge directive body to semantic field names.
   */
  defineContent<TShape extends SchemaShape, TTokens = undefined>(def: {
    name: ContentComponentName;
    params: TShape;
    tokens?: TTokens extends undefined ? string[] : (keyof TTokens & string)[];
    expand: (props: z.infer<z.ZodObject<TShape>> & { body?: string }, context: ExpansionContext, tokens: TTokens) => SlideNode | Promise<SlideNode>;
  }): ContentComponentDefinition<z.ZodObject<TShape>, TTokens>;

  // Implementation — overload signatures above provide type safety for callers.
  // `any` param is unavoidable: overloaded `expand` signatures have contravariant
  // parameter types, so no single structural type is a supertype of all three.
  defineContent(def: any): ContentComponentDefinition {
    const bodySchema: z.ZodTypeAny | null = 'body' in def ? def.body : null;
    const paramsShape: SchemaShape = def.params ?? {};
    const paramsSchema = Object.keys(paramsShape).length > 0 ? z.object(paramsShape) : null;

    const result = {
      name: def.name as ContentComponentName,
      expand: def.expand as ComponentDefinition['expand'],
      tokens: def.tokens as string[],
      schema: bodySchema ?? z.object(paramsShape),
      deserialize: buildDeserializer(def.name, paramsSchema),
    };

    this.register(result);
    return result as ContentComponentDefinition;
  }

  /**
   * Define and register a layout/container component (programmatic only, no .schema).
   * Layout components cannot be used in layout params — they have no YAML-facing schema.
   * Layout components do not support :::directive invocation (no deserializer).
   */
  defineLayout<TProps, TTokens = undefined>(def: {
    name: LayoutComponentName;
    tokens?: TTokens extends undefined ? string[] : (keyof TTokens & string)[];
    expand: (props: TProps, context: ExpansionContext, tokens: TTokens) => SlideNode | Promise<SlideNode>;
  }): ComponentDefinition<TProps, TTokens> {
    const result: ComponentDefinition<TProps, TTokens> = {
      name: def.name,
      expand: def.expand,
      tokens: def.tokens,
    };

    this.register(result);
    return result;
  }

  /**
   * Find a component that supports :::name directive invocation.
   * Returns undefined if the component doesn't exist or doesn't have a deserializer.
   */
  getDirectiveHandler(name: string): (ComponentDefinition & { deserialize: DirectiveDeserializer }) | undefined {
    const def = this.get(name);
    if (def?.deserialize) {
      return def as ComponentDefinition & { deserialize: DirectiveDeserializer };
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
    const requiredTokens = def.tokens;
    if (requiredTokens?.length) {
      const componentConfig = context.theme.components?.[node.componentName];
      if (!componentConfig) {
        throw new Error(
          `Component '${node.componentName}' requires theme tokens but none were provided. ` +
          `Add them to theme.components.${node.componentName}. ` +
          `Required: [${requiredTokens.join(', ')}]`
        );
      }

      const { variants: variantDefs, ...baseTokens } = componentConfig as
        Record<string, unknown> & { variants?: Record<string, Record<string, unknown>> };

      let tokens = { ...baseTokens };

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

      // Validate all required tokens are present
      const missing = requiredTokens.filter(
        (key: string) => tokens[key] === undefined || tokens[key] === null
      );
      if (missing.length) {
        throw new Error(
          `Component '${node.componentName}' is missing required tokens: [${missing.join(', ')}]. ` +
          `Add them to theme.components.${node.componentName}.`
        );
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
    (node as any).type === NODE_TYPE.COMPONENT &&
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
export function component<TProps>(name: ComponentName, props: TProps): ComponentNode<TProps> {
  return {
    type: NODE_TYPE.COMPONENT,
    componentName: name,
    props,
  };
}
