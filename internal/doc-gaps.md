# Documentation Gaps

Surfaced by the DX audit (`internal/dx-audit.md`, workstream B). Each gap lists the target doc file where the fix belongs.

## Critical

1. **No local theme development workflow** — No guide for developing/testing a theme locally (linking packages, watch mode, iterating). → `themes.md`
2. **Multi-slot syntax missing** — Built-in layout docs don't show `::slotName::` syntax for layouts with multiple content slots. → `layouts.md`
3. **YAML complex types never shown** — No examples of array or object values in YAML frontmatter (e.g., `cards:` array, nested objects). → `layouts.md`

## Major

4. **Theme guide references nonexistent files** — `themes.md` step-by-step mentions `components.ts` / `layouts.ts` that are never created in the walkthrough. → `themes.md`
5. **`component.schema` convention undocumented** — Layout authors should use `xComponent.schema` for component-bound params and `schema.*` for config values. Not documented anywhere. → `layouts.md`
6. **Node.js prerequisite not mentioned** — Quick start assumes Node.js is installed but never states the requirement or minimum version. → `quick-start.md`

## Medium

7. **`register()` accepts single or array** — `componentRegistry.register()` accepts both a single definition and an array. Not documented. → `components.md`, `layouts.md`
8. **Image path resolution undocumented** — Unclear whether image paths resolve relative to the markdown file, CWD, or something else. → `components.md` or `markdown-syntax.md`
9. **Canvas API underspecified** — Viewport size, available fonts, and temp file lifecycle for canvas-rendered components not documented. → `components.md`
