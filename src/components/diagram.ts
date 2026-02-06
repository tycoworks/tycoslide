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

// Re-export for convenience
export { NODE_STYLE, type NodeStyle, DIAGRAM_DIRECTION, NODE_SHAPE };
export type { DiagramDirection, DiagramShape };

// ============================================
// INTERFACES
// ============================================

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
// DIAGRAM BUILDER
// ============================================

/**
 * Declarative diagram builder.
 * The builder IS the node - use it directly where ElementNode is expected.
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
 * // d is an ElementNode - use directly in layouts
 * pres.add(contentSlide('My Diagram', d));
 * ```
 */
export class DiagramBuilder implements DiagramNode {
  // DiagramNode properties (makes this object BE the node)
  readonly type = NODE_TYPE.DIAGRAM;
  readonly direction: DiagramDirection;
  readonly nodes: DiagramNodeDef[] = [];
  readonly subgraphs: DiagramSubgraphDef[] = [];
  readonly edges: DiagramEdgeDef[] = [];
  readonly classes: DiagramClassDef[] = [];
  readonly scale?: number;

  constructor(direction: DiagramDirection = 'LR', props?: DiagramProps) {
    this.direction = direction;
    this.scale = props?.scale;
  }

  // ============================================
  // NODE FACTORIES
  // ============================================

  private addNode(id: string, label: string | undefined, shape: DiagramShape): DiagramNodeRef {
    const l = label ?? id;
    this.nodes.push({ id, label: l, shape });
    return { id, label: l, shape };
  }

  rect(id: string, label?: string): DiagramNodeRef {
    return this.addNode(id, label, 'rect');
  }

  round(id: string, label?: string): DiagramNodeRef {
    return this.addNode(id, label, 'round');
  }

  stadium(id: string, label?: string): DiagramNodeRef {
    return this.addNode(id, label, 'stadium');
  }

  cylinder(id: string, label?: string): DiagramNodeRef {
    return this.addNode(id, label, 'cylinder');
  }

  hexagon(id: string, label?: string): DiagramNodeRef {
    return this.addNode(id, label, 'hexagon');
  }

  diamond(id: string, label?: string): DiagramNodeRef {
    return this.addNode(id, label, 'diamond');
  }

  parallelogram(id: string, label?: string): DiagramNodeRef {
    return this.addNode(id, label, 'parallelogram');
  }

  subroutine(id: string, label?: string): DiagramNodeRef {
    return this.addNode(id, label, 'subroutine');
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

    this.subgraphs.push({
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
    this.edges.push({ from: fromIds, to: toIds, label: options?.label });
    return this;
  }

  // ============================================
  // STYLING
  // ============================================

  class(style: NodeStyle, ...nodeList: DiagramNodeRef[]): this {
    for (const node of nodeList) {
      this.classes.push({ nodeId: node.id, style });
    }
    return this;
  }
}

/**
 * Create a new declarative diagram builder.
 * No theme needed - theme is applied at render time.
 *
 * @example
 * ```typescript
 * const d = diagram(DIAGRAM_DIRECTION.LEFT_TO_RIGHT);
 * const db = d.cylinder('DB', 'Postgres');
 * d.edge(db, d.rect('App'));
 * // Use d directly as ElementNode
 * ```
 */
export function diagram(direction: DiagramDirection = DIAGRAM_DIRECTION.LEFT_TO_RIGHT, props?: DiagramProps): DiagramBuilder {
  return new DiagramBuilder(direction, props);
}
