// Declarative Render
// Renders positioned nodes to Canvas

import { NODE_TYPE, type PositionedNode, type TextNode, type ImageNode, type RectangleNode, type DiagramNode, type DiagramShape } from './nodes.js';
import type { Theme, TextStyleName, TextContent, NormalizedRun } from './types.js';
import type { Canvas, TextFragment, TextFragmentOptions } from './canvas.js';
import { SHAPE, TEXT_STYLE, HALIGN, VALIGN, FONT_WEIGHT, NODE_STYLE } from './types.js';
import { Bounds } from './bounds.js';
import { getFontFromFamily, normalizeContent } from '../utils/font-utils.js';
import { log, contentPreview } from '../utils/log.js';

// ============================================
// TEXT RENDERING HELPERS
// ============================================

function buildTextFragments(
  content: TextContent,
  styleName: TextStyleName,
  theme: Theme,
  colorOverride?: string
): TextFragment[] {
  const style = theme.textStyles[styleName];
  const defaultColor = colorOverride ?? style.color ?? theme.colors.text;
  const defaultWeight = style.defaultWeight ?? FONT_WEIGHT.NORMAL;

  const normalized = normalizeContent(content);
  return normalized.map(run => {
    const runWeight = run.weight ?? defaultWeight;
    const runFont = getFontFromFamily(style.fontFamily, runWeight);
    const options: TextFragmentOptions = {
      color: run.color ?? run.highlight?.text ?? defaultColor,
      fontFace: runFont.name,
    };
    if (run.highlight) options.highlight = run.highlight.bg;
    return { text: run.text, options };
  });
}

function renderText(
  canvas: Canvas,
  content: TextContent,
  styleName: TextStyleName,
  theme: Theme,
  x: number,
  y: number,
  w: number,
  h: number,
  hAlign?: string,
  vAlign?: string,
  colorOverride?: string
): void {
  const style = theme.textStyles[styleName];
  const defaultFont = getFontFromFamily(style.fontFamily, style.defaultWeight ?? FONT_WEIGHT.NORMAL);
  const fragments = buildTextFragments(content, styleName, theme, colorOverride);

  log.render.text('renderText style=%s x=%f y=%f w=%f h=%f align=%s/%s "%s"',
    styleName, x, y, w, h, hAlign ?? 'left', vAlign ?? 'top', contentPreview(content));

  canvas.addText(fragments, {
    x, y, w, h,
    fontSize: style.fontSize,
    fontFace: defaultFont.name,
    color: colorOverride ?? style.color ?? theme.colors.text,
    margin: 0,
    wrap: true,
    lineSpacingMultiple: 1.0,
    align: (hAlign as any) ?? HALIGN.LEFT,
    valign: (vAlign as any) ?? VALIGN.TOP,
  });
}

// ============================================
// NODE RENDERERS
// ============================================

function renderTextNode(canvas: Canvas, node: PositionedNode, theme: Theme): void {
  const textNode = node.node as TextNode;
  log.render.text('RENDER text x=%f y=%f w=%f h=%f "%s"',
    node.x, node.y, node.width, node.height, contentPreview(textNode.content));
  renderText(
    canvas,
    textNode.content,
    textNode.style ?? TEXT_STYLE.BODY,
    theme,
    node.x, node.y, node.width, node.height,
    textNode.hAlign,
    textNode.vAlign,
    textNode.color
  );
}

function renderImageNode(canvas: Canvas, node: PositionedNode, theme: Theme): void {
  const imageNode = node.node as ImageNode;
  log.render.image('RENDER image x=%f y=%f w=%f h=%f src=%s',
    node.x, node.y, node.width, node.height, imageNode.src.split('/').pop());
  canvas.addImage({
    path: imageNode.src,
    x: node.x,
    y: node.y,
    w: node.width,
    h: node.height,
  });
}

function renderRectangleNode(canvas: Canvas, node: PositionedNode, theme: Theme): void {
  const rectNode = node.node as RectangleNode;

  log.render.shape('RENDER rectangle x=%f y=%f w=%f h=%f',
    node.x, node.y, node.width, node.height);

  // Draw the shape if fill or border is specified
  if (rectNode.fill || rectNode.border) {
    const shapeType = rectNode.cornerRadius ? SHAPE.ROUND_RECT : SHAPE.RECT;

    // Build shape options
    const shapeOpts: Parameters<typeof canvas.addShape>[1] = {
      x: node.x,
      y: node.y,
      w: node.width,
      h: node.height,
    };

    // Fill
    if (rectNode.fill) {
      shapeOpts.fill = {
        color: rectNode.fill.color,
        transparency: rectNode.fill.opacity !== undefined ? 100 - rectNode.fill.opacity : 0,
      };
    }

    // Border - check if any sides are explicitly disabled
    if (rectNode.border) {
      const border = rectNode.border;
      const allSides = border.top !== false && border.right !== false &&
                       border.bottom !== false && border.left !== false;

      if (allSides) {
        // All sides - use standard line
        shapeOpts.line = {
          color: border.color ?? theme.colors.secondary,
          width: border.width ?? theme.borders.width,
        };
      }
      // Per-side borders would need separate line shapes - not yet implemented
    }

    // Corner radius
    if (rectNode.cornerRadius) {
      shapeOpts.rectRadius = rectNode.cornerRadius;
    }

    canvas.addShape(shapeType, shapeOpts);
  }
  // Rectangle is a pure visual shape - no children to render
}

function renderLineNode(canvas: Canvas, node: PositionedNode, theme: Theme): void {
  const lineNode = node.node as import('./nodes.js').LineNode;
  const color = lineNode.color ?? theme.colors.secondary;
  const width = lineNode.width ?? theme.borders.width;

  // Detect orientation from positioned dimensions
  // Vertical if height > width, horizontal otherwise
  const isVertical = node.height > node.width;

  if (isVertical) {
    log.render.shape('RENDER vertical line x=%f y=%f h=%f', node.x, node.y, node.height);
    canvas.addShape(SHAPE.LINE, {
      x: node.x,
      y: node.y,
      w: 0,
      h: node.height,
      line: { color, width },
    });
  } else {
    log.render.shape('RENDER horizontal line x=%f y=%f w=%f', node.x, node.y, node.width);
    canvas.addShape(SHAPE.LINE, {
      x: node.x,
      y: node.y,
      w: node.width,
      h: 0,
      line: { color, width },
    });
  }
}

function renderSlideNumberNode(canvas: Canvas, node: PositionedNode, theme: Theme): void {
  const slideNumNode = node.node as import('./nodes.js').SlideNumberNode;
  const styleName = slideNumNode.style ?? TEXT_STYLE.FOOTER;
  const style = theme.textStyles[styleName as keyof typeof theme.textStyles];
  const font = getFontFromFamily(style.fontFamily, FONT_WEIGHT.NORMAL);

  log.render.text('RENDER slideNumber x=%f y=%f w=%f h=%f', node.x, node.y, node.width, node.height);
  canvas.addSlideNumber({
    x: node.x,
    y: node.y,
    w: node.width,
    h: node.height,
    fontFace: font.name,
    fontSize: style.fontSize,
    color: slideNumNode.color ?? style.color ?? theme.colors.textMuted,
    align: slideNumNode.hAlign ?? HALIGN.RIGHT,
    valign: VALIGN.MIDDLE,
    margin: 0,
  });
}

// ============================================
// DIAGRAM RENDERER (flowcharts via external tool)
// ============================================

import { execSync } from 'child_process';
import { writeFileSync, mkdtempSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import imageSizeDefault from 'image-size';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const imageSize = (imageSizeDefault as any).default || imageSizeDefault;

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
    // Access color by style name (e.g., 'primary', 'secondary', 'accent1')
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

function renderDiagramNode(canvas: Canvas, positioned: PositionedNode, theme: Theme): void {
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
}

// ============================================
// MAIN RENDER FUNCTION
// ============================================

export function render(positioned: PositionedNode, canvas: Canvas, theme: Theme): void {
  const { node } = positioned;

  log.render._('render %s x=%f y=%f w=%f h=%f',
    node.type, positioned.x, positioned.y, positioned.width, positioned.height);

  switch (node.type) {
    case NODE_TYPE.TEXT:
      renderTextNode(canvas, positioned, theme);
      break;
    case NODE_TYPE.IMAGE:
      renderImageNode(canvas, positioned, theme);
      break;
    case NODE_TYPE.LINE:
      renderLineNode(canvas, positioned, theme);
      break;
    case NODE_TYPE.SLIDE_NUMBER:
      renderSlideNumberNode(canvas, positioned, theme);
      break;
    case NODE_TYPE.DIAGRAM:
      renderDiagramNode(canvas, positioned, theme);
      break;
    case NODE_TYPE.RECTANGLE:
      renderRectangleNode(canvas, positioned, theme);
      break;
    case NODE_TYPE.ROW:
    case NODE_TYPE.COLUMN:
    case NODE_TYPE.STACK:
      // Container nodes: just render children (Stack renders in z-order)
      log.render._('  container %s with %d children', node.type, positioned.children?.length ?? 0);
      if (positioned.children) {
        for (const child of positioned.children) {
          render(child, canvas, theme);
        }
      }
      break;
  }
}
