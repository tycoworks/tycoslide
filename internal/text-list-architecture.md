# Text Component Internal-Only + List Component + PROSE Removal

Implementation plan for making the text component internal-only, introducing a dedicated list component, and removing CONTENT.PROSE. Companion to [token-architecture.md](./token-architecture.md) and [roadmap.md](./roadmap.md).

---

## Problem

The `:::text` directive exposes an implementation detail (text boxes) to markdown authors. Combined with `content="prose"`, it creates a single mega text box from mixed content, causing silent vanishing of unsupported GFM content (blockquotes, code blocks, tables) and requiring pptxgenjs patches for bullet/paragraph transitions.

Additionally, the text component duplicates the slot compiler's job: both decompose markdown blocks into components. There should be one path, not two.

## Philosophy

- **"Gate not sign"** — prevent error conditions structurally rather than throwing errors
- **Declare outcomes, not implementation** — users should not think in terms of text boxes
- **Notion block model** — each block type is its own component (text, list, image, code, etc.)
- **One dispatch path** — the slot compiler dispatches blocks to components; components don't re-dispatch internally

## Design Decisions

### Text component becomes internal-only

Users cannot write `:::text` in markdown. The text component:
- Still handles bare paragraphs and headings via MDAST handlers (slot compiler dispatch)
- Still available to layout TypeScript authors via `text()` DSL function
- Still provides `textComponent.schema` (`z.string()`) for layout parameter typing

Mechanism: `directive: false` on `defineComponent` suppresses `.deserialize` while keeping `.schema` and `.mdast` handlers.

### List becomes its own component

Following the Notion block model, lists are a peer of text, not contained within text.

The list component:
- Registers MDAST handler for `SYNTAX.LIST` (moved from text)
- Takes `items: string[]` from layout authors via `list()` DSL function
- Parses each item as RICH (inline formatting: bold, italic, colors, links)
- Applies bullet formatting programmatically (not via markdown syntax construction)
- Produces a TextNode (PPTX requires bullets in one text frame for alignment)
- Supports ordered and unordered lists

### CONTENT.PROSE is removed

With lists handled by their own component, the text component no longer needs block-level markdown parsing.

| Mode | Purpose | Status |
|------|---------|--------|
| CONTENT.PLAIN | Literal text, no parsing. Titles, labels, attributions. | Keep |
| CONTENT.RICH | Inline formatting (bold, italic, color, links). Default. | Keep |
| CONTENT.PROSE | Block-level markdown (paragraphs, bullets, headings). | Remove |

PROSE was needed because text handled lists internally. With lists separated, paragraphs and headings are single-block dispatches where RICH produces identical output.

### No `:::content` directive

Wrapping a whole slide's content in a directive to control styling is a smell — that's a layout-level concern. Layout variants and tokens (tracked in token-architecture.md) solve the styling use case.

### Parameter vs slot boundary

| Characteristic | Parameter | Slot |
|---|---|---|
| Content complexity | Inline-only (RICH) | Mixed blocks (paragraphs, bullets, images) |
| Length | Short (1-2 lines in YAML) | Unbounded markdown |
| Styling control | Layout controls entirely | User has per-block control |
| Examples | title, eyebrow, items[], caption | body, left, right |

Layout TypeScript authors can still use CONTENT.PLAIN or CONTENT.RICH on text parameters. If a layout needs mixed-content prose, it exposes a slot.

---

## Implementation Steps

### Step 1: `directive: false` on `defineComponent`

**`packages/core/src/core/rendering/registry.ts`**: Add `directive?: boolean` to scalar component overloads. Guard `.deserialize` creation with `if (def.directive !== false)`. `.schema` always set.

### Step 2: Text component changes

**`packages/components/src/text.ts`**:
- Add `directive: false` to `defineComponent` call
- Remove `SYNTAX.LIST` from `mdast.nodeTypes`
- Change paragraph/heading MDAST handlers from `CONTENT.PROSE` to `CONTENT.RICH`
- Remove `mdastToRuns`, `transformList`, `proseProcessor`, PROSE branch in `expandText`

### Step 3: Create list component

**`packages/components/src/list.ts`** (new file):
- `defineComponent` with `body: schema.array(schema.string())`, `directive: false`
- MDAST handler for `SYNTAX.LIST`: walks List node, extracts item inline sources
- `expandList`: parses each item as RICH, applies bullet formatting, produces TextNode
- `list()` DSL function for layout authors

**`packages/core/src/core/model/types.ts`**: Add `List` to `Component` enum.

### Step 4: Update parent components

- `card.ts`: description PROSE → RICH (single-paragraph content)
- `quote.ts`: quote body PROSE → RICH
- `testimonial.ts`: testimonial quote PROSE → RICH

### Step 5: Update theme layouts

- `agendaLayout`: Replace `text(items.map(...).join('\n'), { content: CONTENT.PROSE })` with `list(items)`
- `statementLayout`: Change `CONTENT.PROSE` to `CONTENT.RICH` (single-paragraph body)
- Both default theme and Materialize theme
- Add list component tokens to themes

### Step 6: Remove CONTENT.PROSE

- Remove from `CONTENT` enum in `types.ts`
- Remove `content` param from text directive schema (or restrict to PLAIN/RICH)
- Verify zero PROSE references across codebase

### Step 7: Update tests and docs

- `schema.test.ts`: `:::text` tests expect "unknown directive" error
- `text.test.ts`: Remove PROSE tests, verify RICH for paragraphs/headings
- New `list.test.ts`: Test expansion, MDAST handler, ordered/unordered, inline formatting
- `docs/components.md`: Remove `:::text` examples, document list component for layout authors

---

## What Does NOT Change

- **CONTENT.PLAIN / CONTENT.RICH**: Stay as-is
- **`text()` DSL / `textComponent.schema`**: Stay as-is, available to layout authors
- **Bare markdown dispatch**: Paragraphs/headings → text, lists → list (new)
- **pptxgenjs patches**: Independent. Patch 4 (single `<a:pPr>`) still needed for multi-run bullets.
- **Layout tokens/variants**: Separate work (token-architecture.md)
