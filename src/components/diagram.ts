// Diagram Component
// Declarative builder for flowchart diagrams (rendered via mermaid-cli at render time)

import {
  NODE_STYLE,
  type NodeStyle,
} from '../core/types.js';

import {
  NODE_TYPE,
  DIAGRAM_DIRECTION,
  NODE_SHAPE,
  type DiagramNode,
  type DiagramNodeDef,
  type DiagramSubgraphDef,
  type DiagramEdgeDef,
  type DiagramClassDef,
  type DiagramShape,
  type DiagramDirection,
} from '../core/nodes.js';

import {
  componentRegistry,
  COMPONENT_TYPE,
  type ComponentNode,
  type ExpansionContext,
} from '../core/component-registry.js';

// Re-export for convenience
export { NODE_STYLE, type NodeStyle, DIAGRAM_DIRECTION, NODE_SHAPE };
export type { DiagramDirection, DiagramShape };

// ============================================
// CONSTANTS
// ============================================

/** Component name for diagram */
export const DIAGRAM_COMPONENT = 'diagram' as const;

// ============================================
// INTERFACES
// ============================================

/** Full props for diagram component (internal state) */
export interface DiagramComponentProps {
  /** Flow direction */
  direction: DiagramDirection;
  /** Node definitions */
  nodes: DiagramNodeDef[];
  /** Subgraph definitions */
  subgraphs: DiagramSubgraphDef[];
  /** Edge definitions */
  edges: DiagramEdgeDef[];
  /** Class/style assignments */
  classes: DiagramClassDef[];
  /** DPI multiplier for rendering (default: 2) */
  scale?: number;
}

export interface DiagramProps {
  /** DPI multiplier for rendering (default: 2) */
  scale?: number;
}

/** Reference to a node in the diagram (for fluent API) */
export interface DiagramNodeRef {
  readonly id: string;
  readonly label: string;
  readonly shape: DiagramShape;
}

/** Options for subgraphs */
export interface SubgraphOptions {
  label?: string;
  direction?: DiagramDirection;
}

export interface EdgeOptions {
  label?: string;
}

// ============================================
// COMPONENT EXPANSION
// ============================================

/**
 * Expand diagram component props into DiagramNode (passthrough).
 * The expansion is trivial - just reshapes the data into the ElementNode format.
 */
function expandDiagram(props: DiagramComponentProps, _context: ExpansionContext): DiagramNode {
  return {
    type: NODE_TYPE.DIAGRAM,
    direction: props.direction,
    nodes: props.nodes,
    subgraphs: props.subgraphs,
    edges: props.edges,
    classes: props.classes,
    scale: props.scale,
  };
}

// Register the component
componentRegistry.register({
  name: DIAGRAM_COMPONENT,
  expand: expandDiagram,
});

// ============================================
// DIAGRAM BUILDER
// ============================================

/**
 * Declarative diagram builder that implements ComponentNode.
 * Use the fluent API to build the diagram, then use it directly where content is expected.
 * Theme is only needed at render time, not construction.
 *
 * @example
 * ```typescript
 * const d = diagram(DIAGRAM_DIRECTION.LEFT_TO_RIGHT);
 * const db = d.cylinder('DB', 'Postgres');
 * const app = d.rect('App', 'Application');
 * d.subgraph('Sources', db)
 *  .edge(db, app)
 *  .class(NODE_STYLE.PRIMARY, db);
 * // d is a ComponentNode - consistent with card(), list(), table()
 * pres.add(contentSlide('My Diagram', d));
 * ```
 */
export class DiagramBuilder implements ComponentNode<DiagramComponentProps> {
  // ComponentNode properties
  readonly type = COMPONENT_TYPE;
  readonly componentName = DIAGRAM_COMPONENT;

  // Internal state (accumulated via fluent API)
  private readonly _direction: DiagramDirection;
  private readonly _nodes: DiagramNodeDef[] = [];
  private readonly _subgraphs: DiagramSubgraphDef[] = [];
  private readonly _edges: DiagramEdgeDef[] = [];
  private readonly _classes: DiagramClassDef[] = [];
  private readonly _scale?: number;

  constructor(direction: DiagramDirection = DIAGRAM_DIRECTION.LEFT_TO_RIGHT, props?: DiagramProps) {
    this._direction = direction;
    this._scale = props?.scale;
  }

  /** ComponentNode props getter - returns accumulated state */
  get props(): DiagramComponentProps {
    return {
      direction: this._direction,
      nodes: this._nodes,
      subgraphs: this._subgraphs,
      edges: this._edges,
      classes: this._classes,
      scale: this._scale,
    };
  }

  // ============================================
  // NODE FACTORIES
  // ============================================

  private addNode(id: string, label: string | undefined, shape: DiagramShape): DiagramNodeRef {
    const l = label ?? id;
    this._nodes.push({ id, label: l, shape });
    return { id, label: l, shape };
  }

  rect(id: string, label?: string): DiagramNodeRef {
    return this.addNode(id, label, NODE_SHAPE.RECT);
  }

  round(id: string, label?: string): DiagramNodeRef {
    return this.addNode(id, label, NODE_SHAPE.ROUND);
  }

  stadium(id: string, label?: string): DiagramNodeRef {
    return this.addNode(id, label, NODE_SHAPE.STADIUM);
  }

  cylinder(id: string, label?: string): DiagramNodeRef {
    return this.addNode(id, label, NODE_SHAPE.CYLINDER);
  }

  hexagon(id: string, label?: string): DiagramNodeRef {
    return this.addNode(id, label, NODE_SHAPE.HEXAGON);
  }

  diamond(id: string, label?: string): DiagramNodeRef {
    return this.addNode(id, label, NODE_SHAPE.DIAMOND);
  }

  parallelogram(id: string, label?: string): DiagramNodeRef {
    return this.addNode(id, label, NODE_SHAPE.PARALLELOGRAM);
  }

  subroutine(id: string, label?: string): DiagramNodeRef {
    return this.addNode(id, label, NODE_SHAPE.SUBROUTINE);
  }

  // ============================================
  // STRUCTURE
  // ============================================

  subgraph(id: string, ...args: (DiagramNodeRef | SubgraphOptions)[]): this {
    let options: SubgraphOptions = {};
    const nodeList: DiagramNodeRef[] = [];

    for (const arg of args) {
      if ('id' in arg && 'label' in arg && 'shape' in arg) {
        nodeList.push(arg as DiagramNodeRef);
      } else {
        options = arg as SubgraphOptions;
      }
    }

    this._subgraphs.push({
      id,
      label: options.label,
      direction: options.direction,
      nodeIds: nodeList.map(n => n.id),
    });

    return this;
  }

  // ============================================
  // EDGES
  // ============================================

  edge(from: DiagramNodeRef | DiagramNodeRef[], to: DiagramNodeRef | DiagramNodeRef[], options?: EdgeOptions): this {
    const fromIds = Array.isArray(from) ? from.map(n => n.id) : [from.id];
    const toIds = Array.isArray(to) ? to.map(n => n.id) : [to.id];
    this._edges.push({ from: fromIds, to: toIds, label: options?.label });
    return this;
  }

  // ============================================
  // STYLING
  // ============================================

  class(style: NodeStyle, ...nodeList: DiagramNodeRef[]): this {
    for (const node of nodeList) {
      this._classes.push({ nodeId: node.id, style });
    }
    return this;
  }
}

/**
 * Create a new declarative diagram builder.
 * Returns a ComponentNode with fluent builder methods.
 * No theme needed - theme is applied at render time.
 *
 * @example
 * ```typescript
 * const d = diagram(DIAGRAM_DIRECTION.LEFT_TO_RIGHT);
 * const db = d.cylinder('DB', 'Postgres');
 * d.edge(db, d.rect('App'));
 * // d is a ComponentNode - use in layouts like card(), list(), table()
 * ```
 */
export function diagram(direction: DiagramDirection = DIAGRAM_DIRECTION.LEFT_TO_RIGHT, props?: DiagramProps): DiagramBuilder {
  return new DiagramBuilder(direction, props);
}
