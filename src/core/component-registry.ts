// Component Registry
// Mechanism for registering and expanding component nodes to primitives

import type { ElementNode, ComponentNode } from './nodes.js';
import type { Theme } from './types.js';
import type { TextMeasurer } from '../utils/text-measurer.js';

// Re-export ComponentNode for convenience
export type { ComponentNode } from './nodes.js';

// ============================================
// TYPES
// ============================================

/**
 * Context passed to component expansion functions.
 */
export interface ExpansionContext {
  theme: Theme;
  measurer?: TextMeasurer;
  slideIndex?: number;
}

/**
 * A component definition describes how to expand a component into primitives.
 */
export interface ComponentDefinition<TProps = unknown> {
  /** Unique name for this component (e.g., 'card', 'table') */
  name: string;
  /** Expand props into a primitive node tree */
  expand: (props: TProps, context: ExpansionContext) => ElementNode;
}

// ============================================
// REGISTRY
// ============================================

/**
 * Registry for component definitions.
 * Themes and the core library register components here.
 */
class ComponentRegistry {
  private definitions = new Map<string, ComponentDefinition<any>>();

  /**
   * Register a component definition.
   * @throws Error if a component with this name is already registered
   */
  register<TProps>(definition: ComponentDefinition<TProps>): void {
    if (this.definitions.has(definition.name)) {
      throw new Error(`Component '${definition.name}' is already registered`);
    }
    this.definitions.set(definition.name, definition);
  }

  /**
   * Check if a component is registered.
   */
  has(name: string): boolean {
    return this.definitions.has(name);
  }

  /**
   * Get a component definition by name.
   */
  get<TProps>(name: string): ComponentDefinition<TProps> | undefined {
    return this.definitions.get(name);
  }

  /**
   * Expand a single component node to its primitive representation.
   * @throws Error if the component is not registered
   */
  expand(node: ComponentNode, context: ExpansionContext): ElementNode {
    const def = this.definitions.get(node.componentName);
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
  expandTree(node: ElementNode | ComponentNode, context: ExpansionContext): ElementNode {
    // Check if this is a component node
    if (isComponentNode(node)) {
      // Expand and recursively process the result
      const expanded = this.expand(node, context);
      return this.expandTree(expanded, context);
    }

    // It's a primitive - recurse into children
    const elementNode = node as ElementNode;

    // Handle 'children' array (Row, Column, Group, Card, etc.)
    if ('children' in elementNode && Array.isArray((elementNode as any).children)) {
      const withChildren = elementNode as ElementNode & { children: (ElementNode | ComponentNode)[] };
      return {
        ...withChildren,
        children: withChildren.children.map(c => this.expandTree(c, context)),
      } as ElementNode;
    }

    // Leaf node - return as-is
    return elementNode;
  }

  /**
   * Clear all registered components.
   * Useful for testing.
   */
  clear(): void {
    this.definitions.clear();
  }

  /**
   * Get all registered component names.
   */
  getRegisteredNames(): string[] {
    return Array.from(this.definitions.keys());
  }
}

// ============================================
// TYPE GUARD
// ============================================

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
// SINGLETON INSTANCE
// ============================================

/**
 * Global component registry instance.
 * Use this to register and expand components.
 */
export const componentRegistry = new ComponentRegistry();

// ============================================
// CONSTANTS
// ============================================

/** Type discriminator for component nodes */
export const COMPONENT_TYPE = 'component' as const;

// ============================================
// DSL HELPERS
// ============================================

/**
 * Create a component node.
 * This is the generic way to create components; convenience wrappers
 * like card() and table() will call this internally.
 *
 * @example
 * // Generic usage
 * component('card', { title: 'Hello', description: 'World' })
 *
 * // With type safety
 * component<CardProps>('card', { title: 'Hello' })
 */
export function component<TProps>(name: string, props: TProps): ComponentNode<TProps> {
  return {
    type: COMPONENT_TYPE,
    componentName: name,
    props,
  };
}

/**
 * Define and register a component in one step.
 * Returns a typed DSL factory function.
 *
 * @example
 * // Define component with single line
 * export const card = defineComponent<CardProps>('card', (props, ctx) => {
 *   return stack(rectangle(...), column(...));
 * });
 *
 * // Usage
 * card({ title: 'Hello', description: 'World' })
 */
export function defineComponent<TProps>(
  name: string,
  expand: (props: TProps, context: ExpansionContext) => ElementNode
): (props: TProps) => ComponentNode<TProps> {
  // Register the component
  componentRegistry.register({ name, expand });

  // Return the DSL factory
  return (props: TProps) => component(name, props);
}
