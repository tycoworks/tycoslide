// DIAGRAM Node Handler
// Consolidates all DIAGRAM-related logic from compute-layout.ts, render.ts, and measure.ts

import { NODE_TYPE, type DiagramNode, type DiagramShape, type PositionedNode } from '../core/nodes.js';
import type { Theme, TextStyleName, TextContent } from '../core/types.js';
import { TEXT_STYLE, NODE_STYLE } from '../core/types.js';
import type { Bounds } from '../core/bounds.js';
import type { Canvas } from '../core/canvas.js';
import type { MeasurementRequests, TextMeasurementRequest, StyleMeasurementRequest } from '../core/measure.js';
import { elementHandlerRegistry, type ElementHandler, type LayoutContext } from '../core/element-registry.js';
import { log } from '../utils/log.js';
import { execSync } from 'child_process';
import { writeFileSync, mkdtempSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import imageSizeDefault from 'image-size';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const imageSize = (imageSizeDefault as any).default || imageSizeDefault;

// ============================================
// DIAGRAM RENDERING HELPERS
// ============================================

function findMmdcPath(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  let dir = __dirname;
  for (let i = 0; i < 6; i++) { // Go up one more level from handlers/
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

function buildDiagramDefinition(node: DiagramNode): string {
  const lines: string[] = [];

  lines.push(`%%{init: {"flowchart": {"curve": "linear"}}}%%`);
  lines.push(`flowchart ${node.direction}`);

  const renderedNodes = new Set<string>();

  // Render subgraphs
  for (const sg of node.subgraphs) {
    const label = sg.label ? `${sg.id}[${sg.label}]` : sg.id;
    lines.push(`    subgraph ${label}`);
    if (sg.direction) {
      lines.push(`        direction ${sg.direction}`);
    }
    for (const nodeId of sg.nodeIds) {
      const nodeDef = node.nodes.find(n => n.id === nodeId);
      if (nodeDef) {
        lines.push(`        ${renderDiagramShapeNode(nodeDef)}`);
        renderedNodes.add(nodeId);
      }
    }
    lines.push(`    end`);
  }

  // Render remaining nodes
  for (const nodeDef of node.nodes) {
    if (!renderedNodes.has(nodeDef.id)) {
      lines.push(`    ${renderDiagramShapeNode(nodeDef)}`);
    }
  }

  // Render edges
  for (const edge of node.edges) {
    const fromStr = edge.from.length > 1 ? edge.from.join(' & ') : edge.from[0];
    const toStr = edge.to.length > 1 ? edge.to.join(' & ') : edge.to[0];
    const arrow = edge.label ? `-->|${edge.label}|` : '-->';
    lines.push(`    ${fromStr} ${arrow} ${toStr}`);
  }

  // Render class assignments
  const styleGroups = new Map<string, string[]>();
  for (const cls of node.classes) {
    if (!styleGroups.has(cls.style)) styleGroups.set(cls.style, []);
    styleGroups.get(cls.style)!.push(cls.nodeId);
  }
  for (const [style, ids] of styleGroups) {
    lines.push(`    class ${ids.join(',')} ${style}`);
  }

  return lines.join('\n');
}

function renderDiagramShapeNode(nodeDef: { id: string; label: string; shape: DiagramShape }): string {
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

// ============================================
// MEASUREMENT HELPERS
// ============================================

function makeTextKey(styleName: TextStyleName, availableWidth: number, content: TextContent): string {
  const text = typeof content === 'string' ? content : content.map(run => typeof run === 'string' ? run : run.text).join('');
  return `text|${styleName}|${availableWidth.toFixed(4)}|${text}`;
}

function makeStyleKey(styleName: TextStyleName): string {
  return `style|${styleName}`;
}

// ============================================
// DIAGRAM HANDLER
// ============================================

export const diagramHandler: ElementHandler<DiagramNode> = {
  nodeType: NODE_TYPE.DIAGRAM,

  /**
   * Diagrams are rendered externally - height cannot be computed at layout time.
   * Returns 0; computeLayout will use bounds.h instead.
   */
  getHeight(_node: DiagramNode, _width: number, _ctx: LayoutContext): number {
    log.layout.height('HEIGHT diagram -> 0 (will use bounds)');
    return 0;
  },

  /**
   * Diagram is fully compressible.
   */
  getMinHeight(_node: DiagramNode, _width: number, _ctx: LayoutContext): number {
    return 0;
  },

  /**
   * Compute layout for DIAGRAM.
   * Uses bounds height since diagram size is determined by container.
   */
  computeLayout(node: DiagramNode, bounds: Bounds, _ctx: LayoutContext): PositionedNode {
    log.layout._('LAYOUT diagram bounds={x=%f y=%f w=%f h=%f} (using bounds height)',
      bounds.x, bounds.y, bounds.w, bounds.h);

    return {
      node,
      x: bounds.x,
      y: bounds.y,
      width: bounds.w,
      height: bounds.h,
    };
  },

  /**
   * Render diagram via mermaid-cli.
   */
  render(positioned: PositionedNode, canvas: Canvas, theme: Theme): void {
    const diagramNode = positioned.node as DiagramNode;
    const scale = diagramNode.scale ?? 2;

    log.render.diagram('RENDER diagram x=%f y=%f w=%f h=%f nodes=%d edges=%d scale=%d',
      positioned.x, positioned.y, positioned.width, positioned.height,
      diagramNode.nodes.length, diagramNode.edges.length, scale);

    // Build mermaid definition from node data
    const definition = buildDiagramDefinition(diagramNode);

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
        { stdio: 'pipe', timeout: 30000 },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Diagram rendering failed: ${message}`);
    }

    // Get image dimensions for proper scaling
    const dimensions = imageSize(outputPath);
    if (!dimensions.width || !dimensions.height) {
      throw new Error(`Cannot determine dimensions of rendered diagram: ${outputPath}`);
    }
    const imgWidth = dimensions.width / scale / theme.spacing.minDisplayDPI;
    const imgHeight = dimensions.height / scale / theme.spacing.minDisplayDPI;

    // Calculate scaling to fit bounds while maintaining aspect ratio
    const scaleX = positioned.width / imgWidth;
    const scaleY = positioned.height / imgHeight;
    const fitScale = Math.min(scaleX, scaleY, 1); // Don't scale up

    const finalWidth = imgWidth * fitScale;
    const finalHeight = imgHeight * fitScale;

    // Center in bounds
    const x = positioned.x + (positioned.width - finalWidth) / 2;
    const y = positioned.y + (positioned.height - finalHeight) / 2;

    log.render.diagram('  diagram rendered: imgSize=%dx%d -> %f x %f in, fitScale=%f, final=%f x %f at (%f, %f)',
      dimensions.width, dimensions.height, imgWidth, imgHeight, fitScale, finalWidth, finalHeight, x, y);

    canvas.addImage({
      path: outputPath,
      x,
      y,
      w: finalWidth,
      h: finalHeight,
    });
  },

  /**
   * Collect text measurements for diagram nodes.
   */
  collectMeasurements(node: DiagramNode, bounds: Bounds, theme: Theme): MeasurementRequests {
    const text: TextMeasurementRequest[] = [];
    const styles: StyleMeasurementRequest[] = [];
    const seenTextIds = new Set<string>();
    const seenStyleIds = new Set<string>();

    // Diagram text uses SMALL style
    const styleId = makeStyleKey(TEXT_STYLE.SMALL);
    if (!seenStyleIds.has(styleId)) {
      seenStyleIds.add(styleId);
      styles.push({ id: styleId, style: theme.textStyles[TEXT_STYLE.SMALL] });
    }

    // Approximate box width
    const approxWidth = bounds.w / node.nodes.length;
    for (const box of node.nodes) {
      const textId = makeTextKey(TEXT_STYLE.SMALL, approxWidth, box.label);
      if (!seenTextIds.has(textId)) {
        seenTextIds.add(textId);
        text.push({
          id: textId,
          content: box.label,
          style: theme.textStyles[TEXT_STYLE.SMALL],
          availableWidth: approxWidth,
        });
      }
    }

    return { text, styles };
  },
};

// ============================================
// REGISTRATION
// ============================================

// Register handler on module load
elementHandlerRegistry.register(diagramHandler);
