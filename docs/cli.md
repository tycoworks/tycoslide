# CLI Reference

Complete reference for the tycoslide command-line interface.

## tycoslide build

Compiles a Markdown file to PowerPoint. Every build also writes a `{basename}-build/` directory containing a per-slide HTML preview you can open in a browser to check how your slides look.

```
tycoslide build <input> [options]
```

### Flags

| Flag | Default | Description |
|------|---------|-------------|
| `-p, --preview` | off | Skip PPTX generation; write HTML only. Validation errors become warnings instead of failures. |
| `-f, --force` | off | Write PPTX even with layout errors or missing fonts. |
| `-d, --debug` | off | Enable verbose build logging. Does not affect output files. |
| `--render-scale <n>` | `2` | Pixel density for rendered diagrams and code blocks. `1` = draft, `2` = retina, `3` = print. |
| `--no-notes` | notes included | Exclude speaker notes from the output PPTX. |

### Exit Codes

- `0` — Success
- `1` — Build error (parse, validation, or layout failure)

For error messages and solutions, see [Troubleshooting](./troubleshooting.md).

### Debug Workflow

When a slide overflows or renders incorrectly, use `--preview` to skip PPTX generation and just get the HTML:

```bash
tycoslide build slides.md --preview
```

Open `slides-build/slide-N.html` in a browser to see where each element landed. Add `--debug` for verbose logging.

For a full debugging walkthrough, see [Troubleshooting](./troubleshooting.md).

## Related

- [Quick Start](./quick-start.md) - Build your first presentation
- [Markdown Syntax](./markdown-syntax.md) - Markdown syntax reference
- [Components](./components.md) - Component reference and custom components
- [Themes](./themes.md) - Theme system
