// Default Theme Layouts
// 11 layouts covering universal presentation patterns.
// Naming convention: kebab-case (matching SlideDev).

import type {
  CardTokens,
  ImageTokens,
  LabelTokens,
  LineTokens,
  ListTokens,
  QuoteTokens,
  ShapeTokens,
  TextTokens,
} from "@tycoslide/components";
import {
  Component,
  cardComponent,
  column,
  grid,
  image,
  imageComponent,
  label,
  labelComponent,
  line,
  row,
  shape,
  stack,
  text,
  textComponent,
} from "@tycoslide/components";
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
  schema,
  token,
  VALIGN,
  type VerticalAlignment,
} from "@tycoslide/core";
import { type DefaultMasterTokens, MASTER, type MinimalMasterTokens } from "./master.js";

// ============================================
// COMPOSITION PRIMITIVES
// ============================================

interface HeaderTokens {
  title: LabelTokens;
  eyebrow: LabelTokens;
  headerSpacing: number;
}

/** Title header block with optional eyebrow */
export function headerBlock(title: string, tokens: HeaderTokens, eyebrow?: string): SlideNode {
  if (eyebrow) {
    return column({ spacing: tokens.headerSpacing }, label(eyebrow, tokens.eyebrow), label(title, tokens.title));
  }
  return label(title, tokens.title);
}

/** Wrap content in the default master (footer chrome + content bounds) */
export function masteredSlide(masterTokens: DefaultMasterTokens, ...content: SlideNode[]): Slide {
  return {
    masterName: MASTER.DEFAULT,
    masterTokens,
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
  master: token.required<MinimalMasterTokens>(),
  vAlign: token.required<VerticalAlignment>(),
  hAlign: token.required<HorizontalAlignment>(),
  spacing: token.required<number>(),
  image: token.required<ImageTokens>(),
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
      masterName: MASTER.MINIMAL,
      masterTokens: tokens.master,
      content: imagePath
        ? row({ spacing: 0, vAlign: tokens.vAlign, height: SIZE.FILL }, textBlock, image(imagePath, tokens.image))
        : textBlock,
    };
  },
});

// --- section ---

export const sectionLayoutTokens = token.shape({
  title: token.required<LabelTokens>(),
  master: token.required<MinimalMasterTokens>(),
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
    masterName: MASTER.MINIMAL,
    masterTokens: tokens.master,
    content: column(
      { spacing: 0, vAlign: tokens.vAlign, hAlign: tokens.hAlign, height: SIZE.FILL },
      label(title, tokens.title),
    ),
  }),
});

// --- body ---

export const bodyLayoutTokens = token.shape({
  master: token.required<DefaultMasterTokens>(),
  title: token.required<LabelTokens>(),
  eyebrow: token.required<LabelTokens>(),
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
      tokens.master,
      ...(title ? [headerBlock(title, tokens, eyebrow)] : []),
      column({ height: SIZE.FILL, vAlign: tokens.vAlign, hAlign: tokens.hAlign, spacing: tokens.spacing }, ...body),
    ),
});

// --- stat ---

export const statLayoutTokens = token.shape({
  master: token.required<DefaultMasterTokens>(),
  value: token.required<LabelTokens>(),
  label: token.required<LabelTokens>(),
  caption: token.required<TextTokens>(),
  background: token.optional<ShapeTokens>(),
  backgroundWidth: token.optional<number>(),
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
  render: ({ value, label: labelText, caption }, _slots, tokens: StatLayoutTokens) => {
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

    return masteredSlide(
      tokens.master,
      column({ spacing: 0, height: SIZE.FILL, vAlign: tokens.vAlign, hAlign: tokens.hAlign }, wrapped),
    );
  },
});

// --- quote ---

export const quoteLayoutTokens = token.shape({
  quote: token.required<QuoteTokens>(),
  master: token.required<MinimalMasterTokens>(),
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
  render: ({ quote: quoteText, attribution }, _slots, tokens: QuoteLayoutTokens) => ({
    masterName: MASTER.MINIMAL,
    masterTokens: tokens.master,
    content: column(
      { spacing: 0, height: SIZE.FILL },
      column(
        { height: SIZE.FILL, vAlign: tokens.vAlign, hAlign: tokens.hAlign, spacing: tokens.spacing },
        component(Component.Quote, { quote: quoteText, attribution }, undefined, tokens.quote),
      ),
    ),
  }),
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
    masterName: MASTER.MINIMAL,
    masterTokens: tokens.master,
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
  master: token.required<MinimalMasterTokens>(),
});

export type BlankLayoutTokens = InferTokens<typeof blankLayoutTokens>;

export const blankLayout = defineLayout({
  name: "blank",
  description: "No chrome. Full canvas for custom content.",
  params: {},
  slots: ["body"],
  tokens: blankLayoutTokens,
  render: (_params, { body }, tokens: BlankLayoutTokens) => ({
    masterName: MASTER.MINIMAL,
    masterTokens: tokens.master,
    content: column({ spacing: 0, height: SIZE.FILL }, ...body),
  }),
});

// --- two-column ---

export const twoColumnLayoutTokens = token.shape({
  master: token.required<DefaultMasterTokens>(),
  title: token.required<LabelTokens>(),
  eyebrow: token.required<LabelTokens>(),
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
      tokens.master,
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
  master: token.required<MinimalMasterTokens>(),
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
    masterName: MASTER.MINIMAL,
    masterTokens: tokens.master,
    content: column(
      { height: SIZE.FILL, vAlign: tokens.vAlign, hAlign: tokens.hAlign, spacing: tokens.spacing },
      text(body, tokens.body),
      ...(caption ? [text(caption, tokens.caption)] : []),
    ),
  }),
});

// --- agenda ---

export const agendaLayoutTokens = token.shape({
  master: token.required<DefaultMasterTokens>(),
  title: token.required<LabelTokens>(),
  eyebrow: token.required<LabelTokens>(),
  headerSpacing: token.required<number>(),
  vAlign: token.required<VerticalAlignment>(),
  items: token.required<TextTokens>(),
  divider: token.required<LineTokens>(),
  itemNumber: token.required<LabelTokens>(),
  itemVAlign: token.required<VerticalAlignment>(),
  itemSpacing: token.required<number>(),
  spacing: token.required<number>(),
  image: token.required<ImageTokens>(),
});

export type AgendaLayoutTokens = InferTokens<typeof agendaLayoutTokens>;

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
// | footer                     |
// +----------------------------+
export const agendaLayout = defineLayout({
  name: "agenda",
  description: "Eyebrow, title, and numbered item list with divider lines.",
  params: {
    title: param.required(textComponent.schema),
    eyebrow: param.optional(textComponent.schema),
    items: param.required(schema.array(textComponent.schema)),
    image: param.optional(imageComponent.schema),
  },
  tokens: agendaLayoutTokens,
  render: ({ title, eyebrow, items, image: imageSrc }, _slots, tokens: AgendaLayoutTokens) => {
    const itemRows = items.flatMap((item, i) => [
      ...(i > 0 ? [line(tokens.divider)] : []),
      row(
        { vAlign: tokens.itemVAlign, spacing: tokens.itemSpacing },
        // HUG-width column keeps number from stretching in the row
        column({ spacing: 0, width: SIZE.HUG, vAlign: tokens.itemVAlign }, label(String(i + 1), tokens.itemNumber)),
        text(item, tokens.items),
      ),
    ]);

    const itemsColumn = column(
      { spacing: tokens.spacing, vAlign: tokens.vAlign, height: SIZE.FILL },
      ...itemRows,
    );

    return masteredSlide(
      tokens.master,
      headerBlock(title, tokens, eyebrow),
      imageSrc
        ? row({ spacing: tokens.spacing, height: SIZE.FILL }, itemsColumn, image(imageSrc, tokens.image))
        : itemsColumn,
    );
  },
});

// --- cards ---

export const cardsLayoutTokens = token.shape({
  master: token.required<DefaultMasterTokens>(),
  title: token.required<LabelTokens>(),
  eyebrow: token.required<LabelTokens>(),
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
      tokens.master,
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
  master: token.required<DefaultMasterTokens>(),
  title: token.required<LabelTokens>(),
  eyebrow: token.required<LabelTokens>(),
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
    const colProps = {
      vAlign: tokens.vAlign,
      hAlign: tokens.hAlign,
      spacing: tokens.contentSpacing,
      height: SIZE.FILL,
    };
    const layers: SlideNode[] = [
      row({ spacing: tokens.spacing, height: SIZE.HUG }, column(colProps, ...left), column(colProps, ...right)),
    ];
    if (overlay.length > 0) {
      layers.push(
        column(
          {
            width: tokens.overlaySize,
            height: tokens.overlaySize,
            spacing: 0,
            vAlign: tokens.overlayVAlign,
            hAlign: tokens.overlayHAlign,
          },
          ...overlay,
        ),
      );
    }
    const content = layers.length === 1 ? layers[0] : stack({ height: SIZE.FILL }, ...layers);
    return masteredSlide(
      tokens.master,
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
  master: token.required<DefaultMasterTokens>(),
  title: token.required<LabelTokens>(),
  eyebrow: token.required<LabelTokens>(),
  subtitle: token.optional<LabelTokens>(),
  headerSpacing: token.required<number>(),
  label: token.required<LabelTokens>(),
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
    subtitle: param.optional(textComponent.schema),
  },
  tokens: shapesLayoutTokens,
  render: ({ title, eyebrow, subtitle }, _slots, tokens: ShapesLayoutTokens) => {
    const cell = (t: ShapeTokens, s: (typeof SHAPE)[keyof typeof SHAPE], labelText: string) =>
      column(
        { spacing: tokens.spacing, hAlign: tokens.hAlign, height: SIZE.FILL },
        stack({ height: SIZE.FILL }, shape(t, { shape: s })),
        label(labelText, tokens.label),
      );

    return masteredSlide(
      tokens.master,
      column(
        { vAlign: tokens.vAlign, height: SIZE.FILL, spacing: tokens.spacing },
        ...(title ? [headerBlock(title, tokens, eyebrow)] : []),
        ...(subtitle && tokens.subtitle ? [label(subtitle, tokens.subtitle)] : []),
        row(
          { spacing: tokens.spacing, height: SIZE.FILL },
          cell(tokens.rectangle, SHAPE.RECTANGLE, "Primary\n#7C3AED"),
          cell(tokens.ellipse, SHAPE.ELLIPSE, "Dark\n#1A1A2E"),
          cell(tokens.triangle, SHAPE.TRIANGLE, "Accent\n#10B981"),
          cell(tokens.diamond, SHAPE.DIAMOND, "Surface\n#E2E8F0"),
        ),
      ),
    );
  },
});

// --- lines (demo) ---

export const linesLayoutTokens = token.shape({
  master: token.required<DefaultMasterTokens>(),
  title: token.required<LabelTokens>(),
  eyebrow: token.required<LabelTokens>(),
  headerSpacing: token.required<number>(),
  label: token.required<LabelTokens>(),
  solid: token.required<LineTokens>(),
  dashed: token.required<LineTokens>(),
  dotted: token.required<LineTokens>(),
  vAlign: token.required<VerticalAlignment>(),
  hAlign: token.required<HorizontalAlignment>(),
  spacing: token.required<number>(),
});

export type LinesLayoutTokens = InferTokens<typeof linesLayoutTokens>;

// +----------------------------+
// | eyebrow                    |
// | Title                      |
// |  Solid  ────────────────── |
// |  Dashed ── ── ── ── ── ── |
// |  Dotted ·· ·· ·· ·· ·· ·· |
// +----------------------------+
export const linesLayout = defineLayout({
  name: "lines",
  description: "Demo layout showing all 3 dash types.",
  params: {
    title: param.optional(textComponent.schema),
    eyebrow: param.optional(textComponent.schema),
  },
  tokens: linesLayoutTokens,
  render: ({ title, eyebrow }, _slots, tokens: LinesLayoutTokens) => {
    const sample = (t: LineTokens, labelText: string) =>
      column({ spacing: 0, height: SIZE.FILL, vAlign: VALIGN.BOTTOM }, label(labelText, tokens.label), line(t));

    return masteredSlide(
      tokens.master,
      column(
        { vAlign: tokens.vAlign, height: SIZE.FILL, spacing: tokens.spacing },
        ...(title ? [headerBlock(title, tokens, eyebrow)] : []),
        column(
          { spacing: tokens.spacing, height: SIZE.FILL, vAlign: VALIGN.MIDDLE },
          sample(tokens.solid, "Solid"),
          sample(tokens.dashed, "Dashed"),
          sample(tokens.dotted, "Dotted"),
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
