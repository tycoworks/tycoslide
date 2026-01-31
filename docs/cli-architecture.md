# CLI & Markdown Architecture Plan

Research and design notes for adding a CLI tool and Markdown input to tycoslide.

## Goal

Tycoslide is currently a TypeScript library. The goal is to add a CLI that takes Markdown files as input and generates branded `.pptx` presentations — while keeping the library usable on its own.

## Unique Position

Tycoslide generates **native, editable PowerPoint** with full programmatic layout control (Yoga flexbox, component tree, theme system). No other Markdown-to-PPTX tool does this:

- **Marp** renders slides to PNG images and embeds them — output is not editable in PowerPoint
- **Pandoc** generates native PPTX but has no custom layout system — limited to what its Haskell writer supports
- **Slidev/reveal.js** are web-only, no PPTX output

## CLI Framework

The CLI surface is small: `tycoslide build deck.md --theme materialize -o deck.pptx`

### Recommendation: Commander.js (or cac)

| Option | Size | Weekly Downloads | Notes |
|--------|------|-----------------|-------|
| Commander | ~15KB | 238M | Industry standard, great docs |
| cac | ~5KB | 62M | Used by Vite/Tsup, minimal |
| citty | tiny | newer | UnJS ecosystem, TypeScript-first |

All three are adequate. Commander is the safe default; cac if we prefer minimal.

### What NOT to use

- **NestJS** — Server-side HTTP framework. Wrong architecture for file-processing CLI. Adds 50+ dependencies for a DI container we'd never use.
- **oclif** — Plugin framework. Overkill for a single-purpose tool.
- **yargs** — 290KB, heavier than needed.

### Plain TypeScript?

`node:util parseArgs` (Node 18.3+) works for zero-dependency argument parsing, but Commander gives help text, version flags, and subcommands for free with ~15KB. The overhead is negligible.

## Markdown Parser

### Recommendation: unified/remark

We need to walk an AST to map Markdown structure to the tycoslide component tree (headings → h1/h2, lists → bulletList, `---` → slide breaks, `:::columns` → row layout).

| Parser | AST? | Directives | Frontmatter | Ecosystem |
|--------|------|-----------|-------------|-----------|
| **unified/remark** | Full mdast | `remark-directive` | `remark-frontmatter` | 500+ plugins |
| markdown-it | Token stream | Plugins available | Plugin available | Proven in Marp |
| marked | No real AST | Limited | Limited | Fast but rigid |

Remark gives a proper `mdast` tree we can traverse and transform node-by-node into tycoslide DSL calls. The plugin ecosystem handles frontmatter, GFM tables, and custom directives out of the box.

markdown-it is a valid alternative (Marp uses it), but its token-stream model is harder to map to a component tree than remark's AST.

### Plugin stack

```
remarkParse          → parse Markdown to mdast
remarkFrontmatter    → extract YAML metadata (deck title, theme, per-slide config)
remarkDirective      → custom blocks (:::card, :::columns, :::callout)
remarkGfm            → GitHub-flavored Markdown (tables, strikethrough)
```

### Slide separation

Split on `thematicBreak` nodes in mdast (represents `---` in Markdown). This is the Marp convention and is CommonMark-compliant.

### Custom layout directives

```markdown
:::columns
Left column content

:::
Right column content
:::
```

Maps to `row(theme, leftContent, rightContent)` in the DSL.

## Architecture

### Pipeline

```
Markdown file
    ↓ remark-parse
mdast (AST)
    ↓ slide splitter (split on --- thematic breaks)
Slide[] of mdast subtrees
    ↓ transformer (walk AST, emit DSL calls)
Presentation with slides
    ↓ writeFile()
.pptx
```

### File structure

The CLI can live inside the tycoslide repo or as a separate package. Inside the repo:

```
tycoslide/
  src/
    core/           ← existing: Presentation, Renderer, Box, DSL, Types
    components/     ← existing: Text, Image, List, Table, Card
    cli/            ← new
      cli.ts        ← Commander setup, arg parsing (~50 lines)
      markdown.ts   ← remark pipeline: Markdown → mdast → DSL calls
      config.ts     ← theme loading, frontmatter handling
```

Or as a separate package (`@tycoslide/cli`) that depends on `tycoslide`.

### Where the complexity lives

The CLI shell itself is ~50 lines of Commander setup. The real work is the **mdast → DSL transformer** — mapping Markdown nodes to tycoslide components:

| mdast node | tycoslide component |
|-----------|-------------------|
| `heading` (depth 1) | `h1()` |
| `heading` (depth 2) | `h2()` |
| `heading` (depth 3-4) | `h3()` / `h4()` |
| `paragraph` | `body()` |
| `list` | `bulletList()` / `numberedList()` |
| `table` | `table()` |
| `image` | `image()` |
| `thematicBreak` | slide separator |
| `containerDirective` (:::columns) | `row()` |
| `containerDirective` (:::card) | `card()` |
| `yaml` (frontmatter) | theme/metadata config |

### Theme delivery

The CLI needs a theme to render against. Options:

1. **Bundled default theme** — ship a minimal built-in theme
2. **External theme package** — `--theme materialize` resolves to `materialize_theme` package
3. **Theme file** — `--theme ./my-theme.ts` loads a local file

All three can coexist. Start with option 2 (named package) since that's how themes already work.

## Comparable tools — lessons learned

### Marp

- Multi-package: marpit (framework), marp-core (engine), marp-cli (interface)
- Uses markdown-it with custom token extensions
- PPTX output embeds PNG screenshots — **not editable**
- Lesson: clean package separation enables VS Code extension, web integration

### Pandoc

- Only tool generating native editable PPTX objects
- Uses Lua filters for content transformation
- Themes via PowerPoint reference templates (slide masters)
- Lesson: native PPTX is the right approach but needs more layout control than Pandoc offers

### Slidev

- Monorepo (pnpm workspaces), Vite + Vue 3
- Markdown as Vue component templates
- No PPTX output
- Lesson: hot reload dev server is valuable for iteration

## Implementation priority

1. **Core transformer**: mdast → tycoslide DSL (the hard part)
2. **CLI entry point**: Commander with `build` command
3. **Theme loading**: resolve named theme packages
4. **Frontmatter**: deck-level and slide-level metadata
5. **Custom directives**: :::columns, :::card, :::callout
6. **Dev server** (future): file watcher + rebuild on change
