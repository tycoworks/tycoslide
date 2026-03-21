// Default Theme Layouts
// 11 layouts covering universal presentation patterns.
// Naming convention: kebab-case (matching SlideDev).

import {
  component,
  defineLayout,
  type HorizontalAlignment,
  type InferTokens,
  param,
  SHAPE,
  SIZE,
  type Slide,
  type SlideNode,
  SPACING_MODE,
  VALIGN,
  schema,
  token,
  type VerticalAlignment,
} from "tycoslide";
import type {
  CardTokens,
  LineTokens,
  ListTokens,
  PlainTextTokens,
  QuoteTokens,
  ShapeTokens,
  TextTokens,
} from "tycoslide-components";
import {
  Component,
  cardComponent,
  column,
  grid,
  image,
  imageComponent,
  line,
  plainText,
  row,
  shape,
  stack,
  text,
  textComponent,
} from "tycoslide-components";

// ============================================
// COMPOSITION PRIMITIVES
// ============================================

interface HeaderTokens {
  title: PlainTextTokens;
  eyebrow: PlainTextTokens;
  headerSpacing: number;
}

/** Title header block with optional eyebrow */
export function headerBlock(title: string, tokens: HeaderTokens, eyebrow?: string): SlideNode {
  if (eyebrow) {
    return column(
      { spacing: tokens.headerSpacing },
      plainText(eyebrow, tokens.eyebrow),
      plainText(title, tokens.title),
    );
  }
  return plainText(title, tokens.title);
}

/** Wrap content in the default master (footer chrome + content bounds) */
export function masteredSlide(...content: SlideNode[]): Slide {
  return {
    masterName: "default",
    masterVariant: "default",
    content: column({ spacing: 0, height: SIZE.FILL }, ...content),
  };
}

// ============================================
// FULL-SLIDE LAYOUTS (no master)
// ============================================

// --- title, end ---

export const titleLayoutTokens = token.shape({
  title: token.required<TextTokens>(),
  subtitle: token.required<TextTokens>(),
  masterVariant: token.required<string>(),
  vAlign: token.required<VerticalAlignment>(),
  hAlign: token.required<HorizontalAlignment>(),
  spacing: token.required<number>(),
});

export type TitleLayoutTokens = InferTokens<typeof titleLayoutTokens>;

// +----------------------------+       +------------------+---------+
// |                            |       | TITLE            |         |
// |           TITLE            |  or   | subtitle         |  IMAGE  |
// |          subtitle          |       |                  |         |
// +----------------------------+       +------------------+---------+
export const titleLayout = defineLayout({
  name: "title",
  description: "Opening slide with large title and optional subtitle.",
  params: {
    title: param.required(textComponent.schema),
    subtitle: param.optional(textComponent.schema),
    image: param.optional(imageComponent.schema),
  },
  tokens: titleLayoutTokens,
  render: ({ title, subtitle, image: imagePath }, _slots, tokens: TitleLayoutTokens) => {
    const textBlock = column(
      { vAlign: tokens.vAlign, hAlign: tokens.hAlign, spacing: tokens.spacing, height: SIZE.FILL },
      text(title, tokens.title),
      ...(subtitle ? [text(subtitle, tokens.subtitle)] : []),
    );

    return {
      masterName: "minimal",
      masterVariant: tokens.masterVariant,
      content: imagePath
        ? row({ spacing: 0, vAlign: tokens.vAlign, height: SIZE.FILL }, textBlock, image(imagePath))
        : textBlock,
    };
  },
});

// --- section ---

export const sectionLayoutTokens = token.shape({
  title: token.required<PlainTextTokens>(),
  masterVariant: token.required<string>(),
  vAlign: token.required<VerticalAlignment>(),
  hAlign: token.required<HorizontalAlignment>(),
});

export type SectionLayoutTokens = InferTokens<typeof sectionLayoutTokens>;

// +----------------------------+
// |                            |
// |           TITLE            |
// |                            |
// +----------------------------+
export const sectionLayout = defineLayout({
  name: "section",
  description: "Section divider with centered title.",
  params: { title: param.required(textComponent.schema) },
  tokens: sectionLayoutTokens,
  render: ({ title }, _slots, tokens: SectionLayoutTokens) => ({
    masterName: "minimal",
    masterVariant: tokens.masterVariant,
    content: column(
      { spacing: 0, vAlign: tokens.vAlign, hAlign: tokens.hAlign, height: SIZE.FILL },
      plainText(title, tokens.title),
    ),
  }),
});

// --- body ---

export const bodyLayoutTokens = token.shape({
  title: token.required<PlainTextTokens>(),
  eyebrow: token.required<PlainTextTokens>(),
  text: token.required<TextTokens>(),
  list: token.required<ListTokens>(),
  vAlign: token.required<VerticalAlignment>(),
  hAlign: token.required<HorizontalAlignment>(),
  spacing: token.required<number>(),
  headerSpacing: token.required<number>(),
});

export type BodyLayoutTokens = InferTokens<typeof bodyLayoutTokens>;

// +----------------------------+
// | EYEBROW                    |
// | Title                      |
// |----------------------------|
// | Markdown body...           |
// |                            |
// |                            |
// +----------------------------+
// | footer                     |
// +----------------------------+
export const bodyLayout = defineLayout({
  name: "body",
  description: "Markdown body with optional title. Default layout.",
  params: {
    title: param.optional(textComponent.schema),
    eyebrow: param.optional(textComponent.schema),
  },
  slots: ["body"],
  tokens: bodyLayoutTokens,
  render: ({ title, eyebrow }, { body }, tokens: BodyLayoutTokens) =>
    masteredSlide(
      ...(title ? [headerBlock(title, tokens, eyebrow)] : []),
      column({ height: SIZE.FILL, vAlign: tokens.vAlign, hAlign: tokens.hAlign, spacing: tokens.spacing }, ...body),
    ),
});

// --- stat ---

export const statLayoutTokens = token.shape({
  value: token.required<PlainTextTokens>(),
  label: token.required<PlainTextTokens>(),
  caption: token.required<TextTokens>(),
  surface: token.optional<ShapeTokens>(),
  vAlign: token.required<VerticalAlignment>(),
  hAlign: token.required<HorizontalAlignment>(),
  spacing: token.required<number>(),
  padding: token.required<number>(),
});

export type StatLayoutTokens = InferTokens<typeof statLayoutTokens>;

// +----------------------------+
// |                            |
// |            47%             |
// |       Metric Label         |
// |      optional caption      |
// |                            |
// +----------------------------+
// | footer                     |
// +----------------------------+
export const statLayout = defineLayout({
  name: "stat",
  description: "Big number or key metric with label and optional caption.",
  params: {
    value: param.required(textComponent.schema),
    label: param.required(textComponent.schema),
    caption: param.optional(textComponent.schema),
  },
  tokens: statLayoutTokens,
  render: ({ value, label, caption }, _slots, tokens: StatLayoutTokens) => {
    const content = column(
      {
        vAlign: tokens.vAlign,
        hAlign: tokens.hAlign,
        spacing: tokens.spacing,
        height: SIZE.FILL,
        padding: tokens.padding,
      },
      plainText(value, tokens.value),
      plainText(label, tokens.label),
      ...(caption ? [text(caption, tokens.caption)] : []),
    );

    const surfaced = tokens.surface
      ? stack({ height: SIZE.FILL }, shape(tokens.surface, { shape: SHAPE.RECTANGLE }), content)
      : content;

    return masteredSlide(
      column({ spacing: 0, height: SIZE.FILL, vAlign: tokens.vAlign, hAlign: tokens.hAlign }, surfaced),
    );
  },
});

// --- quote ---

export const quoteLayoutTokens = token.shape({
  quote: token.required<QuoteTokens>(),
  vAlign: token.required<VerticalAlignment>(),
  hAlign: token.required<HorizontalAlignment>(),
  spacing: token.required<number>(),
});

export type QuoteLayoutTokens = InferTokens<typeof quoteLayoutTokens>;

// +----------------------------+
// |                            |
// |  "Quote text here..."      |
// |       -- Attribution       |
// |                            |
// +----------------------------+
// | footer                     |
// +----------------------------+
export const quoteLayout = defineLayout({
  name: "quote",
  description: "Standalone pull quote with left accent bar and optional attribution.",
  params: {
    quote: param.required(textComponent.schema),
    attribution: param.optional(textComponent.schema),
  },
  tokens: quoteLayoutTokens,
  render: ({ quote: quoteText, attribution }, _slots, tokens: QuoteLayoutTokens) =>
    masteredSlide(
      column(
        { height: SIZE.FILL, vAlign: tokens.vAlign, hAlign: tokens.hAlign, spacing: tokens.spacing },
        component(Component.Quote, { quote: quoteText, attribution }, undefined, tokens.quote),
      ),
    ),
});

// --- end ---

// +----------------------------+
// |                            |
// |           TITLE            |
// |          subtitle          |
// |                            |
// +----------------------------+
export const endLayout = defineLayout({
  name: "end",
  description: "Closing slide. Mirrors the title layout.",
  params: {
    title: param.required(textComponent.schema),
    subtitle: param.optional(textComponent.schema),
  },
  tokens: titleLayoutTokens,
  render: ({ title, subtitle }, _slots, tokens: TitleLayoutTokens) => ({
    masterName: "minimal",
    masterVariant: tokens.masterVariant,
    content: column(
      { vAlign: tokens.vAlign, hAlign: tokens.hAlign, spacing: tokens.spacing, height: SIZE.FILL },
      text(title, tokens.title),
      ...(subtitle ? [text(subtitle, tokens.subtitle)] : []),
    ),
  }),
});

// --- blank ---

// +----------------------------+
// |                            |
// |       (raw content)        |
// |                            |
// +----------------------------+
export const blankLayoutTokens = token.shape({
  masterVariant: token.required<string>(),
});

export type BlankLayoutTokens = InferTokens<typeof blankLayoutTokens>;

export const blankLayout = defineLayout({
  name: "blank",
  description: "No chrome. Full canvas for custom content.",
  params: {},
  slots: ["body"],
  tokens: blankLayoutTokens,
  render: (_params, { body }, tokens: BlankLayoutTokens) => ({
    masterName: "minimal",
    masterVariant: tokens.masterVariant,
    content: column({ spacing: 0, height: SIZE.FILL }, ...body),
  }),
});

// --- two-column ---

export const twoColumnLayoutTokens = token.shape({
  title: token.required<PlainTextTokens>(),
  eyebrow: token.required<PlainTextTokens>(),
  text: token.required<TextTokens>(),
  list: token.required<ListTokens>(),
  vAlign: token.required<VerticalAlignment>(),
  hAlign: token.required<HorizontalAlignment>(),
  spacing: token.required<number>(),
  headerSpacing: token.required<number>(),
});

export type TwoColumnLayoutTokens = InferTokens<typeof twoColumnLayoutTokens>;

// +----------------------------+
// | EYEBROW                    |
// | Title                      |
// |----------------------------|
// | ::left::    | ::right::    |
// | Markdown    | Markdown     |
// | content     | content      |
// |             |              |
// +----------------------------+
// | footer                     |
// +----------------------------+
export const twoColumnLayout = defineLayout({
  name: "two-column",
  description: "Two equal markdown columns with optional header.",
  params: {
    title: param.optional(textComponent.schema),
    eyebrow: param.optional(textComponent.schema),
  },
  slots: ["left", "right"],
  tokens: twoColumnLayoutTokens,
  render: ({ title, eyebrow }, { left, right }, tokens: TwoColumnLayoutTokens) => {
    const colProps = { vAlign: tokens.vAlign, hAlign: tokens.hAlign, spacing: tokens.spacing, height: SIZE.FILL };
    return masteredSlide(
      ...(title ? [headerBlock(title, tokens, eyebrow)] : []),
      row({ spacing: tokens.spacing, height: SIZE.HUG }, column(colProps, ...left), column(colProps, ...right)),
    );
  },
});

// --- statement ---

export const statementLayoutTokens = token.shape({
  body: token.required<TextTokens>(),
  caption: token.required<TextTokens>(),
  vAlign: token.required<VerticalAlignment>(),
  hAlign: token.required<HorizontalAlignment>(),
  spacing: token.required<number>(),
  masterVariant: token.required<string>(),
});

export type StatementLayoutTokens = InferTokens<typeof statementLayoutTokens>;

// +----------------------------+
// |                            |
// |   Body text, centered      |
// |      optional caption      |
// |                            |
// +----------------------------+
export const statementLayout = defineLayout({
  name: "statement",
  description: "Centered body text with optional caption. Use for value props and big statements.",
  params: {
    body: param.required(textComponent.schema),
    caption: param.optional(textComponent.schema),
  },
  tokens: statementLayoutTokens,
  render: ({ body, caption }, _slots, tokens: StatementLayoutTokens) => ({
    masterName: "minimal",
    masterVariant: tokens.masterVariant,
    content: column(
      { height: SIZE.FILL, vAlign: tokens.vAlign, hAlign: tokens.hAlign, spacing: tokens.spacing },
      text(body, tokens.body),
      ...(caption ? [text(caption, tokens.caption)] : []),
    ),
  }),
});

// --- agenda ---

export const agendaLayoutTokens = token.shape({
  title: token.required<PlainTextTokens>(),
  eyebrow: token.required<PlainTextTokens>(),
  headerSpacing: token.required<number>(),
  vAlign: token.required<VerticalAlignment>(),
  hAlign: token.required<HorizontalAlignment>(),
  items: token.required<TextTokens>(),
  itemBackground: token.required<ShapeTokens>(),
  itemNumber: token.required<PlainTextTokens>(),
  itemPadding: token.required<number>(),
  itemVAlign: token.required<VerticalAlignment>(),
  itemSpacing: token.required<number>(),
  gridColumns: token.required<number>(),
  gridSpacing: token.required<number>(),
});

export type AgendaLayoutTokens = InferTokens<typeof agendaLayoutTokens>;

// +----------------------------+
// | EYEBROW                    |
// | Title                      |
// |----------------------------|
// | +--1 Item--+ +--2 Item--+  |
// | +--3 Item--+ +--4 Item--+  |
// +----------------------------+
// | footer                     |
// +----------------------------+
export const agendaLayout = defineLayout({
  name: "agenda",
  description: "Eyebrow, title, and numbered card grid.",
  params: {
    title: param.required(textComponent.schema),
    eyebrow: param.optional(textComponent.schema),
    items: param.required(schema.array(textComponent.schema)),
  },
  tokens: agendaLayoutTokens,
  render: ({ title, eyebrow, items }, _slots, tokens: AgendaLayoutTokens) => {
    // Inline card component: stack composes a rounded-rect background shape
    // with padded content in a single node. Layouts can build ad-hoc visuals
    // by composing primitives directly — not everything needs to be a registered component.
    const itemCards = items.map((item, i) =>
      stack(
        shape(tokens.itemBackground, { shape: SHAPE.RECTANGLE }),
        row(
          { padding: tokens.itemPadding, vAlign: tokens.itemVAlign, spacing: tokens.itemSpacing },
          column(
            { spacing: 0, width: SIZE.HUG, vAlign: tokens.itemVAlign },
            plainText(String(i + 1), tokens.itemNumber),
          ),
          text(item, tokens.items),
        ),
      ),
    );
    return masteredSlide(
      headerBlock(title, tokens, eyebrow),
      column(
        { spacing: 0, height: SIZE.FILL, vAlign: tokens.vAlign, hAlign: tokens.hAlign },
        grid({ columns: tokens.gridColumns, spacing: tokens.gridSpacing, height: SIZE.HUG }, ...itemCards),
      ),
    );
  },
});

// --- cards ---

export const cardsLayoutTokens = token.shape({
  title: token.required<PlainTextTokens>(),
  eyebrow: token.required<PlainTextTokens>(),
  headerSpacing: token.required<number>(),
  intro: token.required<TextTokens>(),
  caption: token.required<TextTokens>(),
  card: token.required<CardTokens>(),
  vAlign: token.required<VerticalAlignment>(),
  hAlign: token.required<HorizontalAlignment>(),
  spacing: token.required<number>(),
  gridSpacing: token.required<number>(),
});

export type CardsLayoutTokens = InferTokens<typeof cardsLayoutTokens>;

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
// | footer                     |
// +----------------------------+
export const cardsLayout = defineLayout({
  name: "cards",
  description: "Card grid with intro text and optional caption.",
  params: {
    title: param.required(textComponent.schema),
    eyebrow: param.optional(textComponent.schema),
    intro: param.optional(textComponent.schema),
    cards: param.required(schema.array(cardComponent.paramsSchema!)),
    caption: param.optional(textComponent.schema),
  },
  tokens: cardsLayoutTokens,
  render: ({ title, eyebrow, intro, cards: cardItems, caption }, _slots, tokens: CardsLayoutTokens) => {
    const built = cardItems.map((c) =>
      component(Component.Card, c as unknown as Record<string, unknown>, undefined, tokens.card),
    );
    const perRow = built.length <= 2 ? built.length : built.length === 4 ? 2 : built.length >= 7 ? 4 : 3;
    return masteredSlide(
      headerBlock(title, tokens, eyebrow),
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
});

// --- transform ---

export const transformLayoutTokens = token.shape({
  title: token.required<PlainTextTokens>(),
  eyebrow: token.required<PlainTextTokens>(),
  text: token.required<TextTokens>(),
  list: token.required<ListTokens>(),
  vAlign: token.required<VerticalAlignment>(),
  hAlign: token.required<HorizontalAlignment>(),
  overlayVAlign: token.required<VerticalAlignment>(),
  overlayHAlign: token.required<HorizontalAlignment>(),
  spacing: token.required<number>(),
  contentSpacing: token.required<number>(),
  headerSpacing: token.required<number>(),
  overlaySize: token.required<number>(),
});

export type TransformLayoutTokens = InferTokens<typeof transformLayoutTokens>;

// +----------------------------+
// | ::left::     ::right::     |
// |       ::overlay::          |
// +----------------------------+
export const transformLayout = defineLayout({
  name: "transform",
  description: "Side-by-side comparison layout with optional overlay.",
  params: {
    title: param.optional(textComponent.schema),
    eyebrow: param.optional(textComponent.schema),
  },
  slots: ["left", "right", "overlay"],
  tokens: transformLayoutTokens,
  render: ({ title, eyebrow }, { left, right, overlay }, tokens: TransformLayoutTokens) => {
    const colProps = { vAlign: tokens.vAlign, hAlign: tokens.hAlign, spacing: tokens.contentSpacing, height: SIZE.FILL };
    const layers: SlideNode[] = [
      row(
        { spacing: tokens.spacing, height: SIZE.HUG },
        column(colProps, ...left),
        column(colProps, ...right),
      ),
    ];
    if (overlay.length > 0) {
      layers.push(
        column({ width: tokens.overlaySize, height: tokens.overlaySize, spacing: 0, vAlign: tokens.overlayVAlign, hAlign: tokens.overlayHAlign },
          ...overlay,
        ),
      );
    }
    const content = layers.length === 1 ? layers[0] : stack({ height: SIZE.HUG }, ...layers);
    return masteredSlide(
      column(
        { vAlign: tokens.vAlign, height: SIZE.FILL, spacing: tokens.spacing },
        ...(title ? [headerBlock(title, tokens, eyebrow)] : []),
        content,
      ),
    );
  },
});

// --- shapes (demo) ---

export const shapesLayoutTokens = token.shape({
  title: token.required<PlainTextTokens>(),
  eyebrow: token.required<PlainTextTokens>(),
  headerSpacing: token.required<number>(),
  label: token.required<PlainTextTokens>(),
  rectangle: token.required<ShapeTokens>(),
  ellipse: token.required<ShapeTokens>(),
  triangle: token.required<ShapeTokens>(),
  diamond: token.required<ShapeTokens>(),
  vAlign: token.required<VerticalAlignment>(),
  hAlign: token.required<HorizontalAlignment>(),
  spacing: token.required<number>(),
});

export type ShapesLayoutTokens = InferTokens<typeof shapesLayoutTokens>;

// +----------------------------+
// | eyebrow                    |
// | Title                      |
// | [rect] [ellipse] [tri] [◇] |
// |  label   label   label lbl |
// +----------------------------+
export const shapesLayout = defineLayout({
  name: "shapes",
  description: "Demo layout showing all 4 shape primitives with varied properties.",
  params: {
    title: param.optional(textComponent.schema),
    eyebrow: param.optional(textComponent.schema),
  },
  tokens: shapesLayoutTokens,
  render: ({ title, eyebrow }, _slots, tokens: ShapesLayoutTokens) => {
    const cell = (t: ShapeTokens, s: (typeof SHAPE)[keyof typeof SHAPE], label: string) =>
      column(
        { spacing: tokens.spacing, hAlign: tokens.hAlign, height: SIZE.FILL },
        stack({ height: SIZE.FILL }, shape(t, { shape: s })),
        plainText(label, tokens.label),
      );

    return masteredSlide(
      column(
        { vAlign: tokens.vAlign, height: SIZE.FILL, spacing: tokens.spacing },
        ...(title ? [headerBlock(title, tokens, eyebrow)] : []),
        row(
          { spacing: tokens.spacing, height: SIZE.FILL },
          cell(tokens.rectangle, SHAPE.RECTANGLE, "Rectangle"),
          cell(tokens.ellipse, SHAPE.ELLIPSE, "Ellipse"),
          cell(tokens.triangle, SHAPE.TRIANGLE, "Triangle"),
          cell(tokens.diamond, SHAPE.DIAMOND, "Diamond"),
        ),
      ),
    );
  },
});

// --- lines (demo) ---

export const linesLayoutTokens = token.shape({
  title: token.required<PlainTextTokens>(),
  eyebrow: token.required<PlainTextTokens>(),
  headerSpacing: token.required<number>(),
  label: token.required<PlainTextTokens>(),
  solid: token.required<LineTokens>(),
  dash: token.required<LineTokens>(),
  lgDash: token.required<LineTokens>(),
  dashDot: token.required<LineTokens>(),
  lgDashDot: token.required<LineTokens>(),
  sysDot: token.required<LineTokens>(),
  sysDash: token.required<LineTokens>(),
  vAlign: token.required<VerticalAlignment>(),
  hAlign: token.required<HorizontalAlignment>(),
  spacing: token.required<number>(),
});

export type LinesLayoutTokens = InferTokens<typeof linesLayoutTokens>;

// +----------------------------+
// | eyebrow                    |
// | Title                      |
// |  Solid  ────────────────── |
// |  Dash   ── ── ── ── ── ── |
// |  ...                       |
// +----------------------------+
export const linesLayout = defineLayout({
  name: "lines",
  description: "Demo layout showing all 7 dash types.",
  params: {
    title: param.optional(textComponent.schema),
    eyebrow: param.optional(textComponent.schema),
  },
  tokens: linesLayoutTokens,
  render: ({ title, eyebrow }, _slots, tokens: LinesLayoutTokens) => {
    const sample = (t: LineTokens, label: string) =>
      column({ spacing: 0, height: SIZE.FILL, vAlign: VALIGN.BOTTOM }, plainText(label, tokens.label), line(t));

    return masteredSlide(
      column(
        { vAlign: tokens.vAlign, height: SIZE.FILL, spacing: tokens.spacing },
        ...(title ? [headerBlock(title, tokens, eyebrow)] : []),
        column(
          { spacing: tokens.spacing, height: SIZE.FILL, vAlign: VALIGN.MIDDLE },
          sample(tokens.solid, "Solid"),
          sample(tokens.dash, "Dash"),
          sample(tokens.lgDash, "Long Dash"),
          sample(tokens.dashDot, "Dash Dot"),
          sample(tokens.lgDashDot, "Long Dash Dot"),
          sample(tokens.sysDot, "Dot"),
          sample(tokens.sysDash, "Short Dash"),
        ),
      ),
    );
  },
});

// ============================================
// ALL LAYOUTS
// ============================================

export const allLayouts = [
  titleLayout,
  sectionLayout,
  bodyLayout,
  statLayout,
  quoteLayout,
  endLayout,
  blankLayout,
  twoColumnLayout,
  statementLayout,
  agendaLayout,
  cardsLayout,
  transformLayout,
  shapesLayout,
  linesLayout,
];
