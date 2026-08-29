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

## Releasing

`@tycoworks/tycoslide` is a single npm package (no workspaces). The published tarball ships only `dist/`, `bin/`, `SKILL.md`, `syntax.md` (the `files` array); the `bin/tycoslide.js` shebang and `@tycoworks` publish access are assumed set up.

Commit and tag the bump **before** publishing. A publish that fails leaves a tag for a version not yet on npm, which the retry resolves; a publish that succeeds before the commit leaves npm carrying a version with no commit behind it, and the number can never be reused. Publishing requires a one-time password, so step 5 is run by hand.

1. **Clean-build + test** on the release branch: `npm ci && npm run build && npm test && npm run lint`. If the build reports missing exports that exist in source, `find . -name 'tsconfig.tsbuildinfo' -not -path './node_modules/*' -delete && npm run build`.
2. **Bump**: `npm version <patch|minor|major> --no-git-tag-version` (updates `package.json` + lockfile; no commit/tag).
3. **Verify the tarball**: `npm pack --dry-run` — confirm only `dist/`, `bin/tycoslide.js` (with shebang), `SKILL.md`, `syntax.md`, `package.json`, `README.md`, `LICENSE`; no `src/`, `test/`, configs, or fixtures.
4. **Commit, tag, push**: `git commit -am "release vX.Y.Z" && git tag -a vX.Y.Z -m "vX.Y.Z" && git push --follow-tags`. The tag must be annotated: `--follow-tags` ignores lightweight ones and the tag silently stays local.
5. **Publish**: `npm publish --access public` (`--access public` required on first publish, harmless after).
6. **GitHub release**: `gh release create vX.Y.Z --title "vX.Y.Z" --generate-notes`.
7. **Clean-room check**: in an empty dir, `npm install @tycoworks/tycoslide && npx tycoslide --version`, then build a minimal deck against a theme to confirm it renders a `.pptx`.

## Product Principle

**Users should never have to change their `.pptx`.** tycoslide works with the template as-is — no tycoslide syntax, tokens, or placeholders added to it, and no asking anyone to clean it up or re-author it. Everything tycoslide needs, and everything that copes with messy real-world files (a line split across many runs, inconsistent styling, odd shape names), lives in the manifest and the fill logic instead. If a decision would force the user to edit their file, move it into the manifest / tycoslide instead.

**tycoslide fills; it does not design.** The design — layout, type, color, spacing, chrome — lives in the designer's `.pptx` and is never generated, critiqued, or "improved." tycoslide is not a slide *generator* (Gamma, Tome, generic markdown-to-deck tools invent generic design); it reproduces a real brand system exactly. The agent's job is **composition within a fixed design system** — mapping content into the right slots of a real branded template — never design. Helping an agent *understand and compose within* the theme (which layout fits, what a slot accepts, a few general composition principles) is in scope; helping it invent, choose, or judge *design* is out, on purpose — that "out" is the product. Quality comes from the theme, not the prompt: a great template makes every deck great. (Composition still has taste — a valid fill can be a weak one — so a handful of general composition principles live in the agent skill; per-layout design guidance does not.)

## Architecture

Two layers with a hard boundary:

- **`src/markdown/`** — compiler. Owns markdown parsing, code highlighting (Shiki), mermaid rendering (mermaid-cli), the theme's asset catalog, and everything else "markdown-flavored." Normalizes the deck spec so the engine only sees text runs, tables, and resolved image paths.
- **`src/engine/`** — engine. Four fill primitives — `fillTemplate`, `fillText`, `fillTable`, `fillImage` — each wrapped as a `Filler` strategy in the `FILLERS` registry (`engine/fillers/filler.ts`, keyed by `SlotType`), plus a `generate` orchestrator (`engine/generate.ts`). Each fill and its value-discriminator (`fillX` + `isXFill`) live together in `engine/fillers/{template,text,table,image}.ts`; shared shape/DOM primitives and the paragraph-rebuild machinery live in `engine/dom.ts` (fillers never import each other). Deliberately ignorant of markdown, code fences, mermaid, or theme asset catalogs. Only knows PPTX shapes, runs, paragraphs, tables, and image files at resolved paths.

The compiler advertises a layout's author-facing inputs as two lists — `parameters` (a frontmatter line per `{key}` placeholder in a styled shape) and `slots` (body regions, types `text`/`table`/`code`/`mermaid`). A parameter substitutes into runs that already exist; a slot replaces a shape's content. That split is a compiler/manifest concern only. At the engine boundary (`toEngineLayout` in `src/index.ts`) both lists collapse into one flat `Layout.slots`, and every value flows through one unified channel: `DeckStep.content: Record<string, TextFill | TableFill | ImageFill | TemplateFill>` — the four `*Fill` shapes read as one family. Each engine slot declares a `SlotType` (`Template | Text | Table | Image`) that selects the matching `Filler`; compiler-only `code`/`mermaid` resolve to `text`/`image` before the engine sees them.

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
