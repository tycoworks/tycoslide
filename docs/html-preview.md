# HTML Preview & Text Measurement System

**Status:** Design complete, ready for implementation

---

## Overview

Add an HTMLRenderer that consumes the existing Canvas abstraction, enabling:
1. **Step 1:** Browser-based text measurement to validate/tune calibration constants
2. **Step 2:** Visual slide preview (browser + VS Code extension)

This builds on TycoSlide's existing architecture - no changes to components or Canvas.

---

## The Problem

PptxGenJS is write-only. We estimate text heights using fontkit with calibration constants:

```typescript
// font-utils.ts
const WIDTH_CALIBRATION = 0.80;   // PowerPoint packs ~20% tighter
const HEIGHT_CALIBRATION = 0.88; // Lines render ~12% shorter
```

These are empirical guesses. We have no way to validate them without:
1. Generating PPTX
2. Opening in PowerPoint/Keynote
3. Eyeballing whether text overflowed
4. Adjusting constants and repeating

**Pain points:**
- Text wrapping when it wasn't expected (or not wrapping when it should)
- Bullet point rendering unpredictable across content lengths
- No way to validate layout before committing to PPTX output

---

## The Solution: HTMLRenderer

### Architecture

The Canvas abstraction already exists. We just add another renderer:

```
Component.prepare(bounds) → Drawer
Drawer(canvas) → canvas.addText(), canvas.addShape(), canvas.addImage()
Canvas.objects: CanvasObject[]
├── PptxRenderer(canvas) → PPTX file    (existing)
└── HTMLRenderer(canvas) → HTML string  (NEW)
```

**No changes to Canvas or Components.** HTMLRenderer is a new consumer of the same CanvasObject types.

### Files

| File | Action |
|------|--------|
| `src/core/html-renderer.ts` | **CREATE** - New HTMLRenderer class |
| `src/index.ts` | Export HTMLRenderer |
| Everything else | No changes |

---

## Step 1: Text Measurement

### Goal

Use browser rendering to measure actual text heights, compare to fontkit estimates, and tune calibration constants with real data.

### HTMLRenderer Interface

```typescript
// src/core/html-renderer.ts

export interface HTMLRendererOptions {
  dpi?: number;           // Default: 96 (screen)
  fontStrategy?: 'file' | 'base64';  // How to load fonts
}

export class HTMLRenderer {
  constructor(private theme: Theme, private options: HTMLRendererOptions = {}) {}

  /** Render a slide's canvas to complete HTML document */
  renderSlide(canvas: Canvas, background?: string): string;

  /** Get @font-face CSS declarations from theme fonts */
  getFontCSS(): string;
}
```

### Unit Conversion

Reuse existing helpers from `font-utils.ts`:

```typescript
// Already exists
export const POINTS_PER_INCH = 72;
export const ptToIn = (pt: number): number => pt / POINTS_PER_INCH;
export const inToPt = (inches: number): number => inches * POINTS_PER_INCH;

// New helpers for HTML rendering
const DEFAULT_DPI = 96;
const inToPx = (inches: number, dpi = DEFAULT_DPI): number => inches * dpi;
const ptToPx = (points: number, dpi = DEFAULT_DPI): number => (points / 72) * dpi;
```

### Canvas Object → HTML Mapping

| CanvasObject | HTML Element | Step 1 Priority |
|--------------|--------------|-----------------|
| `TextObject` | `<div>` + `<span>` per fragment | Required |
| `ShapeObject` (rect/roundRect) | `<div>` with background/border | Required (Card backgrounds) |
| `ShapeObject` (line) | `<div>` or `<svg>` | Skip for now |
| `ImageObject` | `<img>` | Skip for now |
| `SlideNumberObject` | Skip | Not needed |

### Text Rendering

```typescript
private renderText(obj: TextObject, dpi: number, index: number): string {
  const { x, y, w, h, fontSize, fontFace, color, align, valign, wrap } = obj.options;

  const styles = [
    'position: absolute',
    `left: ${inToPx(x, dpi)}px`,
    `top: ${inToPx(y, dpi)}px`,
    `width: ${inToPx(w, dpi)}px`,
    `height: ${inToPx(h, dpi)}px`,
    `font-size: ${ptToPx(fontSize, dpi)}px`,
    `font-family: '${fontFace}', sans-serif`,
    `color: ${formatColor(color)}`,
    `text-align: ${align || 'left'}`,
    `line-height: 1.0`,  // Match PowerPoint's default
    wrap !== false ? 'word-wrap: break-word' : 'white-space: nowrap',
    'overflow: hidden',
    'box-sizing: border-box',
    // Flexbox for vertical alignment
    'display: flex',
    'flex-direction: column',
    `justify-content: ${valignToFlex(valign)}`,
  ];

  const spans = obj.content.map(fragment => {
    const spanStyles = [];
    if (fragment.options?.color) spanStyles.push(`color: ${formatColor(fragment.options.color)}`);
    if (fragment.options?.fontFace) spanStyles.push(`font-family: '${fragment.options.fontFace}'`);
    if (fragment.options?.highlight) spanStyles.push(`background-color: ${formatColor(fragment.options.highlight)}`);
    const style = spanStyles.length ? ` style="${spanStyles.join('; ')}"` : '';
    return `<span${style}>${escapeHtml(fragment.text)}</span>`;
  }).join('');

  return `<div data-text-id="${index}" style="${styles.join('; ')}">${spans}</div>`;
}

function valignToFlex(valign?: string): string {
  switch (valign) {
    case 'middle': return 'center';
    case 'bottom': return 'flex-end';
    default: return 'flex-start';  // top
  }
}
```

### Font Loading

Use `file://` URLs for local fonts (Playwright can access filesystem):

```typescript
getFontCSS(): string {
  const fonts = this.collectFontsFromTheme();
  return fonts.map(font => `
    @font-face {
      font-family: '${font.name}';
      src: url('file://${font.path}');
    }
  `).join('\n');
}
```

### Measurement Workflow

```typescript
// test/calibration.ts
import { chromium } from 'playwright';
import { HTMLRenderer } from '../src/core/html-renderer.js';

async function measureSlide(canvas: Canvas, theme: Theme) {
  const renderer = new HTMLRenderer(theme);
  const html = renderer.renderSlide(canvas);

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);

  // Measure each text element
  const measurements = await page.$$eval('[data-text-id]', elements =>
    elements.map(el => ({
      id: el.dataset.textId,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      overflows: el.scrollHeight > el.clientHeight,
    }))
  );

  await browser.close();
  return measurements;
}
```

### Calibration Analysis

Compare browser measurements to fontkit estimates:

```typescript
// For each text element:
const fontkitEstimate = textComponent.getHeight(width);  // Uses calibration constants
const browserActual = measurements[i].scrollHeight / dpi;  // Convert px back to inches

const delta = browserActual - fontkitEstimate;
const ratio = browserActual / fontkitEstimate;

console.log(`Text ${i}: fontkit=${fontkitEstimate.toFixed(3)}" browser=${browserActual.toFixed(3)}" delta=${delta.toFixed(3)}" ratio=${ratio.toFixed(3)}`);
```

This gives real data to tune `WIDTH_CALIBRATION` and `HEIGHT_CALIBRATION`.

---

## Step 2: Visual Preview

### Goal

See slides rendered in browser before generating PPTX. Enables:
- Instant visual feedback during development
- Catch layout issues without opening PowerPoint/Keynote
- Foundation for VS Code extension

### Extended HTMLRenderer

Add full rendering support:

| CanvasObject | HTML Element |
|--------------|--------------|
| `TextObject` | `<div>` + `<span>` (from Step 1) |
| `ShapeObject` (rect/roundRect) | `<div>` with CSS |
| `ShapeObject` (line) | `<svg>` with `<line>` |
| `ImageObject` | `<img src="file://...">` |
| `SlideNumberObject` | `<div>` with page number |

### Preview Server

Simple local server for development:

```typescript
// scripts/preview.ts
import express from 'express';
import { watch } from 'chokidar';

const app = express();

app.get('/slide/:index', async (req, res) => {
  const presentation = await executePresentation(presentationPath);
  const canvas = presentation.slides[req.params.index].canvas;
  const html = renderer.renderSlide(canvas);
  res.send(html);
});

app.get('/', (req, res) => {
  // Slide thumbnail gallery
});

app.listen(3000, () => console.log('Preview at http://localhost:3000'));

// Watch for changes
watch(presentationPath).on('change', () => {
  // Notify connected clients via WebSocket
});
```

### CLI Integration

```bash
# Generate PPTX (existing)
npx tsx presentation.ts

# Preview in browser (new)
npx tycoslide preview presentation.ts
```

---

## Step 3: VS Code Extension (Future)

### Challenge

TycoSlide presentations are TypeScript files that must be **executed**, not parsed. Unlike Marp (Markdown), we can't just parse the file - we need to run it.

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   VS Code Extension                      │
├─────────────────────────────────────────────────────────┤
│  File Watcher ──▶ Execution Service ──▶ Preview Webview │
│  (debounced)       (child process)       (side panel)   │
│                         │                      ▲        │
│                         ▼                      │        │
│                  ┌─────────────┐    ┌─────────────────┐ │
│                  │ tsx runner  │───▶│ HTMLRenderer    │ │
│                  │ (sandboxed) │    │ (shared code)   │ │
│                  └─────────────┘    └─────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Execution Strategy

Add `toPreviewData()` method to Presentation class:

```typescript
// src/core/presentation.ts
export class Presentation {
  /** Serialize for preview without PPTX generation */
  toPreviewData(): PreviewData {
    return {
      slides: this.slides.map(s => ({
        canvas: s.canvas.getObjects(),
        masterName: s.masterName,
        notes: s.notes,
      })),
      theme: this._theme,
    };
  }
}
```

Preview runner executes user's file and captures data:

```typescript
// preview-runner.ts (executed in child process)
const pres = /* dynamically import user's presentation */;
console.log(JSON.stringify(pres.toPreviewData()));
```

### Latency Budget

| Phase | Target |
|-------|--------|
| File change detection | <50ms |
| TypeScript compilation (tsx) | 200-500ms |
| Data extraction | 50-100ms |
| HTML rendering | <50ms |
| Webview update | <50ms |
| **Total** | **~750ms** |

With 300ms debounce, this feels responsive for live preview.

### VS Code UX

- **Command:** "TycoSlide: Open Preview"
- **Auto-detect:** Files with `from 'tycoslide'` and `new Presentation`
- **Side panel:** Split view like Marp
- **Keyboard:** Arrow keys for slide navigation

---

## Implementation Plan

### Phase 1: HTMLRenderer for Measurement (Step 1)

**Deliverables:**
1. `src/core/html-renderer.ts` - HTMLRenderer class
2. `test/calibration.ts` - Measurement script using Playwright
3. Export from `src/index.ts`

**Scope:**
- TextObject rendering with full fidelity
- ShapeObject (rect/roundRect) for visual context
- Font loading via @font-face
- Data attributes for measurement targeting

**Dependencies:**
```json
{
  "devDependencies": {
    "playwright": "^1.40.0"
  }
}
```

**Effort:** ~200 lines of code

### Phase 2: Visual Preview (Step 2)

**Deliverables:**
1. Extend HTMLRenderer for all object types
2. `scripts/preview.ts` - Local preview server
3. CLI command: `tycoslide preview`

**Additional scope:**
- ImageObject rendering
- Line/shape rendering
- Slide navigation UI
- Hot reload on file changes

**Effort:** ~300 additional lines

### Phase 3: VS Code Extension (Step 3)

**Deliverables:**
1. VS Code extension package
2. Webview preview panel
3. TypeScript execution service
4. Live reload integration

**Effort:** ~500 lines + VS Code boilerplate

---

## Trade-offs

| Decision | Pro | Con |
|----------|-----|-----|
| Browser as measurement proxy | Real text rendering, actual layout | Still not identical to PowerPoint |
| HTMLRenderer as new file | No changes to existing code | Another renderer to maintain |
| Playwright for measurement | Headless, automatable | Adds dev dependency |
| file:// URLs for fonts | Simple, works locally | Won't work in web context |

---

## Success Criteria

### Step 1
- [ ] HTMLRenderer produces valid HTML for TextObject and ShapeObject
- [ ] Fonts load correctly in Playwright
- [ ] Measurement script outputs fontkit vs browser comparison
- [ ] Data informs calibration constant tuning

### Step 2
- [ ] All CanvasObject types render in browser
- [ ] Preview server shows slide gallery
- [ ] Hot reload updates preview on file change
- [ ] Visual fidelity "close enough" to PPTX output

### Step 3
- [ ] VS Code extension activates on TycoSlide files
- [ ] Preview panel shows slides in split view
- [ ] Live reload on save
- [ ] <1 second update latency

---

## References

- [text-measurement.md](./text-measurement.md) - Current calibration approach
- [architecture.md](./architecture.md) - Canvas abstraction details
- [Marp VS Code Extension](https://github.com/marp-team/marp-vscode) - Inspiration for VS Code UX
