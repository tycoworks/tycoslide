// Diagram Component
// Type-safe builder for flowchart diagrams that renders via mermaid-cli

import { execSync } from 'child_process';
import { writeFileSync, mkdtempSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

import {
  type Component,
  type Drawer,
  type Bounds,
  type Theme,
  type AlignContext,
  NODE_STYLE,
  type NodeStyle,
} from '../core/types.js';
import { Image } from './image.js';
import { log } from '../utils/log.js';

// Re-export for convenience
export { NODE_STYLE, type NodeStyle };

// ============================================
// ENUMS
// ============================================

/** Diagram flow direction */
export const DIAGRAM_DIRECTION = {
  LEFT_TO_RIGHT: 'LR',
  TOP_TO_BOTTOM: 'TB',
  RIGHT_TO_LEFT: 'RL',
  BOTTOM_TO_TOP: 'BT',
} as const;
export type DiagramDirection = typeof DIAGRAM_DIRECTION[keyof typeof DIAGRAM_DIRECTION];

/** Node shape (mermaid syntax) */
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
export type NodeShape = typeof NODE_SHAPE[keyof typeof NODE_SHAPE];

// ============================================
// INTERFACES
// ============================================

export interface DiagramProps {
  /** DPI multiplier for rendering (default: 2) */
  scale?: number;
}

export interface DiagramNode {
  readonly id: string;
  readonly label: string;
  readonly shape: NodeShape;
}

interface SubgraphDef {
  id: string;
  label?: string;
  direction?: DiagramDirection;
  nodeIds: string[];
}

interface EdgeDef {
  from: string[];
  to: string[];
  label?: string;
}

export interface SubgraphOptions {
  label?: string;
  direction?: DiagramDirection;
}

export interface EdgeOptions {
  label?: string;
}

// ============================================
// INTERNAL HELPERS
// ============================================

function findMmdcPath(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  let dir = __dirname;
  for (let i = 0; i < 5; i++) {
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

function buildMermaidConfig(theme: Theme): object {
  const { colors, textStyles } = theme;
  const fontFamily = textStyles.body.fontFamily.normal.name;
  const alphaDecimal = (colors.subtleOpacity ?? 20) / 100;

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
  const alphaPercent = colors.subtleOpacity ?? 20;
  const alpha = Math.round(alphaPercent / 100 * 255).toString(16).padStart(2, '0');

  return Object.values(NODE_STYLE).map((styleName: NodeStyle) => {
    const baseColor = colors[styleName] as string;
    // PRIMARY uses full opacity; other styles use subtle alpha for emphasis contrast
    const fill = styleName === NODE_STYLE.PRIMARY
      ? `#${baseColor}`
      : `#${baseColor}${alpha}`;
    return `classDef ${styleName} fill:${fill}`;
  }).join('\n');
}

function buildSubgraphStyles(definition: string, theme: Theme): string {
  const { colors } = theme;
  const alphaPercent = colors.subtleOpacity ?? 20;
  const alpha = Math.round(alphaPercent / 100 * 255).toString(16).padStart(2, '0');
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

// ============================================
// DIAGRAM CLASS
// ============================================

/**
 * Fluent builder for diagrams that implements Component interface.
 * Renders to PNG via mermaid-cli when prepare() is first called.
 */
export class Diagram implements Component {
  private theme: Theme;
  private props: DiagramProps;
  private flowDirection: DiagramDirection;
  private nodes = new Map<string, { label: string; shape: NodeShape }>();
  private subgraphs: SubgraphDef[] = [];
  private edges: EdgeDef[] = [];
  private classes = new Map<string, NodeStyle>();
  private image: Image | null = null;

  constructor(theme: Theme, direction: DiagramDirection = DIAGRAM_DIRECTION.LEFT_TO_RIGHT, props?: DiagramProps) {
    this.theme = theme;
    this.flowDirection = direction;
    this.props = props ?? {};
  }

  // ============================================
  // NODE FACTORIES
  // ============================================

  rect(id: string, label?: string): DiagramNode {
    const l = label ?? id;
    this.nodes.set(id, { label: l, shape: NODE_SHAPE.RECT });
    return { id, label: l, shape: NODE_SHAPE.RECT };
  }

  round(id: string, label?: string): DiagramNode {
    const l = label ?? id;
    this.nodes.set(id, { label: l, shape: NODE_SHAPE.ROUND });
    return { id, label: l, shape: NODE_SHAPE.ROUND };
  }

  stadium(id: string, label?: string): DiagramNode {
    const l = label ?? id;
    this.nodes.set(id, { label: l, shape: NODE_SHAPE.STADIUM });
    return { id, label: l, shape: NODE_SHAPE.STADIUM };
  }

  cylinder(id: string, label?: string): DiagramNode {
    const l = label ?? id;
    this.nodes.set(id, { label: l, shape: NODE_SHAPE.CYLINDER });
    return { id, label: l, shape: NODE_SHAPE.CYLINDER };
  }

  hexagon(id: string, label?: string): DiagramNode {
    const l = label ?? id;
    this.nodes.set(id, { label: l, shape: NODE_SHAPE.HEXAGON });
    return { id, label: l, shape: NODE_SHAPE.HEXAGON };
  }

  diamond(id: string, label?: string): DiagramNode {
    const l = label ?? id;
    this.nodes.set(id, { label: l, shape: NODE_SHAPE.DIAMOND });
    return { id, label: l, shape: NODE_SHAPE.DIAMOND };
  }

  parallelogram(id: string, label?: string): DiagramNode {
    const l = label ?? id;
    this.nodes.set(id, { label: l, shape: NODE_SHAPE.PARALLELOGRAM });
    return { id, label: l, shape: NODE_SHAPE.PARALLELOGRAM };
  }

  subroutine(id: string, label?: string): DiagramNode {
    const l = label ?? id;
    this.nodes.set(id, { label: l, shape: NODE_SHAPE.SUBROUTINE });
    return { id, label: l, shape: NODE_SHAPE.SUBROUTINE };
  }

  // ============================================
  // STRUCTURE
  // ============================================

  subgraph(id: string, ...args: (DiagramNode | SubgraphOptions)[]): this {
    let options: SubgraphOptions = {};
    let nodeList: DiagramNode[] = [];

    for (const arg of args) {
      if ('id' in arg && 'label' in arg && 'shape' in arg) {
        nodeList.push(arg as DiagramNode);
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

  edge(from: DiagramNode | DiagramNode[], to: DiagramNode | DiagramNode[], options?: EdgeOptions): this {
    const fromIds = Array.isArray(from) ? from.map(n => n.id) : [from.id];
    const toIds = Array.isArray(to) ? to.map(n => n.id) : [to.id];
    this.edges.push({ from: fromIds, to: toIds, label: options?.label });
    return this;
  }

  // ============================================
  // STYLING
  // ============================================

  class(style: NodeStyle, ...nodeList: DiagramNode[]): this {
    for (const node of nodeList) {
      this.classes.set(node.id, style);
    }
    return this;
  }

  // ============================================
  // BUILD MERMAID DEFINITION
  // ============================================

  /** Returns the mermaid definition string. Useful for debugging or testing. */
  build(): string {
    return this.buildDefinition();
  }

  private buildDefinition(): string {
    const lines: string[] = [];

    lines.push(`%%{init: {"flowchart": {"curve": "linear"}}}%%`);
    lines.push(`flowchart ${this.flowDirection}`);

    const renderedNodes = new Set<string>();

    for (const sg of this.subgraphs) {
      const label = sg.label ? `${sg.id}[${sg.label}]` : sg.id;
      lines.push(`    subgraph ${label}`);
      if (sg.direction) {
        lines.push(`        direction ${sg.direction}`);
      }
      for (const nodeId of sg.nodeIds) {
        lines.push(`        ${this.renderNode(nodeId)}`);
        renderedNodes.add(nodeId);
      }
      lines.push(`    end`);
    }

    for (const [id] of this.nodes) {
      if (!renderedNodes.has(id)) {
        lines.push(`    ${this.renderNode(id)}`);
      }
    }

    for (const edge of this.edges) {
      const fromStr = edge.from.length > 1 ? edge.from.join(' & ') : edge.from[0];
      const toStr = edge.to.length > 1 ? edge.to.join(' & ') : edge.to[0];
      const arrow = edge.label ? `-->|${edge.label}|` : '-->';
      lines.push(`    ${fromStr} ${arrow} ${toStr}`);
    }

    const styleGroups = new Map<NodeStyle, string[]>();
    for (const [id, style] of this.classes) {
      if (!styleGroups.has(style)) styleGroups.set(style, []);
      styleGroups.get(style)!.push(id);
    }
    for (const [style, ids] of styleGroups) {
      lines.push(`    class ${ids.join(',')} ${style}`);
    }

    return lines.join('\n');
  }

  private renderNode(id: string): string {
    const node = this.nodes.get(id);
    if (!node) return id;

    const { label, shape } = node;
    switch (shape) {
      case NODE_SHAPE.CYLINDER: return `${id}[(${label})]`;
      case NODE_SHAPE.HEXAGON: return `${id}{{${label}}}`;
      case NODE_SHAPE.STADIUM: return `${id}([${label}])`;
      case NODE_SHAPE.ROUND: return `${id}(${label})`;
      case NODE_SHAPE.DIAMOND: return `${id}{${label}}`;
      case NODE_SHAPE.PARALLELOGRAM: return `${id}[/${label}/]`;
      case NODE_SHAPE.SUBROUTINE: return `${id}[[${label}]]`;
      case NODE_SHAPE.RECT: return `${id}[${label}]`;
    }
  }

  // ============================================
  // RENDER TO IMAGE
  // ============================================

  private render(): Image {
    if (this.image) return this.image;

    const scale = this.props.scale ?? 2;
    const definition = this.buildDefinition();

    const tmpDir = mkdtempSync(join(tmpdir(), 'diagram-'));
    const inputPath = join(tmpDir, 'diagram.mmd');
    const outputPath = join(tmpDir, 'diagram.png');
    const configPath = join(tmpDir, 'config.json');

    const processedDefinition = injectClassDefs(definition, this.theme);
    writeFileSync(inputPath, processedDefinition);

    const config = buildMermaidConfig(this.theme);
    writeFileSync(configPath, JSON.stringify(config));

    const mmdc = findMmdcPath();
    try {
      execSync(
        `${mmdc} -i "${inputPath}" -o "${outputPath}" -c "${configPath}" -s ${scale} -b transparent`,
        { stdio: 'pipe', timeout: 30000 },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Diagram rendering failed: ${message}`);
    }

    this.image = new Image(this.theme, outputPath);

    log('diagram: rendered %dx%d ar=%f path=%s',
      this.image.pixelWidth, this.image.pixelHeight, this.image.aspectRatio, outputPath);

    return this.image;
  }

  // ============================================
  // COMPONENT INTERFACE
  // ============================================

  get aspectRatio(): number {
    return this.render().aspectRatio;
  }

  get pixelWidth(): number {
    return this.render().pixelWidth;
  }

  get pixelHeight(): number {
    return this.render().pixelHeight;
  }

  getHeight(width: number): number {
    return this.render().getHeight(width);
  }

  getMinHeight(width: number): number {
    return this.render().getMinHeight(width);
  }

  getWidth(height: number): number {
    return this.render().getWidth(height);
  }

  prepare(bounds: Bounds, alignContext?: AlignContext): Drawer {
    return this.render().prepare(bounds, alignContext);
  }
}

/**
 * Create a new diagram builder.
 *
 * @example
 * ```typescript
 * const d = diagram(theme, DIAGRAM_DIRECTION.LEFT_TO_RIGHT);
 * const db = d.cylinder('DB', 'Postgres');
 * const app = d.rect('App', 'Application');
 * d.subgraph('Sources', db)
 *  .edge(db, app)
 *  .class(NODE_STYLE.PRIMARY, db);
 * // d is already a Component - use directly in layouts
 * ```
 */
export function diagram(theme: Theme, direction: DiagramDirection = DIAGRAM_DIRECTION.LEFT_TO_RIGHT, props?: DiagramProps): Diagram {
  return new Diagram(theme, direction, props);
}
