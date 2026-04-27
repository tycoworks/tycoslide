// Default Theme Layouts
// 11 layouts covering universal presentation patterns.
// Naming convention: kebab-case (matching SlideDev).

import {
  component,
  defineLayout,
  type HorizontalAlignment,
  param,
  SHAPE,
  SIZE,
  type Slide,
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
import type { MasterRef } from "./master.js";

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

/** Wrap content in a master (chrome + content bounds). Format-agnostic via MasterRef. */
export function masteredSlide(master: MasterRef, ...content: SlideNode[]): Slide {
  return {
    masterName: master.masterName,
    masterTokens: master.tokens,
    content: column({ spacing: 0, height: SIZE.FILL }, ...content),
  };
}

// ============================================
// FULL-SLIDE LAYOUTS (no master)
// ============================================

// --- title, end ---

export interface TitleLayoutTokens {
  title: TextTokens;
  subtitle: TextTokens;
  master: MasterRef;
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
export const titleLayout = defineLayout({
  name: "title",
  description: "Opening slide with large title and optional subtitle.",
  params: {
    title: param.required(textComponent.schema),
    subtitle: param.optional(textComponent.schema),
    image: param.optional(imageComponent.schema),
  },
  render: ({ title, subtitle, image: imagePath }, _slots, tokens: TitleLayoutTokens) => {
    const textBlock = column(
      { vAlign: tokens.vAlign, hAlign: tokens.hAlign, spacing: tokens.spacing, height: SIZE.FILL },
      text(title, tokens.title),
      ...(subtitle ? [text(subtitle, tokens.subtitle)] : []),
    );

    return {
      masterName: tokens.master.masterName,
      masterTokens: tokens.master.tokens,
      content: imagePath
        ? row({ spacing: 0, vAlign: tokens.vAlign, height: SIZE.FILL }, textBlock, image(imagePath, tokens.image))
        : textBlock,
    };
  },
});

// --- section ---

export interface SectionLayoutTokens {
  title: LabelTokens;
  master: MasterRef;
  vAlign: VerticalAlignment;
  hAlign: HorizontalAlignment;
}

// +----------------------------+
// |                            |
// |           TITLE            |
// |                            |
// +----------------------------+
export const sectionLayout = defineLayout({
  name: "section",
  description: "Section divider with centered title.",
  params: { title: param.required(textComponent.schema) },
  render: ({ title }, _slots, tokens: SectionLayoutTokens) => ({
    masterName: tokens.master.masterName,
    masterTokens: tokens.master.tokens,
    content: column(
      { spacing: 0, vAlign: tokens.vAlign, hAlign: tokens.hAlign, height: SIZE.FILL },
      label(title, tokens.title),
    ),
  }),
});

// --- body ---

export interface BodyLayoutTokens {
  master: MasterRef;
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
  render: ({ title, eyebrow }, { body }, tokens: BodyLayoutTokens) =>
    masteredSlide(
      tokens.master,
      column(
        { height: SIZE.FILL, vAlign: tokens.vAlign, hAlign: tokens.hAlign, spacing: tokens.spacing },
        ...(title ? [headerBlock(title, tokens, eyebrow)] : []),
        ...body,
      ),
    ),
});

// --- stat ---

export interface StatLayoutTokens {
  master: MasterRef;
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

export interface QuoteLayoutTokens {
  quote: QuoteTokens;
  master: MasterRef;
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
// | footer                     |
// +----------------------------+
export const quoteLayout = defineLayout({
  name: "quote",
  description: "Standalone pull quote with left accent bar and optional attribution.",
  params: {
    quote: param.required(textComponent.schema),
    attribution: param.optional(textComponent.schema),
  },
  render: ({ quote: quoteText, attribution }, _slots, tokens: QuoteLayoutTokens) => ({
    masterName: tokens.master.masterName,
    masterTokens: tokens.master.tokens,
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
  render: ({ title, subtitle }, _slots, tokens: TitleLayoutTokens) => ({
    masterName: tokens.master.masterName,
    masterTokens: tokens.master.tokens,
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
export interface BlankLayoutTokens {
  master: MasterRef;
}

export const blankLayout = defineLayout({
  name: "blank",
  description: "No chrome. Full canvas for custom content.",
  params: {},
  slots: ["body"],
  render: (_params, { body }, tokens: BlankLayoutTokens) => ({
    masterName: tokens.master.masterName,
    masterTokens: tokens.master.tokens,
    content: column({ spacing: 0, height: SIZE.FILL }, ...body),
  }),
});

// --- two-column ---

export interface TwoColumnLayoutTokens {
  master: MasterRef;
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

export interface StatementLayoutTokens {
  body: TextTokens;
  caption: TextTokens;
  vAlign: VerticalAlignment;
  hAlign: HorizontalAlignment;
  spacing: number;
  master: MasterRef;
}

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
  render: ({ body, caption }, _slots, tokens: StatementLayoutTokens) => ({
    masterName: tokens.master.masterName,
    masterTokens: tokens.master.tokens,
    content: column(
      { height: SIZE.FILL, vAlign: tokens.vAlign, hAlign: tokens.hAlign, spacing: tokens.spacing },
      text(body, tokens.body),
      ...(caption ? [text(caption, tokens.caption)] : []),
    ),
  }),
});

// --- agenda ---

export interface AgendaLayoutTokens {
  master: MasterRef;
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

    const itemsColumn = column({ spacing: tokens.spacing, vAlign: tokens.vAlign, height: SIZE.FILL }, ...itemRows);

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

export interface CardsLayoutTokens {
  master: MasterRef;
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

export interface TransformLayoutTokens {
  master: MasterRef;
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
export const transformLayout = defineLayout({
  name: "transform",
  description: "Side-by-side comparison layout with optional overlay.",
  params: {
    title: param.optional(textComponent.schema),
    eyebrow: param.optional(textComponent.schema),
  },
  slots: ["left", "right", "overlay"],
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

export interface ShapesLayoutTokens {
  master: MasterRef;
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
export const shapesLayout = defineLayout({
  name: "shapes",
  description: "Demo layout showing all 4 shape primitives with varied properties.",
  params: {
    title: param.optional(textComponent.schema),
    eyebrow: param.optional(textComponent.schema),
    subtitle: param.optional(textComponent.schema),
  },
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

export interface LinesLayoutTokens {
  master: MasterRef;
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
export const linesLayout = defineLayout({
  name: "lines",
  description: "Demo layout showing all 3 dash types.",
  params: {
    title: param.optional(textComponent.schema),
    eyebrow: param.optional(textComponent.schema),
  },
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
