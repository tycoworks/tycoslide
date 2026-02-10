// Diagram Component
// Declarative builder for flowchart diagrams
// Expands to ImageNode after rendering via mermaid-cli

import {
  NODE_STYLE,
  type NodeStyle,
  type Theme,
} from '../core/types.js';

import {
  NODE_TYPE,
  type ImageNode,
} from '../core/nodes.js';

import {
  componentRegistry,
  COMPONENT_TYPE,
  type ComponentNode,
  type ExpansionContext,
} from '../core/componentRegistry.js';

import { execSync } from 'child_process';
import { writeFileSync, mkdtempSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

// ============================================
// CONSTANTS
// ============================================

/** Component name for diagram */
export const DIAGRAM_COMPONENT = 'diagram' as const;

/** Diagram flow direction */
export const DIAGRAM_DIRECTION = {
  LEFT_TO_RIGHT: 'LR',
  RIGHT_TO_LEFT: 'RL',
  TOP_TO_BOTTOM: 'TB',
  BOTTOM_TO_TOP: 'BT',
} as const;
export type DiagramDirection = typeof DIAGRAM_DIRECTION[keyof typeof DIAGRAM_DIRECTION];

/** Timeout for mermaid-cli rendering in milliseconds */
const MERMAID_RENDER_TIMEOUT_MS = 30000;

/** Max directory levels to search for mmdc binary */
const MAX_MMDC_SEARCH_DEPTH = 6;

/** Diagram node shape */
export const NODE_SHAPE = {
  RECT: 'rect',
  ROUND: 'round',
  STADIUM: 'stadium',
  CYLINDER: 'cylinder',
  HEXAGON: 'hexagon',
  DIAMOND: 'diamond',
  PARALLELOGRAM: 'parallelogram',
  SUBROUTINE: 'subroutine',
} as const;
export type DiagramShape = typeof NODE_SHAPE[keyof typeof NODE_SHAPE];

// Re-export for convenience
export { NODE_STYLE, type NodeStyle };

// ============================================
// DIAGRAM DATA TYPES
// ============================================

/** A node in the diagram */
export interface DiagramNodeDef {
  id: string;
  label: string;
  shape: DiagramShape;
}

/** A subgraph grouping */
export interface DiagramSubgraphDef {
  id: string;
  label?: string;
  direction?: DiagramDirection;
  nodeIds: string[];
}

/** An edge between nodes */
export interface DiagramEdgeDef {
  from: string[];
  to: string[];
  label?: string;
}

/** Style class assignment */
export interface DiagramClassDef {
  nodeId: string;
  style: NodeStyle;
}

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
// MERMAID RENDERING HELPERS
// ============================================

function findMmdcPath(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  let dir = __dirname;
  for (let i = 0; i < MAX_MMDC_SEARCH_DEPTH; i++) {
    const candidate = join(dir, 'node_modules', '.bin', 'mmdc');
    if (existsSync(candidate)) {
      return candidate;
    }
    dir = dirname(dir);
  }

  try {
    const require = createRequire(import.meta.url);
    const cliPath = require.resolve('@mermaid-js/mermaid-cli/src/cli.js');
    return `node "${cliPath}"`;
  } catch {
    return 'mmdc';
  }
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function buildDiagramConfig(theme: Theme): object {
  const { colors, textStyles } = theme;
  const fontFamily = textStyles.body.fontFamily.normal.name;
  const alphaDecimal = colors.subtleOpacity / 100;

  return {
    theme: 'base',
    themeVariables: {
      fontFamily,
      background: `#${colors.background}`,
      primaryColor: `#${colors.primary}`,
      primaryTextColor: `#${colors.text}`,
      primaryBorderColor: `#${colors.secondary}`,
      lineColor: `#${colors.secondary}`,
      secondaryColor: `#${colors.primary}`,
      tertiaryColor: `#${colors.primary}`,
      textColor: `#${colors.text}`,
      titleColor: `#${colors.text}`,
      nodeTextColor: `#${colors.text}`,
      clusterBkg: hexToRgba(colors.secondary, alphaDecimal),
      clusterBorder: `#${colors.secondary}`,
      edgeLabelBackground: `#${colors.background}`,
    },
  };
}

function buildClassDefs(theme: Theme): string {
  const { colors } = theme;
  const alpha = Math.round(colors.subtleOpacity / 100 * 255).toString(16).padStart(2, '0');

  return Object.values(NODE_STYLE).map((styleName) => {
    const baseColor = (colors as unknown as Record<string, string>)[styleName];
    if (!baseColor || typeof baseColor !== 'string') return null;
    const fill = styleName === NODE_STYLE.PRIMARY
      ? `#${baseColor}`
      : `#${baseColor}${alpha}`;
    return `classDef ${styleName} fill:${fill}`;
  }).filter(Boolean).join('\n');
}

function buildSubgraphStyles(definition: string, theme: Theme): string {
  const { colors } = theme;
  const alpha = Math.round(colors.subtleOpacity / 100 * 255).toString(16).padStart(2, '0');
  const fillColor = `#${colors.secondary}${alpha}`;

  const subgraphPattern = /subgraph\s+(\w+)/g;
  const ids: string[] = [];
  let match;
  while ((match = subgraphPattern.exec(definition)) !== null) {
    ids.push(match[1]);
  }

  if (ids.length === 0) return '';
  return ids.map(id => `style ${id} fill:${fillColor}`).join('\n');
}

function injectClassDefs(definition: string, theme: Theme): string {
  const classDefs = buildClassDefs(theme);
  const subgraphStyles = buildSubgraphStyles(definition, theme);

  const diagramPattern = /^(\s*(?:flowchart|graph)\s+\w*\s*\n)/m;
  const match = definition.match(diagramPattern);

  if (match) {
    const [fullMatch] = match;
    let result = definition.replace(fullMatch, `${fullMatch}${classDefs}\n`);
    if (subgraphStyles) {
      result = result.trimEnd() + '\n' + subgraphStyles;
    }
    return result;
  }

  let result = `${classDefs}\n${definition}`;
  if (subgraphStyles) {
    result = result.trimEnd() + '\n' + subgraphStyles;
  }
  return result;
}

function buildDiagramDefinition(props: DiagramComponentProps): string {
  const lines: string[] = [];

  lines.push(`%%{init: {"flowchart": {"curve": "linear"}}}%%`);
  lines.push(`flowchart ${props.direction}`);

  const renderedNodes = new Set<string>();

  // Render subgraphs
  for (const sg of props.subgraphs) {
    const label = sg.label ? `${sg.id}[${sg.label}]` : sg.id;
    lines.push(`    subgraph ${label}`);
    if (sg.direction) {
      lines.push(`        direction ${sg.direction}`);
    }
    for (const nodeId of sg.nodeIds) {
      const nodeDef = props.nodes.find(n => n.id === nodeId);
      if (nodeDef) {
        lines.push(`        ${renderDiagramShapeNode(nodeDef)}`);
        renderedNodes.add(nodeId);
      }
    }
    lines.push(`    end`);
  }

  // Render remaining nodes
  for (const nodeDef of props.nodes) {
    if (!renderedNodes.has(nodeDef.id)) {
      lines.push(`    ${renderDiagramShapeNode(nodeDef)}`);
    }
  }

  // Render edges
  for (const edge of props.edges) {
    const fromStr = edge.from.length > 1 ? edge.from.join(' & ') : edge.from[0];
    const toStr = edge.to.length > 1 ? edge.to.join(' & ') : edge.to[0];
    const arrow = edge.label ? `-->|${edge.label}|` : '-->';
    lines.push(`    ${fromStr} ${arrow} ${toStr}`);
  }

  // Render class assignments
  const styleGroups = new Map<string, string[]>();
  for (const cls of props.classes) {
    if (!styleGroups.has(cls.style)) styleGroups.set(cls.style, []);
    styleGroups.get(cls.style)!.push(cls.nodeId);
  }
  for (const [style, ids] of styleGroups) {
    lines.push(`    class ${ids.join(',')} ${style}`);
  }

  return lines.join('\n');
}

function renderDiagramShapeNode(nodeDef: DiagramNodeDef): string {
  const { id, label, shape } = nodeDef;
  switch (shape) {
    case 'cylinder': return `${id}[(${label})]`;
    case 'hexagon': return `${id}{{${label}}}`;
    case 'stadium': return `${id}([${label}])`;
    case 'round': return `${id}(${label})`;
    case 'diamond': return `${id}{${label}}`;
    case 'parallelogram': return `${id}[/${label}/]`;
    case 'subroutine': return `${id}[[${label}]]`;
    case 'rect': return `${id}[${label}]`;
  }
}

/**
 * Render diagram to PNG via mermaid-cli.
 * Returns the path to the generated PNG file.
 */
function renderDiagramToPng(props: DiagramComponentProps, theme: Theme): string {
  const scale = props.scale ?? 2;

  // Build mermaid definition from props
  const definition = buildDiagramDefinition(props);

  // Create temp directory and files
  const tmpDir = mkdtempSync(join(tmpdir(), 'diagram-'));
  const inputPath = join(tmpDir, 'diagram.mmd');
  const outputPath = join(tmpDir, 'diagram.png');
  const configPath = join(tmpDir, 'config.json');

  // Inject theme-based class definitions
  const processedDefinition = injectClassDefs(definition, theme);
  writeFileSync(inputPath, processedDefinition);

  // Write mermaid config
  const config = buildDiagramConfig(theme);
  writeFileSync(configPath, JSON.stringify(config));

  // Render via mermaid-cli
  const mmdc = findMmdcPath();
  try {
    execSync(
      `${mmdc} -i "${inputPath}" -o "${outputPath}" -c "${configPath}" -s ${scale} -b transparent`,
      { stdio: 'pipe', timeout: MERMAID_RENDER_TIMEOUT_MS },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Diagram rendering failed: ${message}`);
  }

  return outputPath;
}

// ============================================
// COMPONENT EXPANSION
// ============================================

/**
 * Expand diagram component to ImageNode.
 * Renders the diagram via mermaid-cli and returns an image reference.
 */
function expandDiagram(props: DiagramComponentProps, context: ExpansionContext): ImageNode {
  // Render diagram to PNG
  const pngPath = renderDiagramToPng(props, context.theme);

  // Return an ImageNode pointing to the rendered PNG
  return {
    type: NODE_TYPE.IMAGE,
    src: pngPath,
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
 * Theme is only needed at expansion time (when diagram is rendered to PNG).
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
 * No theme needed at construction - theme is applied at expansion time.
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
