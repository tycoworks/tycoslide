# CLI Reference

Complete reference for the tycoslide command-line interface.

## tycoslide build

Compile Markdown to PowerPoint (PPTX).

```bash
tycoslide build <input> [options]
```

### Arguments

- `<input>` - Path to Markdown file (required)

### Options

#### `-o, --output <path>`

Specify the output PPTX file path.

```bash
tycoslide build slides.md -o presentation.pptx
```

Default: Input filename with `.pptx` extension (e.g., `slides.md` → `slides.pptx`)

#### `-f, --force`

Write PPTX despite layout validation errors.

```bash
tycoslide build slides.md --force
```

Use this when:
- You accept content overflow warnings
- You want to generate output for review despite errors

Default: Build fails on validation errors

#### `-d, --debug <dir>`

Enable debug mode and write debug HTML files to the specified directory.

```bash
tycoslide build slides.md -d debug-output
```

This creates:
- HTML files showing layout visualization
- Measurement data for each slide
- Verbose logging in console

Useful for:
- Debugging layout issues
- Understanding why content overflows
- Seeing how elements are measured and positioned

See the [Debug Workflow](#debug-workflow) section below for details on interpreting debug output.

#### `--render-scale <factor>`

Scale factor for rendered images (mermaid diagrams and code blocks). Use `1` for fast iteration while drafting, `2` (the default) for screen presentations, and `3` for decks that will be printed or projected at high resolution.

```bash
tycoslide build slides.md --render-scale 3
```

- `1` — Fast, draft quality
- `2` — Retina quality (default)
- `3` — Print quality

Default: `2`

#### `--no-notes`

Exclude speaker notes from the output PPTX.

```bash
tycoslide build slides.md --no-notes
```

Use this when:
- Sharing slides publicly
- Reducing file size
- Notes aren't needed

Default: Notes are included

### Examples

**Basic build:**
```bash
tycoslide build slides.md
```

Output: `slides.pptx`

**Custom output path:**
```bash
tycoslide build slides.md -o output/presentation.pptx
```

**Build with debug output:**
```bash
tycoslide build slides.md -d debug
```

Creates `debug/` directory with HTML visualization files.

**Force build despite errors:**
```bash
tycoslide build slides.md --force
```

Generates output even if content overflows slide bounds.

**Build without notes:**
```bash
tycoslide build slides.md --no-notes
```

**Combine options:**
```bash
tycoslide build slides.md -o dist/slides.pptx -d debug --no-notes
```

## Exit Codes

- `0` - Success
- `1` - Build error (parse, validation, or layout failure)

For error messages and solutions, see [Troubleshooting](./troubleshooting.md).

## Debug Workflow

Use the `-d` / `--debug` flag to write HTML visualization files for each slide:

```bash
tycoslide build slides.md -d debug
```

This creates `debug/slide-0.html` (and one file per slide) showing bounding boxes, text measurement data, and element positioning.

For a full debugging walkthrough, see [Troubleshooting](./troubleshooting.md).

## Environment Variables

None. All configuration is via CLI options or frontmatter.

## Version

Check installed version:
```bash
tycoslide --version
```

## Help

Display help:
```bash
tycoslide --help
tycoslide build --help
```

## Related

- [Quick Start](./quick-start.md) - Build your first presentation
- [Markdown Syntax](./markdown-syntax.md) - Markdown syntax reference
- [Components](./components.md) - Component reference and custom components
- [Themes](./themes.md) - Theme system
