# Mermaid Diagram Integration

Design research for adding Mermaid diagram support to TycoSlide.

## Goal

Enable programmatic diagram generation from text-based Mermaid DSL, rendered as images in PowerPoint presentations with theme-aware styling.

## The Core Challenge

Mermaid.js **requires a browser layout engine** to calculate node positions and render diagrams. There is no pure Node.js API that avoids browser dependency. All rendering options involve either:

1. Spawning a headless browser (Puppeteer/Playwright)
2. Using a native reimplementation (Rust)
3. Calling a remote API service

## Rendering Options Evaluated

| Option | Speed | Dependencies | Compatibility | Recommendation |
|--------|-------|--------------|---------------|----------------|
| **mermaid-cli** | 2-3s startup | Puppeteer + Chromium | 100% | **Recommended** |
| mmdr (Rust) | 2-6ms | Binary install | ~90% | Alternative |
| Kroki API | Network latency | HTTP / Docker | 100% | Fallback |

### Option 1: mermaid-cli (Recommended)

The official [@mermaid-js/mermaid-cli](https://github.com/mermaid-js/mermaid-cli) uses Puppeteer internally. It's the most compatible option with full feature support.

```bash
npm install @mermaid-js/mermaid-cli
npx mmdc -i diagram.mmd -o output.png -c config.json
```

**Pros:**
- 100% Mermaid compatibility (official tool)
- Active maintenance, follows Mermaid releases
- Supports all diagram types (flowchart, sequence, ER, state, etc.)
- Configurable theming via JSON config

**Cons:**
- 2-3 second cold start per render (Chromium boot)
- Heavy dependency (Puppeteer pulls ~400MB Chromium)
- Slower for batch rendering

**Mitigation for speed:** The CLI reuses the browser instance when rendering multiple files in one invocation. Batch diagrams where possible.

### Option 2: mmdr (Rust-native)

[mermaid-rs-renderer](https://github.com/1jehuang/mermaid-rs-renderer) is a native Rust implementation, 500-1000x faster.

```bash
brew tap 1jehuang/mmdr && brew install mmdr
mmdr -i diagram.mmd -o output.png -e png
```

**Pros:**
- Blazing fast (2-6ms per diagram)
- No browser, no Node overhead
- Small binary

**Cons:**
- May not support all diagram types
- Separate binary to install (not npm)
- Newer project, less battle-tested

### Option 3: Kroki API

[Kroki.io](https://kroki.io/) provides a unified HTTP API.

```bash
curl -X POST -H "Content-Type: text/plain" \
  --data-binary "flowchart LR; A-->B" \
  https://kroki.io/mermaid/svg > diagram.svg
```

**Pros:**
- No local install
- Can self-host via Docker
- Supports 20+ diagram types

**Cons:**
- Network dependency
- External service (or Docker overhead)
- Less control over rendering options

## Proposed Implementation

### Architecture

Follow the existing `Image` component pattern:

```
User Code: diagram(theme, "flowchart LR; A-->B")
    ↓
Diagram Component: Render Mermaid → temp PNG, read dimensions
    ↓
Layout: getHeight(width), getWidth(height) - same as Image
    ↓
Canvas: addImage({ path, x, y, w, h })
    ↓
Renderer: pptxSlide.addImage()
```

### File Structure

```
src/components/diagram.ts    # New Diagram component
src/core/dsl.ts              # Add diagram() factory
```

### API Design

```typescript
// DSL usage
const { diagram } = createDSL(theme);

pres.add(contentSlide('Data Flow',
  await diagram(`
    flowchart LR
      A[Sources] --> B[Ingest]
      B --> C[Transform]
      C --> D[Serve]
  `)
));

// With options
await diagram(code, {
  scale: 2,           // DPI multiplier
  backgroundColor: 'transparent',
  width: 800,         // Max width hint
});
```

### Theme Integration

Mermaid supports theming via `%%{init}%%` directives or config files:

```json
{
  "theme": "base",
  "themeVariables": {
    "primaryColor": "#7C5CD0",
    "primaryTextColor": "#FFFFFF",
    "primaryBorderColor": "#BDB0E0",
    "lineColor": "#BDB0E0",
    "background": "#120E22",
    "fontFamily": "Inter"
  }
}
```

The `diagram()` function should auto-generate this config from the active TycoSlide theme:

```typescript
function buildMermaidConfig(theme: Theme): MermaidConfig {
  return {
    theme: 'base',
    themeVariables: {
      primaryColor: `#${theme.colors.primary}`,
      primaryTextColor: `#${theme.colors.text}`,
      lineColor: `#${theme.colors.secondary}`,
      background: `#${theme.colors.background}`,
    },
  };
}
```

### Implementation Sketch

```typescript
// src/components/diagram.ts
import { execSync } from 'child_process';
import { writeFileSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import imageSize from 'image-size';
import { Theme, Component, Bounds, Drawer } from '../core/types.js';

interface DiagramProps {
  scale?: number;
  backgroundColor?: string;
}

export class Diagram implements Component {
  private imagePath: string;
  private aspectRatio: number;
  private pixelWidth: number;
  private pixelHeight: number;

  constructor(
    private theme: Theme,
    source: string,
    props: DiagramProps = {}
  ) {
    const { scale = 2 } = props;

    // Create temp directory
    const tmp = mkdtempSync(join(tmpdir(), 'mermaid-'));
    const inputPath = join(tmp, 'diagram.mmd');
    const outputPath = join(tmp, 'diagram.png');
    const configPath = join(tmp, 'config.json');

    // Write diagram source
    writeFileSync(inputPath, source);

    // Write theme config
    writeFileSync(configPath, JSON.stringify(buildMermaidConfig(theme)));

    // Render via mermaid-cli
    execSync(
      `npx mmdc -i "${inputPath}" -o "${outputPath}" -c "${configPath}" -s ${scale}`,
      { stdio: 'pipe' }
    );

    // Read dimensions
    const dimensions = imageSize(outputPath);
    this.imagePath = outputPath;
    this.pixelWidth = dimensions.width!;
    this.pixelHeight = dimensions.height!;
    this.aspectRatio = this.pixelWidth / this.pixelHeight;
  }

  getHeight(width: number): number {
    const naturalHeight = width / this.aspectRatio;
    const maxHeight = this.pixelHeight / this.theme.spacing.minDisplayDPI;
    return Math.min(naturalHeight, maxHeight);
  }

  getMinHeight(width: number): number {
    return this.getHeight(width);
  }

  getWidth(height: number): number {
    return height * this.aspectRatio;
  }

  prepare(bounds: Bounds): Drawer {
    // Fit within bounds preserving aspect ratio
    const fitted = this.fitToBounds(bounds);
    return (canvas) => {
      canvas.addImage({
        path: this.imagePath,
        x: fitted.x,
        y: fitted.y,
        w: fitted.w,
        h: fitted.h,
      });
    };
  }

  private fitToBounds(bounds: Bounds) {
    // Same logic as Image component
    const widthConstrained = { w: bounds.w, h: bounds.w / this.aspectRatio };
    const heightConstrained = { w: bounds.h * this.aspectRatio, h: bounds.h };

    const fitted = widthConstrained.h <= bounds.h ? widthConstrained : heightConstrained;

    return {
      x: bounds.x + (bounds.w - fitted.w) / 2,
      y: bounds.y + (bounds.h - fitted.h) / 2,
      w: fitted.w,
      h: fitted.h,
    };
  }
}

// Factory function
export function diagram(
  theme: Theme,
  source: string,
  props?: DiagramProps
): Diagram {
  return new Diagram(theme, source, props);
}
```

## Mermaid Capabilities and Limitations

### Supported Diagram Types

| Type | Support | Notes |
|------|---------|-------|
| Flowchart | Excellent | Most common use case |
| Sequence | Excellent | Good for API flows |
| Class | Good | UML class diagrams |
| State | Good | State machines |
| ER | Good | Database schemas |
| Gantt | Good | Timelines |
| Pie | Basic | Simple pie charts |
| Git Graph | Good | Branch visualization |

### What Mermaid Cannot Do

- **Nested containers** - Subgraphs exist but are limited
- **Custom icons inside nodes** - Font Awesome only, no arbitrary images
- **Junction dots on lines** - No control over connection points
- **Precise positioning** - Auto-layout only, no manual coordinates
- **Complex brand styling** - Theming is limited to color variables

### Recommendation for Complex Diagrams

For sophisticated architecture diagrams (like the Materialize data flow), keep them as **static image assets**. Mermaid is best for:

- Quick flowcharts in content slides
- Sequence diagrams for API documentation
- ER diagrams for database overviews
- Simple visual explanations

Hero architecture slides should use carefully crafted static images until TycoSlide supports native shape composition.

## Dependencies to Add

```json
{
  "dependencies": {
    "@mermaid-js/mermaid-cli": "^11.0.0"
  }
}
```

Note: mermaid-cli will install Puppeteer as a peer dependency (~400MB for Chromium).

## Future Enhancements

1. **Async rendering** - Return Promise for non-blocking render
2. **Caching** - Hash diagram source, reuse cached PNGs
3. **SVG output** - For higher quality scaling
4. **Batch mode** - Render multiple diagrams in one browser session
5. **Native shapes** - Eventually build TycoSlide-native diagram primitives

## References

- [mermaid-cli GitHub](https://github.com/mermaid-js/mermaid-cli)
- [Mermaid Configuration](https://mermaid.js.org/config/usage.html)
- [Mermaid Theme Variables](https://mermaid.js.org/config/theming.html)
- [mmdr (Rust alternative)](https://github.com/1jehuang/mermaid-rs-renderer)
- [Kroki.io](https://kroki.io/)
