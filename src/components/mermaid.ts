// Mermaid Diagram Component
// Renders Mermaid diagrams to PNG via mermaid-cli, then delegates to Image component

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
} from '../core/types.js';
import { Image } from './image.js';
import { log } from '../utils/log.js';

// Resolve mmdc binary path from tycoslide's node_modules
function findMmdcPath(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  // Walk up to find node_modules
  let dir = __dirname;
  for (let i = 0; i < 5; i++) {
    const candidate = join(dir, 'node_modules', '.bin', 'mmdc');
    if (existsSync(candidate)) {
      return candidate;
    }
    dir = dirname(dir);
  }

  // Fallback: try using createRequire to resolve
  try {
    const require = createRequire(import.meta.url);
    const cliPath = require.resolve('@mermaid-js/mermaid-cli/src/cli.js');
    return `node "${cliPath}"`;
  } catch {
    // Last resort: assume mmdc is in PATH
    return 'mmdc';
  }
}

export interface MermaidProps {
  /** DPI multiplier for rendering (default: 2) */
  scale?: number;
  /** Override theme background color (hex without #) */
  backgroundColor?: string;
  /** Override theme primary color (hex without #) */
  primaryColor?: string;
}

interface MermaidConfig {
  theme: 'base';
  themeVariables: Record<string, string>;
}

function buildMermaidConfig(theme: Theme, props?: MermaidProps): MermaidConfig {
  const bg = props?.backgroundColor ?? theme.colors.background;
  const primary = props?.primaryColor ?? theme.colors.primary;

  return {
    theme: 'base',
    themeVariables: {
      background: `#${bg}`,
      primaryColor: `#${primary}`,
      primaryTextColor: `#${theme.colors.text}`,
      primaryBorderColor: `#${theme.colors.secondary}`,
      lineColor: `#${theme.colors.secondary}`,
      secondaryColor: `#${theme.colors.accent1}`,
      tertiaryColor: `#${theme.colors.accent2}`,
      textColor: `#${theme.colors.text}`,
    },
  };
}

export class Mermaid implements Component {
  private image: Image;

  constructor(
    theme: Theme,
    definition: string,
    props?: MermaidProps,
  ) {
    const scale = props?.scale ?? 2;

    // Create temp directory for mermaid files
    const tmpDir = mkdtempSync(join(tmpdir(), 'mermaid-'));
    const inputPath = join(tmpDir, 'diagram.mmd');
    const outputPath = join(tmpDir, 'diagram.png');
    const configPath = join(tmpDir, 'config.json');

    // Write diagram source
    writeFileSync(inputPath, definition);

    // Write theme config
    const config = buildMermaidConfig(theme, props);
    writeFileSync(configPath, JSON.stringify(config));

    // Render via mermaid-cli with transparent background
    const mmdc = findMmdcPath();
    try {
      execSync(
        `${mmdc} -i "${inputPath}" -o "${outputPath}" -c "${configPath}" -s ${scale} -b transparent`,
        { stdio: 'pipe', timeout: 30000 },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Mermaid rendering failed: ${message}`);
    }

    // Delegate to Image component for all rendering logic
    this.image = new Image(theme, outputPath);

    log('mermaid: rendered %dx%d ar=%f path=%s',
      this.image.pixelWidth, this.image.pixelHeight, this.image.aspectRatio, outputPath);
  }

  get aspectRatio(): number {
    return this.image.aspectRatio;
  }

  get pixelWidth(): number {
    return this.image.pixelWidth;
  }

  get pixelHeight(): number {
    return this.image.pixelHeight;
  }

  getHeight(width: number): number {
    return this.image.getHeight(width);
  }

  getMinHeight(width: number): number {
    return this.image.getMinHeight(width);
  }

  getWidth(height: number): number {
    return this.image.getWidth(height);
  }

  prepare(bounds: Bounds, alignContext?: AlignContext): Drawer {
    return this.image.prepare(bounds, alignContext);
  }
}

/**
 * Factory function for creating Mermaid diagram components.
 */
export function mermaid(theme: Theme, definition: string, props?: MermaidProps): Mermaid {
  return new Mermaid(theme, definition, props);
}
