# Markdown Component

**Status:** Phase 0 complete. Phase 1 ready to implement.

---

## Overview

A `markdown()` component that:

1. Accepts standard markdown with remark-directive syntax for named highlights
2. Expands to a **TextNode** with `NormalizedRun[]` (single PowerPoint text box)
3. Uses paragraph spacing instead of layout gaps
4. Provides a path to MDX support in the future

**Architecture:** Markdown is a **ComponentNode** that expands via ComponentRegistry to a TextNode. It needs theme access during expansion to resolve named highlights against `theme.highlights`. Same pattern as Card.

**Implementation phases:**
1. **Phase 0:** Enrich `NormalizedRun` with paragraph options --- **DONE**
2. **Phase 1:** Add `markdown()` component (remark parser + MDAST-to-runs transformer)
3. **Phase 2:** Battle test in real presentations

---

## Phase 0: Enrich Text --- DONE

Rich text support is fully implemented. `NormalizedRun` supports bold, italic, breakLine, bullet, paraSpaceBefore, paraSpaceAfter. These flow through the entire pipeline:

- `layoutHtml.tsx` renders them as CSS (bold font-family, italic font-style, bullet indent+marker, margin spacing)
- Playwright measures the resulting layout
- `PptxConfigBuilder.buildTextFragments()` translates to pptxgenjs options
- `PptxRenderer` emits a single `addText()` call

The List component has been removed. Bullets are now part of rich text:

```typescript
text([
  { text: 'Introduction', bold: true },
  { text: 'First bullet point', bullet: true },
  { text: 'Second bullet point', bullet: true },
])
```

### pptxgenjs Bullet Behavior

Key rules discovered through testing:

- `bullet: true` auto-creates line breaks --- no `breakLine` needed
- `{ bullet: { type: 'number' } }` produces numbered lists (1. 2. 3.)
- DON'T mix `\n` with `bullet: true` --- causes empty bullet artifacts
- Bold, italic, color all work within bullet runs

---

## The Problem

### Verbose Rich Text

```typescript
// Current: array syntax
text([
  "It's hard to get data in the ",
  { text: 'right shape', highlight: highlights.orange },
  ' at the ',
  { text: 'right time', bold: true },
  '.',
])
```

```typescript
// Proposed: markdown syntax
markdown("It's hard to get data in the :orange[right shape] at the **right time**.")
```

### Multi-Component Spacing

Mixing prose and bullets currently requires multiple text nodes in a column with gap spacing. Markdown produces a single text box with paragraph-level spacing --- more accurate and simpler.

---

## Solution: Markdown Component

### API Design

```typescript
// Simple markdown (single paragraph)
markdown("This is a paragraph with **bold** and :teal[highlights].")

// Multi-paragraph with bullets
markdown(`
Intro paragraph with **bold** text.

- First bullet point
- Second bullet with :pink[highlight]
- Third bullet point

Conclusion paragraph.
`)

// With props
markdown(`Content here`, { style: TEXT_STYLE.BODY, color: 'FFFFFF' })
```

### Phase 1 Syntax Support

| Format | Syntax | Maps to NormalizedRun |
|--------|--------|----------------------|
| Bold | `**text**` | `bold: true` |
| Italic | `*text*` | `italic: true` |
| Bullet list | `- item` | `bullet: true` |
| Numbered list | `1. item` | `bullet: { type: 'number' }` |
| Paragraph break | Blank line | `breakLine: true` |
| Named highlight | `:name[text]` | `highlight: theme.highlights[name]` |

### Excluded from Phase 1

| Syntax | Why |
|--------|-----|
| `# Headings` | No font-size variation within a single TextNode |
| `` `code` `` | No monospace font mapping in NormalizedRun |
| `> blockquote` | No indent/border mechanism |
| `[links](url)` | PowerPoint links not in current pipeline |
| `![images](url)` | Cannot embed images in a TextNode |
| Nested lists | pptxgenjs indent support is fragile |
| `~~strikethrough~~` | Not needed yet (add later with `strike: boolean`) |
| MDX / JSX | Explicitly deferred |

### Highlight Syntax: `:name[text]` (remark-directive)

We use the [remark-directive](https://github.com/remarkjs/remark-directive) text directive syntax. This is the standard way to add custom inline elements in the unified/remark ecosystem.

```typescript
// Named highlight resolves against theme.highlights
markdown("Deploy with :teal[materialized views] using :blue[standard SQL].")
//                     ^^^^                          ^^^^
//                     resolves to theme.highlights.teal / .blue → HighlightPair
```

**Why remark-directive over custom syntax:**
- Battle-tested (255K+ weekly npm downloads)
- Zero custom parsing code --- just a handler for `textDirective` MDAST nodes
- Handles bold/italic inside highlights: `:teal[**bold** highlight]` works
- MDX-compatible (directives are native to the unified/MDX ecosystem)
- No standard exists for named highlights in markdown; this is the closest

---

## Architecture

### Data Flow

```
markdown("**bold** and :teal[highlighted]")
    |
    v
unified()
  .use(remarkParse)         // markdown -> MDAST
  .use(remarkDirective)     // :name[text] -> textDirective nodes
    |
    v
MDAST (Markdown Abstract Syntax Tree)
    |
    v
mdastToRuns(tree, theme.highlights)
  -> NormalizedRun[]
    |
    v
TextNode { type: 'text', content: NormalizedRun[], style, hAlign, vAlign }
    |
    v  (existing pipeline --- no changes needed)
layoutHtml.tsx: LayoutText renders with CSS
Playwright: measures positions
PptxConfigBuilder: translates to pptxgenjs fragments
PptxRenderer: single addText() call
```

### Component Registration

```typescript
// src/components/markdown.ts

export interface MarkdownProps {
  content: string;
  style?: TextStyleName;
  color?: string;
  hAlign?: HorizontalAlignment;
  vAlign?: VerticalAlignment;
  bulletColor?: string;
}

export const markdownComponent = defineComponent<MarkdownProps>(
  'markdown',
  (props, context) => {
    const runs = parseAndTransform(props.content, context.theme.highlights);
    return {
      type: NODE_TYPE.TEXT,
      content: runs,
      style: props.style,
      color: props.color,
      hAlign: props.hAlign ?? HALIGN.LEFT,
      vAlign: props.vAlign ?? VALIGN.TOP,
    };
  }
);
```

### Parser Setup

```typescript
// src/utils/markdownParser.ts

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkDirective from 'remark-directive';

const processor = unified()
  .use(remarkParse)
  .use(remarkDirective);

export function parseMarkdown(input: string): Root {
  return processor.parse(input);
}
```

### MDAST to NormalizedRun[] Transformer

```typescript
// src/utils/mdastToRuns.ts

export function mdastToRuns(
  tree: Root,
  highlights: HighlightScheme
): NormalizedRun[] {
  const runs: NormalizedRun[] = [];

  for (const node of tree.children) {
    if (node.type === 'paragraph') {
      if (runs.length > 0) {
        // breakLine before non-first paragraphs
        runs[runs.length] = { ...firstRun, breakLine: true };
      }
      transformInline(node.children, highlights, runs);
    } else if (node.type === 'list') {
      for (const item of node.children) {
        const bulletType = node.ordered
          ? { type: 'number' as const }
          : true;
        transformInline(
          item.children[0].children,
          highlights,
          runs,
          { bullet: bulletType }
        );
      }
    }
  }

  return runs;
}

function transformInline(
  nodes: PhrasingContent[],
  highlights: HighlightScheme,
  runs: NormalizedRun[],
  defaults?: Partial<NormalizedRun>
): void {
  for (const node of nodes) {
    switch (node.type) {
      case 'text':
        runs.push({ text: node.value, ...defaults });
        break;
      case 'strong':
        transformInline(node.children, highlights, runs, { ...defaults, bold: true });
        break;
      case 'emphasis':
        transformInline(node.children, highlights, runs, { ...defaults, italic: true });
        break;
      case 'textDirective':
        // :name[text] -> resolve highlight
        const pair = highlights[node.name];
        if (!pair) {
          throw new Error(
            `Unknown highlight '${node.name}'. Available: ${Object.keys(highlights).join(', ')}`
          );
        }
        transformInline(node.children, highlights, runs, { ...defaults, highlight: pair });
        break;
    }
  }
}
```

### Dependencies

```json
{
  "dependencies": {
    "unified": "^11.0.0",
    "remark-parse": "^11.0.0",
    "remark-directive": "^3.0.0"
  }
}
```

---

## Dynamic Content

For programmatic content, use template literals:

```typescript
const intro = "Welcome to the system";
const items = ['First', 'Second', 'Third'];

markdown(`
${intro}

${items.map(i => `- ${i}`).join('\n')}

That's all!
`)
```

---

## Trade-offs

### Type Safety

| Aspect | Array Syntax (text()) | Markdown Syntax |
|--------|----------------------|-----------------|
| Compile-time highlight validation | Yes (HighlightPair) | No (string name) |
| IDE autocomplete for highlights | Yes | No |
| Typo detection | Compile-time | Runtime (fast-fail) |

**Mitigation:** Fast-fail at expansion time with clear error messages:

```
Error: Unknown highlight 'organge'. Available: teal, pink, yellow, purple, orange
```

### Ergonomics

| Aspect | text() with runs | markdown() |
|--------|-----------------|------------|
| Bold text | `{ text: 'bold', bold: true }` | `**bold**` |
| Highlight | `{ text: 'x', highlight: h.teal }` | `:teal[x]` |
| Mixed prose + bullets | column + text + text | Single markdown block |
| Readability | Parse array structure | Read as prose |

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/utils/markdownParser.ts` | CREATE - unified + remark-parse + remark-directive setup |
| `src/utils/mdastToRuns.ts` | CREATE - MDAST tree to NormalizedRun[] transformer |
| `src/components/markdown.ts` | CREATE - Component definition + DSL factory |
| `src/components/index.ts` | MODIFY - Register markdown component |
| `src/core/dsl.ts` | MODIFY - Export markdown() |
| `src/index.ts` | MODIFY - Export markdown |
| `test/markdown.test.ts` | CREATE - Parser + transformer + integration tests |
| `package.json` | MODIFY - Add unified, remark-parse, remark-directive |

**No changes needed to:** `types.ts`, `nodes.ts`, `layoutHtml.tsx`, `pptxConfigBuilder.ts`, `pptxRenderer.ts`, `pipeline.ts`, `presentation.ts`

---

## Success Criteria

- [ ] `**bold**` and `*italic*` parse correctly
- [ ] `- bullets` and `1. numbered` produce correct NormalizedRun bullet types
- [ ] Blank lines produce paragraph breaks (breakLine)
- [ ] `:name[text]` resolves against theme.highlights
- [ ] Unknown highlight names throw clear error
- [ ] Bold inside highlights works: `:teal[**bold** text]`
- [ ] Single `addText()` call generated (verify in PPTX)
- [ ] All existing tests pass (no breaking changes)

---

## MDX Roadmap (Future)

Once markdown works, MDX is a natural extension:

```typescript
markdown(`
Here's a card inline:

<Card title="Hello" description="World" />

And back to prose.
`)
```

Requires `@mdx-js/mdx` and a component registry mapping. remark-directive is MDX-compatible, so the highlight syntax carries forward unchanged.

---

## Example Usage

```typescript
// Before: verbose, multiple text nodes
contentSlide('Query Offload', 'PATTERN',
  column({ gap: GAP.TIGHT },
    text("Move beyond slow queries and database overload."),
    text([
      { text: 'Connect your database via CDC', bullet: true },
      { text: 'Write your heavy query as a materialized view', bullet: true },
      { text: 'Point your app at Materialize for reads', bullet: true },
    ]),
    text('This is the fastest way to get value.'),
  ),
)

// After: single markdown component, single text box
contentSlide('Query Offload', 'PATTERN',
  markdown(`
Move beyond slow queries and database overload.

- Connect your database via **CDC**
- Write your heavy query as a :teal[materialized view]
- Point your app at Materialize for reads

This is the **fastest** way to get value.
  `),
)
```

---

## References

- [unified](https://unifiedjs.com/) - Content transformation ecosystem
- [remark](https://remark.js.org/) - Markdown processor
- [remark-directive](https://github.com/remarkjs/remark-directive) - Directive syntax plugin
- [mdast](https://github.com/syntax-tree/mdast) - Markdown AST specification
- [@mdx-js/mdx](https://mdxjs.com/) - MDX (future)
- [pptxgenjs Text Options](https://gitbrent.github.io/PptxGenJS/docs/api-text.html)
