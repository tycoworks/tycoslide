# Troubleshooting

Common errors and how to fix them.

## Theme Errors

### "No theme specified"

```
Error: No theme specified. Add `theme: <name>` to the global frontmatter in your markdown file.
```

**Cause:** The markdown file has no global frontmatter block, or the global frontmatter does not include a `theme:` field.

**Fix:** Add a global frontmatter block at the very top of your file:

```markdown
---
theme: tycoslide-theme-default
---

---
layout: title
title: My Presentation
---
```

The global frontmatter must be the first thing in the file (before any slide separators).

---

### "Could not find theme package"

```
Error: Could not find theme package 'my-theme'.
Is it installed? Try: npm install my-theme
```

**Cause:** The theme named in `theme:` is not installed in `node_modules`.

**Fix:** Install the theme package:

```bash
npm install tycoslide-theme-default
```

If using a local theme, make sure it is listed in `package.json` dependencies and `npm install` has been run.

---

### "Theme package does not export 'theme'"

```
Error: Theme package 'my-theme' does not export 'theme'.
```

**Cause:** The theme package's main entry point does not export a named `theme` export.

**Fix:** Ensure your theme package exports `theme` as a named export:

```typescript
export const theme: Theme = { /* ... */ };
```

---

### "Theme package does not export 'layouts'"

```
Error: Theme package 'my-theme' does not export 'layouts'.
Layouts must be exported so that importing them registers them in the layout registry.
```

**Cause:** The theme package does not re-export its layouts module. Layouts must be exported (even if unused by the caller) so that the import side-effect registers them in the layout registry.

**Fix:** Add a `layouts` re-export to your theme's `index.ts`:

```typescript
export * as layouts from './layouts.js';
export { theme } from './theme.js';
```

---

### "Theme missing tokens for component"

```
Error: Theme missing tokens for component 'card'. Required: [padding, cornerRadius, ...]
```

**Cause:** Your theme does not provide a `components.card` entry. Every component that declares required tokens must have a corresponding block in `theme.components`.

**Fix:** Add the missing component token block to your theme:

```typescript
components: {
  card: {
    variants: {
      default: {
        padding: 0.25,
        cornerRadius: 0.05,
        backgroundColor: 'E7E0EC',
        // ... all required tokens
      }
    }
  }
}
```

See [`theme.ts`](../packages/theme-default/src/theme.ts) for the complete token reference.

Call `componentRegistry.validateTheme(theme)` at startup to catch all missing tokens at once.

---

### "Theme missing 'default' variant for component"

```
Error: Theme missing 'default' variant for component 'card'.
```

**Cause:** The `components.card.variants` object exists but does not include a `default` entry. Every component token config must have at least a `default` variant.

**Fix:** Add a `default` variant to the component's `variants` map.

---

### "Component variant missing required tokens"

```
Error: Component 'card' variant 'subtle' is missing required tokens: [titleColor, descriptionColor].
Each variant must be a complete token set.
```

**Cause:** A named variant does not include all required token keys. Every variant must be a complete token set — partial overrides are not supported.

**Fix:** Copy the `default` variant and override only what you need:

```typescript
subtle: {
  ...defaultTheme.components.card.variants.default,
  backgroundColor: 'F0F0F0',
  backgroundOpacity: 50,
},
```

---

## Component Errors

### "Unknown component: 'xyz'"

```
Error: Unknown component: 'xyz'. Did you forget to register it?
```

**Cause:** A directive `:::xyz` or TypeScript DSL call references a component that has not been registered with `componentRegistry.define()`.

**Fix:** Make sure the component package is imported before compiling. If you are using `tycoslide-components`, import it in your theme's entry point:

```typescript
import 'tycoslide-components';
```

For a custom component, register it before calling `compileDocument()`:

```typescript
import { componentRegistry } from 'tycoslide';
componentRegistry.define({ name: 'my-component', expand: ... });
```

---

### "Unknown variant for component"

```
Error: Unknown variant 'highlight' for component 'card'. Available: default, flat
```

**Cause:** The `variant="highlight"` attribute references a variant that is not defined in the theme's component token config.

**Fix:** Either add the variant to your theme, or use one of the listed available variants.

---

### "Component requires theme tokens but none were provided"

```
Error: Component 'card' requires theme tokens but none were provided.
Add them to theme.components.card. Required: [padding, cornerRadius, ...]
```

**Cause:** The component was registered with a `tokens` list but the theme has no `components.card` entry. Similar to the validateTheme error but caught at render time.

**Fix:** Same as "Theme missing tokens" above — add the required block to `theme.components`.

---

### "MDAST node type already handled"

```
Error: MDAST node type 'paragraph' already handled by 'document'.
Cannot register 'my-component' for the same type.
```

**Cause:** Two components attempted to register `mdast` handlers for the same MDAST node type (e.g., both claiming to handle bare paragraphs).

**Fix:** Only one component can own each MDAST node type. Remove the conflicting `mdast` registration from the custom component.

---

## Layout Errors

### "Missing 'layout' field in frontmatter"

```
Error: Slide 3: missing 'layout' field in frontmatter
```

**Cause:** A slide's frontmatter block does not include a `layout:` field. Every slide must specify a layout.

**Fix:** Add the `layout:` field to the slide's frontmatter:

```markdown
---
layout: body
title: My Slide
---
```

---

### "Unknown layout"

```
Error: Slide 3: unknown layout 'hero'. Available: title, section, body
```

**Cause:** The `layout:` value does not match any registered layout. The available layouts come from the theme package.

**Fix:** Use one of the layouts listed in the error, or verify that your theme package exports the correct layouts. For `tycoslide-theme-default` the available layouts are `title`, `section`, and `body`.

---

### "Layout params validation failed"

```
Error: Layout 'title' params validation failed:
  - title: Required
```

**Cause:** The slide's frontmatter is missing a required field (like `title`) or contains a value of the wrong type.

**Fix:** Add the missing field to the slide frontmatter. Check the layout's documentation for required parameters.

---

## Overflow and Bounds Errors

These errors appear after layout measurement. Use `tycoslide build deck.md --force` to write the PPTX anyway and inspect visually, or `--debug <dir>` to write HTML debug files.

### "Content extends beyond slide bounds"

```
Slide 4 (layout: body, title: Key Points): Content extends beyond slide bounds:
  text at (0.50, 0.42) overflows 0.23" bottom
```

**Cause:** The content on this slide is too tall or wide to fit within the slide boundaries after layout. Common causes: too much text, font size too large, too many items in a column.

**Fix:**
- Reduce the amount of content on the slide
- Break the content across multiple slides
- Reduce font size in the theme's text styles
- Use `SIZE.HUG` instead of `SIZE.FILL` on containers that should shrink to fit
- Use `--force` to write the PPTX anyway and inspect which element overflows

---

### "Unintentional content overlap detected"

```
Slide 2 (layout: body, title: Overview): Unintentional content overlap detected:
  text[0] overlaps text[1] by 0.50"x0.12" in container
```

**Cause:** Two sibling elements in a `row` or `column` container overlap each other. This usually indicates a layout measurement discrepancy.

**Fix:** This is typically caused by elements that are too large for their container. Use `SIZE.FILL` on children to distribute space evenly, or reduce content size. Use `--debug <dir>` to view the HTML layout and identify which elements are colliding.

---

## Markdown Parsing Errors

### "Invalid YAML in slide frontmatter"

```
Error: Invalid YAML in slide 2 frontmatter:
layout: body
title: My Slide: with a colon
```

**Cause:** The frontmatter YAML is malformed. Common causes: unquoted strings containing colons, tabs instead of spaces for indentation.

**Fix:** Quote strings that contain special YAML characters:

```yaml
---
layout: body
title: "My Slide: with a colon"
---
```

---

## Debug Tools

### Verbose logging

Enable verbose build logging with the `--debug` flag:

```bash
tycoslide build deck.md --debug ./debug-output
```

This writes HTML files showing the measured layout for each slide, plus enables detailed logging.

### Force output despite errors

To write the PPTX even when layout validation fails:

```bash
tycoslide build deck.md --force
```

Use this to inspect the output visually and identify which slide and element is causing the problem. The exit code will still be non-zero.

### Theme validation

Validate your theme's tokens against all registered components before building:

```typescript
import { componentRegistry } from 'tycoslide';
import { theme } from './my-theme';

componentRegistry.validateTheme(theme); // throws on first missing token
```

Run this in a test or a small script to catch all missing token issues at once.
