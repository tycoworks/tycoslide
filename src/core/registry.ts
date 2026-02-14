// Registry
// Generic base class, component registry, and layout registry

import { NODE_TYPE, type ElementNode, type ComponentNode, type SlideNode } from './nodes.js';
import type { Theme } from './types.js';
import type { Slide } from '../presentation.js';
import type { ZodType } from 'zod';

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
export interface ComponentDefinition<TProps = unknown> {
  /** Unique name for this component (e.g., 'card', 'table') */
  name: string;
  /** Expand props into a node tree (may contain components that get further expanded) */
  expand: (props: TProps, context: ExpansionContext) => SlideNode | Promise<SlideNode>;
}

/** Type discriminator for component nodes */
export const COMPONENT_TYPE = NODE_TYPE.COMPONENT;

/**
 * Registry for component definitions.
 * Extends the generic Registry with component-specific expansion logic.
 */
class ComponentRegistry extends Registry<ComponentDefinition<any>> {
  constructor() {
    super('Component', 'expand');
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
    return def.expand(node.props, context);
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

/** Values that can round-trip through YAML frontmatter. */
export type ScalarValue = string | number | boolean;

/** Recursive type for layout props — only YAML-serializable values allowed. */
export type ScalarProps = {
  [key: string]: ScalarValue | ScalarValue[] | ScalarProps | ScalarProps[] | undefined;
};

/**
 * A named, described, typed slide factory.
 * Registered layouts should only use ScalarProps-compatible types
 * (strings, numbers, booleans, arrays of scalars, nested scalar objects).
 * The schema field provides runtime validation via Zod.
 * Non-scalar layouts (contentLayout, twoColumnRawLayout) should NOT
 * use this type — they're plain objects outside the registry.
 */
export interface LayoutDefinition<TProps = Record<string, unknown>> {
  name: string;
  description: string;
  schema: ZodType<TProps>;
  render: (props: TProps) => Slide;
}

export const layoutRegistry = new Registry<LayoutDefinition<any>>('Layout', 'render');

/**
 * Validate raw frontmatter props against a layout's Zod schema.
 * @returns The validated and typed props
 * @throws Error with formatted message on validation failure
 */
export function validateLayoutProps<TProps>(
  layout: LayoutDefinition<TProps>,
  raw: Record<string, unknown>,
): TProps {
  const result = layout.schema.safeParse(raw);
  if (result.success) {
    return result.data;
  }
  const issues = result.error.issues
    .map(i => `  - ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  throw new Error(`Layout '${layout.name}' validation failed:\n${issues}`);
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
