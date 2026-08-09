# tycoslide

Layout-driven collateral engine. Fills designer-made PPTX templates with structured content and assets.

For the user-facing model (layouts, slot types, syntax), see [SKILL.md](SKILL.md) and [syntax.md](syntax.md).

## Build & Test

```bash
npm run typecheck    # Type-check (tsc --build)
npm test             # Run tests (node:test)
npm run lint         # Biome check
```

TypeScript runs natively via Node's `--experimental-strip-types`. `tsc --build` emits `.d.ts` declarations only.

## Product Principle

**The designer's `.pptx` is inviolate — you never add anything to it and never clean anything up. tycoslide conforms to whatever the designer made; all tycoslide behavior, and all accommodation for real-world mess, lives in the manifest.**

Two facets of the one rule:

1. **Nothing tycoslide-specific goes into the `.pptx`.** A designer sees a normal template — no syntax to learn, no tokens, no plugins. Slot mappings, placeholder patterns, fit rules — everything tycoslide-flavored lives in the manifest. The template's job is to look right; the manifest's job is to say what fills where. This is the differentiator vs engines that make the designer touch syntax (Handlebars in Word, Templafy tokens, `{{...}}` placeholders).

2. **Real PowerPoint is messy, and tycoslide absorbs the mess.** Real files scatter a single line across many runs for no semantic reason, style inconsistently, and name shapes oddly. tycoslide must work with them as-is — never require the designer to reformat, tidy, or re-author their file. Any workaround lives in tycoslide's fill logic and the manifest (e.g. tycoslide coalesces adjacent same-style runs when filling, rather than demanding tidy runs).

If a decision would put tycoslide markup in the `.pptx`, or would require the designer to change their file, move it into the manifest / tycoslide instead.

## Architecture

Two layers with a hard boundary:

- **`src/markdown/`** — compiler. Owns markdown parsing, code highlighting (Shiki), mermaid rendering (mermaid-cli), the theme's asset catalog, and everything else "markdown-flavored." Normalizes the deck spec so the engine only sees text runs, tables, and resolved image paths.
- **`src/engine/`** — engine. Four fill primitives — `fillTemplate`, `fillText`, `fillTable`, `fillImage` — each wrapped as a `Filler` strategy in the `FILLERS` registry (`engine/fillers/filler.ts`, keyed by `SlotType`), plus a `generate` orchestrator (`engine/generate.ts`). Each fill and its value-discriminator (`fillX` + `isXFill`) live together in `engine/fillers/{template,text,table,image}.ts`; shared shape/DOM primitives and the paragraph-rebuild machinery live in `engine/dom.ts` (fillers never import each other). Deliberately ignorant of markdown, code fences, mermaid, or theme asset catalogs. Only knows PPTX shapes, runs, paragraphs, tables, and image files at resolved paths.

The compiler advertises a layout's author-facing inputs as two lists — `parameters` (frontmatter values, types `template`/`image`) and `slots` (body regions, types `text`/`table`/`code`/`mermaid`). That split is a compiler/manifest concern only. At the engine boundary (`toEngineLayout` in `src/index.ts`) both lists collapse into one flat `Layout.slots`, and every value flows through one unified channel: `DeckStep.content: Record<string, TextFill | TableFill | ImageFill | TemplateFill>` — the four `*Fill` shapes read as one family. Each engine slot declares a `SlotType` (`Template | Text | Table | Image`) that selects the matching `Filler`; compiler-only `code`/`mermaid` resolve to `text`/`image` before the engine sees them.

`src/index.ts` exposes the public API including `buildDeck(deck, config)` — the primary programmatic entry. `src/cli.ts` is the CLI wrapper.

## Coding Standards

- TypeScript, strict mode, native TS execution via Node
- Const objects for enums, not string literal unions: `SlotType.Text` not `'text'`
- No `Omit<>` on type definitions — declare explicitly, wrap don't shave
- No `as unknown as X` casts — single-hop casts only, or fix the types properly
- No silent defaults — if required config is missing, throw with a specific error naming the layout + slot
- No product name in engine/compiler source code — types are generic (`Config`, `Layout`, etc.)
- `node:test` for tests (not vitest)
- No comments unless the WHY is non-obvious
