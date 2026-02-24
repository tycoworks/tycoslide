# Component Tokens

For component usage, directive syntax, and examples, see [Components Guide](../guide/components.md).

All components come from `tycoslide-components`, which `tycoslide-theme-default` re-exports. The theme provides token values for each component via `theme.components`.

Container components (`row`, `column`, `stack`, `grid`) and `image`/`mermaid` do not use theme tokens — they are layout primitives or I/O components.

## Available Components

### Content Components (theme tokens apply)

- **text** — Paragraph text, headings, bullets
- **card** — Content card with optional image, title, and description
- **quote** — Blockquote with optional attribution and image
- **table** — Native PowerPoint table with header support
- **line** — Horizontal or vertical rule
- **shape** — Filled/outlined area shape
- **slideNumber** — Slide number element (used in master)

### Container Components (no theme tokens)

- **row** — Horizontal flex container
- **column** — Vertical flex container
- **stack** — Z-order overlay container
- **grid** — Equal-column grid

### I/O Components (no theme tokens)

- **image** — Embedded image
- **mermaid** — Auto-themed Mermaid diagram (renders via mermaid-cli)

---

## text

Renders paragraph text, bullets, and headings. Supports three content modes.

### Theme Tokens (`theme.components.text.variants`)

| Token | Type | Default | Description |
|-------|------|---------|-------------|
| `color` | string (hex) | `1C1B1F` | Text color |
| `bulletColor` | string (hex) | `1C1B1F` | Bullet/number marker color |
| `style` | TextStyleName | `body` | Base text style |
| `lineHeightMultiplier` | number | `1.2` | Line height multiplier |

### Variants

| Variant | color | bulletColor |
|---------|-------|-------------|
| `default` | `1C1B1F` (text) | `1C1B1F` |
| `muted` | `49454F` (textMuted) | `49454F` |
| `accent` | `1976D2` (blue) | `1976D2` |
| `inverse` | `FFFFFF` (background) | `FFFFFF` |

---

## card

Content card with an optional image, title, and description. Renders as a rounded rectangle with configurable background.

### Theme Tokens (`theme.components.card.variants`)

| Token | Type | Default (`default`) | Description |
|-------|------|---------------------|-------------|
| `padding` | number (inches) | `0.25` | Internal padding |
| `cornerRadius` | number (inches) | `0.05` | Corner radius |
| `backgroundColor` | string (hex) | `E7E0EC` | Background fill color |
| `backgroundOpacity` | number (0–100) | `15` | Background fill opacity (%) |
| `borderColor` | string (hex) | `E7E0EC` | Border color |
| `borderWidth` | number (points) | `0.75` | Border width |
| `titleStyle` | TextStyleName | `h4` | Title text style |
| `titleColor` | string (hex) | `1C1B1F` | Title text color |
| `descriptionStyle` | TextStyleName | `small` | Description text style |
| `descriptionColor` | string (hex) | `49454F` | Description text color |
| `gap` | GapSize | `tight` | Gap between image/title/description |
| `textGap` | GapSize | `tight` | Gap between title and description |
| `hAlign` | HorizontalAlignment | `center` | Content horizontal alignment |
| `vAlign` | VerticalAlignment | `top` | Content vertical alignment |

### Variants

| Variant | Background | Border |
|---------|------------|--------|
| `default` | `E7E0EC` at 15% opacity | `E7E0EC`, 0.75pt |
| `flat` | transparent (opacity 0) | none (width 0) |

---

## quote

Blockquote with optional attribution line and optional image/logo. Same background structure as card.

### Theme Tokens (`theme.components.quote.variants`)

| Token | Type | Default | Description |
|-------|------|---------|-------------|
| `padding` | number (inches) | `0.5` | Internal padding (2x spacing.padding) |
| `cornerRadius` | number (inches) | `0.05` | Corner radius |
| `backgroundColor` | string (hex) | `E7E0EC` | Background fill color |
| `backgroundOpacity` | number (0–100) | `15` | Background fill opacity (%) |
| `borderColor` | string (hex) | `E7E0EC` | Border color |
| `borderWidth` | number (points) | `0.75` | Border width |
| `quoteStyle` | TextStyleName | `body` | Quote text style |
| `quoteColor` | string (hex) | `1C1B1F` | Quote text color |
| `attributionStyle` | TextStyleName | `small` | Attribution text style |
| `attributionColor` | string (hex) | `49454F` | Attribution text color |
| `attributionHAlign` | HorizontalAlignment | `right` | Attribution horizontal alignment |
| `gap` | GapSize | `normal` | Gap between image, quote, and attribution |
| `hAlign` | HorizontalAlignment | `center` | Content horizontal alignment |
| `vAlign` | VerticalAlignment | `middle` | Content vertical alignment |

### Variants

Only `default` is defined. Add variants in your theme to support multiple styles.

---

## table

Native PowerPoint table. Renders via `slide.addTable()` for accurate borders, cell merging, and text wrapping.

### Theme Tokens (`theme.components.table.variants`)

| Token | Type | Default | Description |
|-------|------|---------|-------------|
| `borderStyle` | BorderStyle | `full` | Border drawing mode |
| `borderColor` | string (hex) | `E7E0EC` | Border color |
| `borderWidth` | number (points) | `0.75` | Border width |
| `headerBackground` | string (hex) | `FFFFFF` | Header row background |
| `headerBackgroundOpacity` | number (0–100) | `0` | Header background opacity |
| `headerTextStyle` | TextStyleName | `body` | Header cell text style |
| `cellBackground` | string (hex) | `FFFFFF` | Data cell background |
| `cellBackgroundOpacity` | number (0–100) | `0` | Data cell background opacity |
| `cellTextStyle` | TextStyleName | `body` | Data cell text style |
| `cellPadding` | number (inches) | `0.0625` | Cell internal padding |
| `hAlign` | HorizontalAlignment | `left` | Default cell horizontal alignment |
| `vAlign` | VerticalAlignment | `middle` | Default cell vertical alignment |

`BorderStyle` values: `full` (all borders), `internal` (internal only), `horizontal`, `vertical`, `none`.

### Variants

Only `default` is defined.

---

## line

A horizontal or vertical rule. Expands to a native PowerPoint line shape.

### Theme Tokens (`theme.components.line.variants`)

| Token | Type | Default | Description |
|-------|------|---------|-------------|
| `color` | string (hex) | `E7E0EC` | Line color |
| `width` | number (points) | `0.75` | Line width |
| `dashType` | DashType | `solid` | Line dash style |

`DashType` values: `solid`, `dash`, `dashDot`, `lgDash`, `lgDashDot`, `sysDash`, `sysDot`.

### Variants

Only `default` is defined.

---

## shape

A filled area shape. Used as backgrounds, decorations, or structural elements.

### Theme Tokens (`theme.components.shape.variants`)

| Token | Type | Default | Description |
|-------|------|---------|-------------|
| `fill` | string (hex) | varies by variant | Fill color |
| `fillOpacity` | number (0–100) | varies | Fill opacity (%) |
| `borderColor` | string (hex) | `FFFFFF` | Border color |
| `borderWidth` | number (points) | `0` | Border width |
| `cornerRadius` | number (inches) | `0` | Corner radius |

### Variants

| Variant | fill | fillOpacity | border |
|---------|------|-------------|--------|
| `default` | `E7E0EC` (secondary) | `100` | none |
| `primary` | `1976D2` (primary) | `100` | none |
| `subtle` | `E7E0EC` (secondary) | `15` (subtleOpacity) | none |
| `outlined` | `FFFFFF` | `0` | `1976D2`, 0.75pt |
| `accent` | `1976D2` (blue) | `100` | none |

---

## slideNumber

Displays the current slide number. Used in the default master slide footer.

### Theme Tokens (`theme.components.slideNumber.variants`)

| Token | Type | Default | Description |
|-------|------|---------|-------------|
| `style` | TextStyleName | `footer` | Text style |
| `color` | string (hex) | `49454F` | Text color |
| `hAlign` | HorizontalAlignment | `right` | Horizontal alignment |

### Variants

Only `default` is defined.
