# Documentation

Developer documentation for tycoslide.

## Packages

tycoslide is distributed as three npm packages:

| Package | npm Name | Purpose |
|---------|----------|---------|
| **Core** | `tycoslide` | Framework, CLI, types, component/layout registries |
| **Components** | `tycoslide-components` | 13 built-in components (text, card, quote, table, image, etc.) |
| **Default Theme** | `tycoslide-theme-default` | Default theme with Inter font, title/section/body layouts |

## Guide

- [Introduction](./guide/introduction.md) — Design philosophy and comparison to other tools
- [Quick Start](./guide/quick-start.md) — Build your first presentation
- [Markdown Syntax](./guide/markdown-syntax.md) — Directive syntax and frontmatter
- [Components](./guide/components.md) — All 13 built-in components: parameters, examples, and patterns
- [CLI](./guide/cli.md) — Command-line tool reference
- [Troubleshooting](./guide/troubleshooting.md) — Common errors and debugging

## Extending

- [Creating Components](./extending/creating-components.md) — `componentRegistry.define()` API, tokens, slots, and DSL functions
- [Creating Layouts](./extending/creating-layouts.md) — `layoutRegistry.define()` API, slots, masters, and render functions
- [Creating Themes](./extending/creating-themes.md) — Theme interface, design tokens, fonts, and variants

## Default Theme

- [Overview](./default-theme/README.md) — Colors, typography, spacing
- [Component Tokens](./default-theme/component-tokens.md) — Token values and variants for all styled components
- [Layouts](./default-theme/layouts.md) — title, section, and body layout parameters
- [Customizing](./default-theme/customizing.md) — Extending and overriding the default theme
