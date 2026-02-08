# Markdown Component

**Status:** Phase 0 (Enrich Text) in progress

---

## Overview

Add a new `Markdown` component that:

1. Accepts standard markdown with custom extensions for highlights
2. Emits a **single PowerPoint text box** with multiple paragraphs
3. Uses paragraph spacing instead of layout gaps (more accurate)
4. Provides a path to MDX support in the future

**Architecture Decision:** Markdown is a **component** that expands to a **TextNode** with enriched runs. We enrich the existing Text element first, then build Markdown on top. This gives us ONE text system, not two.

**Implementation strategy:**
1. **Phase 0:** Enrich `NormalizedRun` with paragraph options (bold, italic, breakLine, bullet, paraSpaceBefore)
2. **Phase 1:** Add `Markdown` component that parses markdown and returns a `TextNode`
3. **Phase 2:** Battle test and iterate

---

## Phase 0: Enrich Text (Prerequisites)

Before building Markdown, we enrich the existing Text element to support paragraph-level formatting. This ensures ONE text system in the API.

### NormalizedRun Enrichment

```typescript
// src/core/types.ts - CURRENT
export interface NormalizedRun {
  text: string;
  color?: string;
  highlight?: HighlightPair;
  weight?: FontWeight;
}

// src/core/types.ts - ENRICHED
export interface NormalizedRun {
  text: string;
  color?: string;
  highlight?: HighlightPair;
  weight?: FontWeight;
  // NEW: paragraph-level options
  bold?: boolean;              // Shorthand for weight: 'bold'
  italic?: boolean;            // Italic text
  breakLine?: boolean;         // Force new paragraph before this run
  bullet?: boolean | { type?: string; color?: string };  // Bullet marker
  paraSpaceBefore?: number;    // Points of space before paragraph
  paraSpaceAfter?: number;     // Points of space after paragraph
}
```

### TextFragmentOptions Enrichment

```typescript
// src/core/canvas.ts - CURRENT
export interface TextFragmentOptions {
  color?: string;
  fontFace?: string;
  fontSize?: number;
  highlight?: string;
  softBreakBefore?: boolean;
  bullet?: { type?: string; color?: string } | { color: string };
}

// src/core/canvas.ts - ENRICHED
export interface TextFragmentOptions {
  color?: string;
  fontFace?: string;
  fontSize?: number;
  highlight?: string;
  softBreakBefore?: boolean;
  bullet?: { type?: string; color?: string } | { color: string };
  // NEW: paragraph-level options
  bold?: boolean;
  italic?: boolean;
  paraSpaceBefore?: number;    // Points
  paraSpaceAfter?: number;     // Points
}
```

### Text Handler Updates

The text handler (`src/elements/text.ts`) must pass through the new options:

```typescript
// In buildTextFragments()
const options: TextFragmentOptions = {
  color: run.color ?? run.highlight?.text ?? defaultColor,
  fontFace: runFont.name,
  // NEW: pass through paragraph options
  bold: run.bold,
  italic: run.italic,
  softBreakBefore: run.breakLine,
  bullet: run.bullet,
  paraSpaceBefore: run.paraSpaceBefore,
  paraSpaceAfter: run.paraSpaceAfter,
};
```

### pptxgenjs Bullet Behavior (IMPORTANT)

Through testing, we discovered the correct patterns for pptxgenjs text arrays:

**What works:**
1. `bullet: true` on each item → auto line breaks + bullet markers
2. `{ bullet: { type: 'number' } }` → numbered lists (1. 2. 3.)
3. Header before bullets → no `\n` or `breakLine` needed; `bullet: true` auto-creates line break
4. `\n` in text → plain paragraph breaks (for non-bullet content)
5. Bold, italic, color → work within bullet runs

**Key rule:** DON'T mix `\n` with `bullet: true` - causes empty bullet artifacts.

**Correct pattern:**
```javascript
slide.addText([
  { text: 'Header', options: { bold: true } },           // No \n needed
  { text: 'First bullet', options: { bullet: true } },   // Auto line break
  { text: 'Second bullet', options: { bullet: true } },  // Auto line break
  { text: 'Third bullet', options: { bullet: true } },   // Auto line break
], { x, y, w, h, fontSize: 18 });
```

**Mixed formatting in bullets:**
```javascript
slide.addText([
  { text: 'Key Features', options: { bold: true } },
  { text: 'Bold', options: { bullet: true, bold: true } },
  { text: ' and ', options: {} },
  { text: 'italic', options: { italic: true } },
  { text: ' in same bullet', options: {} },
  { text: 'Second bullet', options: { bullet: true } },
], { x, y, w, h, fontSize: 18 });
```

### Showcase Example

```typescript
// Rich text without markdown - demonstrates enriched runs
// Note: bullet: true auto-creates line breaks, no breakLine needed
text([
  { text: 'Introduction', bold: true },
  { text: 'First bullet point', bullet: true },
  { text: 'Second bullet point', bullet: true },
  { text: 'Third bullet point', bullet: true },
])

// Numbered list
text([
  { text: 'Steps to follow', bold: true },
  { text: 'First step', bullet: { type: 'number' } },
  { text: 'Second step', bullet: { type: 'number' } },
  { text: 'Third step', bullet: { type: 'number' } },
])

// Plain paragraphs (use \n for breaks, no bullets)
text([
  { text: 'First paragraph.\n' },
  { text: 'Second paragraph.\n' },
  { text: 'Third paragraph.' },
])
```

### Phase 0 Success Criteria

- [x] NormalizedRun has bold, italic, breakLine, bullet, paraSpaceBefore, paraSpaceAfter
- [x] TextFragmentOptions has matching options
- [x] Text handler passes options through to canvas
- [ ] Showcase example renders correctly
- [x] All existing tests pass (no breaking changes)

---

## The Problem

### Current Pain: Verbose Rich Text

```typescript
// Current: array syntax for bold/highlight
text([
  "It's hard to get data in the ",
  { text: 'right shape', highlight: highlights.orange },
  ' at the ',
  { text: 'right time', weight: 'bold' },
  '.',
])
```

```typescript
// Proposed: markdown syntax
markdown("It's hard to get data in the ::orange::right shape:: at the **right time**.")
```

### Current Pain: Multi-Component Layout Error

When mixing prose and bullets:

```typescript
// Current: THREE separate text boxes with layout gaps
column({ gap: GAP.TIGHT },
  text("Intro paragraph..."),
  bulletList(['Bullet 1', 'Bullet 2', 'Bullet 3']),
  text("Conclusion paragraph..."),
)
```

This creates **three positioned text boxes** with gap-based spacing. Each component's `getHeight()` has measurement error that compounds.

### How PowerPoint Actually Works

Native PowerPoint uses **one text box with multiple paragraphs**:

```xml
<p:txBody>
  <a:p><!-- Intro paragraph, no bullet --></a:p>
  <a:p><a:pPr><a:buChar char="•"/></a:pPr><!-- Bullet 1 --></a:p>
  <a:p><a:pPr><a:buChar char="•"/></a:pPr><!-- Bullet 2 --></a:p>
  <a:p><!-- Conclusion paragraph, no bullet --></a:p>
</p:txBody>
```

Inter-paragraph spacing is controlled by `paraSpaceBefore`/`paraSpaceAfter`, not external positioning.

**pptxgenjs supports this:**

```javascript
slide.addText([
  { text: "Intro paragraph", options: { paraSpaceAfter: 6 } },
  { text: "Bullet 1", options: { bullet: true } },
  { text: "Bullet 2", options: { bullet: true } },
  { text: "Conclusion", options: { paraSpaceBefore: 6 } }
], { x, y, w, h });
```

---

## Solution: Markdown Component

### API Design

```typescript
// Simple markdown (single paragraph)
markdown("This is a paragraph with **bold** and ::teal::highlights::.")

// Multi-paragraph with bullets (standard markdown)
markdown(`
Intro paragraph with **bold** text.

- First bullet point
- Second bullet with ::pink::highlight::
- Third bullet point

Conclusion paragraph.
`)
```

### Supported Syntax

| Format | Syntax | Example |
|--------|--------|---------|
| Bold | `**text**` | `**important**` |
| Italic | `*text*` | `*emphasis*` |
| Highlight (named) | `::name::text::` | `::orange::warning::` |
| Highlight (default) | `==text==` | `==emphasized==` |
| Bullet list | `- item` | Standard markdown |
| Numbered list | `1. item` | Standard markdown |
| Paragraph break | Blank line | Standard markdown |

### Type Definitions

```typescript
// src/core/types.ts additions

export interface MarkdownProps {
  style?: TextStyleName;
  color?: string;
  hAlign?: HorizontalAlignment;
  vAlign?: VerticalAlignment;
  bulletColor?: string;    // Override bullet marker color
}
```

### Component Interface

```typescript
// src/components/markdown.ts

export class Markdown implements Component {
  constructor(
    private theme: Theme,
    private content: string,
    private props: MarkdownProps = {}
  ) {}

  getHeight(width: number): number;
  getMinHeight(width: number): number;
  getWidth(height: number): number;
  prepare(bounds: Bounds, alignContext?: AlignContext): Drawer;
}

// Factory function
export function markdown(
  theme: Theme,
  content: string,
  props?: MarkdownProps
): Markdown;
```

---

## Implementation: Remark/Unified Ecosystem

### Why Remark (not custom parser or markdown-it)

The user wants **MDX support eventually**. MDX is built on remark/unified, so using remark now means:

1. No rewrite when adding MDX
2. Plugin ecosystem for custom syntax
3. AST-based transformation (clean architecture)
4. Well-maintained, widely used

| Library | MDX Support | Plugin System | Recommendation |
|---------|-------------|---------------|----------------|
| marked | No | Limited | Skip |
| markdown-it | No | Yes | Skip (Marp uses, but no MDX path) |
| **remark/unified** | **Native** | **Excellent** | **Use this** |

### Architecture

```
Input (markdown string)
    │
    ▼
┌─────────────────────────────────────────────┐
│  unified()                                   │
│    .use(remarkParse)        // markdown→AST │
│    .use(remarkGfm)          // tables, etc  │
│    .use(remarkHighlight)    // ::teal::x::  │
└─────────────────────────────────────────────┘
    │
    ▼
MDAST (Markdown Abstract Syntax Tree)
    │
    ▼
┌─────────────────────────────────────────────┐
│  mdastToPptx(tree, theme)                   │
│    → TextFragment[] for canvas.addText()    │
└─────────────────────────────────────────────┘
    │
    ▼
Single addText() call with paragraph spacing
```

### Parser Setup

```typescript
// src/utils/markdown-parser.ts

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { remarkHighlight } from './remark-highlight.js';

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkHighlight);

export function parseMarkdown(input: string): Root {
  return processor.parse(input);
}
```

### Custom Highlight Plugin

```typescript
// src/utils/remark-highlight.ts

// Adds support for ::name::text:: syntax
// Transforms to custom mdast node type: { type: 'highlight', name: 'teal', children: [...] }

import { visit } from 'unist-util-visit';

export function remarkHighlight() {
  return (tree: Root) => {
    visit(tree, 'text', (node, index, parent) => {
      // Parse ::name::text:: patterns
      // Replace with highlight nodes
    });
  };
}
```

### MDAST to PPTX Transform

```typescript
// src/utils/mdast-to-pptx.ts

interface PptxParagraph {
  runs: TextFragment[];
  bullet?: boolean | number;  // true for bullet, number for numbered
  indent?: number;            // nesting level
}

export function mdastToPptx(tree: Root, theme: Theme): PptxParagraph[] {
  const paragraphs: PptxParagraph[] = [];

  for (const node of tree.children) {
    if (node.type === 'paragraph') {
      paragraphs.push({
        runs: transformInline(node.children, theme),
        bullet: false,
      });
    } else if (node.type === 'list') {
      for (const item of node.children) {
        paragraphs.push({
          runs: transformInline(item.children[0].children, theme),
          bullet: node.ordered ? item.index : true,
        });
      }
    }
  }

  return paragraphs;
}

function transformInline(nodes: PhrasingContent[], theme: Theme): TextFragment[] {
  // Transform strong, emphasis, highlight nodes to TextFragment[]
}
```

### Dependencies

```json
{
  "dependencies": {
    "unified": "^11.0.0",
    "remark-parse": "^11.0.0",
    "remark-gfm": "^4.0.0",
    "unist-util-visit": "^5.0.0"
  }
}
```

---

## MDX Roadmap (Future)

Once markdown is working, adding MDX is straightforward:

```typescript
// Future: MDX support
import { compile } from '@mdx-js/mdx';

// Allows components in markdown:
markdown(`
Here's a card inline:

<Card title="Hello" description="World" />

And back to prose.
`)
```

This requires:
1. Add `@mdx-js/mdx` dependency
2. Component registry for allowed components
3. Evaluate compiled MDX to get component tree

**Not in initial scope** - document for future reference.

### Canvas Integration

Extend `TextFragmentOptions` in `src/core/canvas.ts`:

```typescript
export interface TextFragmentOptions {
  color?: string;
  fontFace?: string;
  highlight?: string;
  bullet?: boolean | BulletOptions;     // NEW
  paraSpaceBefore?: number;              // NEW (points)
  paraSpaceAfter?: number;               // NEW (points)
  breakLine?: boolean;                   // NEW (force new paragraph)
}
```

### Render Output

The `Markdown` component emits a **single** `canvas.addText()` call:

```typescript
prepare(bounds: Bounds): Drawer {
  const paragraphs = mdastToPptx(this.tree, this.theme);
  const fragments: TextFragment[] = [];

  paragraphs.forEach((para, i) => {
    const isFirst = i === 0;

    para.runs.forEach((run, j) => {
      fragments.push({
        text: run.text,
        options: {
          ...run.options,
          bullet: j === 0 ? para.bullet : undefined,
          paraSpaceBefore: j === 0 && !isFirst ? this.paragraphSpacing : undefined,
          breakLine: j === 0 && i > 0,  // New paragraph
        }
      });
    });
  });

  return (canvas) => {
    canvas.addText(fragments, {
      x: bounds.x,
      y: bounds.y,
      w: bounds.w,
      h: bounds.h,
      fontSize: this.style.fontSize,
      fontFace: this.defaultFont.name,
      wrap: true,
    });
  };
}
```

---

## Height Estimation

### Single Unified Calculation

Unlike the current multi-component approach, `Markdown.getHeight()` calculates height for the entire content at once:

```typescript
getHeight(width: number): number {
  const paragraphs = mdastToPptx(this.tree, this.theme);
  const lineHeight = getStyleLineHeight(this.style);
  let totalLines = 0;

  for (const para of paragraphs) {
    const paraText = para.runs.map(r => r.text).join('');
    const effectiveWidth = para.bullet
      ? width - this.bulletIndent
      : width;

    totalLines += estimateLines(paraText, this.style, effectiveWidth);
  }

  // Add paragraph spacing (converted to line equivalents)
  const paragraphGaps = (paragraphs.length - 1) * this.paragraphSpacingLines;

  return lineHeight * (totalLines + paragraphGaps);
}
```

**Key advantage:** One measurement instead of N measurements with N-1 gaps.

---

## Migration Path

### Phase 0: Enrich Text (Current)

1. Add paragraph options to `NormalizedRun` in `src/core/types.ts`
2. Add matching options to `TextFragmentOptions` in `src/core/canvas.ts`
3. Update `buildTextFragments` in `src/elements/text.ts` to pass options through
4. Update renderer to handle new options (bold, italic, paraSpacing)
5. Add showcase example demonstrating rich text
6. Add tests for new options
7. **All existing tests must pass**

### Phase 1: Add Markdown Component

Markdown is a **component** (not an element) that:
- Parses markdown string using remark/unified
- Expands to a `TextNode` with enriched `NormalizedRun[]`
- Registered in ComponentRegistry like Card, List, Table

1. Create `src/utils/markdown-parser.ts` (remark setup)
2. Create `src/utils/remark-highlight.ts` (custom syntax plugin)
3. Create `src/utils/mdast-to-runs.ts` (AST → NormalizedRun[] transformer)
4. Add `markdown()` factory to DSL that returns `ComponentNode<MarkdownProps>`
5. Register expander in ComponentRegistry
6. Add to DSL exports

### Phase 2: Battle Test

- Use `Markdown` in real presentations
- Verify height estimation accuracy
- Ensure highlight validation works
- Test edge cases (nested lists, complex inline formatting)

### Phase 3: Remove List Component (Breaking Change)

With rich text supporting `bullet: true` and `bullet: { type: 'number' }`, the List component becomes redundant:

```typescript
// OLD: List component (REMOVED)
bulletList(['First item', 'Second item'])

// NEW: Rich text with bullets (no breakLine needed - bullet auto-creates line breaks)
text([
  { text: 'First item', bullet: true },
  { text: 'Second item', bullet: true },
  { text: 'Third item', bullet: true },
])

// NEW: Numbered list
text([
  { text: 'First item', bullet: { type: 'number' } },
  { text: 'Second item', bullet: { type: 'number' } },
])

// OR: Markdown component (after Phase 1)
markdown(`
- First item
- Second item
`)
```

**Migration path:** Remove List component as breaking change (no deprecation period).

### Programmatic Construction

For dynamic content, use template literals:

```typescript
// Dynamic content via template literals
const intro = "Welcome to the system";
const items = ['First', 'Second', 'Third'];

markdown(`
${intro}

${items.map(i => `- ${i}`).join('\n')}

That's all!
`)
```

---

## What We Lose vs. Gain

### Type Safety Trade-off

| Aspect | Array Syntax (Text) | Markdown Syntax |
|--------|---------------------|-----------------|
| Compile-time highlight validation | Yes | No (runtime) |
| IDE autocomplete for highlights | Limited | No |
| Typo detection | Compile-time | Runtime |

**Mitigation:** Fast-fail at parse time with clear error messages:

```
Error: Unknown highlight 'organge' in markdown content.
Available highlights: teal, pink, yellow, purple, orange
```

### Ergonomics Gain

| Aspect | Current (Text/List) | With Markdown |
|--------|---------------------|---------------|
| Bold text | 5-line array | `**bold**` |
| Highlight | 3-line object | `::teal::text::` |
| Mixed prose + bullets | 3 components + column | Single markdown block |
| Reading/editing | Parse array structure | Read as prose |
| Layout accuracy | Compounds error | Single measurement |

---

## Files to Create/Modify

### Phase 0: Enrich Text

| File | Action |
|------|--------|
| `src/core/types.ts` | MODIFY - Add paragraph options to NormalizedRun |
| `src/core/canvas.ts` | MODIFY - Add paragraph options to TextFragmentOptions |
| `src/elements/text.ts` | MODIFY - Pass paragraph options through buildTextFragments |
| `src/core/renderer.ts` | MODIFY - Handle bold, italic, paraSpacing in pptxgenjs output |
| `test/rich-text.test.ts` | CREATE - Tests for enriched text |
| showcase example | CREATE - Demonstrate rich text features |

### Phase 1: Markdown Component

| File | Action |
|------|--------|
| `src/utils/markdown-parser.ts` | CREATE - Remark processor setup |
| `src/utils/remark-highlight.ts` | CREATE - Custom ::highlight:: plugin |
| `src/utils/mdast-to-runs.ts` | CREATE - AST to NormalizedRun[] |
| `src/core/dsl.ts` | MODIFY - Add markdown() factory |
| `src/components/markdown-expander.ts` | CREATE - Component expander |
| `src/components/index.ts` | MODIFY - Register markdown expander |
| `test/markdown.test.ts` | CREATE - Unit tests |
| `package.json` | MODIFY - Add remark dependencies |

---

## Success Criteria

- [ ] Standard markdown parses correctly (`**bold**`, `*italic*`, `- bullets`, `1. numbered`)
- [ ] Custom highlight syntax works (`::teal::text::`, `==text==`)
- [ ] Unknown highlight names fail fast with clear error
- [ ] Single `addText()` call generated (verify in PPTX XML)
- [ ] Height estimation matches actual render (within 5%)
- [ ] Paragraph spacing uses `paraSpaceBefore/After` (not layout gaps)
- [ ] Existing Text/List components unchanged (backward compatible)
- [ ] remark plugin architecture supports future MDX addition

---

## Example Usage

```typescript
// Before: verbose, three components, three text boxes
pres.add(layouts.contentSlide('Query Offload', 'PATTERN',
  column({ gap: GAP.TIGHT },
    text("Move beyond slow queries and database overload.", { style: TEXT_STYLE.BODY }),
    bulletList([
      'Connect your database via CDC',
      'Write your heavy query as a materialized view',
      'Point your app at Materialize for reads',
    ]),
    text('This is the fastest way to get value.', { style: TEXT_STYLE.BODY }),
  ),
));

// After: single markdown component, single text box
pres.add(layouts.contentSlide('Query Offload', 'PATTERN',
  markdown(`
Move beyond slow queries and database overload.

- Connect your database via **CDC**
- Write your heavy query as a ::teal::materialized view::
- Point your app at Materialize for reads

This is the **fastest** way to get value.
  `),
));
```

---

## References

- [unified](https://unifiedjs.com/) - Content transformation ecosystem
- [remark](https://remark.js.org/) - Markdown processor
- [mdast](https://github.com/syntax-tree/mdast) - Markdown AST specification
- [@mdx-js/mdx](https://mdxjs.com/) - MDX (future)
- [pptxgenjs Text Options](https://gitbrent.github.io/PptxGenJS/docs/api-text.html)
- [text-measurement.md](./text-measurement.md) - Height estimation approach
- [architecture.md](./architecture.md) - Component design patterns
