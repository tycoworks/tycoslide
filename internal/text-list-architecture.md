# Text Component Internal-Only + List Component + PROSE Removal

Implementation plan for making the text component internal-only, introducing a dedicated list component, and removing CONTENT.PROSE entirely. Companion to [token-architecture.md](./token-architecture.md) and [roadmap.md](./roadmap.md).

**No backward compatibility required** — tycoslide has not been released. Remove all traces of PROSE. No deprecation warnings, no fallbacks. Delete it completely.

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
- Provides `listComponent.schema` (`z.array(z.string())`) for layout parameter typing (e.g., `items: listComponent.schema`)

### CONTENT.PROSE is deleted entirely

No trace should remain. No enum value, no code paths, no references in tests or docs.

| Mode | Purpose | Status |
|------|---------|--------|
| CONTENT.PLAIN | Literal text, no parsing. Titles, labels, attributions. | Keep |
| CONTENT.RICH | Inline formatting (bold, italic, color, links). Default. | Keep |
| ~~CONTENT.PROSE~~ | ~~Block-level markdown (paragraphs, bullets, headings).~~ | **Delete entirely** |

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

**`packages/core/src/core/rendering/registry.ts`**

There are 5 overloads of `defineComponent` (lines 180-239). Add `directive?: boolean` to the 3 scalar overloads that can auto-generate `.deserialize`:

**Overload 1** (line 180) — body only:
```typescript
export function defineComponent<TBody extends z.ZodTypeAny, TTokens = undefined>(def: {
  name: string;
  body: TBody;
  directive?: boolean;  // <-- add
  tokens: ...;
  mdast?: MdastHandler;
  expand: ...;
}): ScalarComponentDefinition<TBody, TTokens>;
```

**Overload 2** (line 193) — body + params:
```typescript
export function defineComponent<TBody extends z.ZodTypeAny, TParams extends SchemaShape, TTokens = undefined>(def: {
  name: string;
  body: TBody;
  params: TParams;
  directive?: boolean;  // <-- add
  tokens: ...;
  mdast?: MdastHandler;
  expand: ...;
}): ScalarComponentDefinition<TBody, TTokens>;
```

**Overload 3** (line 208) — params only:
```typescript
export function defineComponent<TShape extends SchemaShape, TTokens = undefined>(def: {
  name: string;
  params: TShape;
  directive?: boolean;  // <-- add
  tokens: ...;
  mdast?: MdastHandler;
  expand: ...;
}): ScalarComponentDefinition<z.ZodObject<TShape>, TTokens>;
```

Overloads 4 (slotted, line 221) and 5 (programmatic, line 234) do NOT need it — they never generate `.deserialize`.

**Implementation** (line 242): Guard `.deserialize` creation:

```typescript
} else if (bodySchema || paramsSchema) {
  // Scalar component: auto-generate .schema and directive deserializer
  result.schema = bodySchema ?? z.object(paramsShape);
  if (def.directive !== false) {
    result.deserialize = buildDeserializer(def.name, paramsSchema);
  }
}
```

`.schema` is always set (needed for layout parameter typing like `items: textComponent.schema`). `.deserialize` is only set when `directive !== false`.

Since `getDirectiveHandler` (line ~324) checks `def?.deserialize`, components with `directive: false` become invisible to directive dispatch. `:::text` becomes an unknown directive error — gate, not sign.

### Step 2: Text component changes

**`packages/components/src/text.ts`**

Add `directive: false` to the `defineComponent` call (line ~350):
```typescript
export const textComponent = defineComponent({
  name: Component.Text,
  body: schema.string(),
  params: textSchema,
  directive: false,    // <-- add this
  tokens: [...],
  mdast: { ... },
  expand: expandText,
});
```

Remove `SYNTAX.LIST` from `mdast.nodeTypes` (list component will own it):
```typescript
mdast: {
  nodeTypes: [SYNTAX.PARAGRAPH, SYNTAX.HEADING],  // was: [SYNTAX.PARAGRAPH, SYNTAX.LIST, SYNTAX.HEADING]
  ...
}
```

Change MDAST compile handler to use `CONTENT.RICH` instead of `CONTENT.PROSE`:
- Heading branch (line ~363): `content: CONTENT.RICH`
- Paragraph/default branch (line ~371): `content: CONTENT.RICH`
- Both are single-block dispatches (slot compiler sends one block at a time), so RICH produces identical output.

Delete these functions and code entirely:
- `mdastToRuns` (lines ~125-151): Block-level MDAST-to-runs converter — only existed for PROSE
- `transformList` (lines ~156-185): List-to-bullet-runs converter — moves to list component
- `proseProcessor`: The remark processor configured for block-level parsing — no longer needed
- The PROSE branch in `expandText`: The code path that called `proseProcessor` and `mdastToRuns`

Remove `content` from `textSchema` (line 88):
```typescript
const textSchema = {
  style: schema.textStyle().optional(),
  hAlign: schema.hAlign().optional(),
  vAlign: schema.vAlign().optional(),
  // content: schema.content().optional(),  <-- DELETE this line entirely
  variant: schema.string().optional(),
} satisfies SchemaShape;
```

Also remove the `content` prop from the DSL function's props type (line ~92-onwards, the `TextDslProps` or equivalent interface). Layout authors no longer choose content mode — text always uses RICH. The only remaining distinction is PLAIN vs RICH, which stays as a DSL prop for layout authors who need literal text (`text(title, { content: CONTENT.PLAIN })`).

**Wait — keep `content` in DSL props but only for PLAIN vs RICH.** Layout authors still need `text(title, { content: CONTENT.PLAIN })` for literal labels. The default is CONTENT.RICH. Just remove PROSE as an option.

### Step 3: Create list component

**New file: `packages/components/src/list.ts`**

The list component is a peer of text. It handles bullet/numbered lists.

**Key implementation detail — `transformList` logic moves here.** The existing function at text.ts lines 156-185 contains the core logic for converting list items to NormalizedRuns with `bullet: true`. This logic must be adapted for the list component's `expandList` function.

Here's what `transformList` does today (for reference):
```typescript
function transformList(list: List, colors: ColorScheme, runs: NormalizedRun[]): void {
  const bulletType = list.ordered ? { type: 'number' as const } : true;
  for (const item of list.children as ListItem[]) {
    const firstChild = item.children[0];
    if (firstChild && firstChild.type === SYNTAX.PARAGRAPH) {
      const itemRuns: NormalizedRun[] = [];
      transformInline((firstChild as Paragraph).children, colors, itemRuns, {});
      if (itemRuns.length > 0) {
        itemRuns[0] = { ...itemRuns[0], bullet: bulletType };
        runs.push(...itemRuns);
      }
    } else if (firstChild && firstChild.type === SYNTAX.LIST) {
      transformList(firstChild as List, colors, runs);  // nested lists
    }
  }
}
```

The list component needs:

1. **`expandList` function**: Takes `items: string[]` and `ordered?: boolean`. For each item:
   - Parse with `inlineProcessor` (same one text uses for RICH — handles bold, italic, `:color[]`, links)
   - Apply `bullet: true` (or `{ type: 'number' }` for ordered) on first run
   - Join items with `paragraphBreak: true` between them
   - Return a single TextNode containing all bulleted runs

2. **MDAST handler for `SYNTAX.LIST`**: When the slot compiler encounters a bare markdown list:
   - Walk the List MDAST node's children (ListItem nodes)
   - Each ListItem's first child is a Paragraph containing inline content
   - Extract the raw source for each item using `extractSource` on the Paragraph (same utility text uses)
   - Detect `node.ordered` (boolean) from the List MDAST node
   - Handle nested lists: if a ListItem's first child is itself a List, recurse
   - Return `component(Component.List, { body: items, ordered: node.ordered })`

3. **`list()` DSL function**:
   ```typescript
   export function list(items: string[], props?: ListProps): ComponentNode {
     return component(Component.List, { body: items, ...props });
   }
   ```
   Where `ListProps` includes: `style`, `hAlign`, `vAlign`, `variant`, `ordered`

4. **`listComponent.schema`**: Should be `schema.array(schema.string())` so layouts can type parameters: `items: listComponent.schema`

5. **Tokens**: Same text-relevant tokens — `bulletColor`, `style`, `lineHeightMultiplier`, `color`, `linkColor`, `linkUnderline`

6. **`transformInline` is shared**: The list component needs `transformInline` from text.ts (for parsing inline formatting within each item). Either:
   - Move `transformInline` to a shared utility (e.g., `packages/components/src/inline.ts`)
   - Or import it from text.ts if text exports it
   - `transformInline` handles: text, strong, emphasis, textDirective (`:color[]`), link, delete (strikethrough), ins (underline), break

**`packages/core/src/core/model/types.ts`**: Add `List = 'list'` to the `Component` enum.

**`packages/components/src/index.ts`**: Export `listComponent`, `list` DSL function.

**`packages/components/src/names.ts`** (if component names are registered here): Add `List`.

### Step 4: Update parent components

These components currently use CONTENT.PROSE for text content that is always single-paragraph inline text. Change to CONTENT.RICH — output is identical for all current usage.

- **`packages/components/src/card.ts`** (line ~111): description `CONTENT.PROSE` → `CONTENT.RICH`
- **`packages/components/src/quote.ts`** (line ~86): quote body `CONTENT.PROSE` → `CONTENT.RICH`
- **`packages/components/src/testimonial.ts`** (line ~110): testimonial quote `CONTENT.PROSE` → `CONTENT.RICH`

### Step 5: Update default theme layouts

**Only update `packages/theme-default/`** — the Materialize theme is in a separate repo and will be updated separately.

**`packages/theme-default/src/layouts.ts`**:

- **`agendaLayout`** (line ~445): Replace the PROSE hack:
  ```typescript
  // BEFORE:
  const body = items.map(item => `- ${item}`).join('\n');
  text(body, { content: CONTENT.PROSE })

  // AFTER:
  list(items)
  ```
  Import `list` from the components package.

- **`statementLayout`** (line ~415): Change `text(body, { content: CONTENT.PROSE })` to `text(body)` (defaults to CONTENT.RICH). All current content is single-paragraph inline text.

- **Theme tokens** (`packages/theme-default/src/theme.ts`): Add `list` component tokens alongside the existing `text` tokens:
  ```typescript
  list: {
    variants: {
      default: {
        color: ...,
        bulletColor: ...,
        style: TEXT_STYLE.BODY,
        lineHeightMultiplier: 1.2,
        linkColor: ...,
        linkUnderline: true,
      },
    },
  },
  ```

### Step 6: Delete CONTENT.PROSE entirely

**`packages/core/src/core/model/types.ts`**: Remove `PROSE: 'prose'` from the `CONTENT` object (line 35). Remove from `CONTENT_VALUES`.

**`packages/core/src/utils/parser.ts`** (if `schema.content()` exists): Update the content schema validator to only allow `'plain'` and `'rich'`. Or remove it entirely if `content` is no longer in any directive schema.

**Grep the entire codebase** for `PROSE`, `'prose'`, `CONTENT.PROSE`, `content.*prose`, `proseProcessor`, `mdastToRuns`. **Zero hits required.**

### Step 7: Update tests and docs

**`packages/core/test/schema.test.ts`**:
- Line 57: `compileSlot(':::text\nHello world\n:::')` → change to expect an error (unknown directive `text`)
- Line 64: `compileSlot(':::text\nText\n:::\n\n:::image\npic.png\n:::')` → remove `:::text` wrapper, test with bare markdown instead

**`packages/components/test/text.test.ts`**:
- Delete all PROSE-related tests
- Verify RICH parsing for paragraph and heading content
- Verify `directive: false` prevents directive deserialization

**New file: `packages/components/test/list.test.ts`**:
- Test `expandList` with unordered items → TextNode with `bullet: true` runs
- Test `expandList` with ordered items → TextNode with `{ type: 'number' }` bullet runs
- Test inline formatting in items: `list(['**bold** item', ':teal[colored] item'])`
- Test MDAST handler: mock List MDAST node → correct component with extracted items
- Test ordered detection: `node.ordered === true` → ordered list
- Test nested lists if supported

**`docs/components.md`**:
- Delete all `:::text` directive examples (9 occurrences)
- Add list component documentation (DSL usage for layout authors)
- Note that text and list are internal components — they handle bare markdown automatically and are available to layout TypeScript authors via `text()` and `list()` DSL functions

**`packages/core/patches/README.md`**:
- Update reference from `:::text{content="prose"}` to describe the scenario generically (layout-authored text nodes with mixed bullet/paragraph content)

---

## What Does NOT Change

- **CONTENT.PLAIN / CONTENT.RICH**: Stay as-is
- **`text()` DSL / `textComponent.schema`**: Stay as-is, available to layout authors
- **Bare markdown dispatch**: Paragraphs/headings → text, lists → list (new)
- **pptxgenjs patches**: Independent. Patch 4 (single `<a:pPr>`) still needed for multi-run bullets within the list component's TextNode output.
- **Layout tokens/variants**: Separate work (token-architecture.md)
- **Materialize theme**: Updated separately (not in this repo)
