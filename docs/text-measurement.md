# Text Measurement & Async Pipeline

**Status:** Planning - this document describes the target architecture.

---

## The Problem

1. **Word wrap estimation:** Fontkit measures character widths but cannot predict where PowerPoint will break lines
2. **Editability:** Manual line breaks make output hard to edit
3. **Cross-platform variance:** Different apps render text differently
4. **Blocking operations:** Mermaid diagram rendering blocks the main thread

## Why Fontkit Is Insufficient

Fontkit can measure character advance widths, but it cannot:
- Know where words will break (language-specific word boundary logic)
- Handle kerning pair adjustments at break points
- Account for hyphenation rules
- Match PowerPoint's proprietary text layout algorithm

**Result:** ~75% accuracy on word wrap estimation. Not good enough.

---

## Solution: Browser-Based Measurement

### Approach

```
Collect measurements → Playwright renders HTML → Measure DOM → Use results in layout
```

Browser text layout handles word boundaries, kerning, and line breaking correctly. We can load the same fonts used in PowerPoint.

### Technology Choice: Playwright

| Approach | Wrap Accuracy | Latency | Recommendation |
|----------|--------------|---------|----------------|
| Fontkit only | ~75% | Fast | ❌ Rejected |
| **Playwright + HTML** | ~95% | ~50-200ms batch | ✅ Chosen |
| JSDOM + node-canvas | ~70-80% | Medium | Fallback option |
| Native PowerPoint | 100% | Very slow | Validation only |

Playwright chosen over Puppeteer for faster cold start.

### HTML Text Rendering

CSS to mimic PowerPoint text boxes:

```css
.pptx-textbox {
  font-family: 'Your Font Name';
  font-size: 18pt;
  line-height: 1.2;              /* lineHeightMultiplier */
  white-space: pre-wrap;         /* Preserve spaces, wrap at words */
  word-wrap: break-word;
  width: 400px;                  /* Available width in pixels */
}
```

Unit conversion (96 DPI): `1 inch = 96 pixels`, `1 point = 1.333 pixels`

---

## Async Pipeline Architecture

### Current Pipeline (sync)

```
Parse → Expand Components → Compute Layout (fontkit) → Render → writeFile()
```

### Proposed Pipeline (async consolidated)

```
Parse → Expand → Collect Async Work → Execute Parallel → Layout → Render → writeFile()
                        ↓                    ↓
                 Text measurements    Browser batch (Playwright)
                 + Diagram renders    + Mermaid CLI (parallel)
```

### Key Design Decision: Async in writeFile()

The `writeFile()` method already returns `Promise<void>`. All async work happens there:

```typescript
// Existing code continues to work unchanged
pres.add(slide1);  // sync - collects work
pres.add(slide2);  // sync - collects work
await pres.writeFile('output.pptx');  // async - executes measurements + diagrams
```

**Not a breaking change.** Users already await writeFile().

### Consolidation with Mermaid Diagrams

Currently diagram.ts uses `execSync` (blocking). The new architecture:

1. **Collect ALL async work upfront** (text measurements + diagram renders)
2. **Execute in parallel** (Playwright for text, mermaid-cli for diagrams)
3. **Resume layout** with all results available

```typescript
interface AsyncWork {
  measurements: KeyedMeasurementRequests;
  diagrams: DiagramRenderRequest[];
}

async function executeAsyncWork(work: AsyncWork): Promise<AsyncResults> {
  const [measurements, diagrams] = await Promise.all([
    browserMeasurer.measureBatch(work.measurements),
    renderDiagramsBatch(work.diagrams),
  ]);
  return { measurements, diagrams };
}
```

---

## Rich Text Considerations

The enriched `NormalizedRun` type now includes paragraph-level options:

| Feature | Height Impact | Measurement Needed |
|---------|--------------|-------------------|
| `bullet: true` | Reduces effective width | Subtract bulletIndent |
| `paraSpaceBefore/After` | Adds vertical space | Sum paragraph spacing |
| `breakLine: true` | Forces new line | Count forced breaks |
| `bold/italic` | Minimal width difference | Use correct font weight |

### Height Calculation with Rich Text

```typescript
function getHeight(node: TextNode, width: number, ctx: LayoutContext): number {
  const content = normalizeContent(node.content);

  // Account for bullet indent
  const hasBullets = content.some(run => run.bullet);
  const effectiveWidth = hasBullets
    ? width - theme.spacing.bulletIndent
    : width;

  // Get base height from browser measurement
  const baseHeight = ctx.measurements.getTextHeight(node, effectiveWidth);

  // Add paragraph spacing
  let extraSpace = 0;
  for (const run of content) {
    if (run.paraSpaceBefore) extraSpace += ptToIn(run.paraSpaceBefore);
    if (run.paraSpaceAfter) extraSpace += ptToIn(run.paraSpaceAfter);
  }

  return baseHeight + extraSpace;
}
```

---

## Implementation Plan

### Phase 1: Browser Measurement Service

**New file: `src/utils/browser-measurer.ts`**

```typescript
interface BrowserMeasurer extends TextMeasurer {
  measureBatch(requests: KeyedMeasurementRequests): Promise<MeasurementResults>;
  launch(): Promise<void>;
  close(): Promise<void>;
}
```

- Launch Playwright browser once per presentation build
- Create measurement page with font loading
- Inject all measurement divs in one DOM update
- Read all heights in one pass

### Phase 2: Async Pipeline Coordinator

**New file: `src/core/async-pipeline.ts`**

- Collect text measurements and diagram requests during add()
- Execute all async work in parallel during writeFile()
- Inject results back into node tree

### Phase 3: Diagram Deferred Rendering

Modify diagram.ts to return placeholder nodes:

```typescript
function expandDiagram(props: DiagramComponentProps, context: ExpansionContext): ImageNode {
  const diagramId = context.registerDiagram(props);
  return {
    type: NODE_TYPE.IMAGE,
    src: `__diagram:${diagramId}__`,  // Placeholder, resolved after async
  };
}
```

### Phase 4: Integration

- Modify Presentation class to collect async work
- Execute async pipeline in writeFile()
- Resolve placeholders before final render

---

## Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `src/utils/browser-measurer.ts` | Playwright-based batch measurement |
| `src/core/async-pipeline.ts` | Parallel async work coordinator |

### Modified Files

| File | Change |
|------|--------|
| `src/core/presentation.ts` | Collect async work, execute in writeFile() |
| `src/components/diagram.ts` | Deferred rendering pattern |
| `src/core/measure.ts` | Already has collection infrastructure (use it) |
| `src/utils/text-measurer.ts` | Add async measureBatch() to interface |
| `package.json` | Add playwright dependency |

---

## Trade-offs

| Aspect | Current (fontkit) | Proposed (browser) |
|--------|-------------------|-------------------|
| Word wrap accuracy | ~75% | ~95% |
| Speed | ~5ms/slide | ~50-200ms first, ~10ms batch |
| Dependencies | fontkit only | + playwright |
| Cold start | None | ~500ms browser launch |
| Mermaid rendering | Blocking (execSync) | Parallel (async) |

**Mitigation for cold start:** Launch browser lazily on first text measurement, keep warm for duration of build.

---

## Incremental Build Steps

Each step is independently committable and testable:

### Step 1: Browser Measurer (standalone)
- Add playwright dependency
- Create `browser-measurer.ts` with `measureBatch()`
- Add unit tests that measure known text → verify heights
- **Commit:** "Add Playwright-based browser text measurer"

### Step 2: Async Text Measurer Interface
- Extend `TextMeasurer` interface with optional async method
- Keep fontkit as default, browser as opt-in
- **Commit:** "Add async measureBatch to TextMeasurer interface"

### Step 3: Measurement Collection in Presentation
- Collect `KeyedMeasurementRequests` during `add()`
- Store on Presentation instance (don't execute yet)
- **Commit:** "Collect text measurement requests during add()"

### Step 4: Execute Measurements in writeFile()
- Call `browserMeasurer.measureBatch()` before layout
- Pass results to `computeLayout()`
- **Commit:** "Execute browser measurements in writeFile()"

### Step 5: Diagram Deferred Rendering
- Change `expandDiagram()` to return placeholder
- Collect diagram requests during expansion
- **Commit:** "Defer diagram rendering to async phase"

### Step 6: Parallel Async Execution
- Combine text measurement + diagram rendering
- Execute with `Promise.all()`
- **Commit:** "Parallelize text measurement and diagram rendering"

### Step 7: Cleanup
- Remove fontkit estimation code (now unused)
- Remove `execSync` from diagram.ts
- **Commit:** "Remove sync measurement code"

---

## Verification

1. Build presentation with multiple text boxes
2. Open in PowerPoint - verify text doesn't overflow boxes
3. Compare browser measurement vs actual PowerPoint height
4. Verify diagrams still render correctly
5. Measure total build time (should be similar due to parallelization)
