# Creating Custom Components

Custom components extend tycoslide with new content types. They integrate with the directive syntax in Markdown and the TypeScript DSL, and receive styling tokens from the theme.

## When to Create Custom Components

Create a custom component when:
- You have a repeating content pattern not covered by built-in components
- You want to encapsulate a complex layout into a single named element
- You're building a reusable component library for your organization

## Component Registration

Components are registered using `componentRegistry.define()`:

```typescript
import { componentRegistry, component, schema, CONTENT } from 'tycoslide';
import { text, column } from 'tycoslide-components';

componentRegistry.define({
  name: 'badge',
  params: {
    label: schema.string(),
    variant: schema.string().optional(),
  },
  tokens: ['backgroundColor', 'textColor', 'textStyle'],
  expand: (props, context, tokens) => {
    return text(props.label, {
      style: tokens.textStyle,
      color: tokens.textColor,
    });
  },
});
```

### Overload Patterns

`componentRegistry.define()` accepts five signatures depending on the component's input model:

| Pattern | When to use |
|---------|-------------|
| `{ name, body: schema.string(), expand }` | Single body text, no named params |
| `{ name, body, params: {...}, expand }` | Body text plus additional named attributes |
| `{ name, params: {...}, expand }` | Multiple named attributes, no primary body |
| `{ name, slots: ['children'], expand }` | Body compiled as `ComponentNode[]` (container) |
| `{ name, expand }` | Programmatic use only, no directive support |

## Component Structure

A component definition includes:

```typescript
{
  name: string;           // Unique component name
  params?: SchemaShape;   // Zod schema for directive attributes
  body?: ZodType;         // Schema for body content (e.g., schema.string())
  tokens?: string[];      // Required theme token keys
  slots?: string[];       // Named content slots (for container components)
  expand: Function;       // Expansion to primitives
}
```

## Parameters

Define parameters using the `schema` helper from `tycoslide`:

```typescript
import { schema } from 'tycoslide';

params: {
  title: schema.string(),                          // Required string
  description: schema.string().optional(),         // Optional string
  size: schema.enum(['small', 'medium', 'large']), // Enum
  count: schema.number(),                          // Number
  enabled: schema.boolean(),                       // Boolean
  gap: schema.gap().optional(),                    // GAP enum: none/tight/normal/loose
  align: schema.hAlign().optional(),               // HALIGN enum: left/center/right
  style: schema.textStyle().optional(),            // TEXT_STYLE enum: h1/h2/h3/h4/body/small/eyebrow/footer
}
```

## Token System

### Declaring Tokens

Components declare required theme tokens by name. Tokens are resolved from the theme for the component's active variant:

```typescript
const BADGE_TOKEN = {
  BACKGROUND_COLOR: 'backgroundColor',
  TEXT_COLOR: 'textColor',
  TEXT_STYLE: 'textStyle',
} as const;

componentRegistry.define({
  name: 'badge',
  params: { label: schema.string(), variant: schema.string().optional() },
  tokens: [BADGE_TOKEN.BACKGROUND_COLOR, BADGE_TOKEN.TEXT_COLOR, BADGE_TOKEN.TEXT_STYLE],
  expand: (props, context, tokens) => {
    // tokens.backgroundColor, tokens.textColor, tokens.textStyle
    // are resolved from theme.components.badge.variants[variant]
    return text(props.label, {
      style: tokens.textStyle,
      color: tokens.textColor,
    });
  },
});
```

### Providing Tokens in a Theme

The theme must supply token values for every variant used:

```typescript
// In your theme definition
components: {
  badge: {
    variants: {
      default: {
        backgroundColor: '#0066CC',
        textColor: '#FFFFFF',
        textStyle: 'small',
      },
      success: {
        backgroundColor: '#34A853',
        textColor: '#FFFFFF',
        textStyle: 'small',
      },
    },
  },
}
```

Missing tokens fail the build immediately.

## Content Slots

Components can accept compiled markdown content in named slots:

```typescript
componentRegistry.define({
  name: 'callout',
  params: { title: schema.string() },
  slots: ['children'],
  expand: (props, context, tokens) => {
    return column(
      text(props.title, { style: TEXT_STYLE.H3 }),
      column(...props.children)
    );
  },
});
```

**Usage in Markdown:**

```markdown
:::callout{title="Important"}
This is the body content.

- It can have bullets
- And other markdown
:::
```

The `children` slot receives the compiled content as an array of `ComponentNode[]`.

## Variants

Support multiple visual styles by declaring token-backed variants:

```typescript
expand: (props, context, tokens) => {
  // tokens are resolved for the specified variant automatically
  return shape({
    shape: SHAPE.ROUND_RECT,
    fill: tokens.backgroundColor,
  });
}
```

The `variant` prop is handled automatically. Use `variant="name"` in Markdown or `{ variant: 'name' }` in TypeScript. Themes must provide a complete token set for each variant. Missing tokens for a declared variant cause a build error.

## Complete Example: Metric Component

Display a large metric value with a label and optional change indicator:

```typescript
import { componentRegistry, component, schema, CONTENT } from 'tycoslide';
import { TEXT_STYLE, GAP } from 'tycoslide';
import { column, text } from 'tycoslide-components';

// 1. Define token constants
const METRIC_TOKEN = {
  VALUE_STYLE: 'valueStyle',
  VALUE_COLOR: 'valueColor',
  LABEL_STYLE: 'labelStyle',
  LABEL_COLOR: 'labelColor',
  CHANGE_STYLE: 'changeStyle',
  POSITIVE_COLOR: 'positiveColor',
  NEGATIVE_COLOR: 'negativeColor',
  GAP: 'gap',
} as const;

// 2. Define and register component
componentRegistry.define({
  name: 'metric',
  params: {
    value: schema.string(),
    label: schema.string(),
    change: schema.string().optional(),
    variant: schema.string().optional(),
  },
  tokens: Object.values(METRIC_TOKEN),
  expand: (props, context, tokens) => {
    const elements = [
      text(props.value, { style: tokens.valueStyle, color: tokens.valueColor }),
      text(props.label, { content: CONTENT.PLAIN, style: tokens.labelStyle, color: tokens.labelColor }),
    ];

    if (props.change) {
      const isPositive = props.change.startsWith('+');
      elements.push(
        text(props.change, {
          content: CONTENT.PLAIN,
          style: tokens.changeStyle,
          color: isPositive ? tokens.positiveColor : tokens.negativeColor,
        })
      );
    }

    return column({ gap: tokens.gap }, ...elements);
  },
});

// 3. Export DSL function
export function metric(props: {
  value: string;
  label: string;
  change?: string;
  variant?: string;
}) {
  return component('metric', props);
}
```

**Usage in TypeScript:**
```typescript
metric({ value: "$2.4M", label: "Revenue", change: "+15%" })
```

**Usage in Markdown:**
```markdown
:::metric{value="$2.4M" label="Revenue" change="+15%"}
:::
```

**Theme tokens:**
```typescript
components: {
  metric: {
    variants: {
      default: {
        valueStyle: 'h1',
        valueColor: '#1A1A1A',
        labelStyle: 'small',
        labelColor: '#666666',
        changeStyle: 'small',
        positiveColor: '#34A853',
        negativeColor: '#EA4335',
        gap: 'tight',
      },
    },
  },
}
```

## TypeScript DSL Functions

Components are used programmatically via DSL functions. All built-in DSL functions are exported from `tycoslide-components`:

```typescript
import { text, card, quote, table, image, mermaid } from 'tycoslide-components';
import { row, column, stack, grid } from 'tycoslide-components';
import { line, shape, slideNumber } from 'tycoslide-components';
import { TEXT_STYLE, GAP, SIZE, SHAPE, CONTENT, HALIGN, VALIGN } from 'tycoslide';

// Text — three content modes
text("**Bold** and :blue[highlighted]")                          // CONTENT.RICH (default)
text("ARCHITECTURE", { content: CONTENT.PLAIN, style: TEXT_STYLE.EYEBROW })  // Plain text
text("- First\n- Second", { content: CONTENT.PROSE })           // Full markdown

// Cards
card({ title: "My Card", description: "Description text" })
card({ title: "With Image", image: "./photo.png", height: SIZE.FILL })

// Quote
quote({ quote: "Innovation is key.", attribution: "— CEO" })

// Table (data array + options)
table([
  ['Name', 'Role'],
  ['Alice', 'Engineer'],
], { headerRows: 1 })

// Image
image('./path/to/image.png')
image('asset.logos.company', { alt: 'Company logo' })

// Shape
shape({ shape: SHAPE.ROUND_RECT, fill: '#FF0000', cornerRadius: 0.1 })

// Containers
column({ gap: GAP.NORMAL }, text("Top"), text("Bottom"))
row({ gap: GAP.NORMAL }, card({ title: "Left" }), card({ title: "Right" }))
grid({ columns: 3, gap: GAP.NORMAL }, ...cards)
stack(shape({ shape: SHAPE.RECT, fill: '#000' }), text("Overlaid", { color: '#FFF' }))
```

Custom components export their own DSL functions using `component()` from `tycoslide`:

```typescript
import { component } from 'tycoslide';

export function metric(props: MetricProps) {
  return component('metric', props);
}
```

## Expansion Function

The expansion function transforms component props into a primitive node tree:

```typescript
expand: (props, context, tokens) => {
  return primitiveNode;
}
```

**Parameters:**
- `props` — Validated component properties. Includes `body` if a body schema is defined, or parsed directive body.
- `context` — Expansion context: `{ theme, assets? }`
- `tokens` — Theme token values resolved for the active variant (if component declared tokens)

**Return:** A `SlideNode` — either a primitive node (text, image, shape, container) or another component node for composition. Component nodes are further expanded by the registry.

## Testing Components

Create test presentations to verify rendering:

```typescript
import { Presentation } from 'tycoslide';
import { theme } from 'tycoslide-theme-default';
import { column } from 'tycoslide-components';
import './my-component';  // Register component via side-effect

const pres = new Presentation(theme);

pres.add({
  content: column(
    metric({ value: "$2.4M", label: "Revenue" }),
    metric({ value: "150K", label: "Users", change: "+25%" })
  ),
});

await pres.writeFile("component-test.pptx");
```

Test all prop combinations, all variants, and overflow edge cases. Test with multiple themes if the component will be distributed.

## Publishing Components as npm Packages

**Package structure:**

```json
{
  "name": "tycoslide-components-metrics",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "peerDependencies": {
    "tycoslide": "^1.0.0",
    "tycoslide-components": "^1.0.0"
  }
}
```

**Entry point registers on import:**

```typescript
// index.ts
import { componentRegistry, component } from 'tycoslide';
import { text, column } from 'tycoslide-components';

// Define components (registers as side-effect of import)
componentRegistry.define({ /* ... */ });

// Export DSL functions
export { metric };
```

**Usage in consuming projects:**

```typescript
import 'tycoslide-components-metrics';  // Auto-registers
import { metric } from 'tycoslide-components-metrics';

metric({ value: "$2.4M", label: "Revenue" })
```

Note that the theme used in the consuming project must provide token values for all custom components. Document required token keys in your package's README.

## Best Practices

**Keep components focused:**
- One clear purpose per component
- Minimal required props
- Sensible defaults via optional params

**Use tokens for all styling:**
- Don't hard-code colors, sizes, or fonts
- Request theme tokens for every visual property
- Support variants for contextual styling

**Validate props:**
- Use `schema.*` helpers for all parameter definitions
- Document required vs optional params

**Composition over complexity:**
- Build from primitives (`text`, `shape`, container functions)
- Reuse existing components from `tycoslide-components`
- Keep expansion logic readable

**Test thoroughly:**
- Test all prop combinations
- Test with different themes
- Test all variants
- Check content that might overflow

---

## See Also

- [Components Guide](../guide/components.md) — using built-in components
- [Creating Layouts](./creating-layouts.md)
- [Creating Themes](./creating-themes.md)
