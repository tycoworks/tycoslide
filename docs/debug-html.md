# Debug HTML: Always-On Layout Inspector

**Status:** Design complete, ready for implementation

---

## Overview

Make debug HTML output a first-class, always-on feature of tycoslide. Every build writes per-slide HTML files with navigation next to the output PPTX. No environment variables needed — you always get a browsable record of what was laid out.

---

## The Problem

The current debug system has friction:

1. **Opt-in via environment variable** — `DEBUG_HTML=1` must be set before every build. Easy to forget, and the output disappears into `/tmp/` where it's hard to find.

2. **Too many files** — A 5-slide deck with one master produces 13 files: 1 combined HTML, 6 per-slide HTML, 6 DOM snapshots, 1 screenshot. Most are redundant.

3. **No navigation** — Each per-slide file is a standalone document. To view slide 3, you need to know the filename and open it manually. No way to step through the deck.

4. **Measurement HTML is polluted in debug mode** — The banner divs and red outline CSS are injected into the same HTML that Playwright measures. While these additions don't affect measurements today (banners are outside `.root`, outlines use CSS `outline`), mixing debug visuals with measurement HTML is fragile.

---

## Current Architecture

There is only ONE HTML generation function: `generateLayoutHTML()` in `layoutHtml.tsx`. It produces a single HTML document containing all slides, which Playwright measures via `getBoundingClientRect()`. When `DEBUG_HTML` is set, the same function also:

- Adds a dark banner div above each slide (outside `.root`, no measurement impact)
- Adds red outline CSS (`[data-node-id] { outline: ... }`)
- Renders each slide as a standalone HTML document

The measurement engine (`measurement.ts`) then writes these files to disk and also captures DOM snapshots and a screenshot.

```
generateLayoutHTML()
    │
    ├── html (combined document → Playwright)
    │
    └── perSlideHtml[] (standalone per-slide files → debug output)
           │
           ├── {prefix}.html         (combined — redundant with in-memory)
           ├── {prefix}-{label}.html (per-slide — useful)
           ├── {prefix}-{label}-dom.html (DOM snapshot — redundant)
           └── {prefix}.png          (screenshot — useful)
```

**Key insight:** Measurement HTML and debug HTML are already the same thing. Debug mode just adds visual decorations and saves copies. There is no separate "debug renderer."

---

## Design

### Principles

1. **Always on** — Debug HTML is written on every build. No env var needed.
2. **Next to output** — Files go in `{name}-debug/` alongside the PPTX, not `/tmp/`.
3. **Clean separation** — Measurement HTML stays clean. Debug HTML is built separately with visual aids.
4. **Navigable** — Each per-slide file has prev/next links to step through the deck.
5. **Minimal output** — Only per-slide HTML files and one screenshot. No combined file, no DOM snapshots.

### Output Structure

After `npx tycoslide build deck.md -o output/deck.pptx`:

```
output/
  deck.pptx
  deck-debug/
    master-title.html     ← nav: [—] master-title [slide-1 →]
    slide-1.html          ← nav: [← master-title] slide-1 [slide-2 →]
    slide-2.html          ← nav: [← slide-1] slide-2 [slide-3 →]
    slide-3.html          ← nav: [← slide-2] slide-3 [—]
    screenshot.png        ← Playwright's full-page render
```

The debug directory name is derived from the PPTX filename: strip `.pptx`, append `-debug/`.

### Navigation Bar

Each per-slide HTML file gets a fixed nav bar at the top (pure HTML, no JavaScript):

```
┌──────────────────────────────────────────────────────┐
│  ← master-title          slide-1          slide-2 →  │
└──────────────────────────────────────────────────────┘
```

- Dark background (`#333`), white monospace text
- Prev/next are `<a>` tags linking to adjacent `{label}.html` files (relative paths)
- First slide omits prev link, last slide omits next link
- Current slide label displayed bold in center
- Links use the same labels already passed through the pipeline (`master-title`, `slide-1`, etc.)

### Debug Visual Aids

Per-slide HTML files include two additions that the measurement HTML does not:

| Aid | CSS | Measurement Impact |
|-----|-----|--------------------|
| Red node outlines | `[data-node-id] { outline: 1px solid rgba(255,0,0,0.3) }` | None (`outline` doesn't affect layout) |
| Scrollable overflow | `body { overflow: auto }` instead of `overflow: hidden` | None (measurement HTML keeps `hidden`) |

### Screenshot

The Playwright screenshot captures what the headless browser actually renders — the measurement HTML with all fonts loaded. This is valuable for diagnosing font loading issues (where the browser sees different fonts than your local machine). It captures all slides stacked vertically in one image.

---

## Implementation

### Files Modified

| File | What Changes |
|------|-------------|
| `packages/core/src/layout/layoutHtml.tsx` | Clean up `generateLayoutHTML()`: remove all `DEBUG_HTML` conditionals, always return `perSlideHtml` with nav bar and debug CSS |
| `packages/core/src/layout/measurement.ts` | Add `debugDir` parameter to `measureLayout()`, write per-slide files + screenshot to that directory, remove combined HTML + DOM snapshot methods |
| `packages/core/src/layout/pipeline.ts` | Thread `debugDir` through `executeMeasurements()` |
| `packages/core/src/presentation.ts` | Compute debug dir from output path, create directory, pass through pipeline |

### Change 1: `layoutHtml.tsx` — Clean measurement HTML, always build debug HTML

**Before:** `generateLayoutHTML()` conditionally injects banners and outlines into the measurement HTML, and conditionally builds per-slide documents.

**After:** Two clean outputs from the same function:
- `html` — Pure measurement HTML. No banners, no outlines. This is what Playwright gets.
- `perSlideHtml` — Always populated. Each entry is a standalone HTML document with nav bar, red outlines, and `overflow: auto`.

The per-slide HTML reuses the same `StyledNode` trees from Phase 1 (no re-computation), wrapped in a standalone document with the debug CSS and nav bar.

```typescript
// generateLayoutHTML return type changes:
export interface LayoutHtmlResult {
  html: string;                              // measurement HTML (clean)
  slideNodeIds: Array<Map<ElementNode, string>>;
  perSlideHtml: string[];                    // always populated (was optional)
}
```

The `labels` parameter becomes required (was optional) since we always need labels for nav links and filenames.

### Change 2: `measurement.ts` — Write debug files to provided directory

**Before:** `saveDebugHtml()`, `saveDebugDomSnapshots()`, `saveDebugScreenshot()` gated on `DEBUG_HTML` env var, compute paths from env var via `debugPrefix()`.

**After:** `measureLayout()` accepts `debugDir?: string`. When provided:
- Write each per-slide HTML to `{debugDir}/{label}.html`
- Write screenshot to `{debugDir}/screenshot.png`

Methods removed:
- `debugPrefix()` — no longer computing paths from env var
- `saveDebugHtml()` — replaced by inline loop writing `perSlideHtml` entries
- `saveDebugDomSnapshots()` — dropped entirely (redundant with per-slide HTML)

Methods kept behind `DEBUG_HTML` env var:
- `logNodeDimensions()` — verbose per-node console logging, useful for deep debugging but too noisy for always-on

```typescript
async measureLayout(
  slides: Array<{ tree: ElementNode; bounds: Bounds; label: string }>,
  theme: Theme,
  debugDir?: string,              // new parameter
): Promise<Map<ElementNode, Bounds>>
```

### Change 3: `pipeline.ts` — Thread debug dir

Minimal change — `executeMeasurements()` accepts and passes `debugDir`:

```typescript
async executeMeasurements(theme: Theme, debugDir?: string): Promise<void> {
  // ...
  this.measurements = await this.measurer.measureLayout(this.slides, theme, debugDir);
}
```

`debugDumpTree()` stays behind `DEBUG_HTML` — it's verbose console logging, not file output.

### Change 4: `presentation.ts` — Compute debug dir, create it, pass through

In `processDeferredSlides()`, accept and pass `debugDir`:

```typescript
private async processDeferredSlides(debugDir?: string): Promise<SlideValidationResult[]> {
  // ...
  await pipeline.executeMeasurements(this._theme, debugDir);
  // ...
}
```

In `writeFile()`, compute the debug directory from the output path:

```typescript
async writeFile(fileName: string, options: { ... } = {}): Promise<WriteResult> {
  const resolvedPath = path.resolve(fileName);
  const debugDir = resolvedPath.replace(/\.pptx$/i, '-debug');
  fs.mkdirSync(debugDir, { recursive: true });

  let validationErrors: SlideValidationResult[] = [];
  if (this.deferredSlides.length > 0) {
    validationErrors = await this.processDeferredSlides(debugDir);
  }
  // ...
}
```

---

## What Gets Dropped

| Current Output | Why |
|----------------|-----|
| Combined all-slides HTML (`debug.html`) | Same as what Playwright holds in memory. Not useful for human viewing — all slides stacked vertically with no context. |
| DOM snapshots (`*-dom.html`) | The browser's post-render `outerHTML`. Nearly identical to the generated HTML. Only useful for debugging Playwright rendering bugs, which are rare. |
| `debugPrefix()` helper | Path computation from env var replaced by explicit `debugDir` parameter. |
| `process.env.DEBUG_HTML` checks in `layoutHtml.tsx` | Debug HTML is now always-on, controlled by the caller passing a directory. |

## What Stays Behind `DEBUG_HTML` Env Var

| Feature | Why Keep It Gated |
|---------|-------------------|
| `logNodeDimensions()` in `measurement.ts` | Logs every node's dimensions, display mode, font, and text preview to console. Extremely verbose — useful for deep debugging but would flood output on every build. |
| `debugDumpTree()` in `pipeline.ts` | Logs the full positioned tree with coordinates. Same concern — useful for debugging layout but too noisy for every build. |

These remain activated via `DEBUG=tycoslide:layout:*` (the `debug` npm package namespace) or `DEBUG_HTML=1`.

---

## Data Flow (After)

```
presentation.writeFile("deck.pptx")
  │
  ├── debugDir = "deck-debug/"
  ├── mkdir(debugDir)
  │
  └── processDeferredSlides(debugDir)
        │
        └── pipeline.executeMeasurements(theme, debugDir)
              │
              └── measurer.measureLayout(slides, theme, debugDir)
                    │
                    ├── generateLayoutHTML(slides, theme, ratios, labels)
                    │     │
                    │     ├── html (clean measurement HTML)
                    │     │     → page.setContent(html)
                    │     │     → page.evaluate() → measurements
                    │     │
                    │     └── perSlideHtml[] (debug HTML with nav + outlines)
                    │           → write to debugDir/{label}.html
                    │
                    └── page.screenshot()
                          → write to debugDir/screenshot.png
```

---

## Verification

1. **Build passes:** `cd packages/core && npm run build && npm test`
2. **Debug directory created:** Build any deck, verify `{name}-debug/` appears next to PPTX
3. **Per-slide files correct:**
   - Each slide has its own `.html` file named by label
   - Red outlines visible on all nodes
   - `overflow: auto` allows scrolling
   - No banner divs (replaced by nav bar)
4. **Navigation works:** Open any per-slide file in browser, click prev/next links, verify they navigate correctly. First slide has no prev, last has no next.
5. **Screenshot present:** `screenshot.png` exists in debug directory
6. **Nothing dropped:** No combined HTML, no DOM snapshots
7. **Measurement unchanged:** PPTX output is byte-identical with and without this change (measurement HTML has no debug additions)
8. **Verbose logging still works:** `DEBUG_HTML=1` still triggers `logNodeDimensions()` and `debugDumpTree()` console output

---

## Non-Goals

- **Live preview server** — That's a separate feature (see `docs/html-preview.md`). This is about static debug output.
- **Slide backgrounds/images in debug HTML** — The debug HTML shows the CSS flexbox layout skeleton, not a pixel-perfect preview. A visual preview renderer would be a different system rendering from `PositionedNode` / `CanvasObject` types.
- **Configurable debug output** — No `--no-debug` flag. The cost is one `mkdir` + a few `writeFileSync` calls per build. Not worth the API surface.
