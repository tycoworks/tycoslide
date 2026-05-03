// Default Theme Layouts
// 14 reusable structural blueprints for slide templates.
// Each layout is a self-contained section: token interface, ASCII diagram, Layout object.
// Templates are defined per-format in theme.ts using defineTemplate() with these layouts.

import {
  component,
  type HorizontalAlignment,
  param,
  type ScalarShape,
  SHAPE,
  SIZE,
  type SlideNode,
  SPACING_MODE,
  schema,
  VALIGN,
  type VerticalAlignment,
} from "@tycoslide/core";
import type {
  CardTokens,
  ImageTokens,
  LabelTokens,
  Layout,
  LineTokens,
  ListTokens,
  QuoteTokens,
  ShapeTokens,
  TextTokens,
} from "@tycoslide/sdk";
import {
  Component,
  cardComponent,
  column,
  grid,
  image,
  imageComponent,
  label,
  line,
  row,
  shape,
  stack,
  text,
  textComponent,
} from "@tycoslide/sdk";

// ============================================
// COMPOSITION PRIMITIVES
// ============================================

interface HeaderTokens {
  title: LabelTokens;
  eyebrow: LabelTokens;
  headerSpacing: number;
}

/** Title header block with optional eyebrow */
function headerBlock(title: string, tokens: HeaderTokens, eyebrow?: string): SlideNode {
  if (eyebrow) {
    return column({ spacing: tokens.headerSpacing }, label(eyebrow, tokens.eyebrow), label(title, tokens.title));
  }
  return label(title, tokens.title);
}

// ============================================
// LAYOUTS
// ============================================

// --- title, end ---

export interface TitleLayoutTokens {
  title: TextTokens;
  subtitle: TextTokens;
  vAlign: VerticalAlignment;
  hAlign: HorizontalAlignment;
  spacing: number;
  image: ImageTokens;
}

// +----------------------------+       +------------------+---------+
// |                            |       | TITLE            |         |
// |           TITLE            |  or   | subtitle         |  IMAGE  |
// |          subtitle          |       |                  |         |
// +----------------------------+       +------------------+---------+
export const title: Layout<TitleLayoutTokens> = {
  params: {
    title: param.required(textComponent.schema),
    subtitle: param.optional(textComponent.schema),
    image: param.optional(imageComponent.schema),
  },
  render: (params, _slots, tokens) => {
    const titleText = params.title as string;
    const subtitle = params.subtitle as string | undefined;
    const imagePath = params.image as string | undefined;
    const textBlock = column(
      { vAlign: tokens.vAlign, hAlign: tokens.hAlign, spacing: tokens.spacing, height: SIZE.FILL },
      text(titleText, tokens.title),
      ...(subtitle ? [text(subtitle, tokens.subtitle)] : []),
    );

    return imagePath
      ? row({ spacing: 0, vAlign: tokens.vAlign, height: SIZE.FILL }, textBlock, image(imagePath, tokens.image))
      : textBlock;
  },
};

// +----------------------------+
// |                            |
// |           TITLE            |
// |          subtitle          |
// |                            |
// +----------------------------+
export const end: Layout<TitleLayoutTokens> = {
  params: {
    title: param.required(textComponent.schema),
    subtitle: param.optional(textComponent.schema),
  },
  render: (params, _slots, tokens) => {
    const titleText = params.title as string;
    const subtitle = params.subtitle as string | undefined;
    return column(
      { vAlign: tokens.vAlign, hAlign: tokens.hAlign, spacing: tokens.spacing, height: SIZE.FILL },
      text(titleText, tokens.title),
      ...(subtitle ? [text(subtitle, tokens.subtitle)] : []),
    );
  },
};

// --- section ---

export interface SectionLayoutTokens {
  title: LabelTokens;
  vAlign: VerticalAlignment;
  hAlign: HorizontalAlignment;
}

// +----------------------------+
// |                            |
// |           TITLE            |
// |                            |
// +----------------------------+
export const section: Layout<SectionLayoutTokens> = {
  params: {
    title: param.required(textComponent.schema),
  },
  render: (params, _slots, tokens) =>
    column(
      { spacing: 0, vAlign: tokens.vAlign, hAlign: tokens.hAlign, height: SIZE.FILL },
      label(params.title as string, tokens.title),
    ),
};

// --- body ---

export interface BodyLayoutTokens {
  title: LabelTokens;
  eyebrow: LabelTokens;
  text: TextTokens;
  list: ListTokens;
  vAlign: VerticalAlignment;
  hAlign: HorizontalAlignment;
  spacing: number;
  headerSpacing: number;
}

// +----------------------------+
// | EYEBROW                    |
// | Title                      |
// |----------------------------|
// | Markdown body...           |
// |                            |
// |                            |
// +----------------------------+
export const body: Layout<BodyLayoutTokens, ScalarShape, readonly ["body"]> = {
  params: {
    title: param.optional(textComponent.schema),
    eyebrow: param.optional(textComponent.schema),
  },
  slots: ["body"] as const,
  render: (params, { body: bodySlot }, tokens) => {
    const titleText = params.title as string | undefined;
    const eyebrow = params.eyebrow as string | undefined;
    return column(
      { height: SIZE.FILL, vAlign: tokens.vAlign, hAlign: tokens.hAlign, spacing: tokens.spacing },
      ...(titleText ? [headerBlock(titleText, tokens, eyebrow)] : []),
      ...bodySlot,
    );
  },
};

// --- stat ---

export interface StatLayoutTokens {
  value: LabelTokens;
  label: LabelTokens;
  caption: TextTokens;
  background?: ShapeTokens;
  backgroundWidth?: number;
  vAlign: VerticalAlignment;
  hAlign: HorizontalAlignment;
  spacing: number;
  padding: number;
}

// +----------------------------+
// |                            |
// |            47%             |
// |       Metric Label         |
// |      optional caption      |
// |                            |
// +----------------------------+
export const stat: Layout<StatLayoutTokens> = {
  params: {
    value: param.required(textComponent.schema),
    label: param.required(textComponent.schema),
    caption: param.optional(textComponent.schema),
  },
  render: (params, _slots, tokens) => {
    const value = params.value as string;
    const labelText = params.label as string;
    const caption = params.caption as string | undefined;
    const content = column(
      {
        vAlign: tokens.vAlign,
        hAlign: tokens.hAlign,
        spacing: tokens.spacing,
        height: SIZE.FILL,
        padding: tokens.padding,
      },
      label(value, tokens.value),
      label(labelText, tokens.label),
      ...(caption ? [text(caption, tokens.caption)] : []),
    );

    const wrapProps = {
      height: SIZE.FILL,
      ...(tokens.backgroundWidth != null ? { width: tokens.backgroundWidth } : {}),
    };
    const wrapped = tokens.background
      ? stack(wrapProps, shape(tokens.background, { shape: SHAPE.RECTANGLE }), content)
      : content;

    return column({ spacing: 0, height: SIZE.FILL, vAlign: tokens.vAlign, hAlign: tokens.hAlign }, wrapped);
  },
};

// --- quote ---

export interface QuoteLayoutTokens {
  quote: QuoteTokens;
  vAlign: VerticalAlignment;
  hAlign: HorizontalAlignment;
  spacing: number;
}

// +----------------------------+
// |                            |
// |  "Quote text here..."      |
// |       -- Attribution       |
// |                            |
// +----------------------------+
export const quote: Layout<QuoteLayoutTokens> = {
  params: {
    quote: param.required(textComponent.schema),
    attribution: param.optional(textComponent.schema),
  },
  render: (params, _slots, tokens) => {
    const quoteText = params.quote as string;
    const attribution = params.attribution as string | undefined;
    return column(
      { spacing: 0, height: SIZE.FILL },
      column(
        { height: SIZE.FILL, vAlign: tokens.vAlign, hAlign: tokens.hAlign, spacing: tokens.spacing },
        component(Component.Quote, { quote: quoteText, attribution }, undefined, tokens.quote),
      ),
    );
  },
};

// --- blank ---

// biome-ignore lint/suspicious/noEmptyInterface: consistent with other layout token interfaces
export interface BlankLayoutTokens {}

// +----------------------------+
// |                            |
// |       (raw content)        |
// |                            |
// +----------------------------+
export const blank: Layout<BlankLayoutTokens, ScalarShape, readonly ["body"]> = {
  params: {},
  slots: ["body"] as const,
  render: (_params, { body: bodySlot }, _tokens) => column({ spacing: 0, height: SIZE.FILL }, ...bodySlot),
};

// --- two-column ---

export interface TwoColumnLayoutTokens {
  title: LabelTokens;
  eyebrow: LabelTokens;
  text: TextTokens;
  list: ListTokens;
  vAlign: VerticalAlignment;
  hAlign: HorizontalAlignment;
  spacing: number;
  headerSpacing: number;
}

// +----------------------------+
// | EYEBROW                    |
// | Title                      |
// |----------------------------|
// | ::left::    | ::right::    |
// | Markdown    | Markdown     |
// | content     | content      |
// |             |              |
// +----------------------------+
export const twoColumn: Layout<TwoColumnLayoutTokens, ScalarShape, readonly ["left", "right"]> = {
  params: {
    title: param.optional(textComponent.schema),
    eyebrow: param.optional(textComponent.schema),
  },
  slots: ["left", "right"] as const,
  render: (params, slots, tokens) => {
    const titleText = params.title as string | undefined;
    const eyebrow = params.eyebrow as string | undefined;
    const colProps = { vAlign: tokens.vAlign, hAlign: tokens.hAlign, spacing: tokens.spacing, height: SIZE.FILL };
    return column(
      { spacing: 0, height: SIZE.FILL },
      ...(titleText ? [headerBlock(titleText, tokens, eyebrow)] : []),
      row(
        { spacing: tokens.spacing, height: SIZE.HUG },
        column(colProps, ...slots.left),
        column(colProps, ...slots.right),
      ),
    );
  },
};

// --- statement ---

export interface StatementLayoutTokens {
  body: TextTokens;
  caption: TextTokens;
  vAlign: VerticalAlignment;
  hAlign: HorizontalAlignment;
  spacing: number;
}

// +----------------------------+
// |                            |
// |   Body text, centered      |
// |      optional caption      |
// |                            |
// +----------------------------+
export const statement: Layout<StatementLayoutTokens> = {
  params: {
    body: param.required(textComponent.schema),
    caption: param.optional(textComponent.schema),
  },
  render: (params, _slots, tokens) => {
    const bodyText = params.body as string;
    const caption = params.caption as string | undefined;
    return column(
      { height: SIZE.FILL, vAlign: tokens.vAlign, hAlign: tokens.hAlign, spacing: tokens.spacing },
      text(bodyText, tokens.body),
      ...(caption ? [text(caption, tokens.caption)] : []),
    );
  },
};

// --- agenda ---

export interface AgendaLayoutTokens {
  title: LabelTokens;
  eyebrow: LabelTokens;
  headerSpacing: number;
  vAlign: VerticalAlignment;
  items: TextTokens;
  divider: LineTokens;
  itemNumber: LabelTokens;
  itemVAlign: VerticalAlignment;
  itemSpacing: number;
  spacing: number;
  image: ImageTokens;
}

// +----------------------------+
// | EYEBROW                    |
// | Title                      |
// |----------------------------|
// |  1  Item        |          |
// |  ────────────── |  IMAGE   |
// |  2  Item        |          |
// |  ────────────── |          |
// |  3  Item        |          |
// +----------------------------+
export const agenda: Layout<AgendaLayoutTokens> = {
  params: {
    title: param.required(textComponent.schema),
    eyebrow: param.optional(textComponent.schema),
    items: param.required(schema.array(textComponent.schema)),
    image: param.optional(imageComponent.schema),
  },
  render: (params, _slots, tokens) => {
    const titleText = params.title as string;
    const eyebrow = params.eyebrow as string | undefined;
    const items = params.items as string[];
    const imageSrc = params.image as string | undefined;
    const itemRows = items.flatMap((item: string, i: number) => [
      ...(i > 0 ? [line(tokens.divider)] : []),
      row(
        { vAlign: tokens.itemVAlign, spacing: tokens.itemSpacing },
        column({ spacing: 0, width: SIZE.HUG, vAlign: tokens.itemVAlign }, label(String(i + 1), tokens.itemNumber)),
        text(item, tokens.items),
      ),
    ]);

    const itemsColumn = column({ spacing: tokens.spacing, vAlign: tokens.vAlign, height: SIZE.FILL }, ...itemRows);

    return column(
      { spacing: 0, height: SIZE.FILL },
      headerBlock(titleText, tokens, eyebrow),
      imageSrc
        ? row({ spacing: tokens.spacing, height: SIZE.FILL }, itemsColumn, image(imageSrc, tokens.image))
        : itemsColumn,
    );
  },
};

// --- cards ---

export interface CardsLayoutTokens {
  title: LabelTokens;
  eyebrow: LabelTokens;
  headerSpacing: number;
  intro: TextTokens;
  caption: TextTokens;
  card: CardTokens;
  vAlign: VerticalAlignment;
  hAlign: HorizontalAlignment;
  spacing: number;
  gridSpacing: number;
}

// +----------------------------+
// | EYEBROW                    |
// | Title                      |
// |----------------------------|
// | Intro text                 |
// | +------+ +------+ +------+ |
// | | Card | | Card | | Card | |
// | +------+ +------+ +------+ |
// |      optional caption      |
// +----------------------------+
export const cards: Layout<CardsLayoutTokens> = {
  params: {
    title: param.required(textComponent.schema),
    eyebrow: param.optional(textComponent.schema),
    intro: param.optional(textComponent.schema),
    cards: param.required(schema.array(cardComponent.paramsSchema!)),
    caption: param.optional(textComponent.schema),
  },
  render: (params, _slots, tokens) => {
    const titleText = params.title as string;
    const eyebrow = params.eyebrow as string | undefined;
    const intro = params.intro as string | undefined;
    const cardItems = params.cards as Record<string, unknown>[];
    const caption = params.caption as string | undefined;
    const built = cardItems.map((c) =>
      component(Component.Card, c as unknown as Record<string, unknown>, undefined, tokens.card),
    );
    const perRow = built.length <= 2 ? built.length : built.length === 4 ? 2 : built.length >= 7 ? 4 : 3;
    return column(
      { spacing: 0, height: SIZE.FILL },
      headerBlock(titleText, tokens, eyebrow),
      column(
        {
          height: SIZE.FILL,
          vAlign: tokens.vAlign,
          hAlign: tokens.hAlign,
          spacing: tokens.spacing,
          spacingMode: SPACING_MODE.AROUND,
        },
        ...(intro ? [text(intro, tokens.intro)] : []),
        grid({ columns: perRow, spacing: tokens.gridSpacing }, ...built),
        ...(caption ? [text(caption, tokens.caption)] : []),
      ),
    );
  },
};

// --- transform ---

export interface TransformLayoutTokens {
  title: LabelTokens;
  eyebrow: LabelTokens;
  text: TextTokens;
  list: ListTokens;
  vAlign: VerticalAlignment;
  hAlign: HorizontalAlignment;
  overlayVAlign: VerticalAlignment;
  overlayHAlign: HorizontalAlignment;
  spacing: number;
  contentSpacing: number;
  headerSpacing: number;
  overlaySize: number;
}

// +----------------------------+
// | ::left::     ::right::     |
// |       ::overlay::          |
// +----------------------------+
export const transform: Layout<TransformLayoutTokens, ScalarShape, readonly ["left", "right", "overlay"]> = {
  params: {
    title: param.optional(textComponent.schema),
    eyebrow: param.optional(textComponent.schema),
  },
  slots: ["left", "right", "overlay"] as const,
  render: (params, slots, tokens) => {
    const titleText = params.title as string | undefined;
    const eyebrow = params.eyebrow as string | undefined;
    const colProps = {
      vAlign: tokens.vAlign,
      hAlign: tokens.hAlign,
      spacing: tokens.contentSpacing,
      height: SIZE.FILL,
    };
    const layers: SlideNode[] = [
      row(
        { spacing: tokens.spacing, height: SIZE.HUG },
        column(colProps, ...slots.left),
        column(colProps, ...slots.right),
      ),
    ];
    if (slots.overlay.length > 0) {
      layers.push(
        column(
          {
            width: tokens.overlaySize,
            height: tokens.overlaySize,
            spacing: 0,
            vAlign: tokens.overlayVAlign,
            hAlign: tokens.overlayHAlign,
          },
          ...slots.overlay,
        ),
      );
    }
    const content = layers.length === 1 ? layers[0] : stack({ height: SIZE.FILL }, ...layers);
    return column(
      { vAlign: tokens.vAlign, height: SIZE.FILL, spacing: tokens.spacing },
      ...(titleText ? [headerBlock(titleText, tokens, eyebrow)] : []),
      content,
    );
  },
};

// --- shapes (demo) ---

export interface ShapesLayoutTokens {
  title: LabelTokens;
  eyebrow: LabelTokens;
  subtitle?: LabelTokens;
  headerSpacing: number;
  label: LabelTokens;
  rectangle: ShapeTokens;
  ellipse: ShapeTokens;
  triangle: ShapeTokens;
  diamond: ShapeTokens;
  vAlign: VerticalAlignment;
  hAlign: HorizontalAlignment;
  spacing: number;
}

// +----------------------------+
// | eyebrow                    |
// | Title                      |
// | [rect] [ellipse] [tri] [◇] |
// |  label   label   label lbl |
// +----------------------------+
export const shapes: Layout<ShapesLayoutTokens> = {
  params: {
    title: param.optional(textComponent.schema),
    eyebrow: param.optional(textComponent.schema),
    subtitle: param.optional(textComponent.schema),
  },
  render: (params, _slots, tokens) => {
    const titleText = params.title as string | undefined;
    const eyebrow = params.eyebrow as string | undefined;
    const subtitle = params.subtitle as string | undefined;
    const cell = (t: ShapeTokens, s: (typeof SHAPE)[keyof typeof SHAPE], labelText: string) =>
      column(
        { spacing: tokens.spacing, hAlign: tokens.hAlign, height: SIZE.FILL },
        stack({ height: SIZE.FILL }, shape(t, { shape: s })),
        label(labelText, tokens.label),
      );

    return column(
      { vAlign: tokens.vAlign, height: SIZE.FILL, spacing: tokens.spacing },
      ...(titleText ? [headerBlock(titleText, tokens, eyebrow)] : []),
      ...(subtitle && tokens.subtitle ? [label(subtitle, tokens.subtitle)] : []),
      row(
        { spacing: tokens.spacing, height: SIZE.FILL },
        cell(tokens.rectangle, SHAPE.RECTANGLE, "Primary\n#7C3AED"),
        cell(tokens.ellipse, SHAPE.ELLIPSE, "Dark\n#1A1A2E"),
        cell(tokens.triangle, SHAPE.TRIANGLE, "Accent\n#10B981"),
        cell(tokens.diamond, SHAPE.DIAMOND, "Surface\n#E2E8F0"),
      ),
    );
  },
};

// --- lines (demo) ---

export interface LinesLayoutTokens {
  title: LabelTokens;
  eyebrow: LabelTokens;
  headerSpacing: number;
  label: LabelTokens;
  solid: LineTokens;
  dashed: LineTokens;
  dotted: LineTokens;
  vAlign: VerticalAlignment;
  hAlign: HorizontalAlignment;
  spacing: number;
}

// +----------------------------+
// | eyebrow                    |
// | Title                      |
// |  Solid  ────────────────── |
// |  Dashed ── ── ── ── ── ── |
// |  Dotted ·· ·· ·· ·· ·· ·· |
// +----------------------------+
export const lines: Layout<LinesLayoutTokens> = {
  params: {
    title: param.optional(textComponent.schema),
    eyebrow: param.optional(textComponent.schema),
  },
  render: (params, _slots, tokens) => {
    const titleText = params.title as string | undefined;
    const eyebrow = params.eyebrow as string | undefined;
    const sample = (t: LineTokens, labelText: string) =>
      column({ spacing: 0, height: SIZE.FILL, vAlign: VALIGN.BOTTOM }, label(labelText, tokens.label), line(t));

    return column(
      { vAlign: tokens.vAlign, height: SIZE.FILL, spacing: tokens.spacing },
      ...(titleText ? [headerBlock(titleText, tokens, eyebrow)] : []),
      column(
        { spacing: tokens.spacing, height: SIZE.FILL, vAlign: VALIGN.MIDDLE },
        sample(tokens.solid, "Solid"),
        sample(tokens.dashed, "Dashed"),
        sample(tokens.dotted, "Dotted"),
      ),
    );
  },
};
