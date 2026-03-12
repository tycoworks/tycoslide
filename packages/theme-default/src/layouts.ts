// Default Theme Layouts
// 11 layouts covering universal presentation patterns.
// Naming convention: kebab-case (matching SlideDev).

import {
  component,
  defineLayout,
  GAP,
  type GapSize,
  type HorizontalAlignment,
  SHAPE,
  SIZE,
  type Slide,
  type SlideNode,
  schema,
  type VerticalAlignment,
} from "tycoslide";
import type { CardTokens, ListTokens, PlainTextTokens, QuoteTokens, ShapeTokens, TextTokens } from "tycoslide-components";
import {
  Component,
  cardComponent,
  column,
  grid,
  image,
  imageComponent,
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
}

/** Title header block with optional eyebrow */
export function headerBlock(title: string, tokens: HeaderTokens, eyebrow?: string): SlideNode {
  if (eyebrow) {
    return column({ gap: GAP.TIGHT }, plainText(eyebrow, tokens.eyebrow), plainText(title, tokens.title));
  }
  return plainText(title, tokens.title);
}

/** Wrap content in the default master (footer chrome + content bounds) */
export function masteredSlide(...content: SlideNode[]): Slide {
  return {
    masterName: "default",
    masterVariant: "default",
    content: column({ gap: GAP.NONE, height: SIZE.FILL }, ...content),
  };
}

// ============================================
// FULL-SLIDE LAYOUTS (no master)
// ============================================

// --- title, end ---

export const TITLE_LAYOUT_TOKEN = {
  TITLE: "title",
  SUBTITLE: "subtitle",
  MASTER_VARIANT: "masterVariant",
  V_ALIGN: "vAlign",
  H_ALIGN: "hAlign",
  GAP: "gap",
} as const;

export interface TitleLayoutTokens {
  [TITLE_LAYOUT_TOKEN.TITLE]: TextTokens;
  [TITLE_LAYOUT_TOKEN.SUBTITLE]: TextTokens;
  [TITLE_LAYOUT_TOKEN.MASTER_VARIANT]: string;
  [TITLE_LAYOUT_TOKEN.V_ALIGN]: VerticalAlignment;
  [TITLE_LAYOUT_TOKEN.H_ALIGN]: HorizontalAlignment;
  [TITLE_LAYOUT_TOKEN.GAP]: GapSize;
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
    title: textComponent.schema,
    subtitle: textComponent.schema.optional(),
    image: imageComponent.schema.optional(),
  },
  tokens: Object.values(TITLE_LAYOUT_TOKEN),
  render: ({ title, subtitle, image: imagePath }, tokens: TitleLayoutTokens) => {
    const textBlock = column(
      { vAlign: tokens.vAlign, hAlign: tokens.hAlign, gap: tokens.gap, height: SIZE.FILL },
      text(title, tokens.title),
      ...(subtitle ? [text(subtitle, tokens.subtitle)] : []),
    );

    return {
      masterName: "minimal",
      masterVariant: tokens.masterVariant,
      content: imagePath
        ? row({ vAlign: tokens.vAlign, height: SIZE.FILL }, textBlock, image(imagePath))
        : textBlock,
    };
  },
});

// --- section ---

export const SECTION_LAYOUT_TOKEN = {
  TITLE: "title",
  MASTER_VARIANT: "masterVariant",
  V_ALIGN: "vAlign",
  H_ALIGN: "hAlign",
} as const;

export interface SectionLayoutTokens {
  [SECTION_LAYOUT_TOKEN.TITLE]: PlainTextTokens;
  [SECTION_LAYOUT_TOKEN.MASTER_VARIANT]: string;
  [SECTION_LAYOUT_TOKEN.V_ALIGN]: VerticalAlignment;
  [SECTION_LAYOUT_TOKEN.H_ALIGN]: HorizontalAlignment;
}

// +----------------------------+
// |                            |
// |           TITLE            |
// |                            |
// +----------------------------+
export const sectionLayout = defineLayout({
  name: "section",
  description: "Section divider with centered title.",
  params: { title: textComponent.schema },
  tokens: Object.values(SECTION_LAYOUT_TOKEN),
  render: ({ title }, tokens: SectionLayoutTokens) => ({
    masterName: "minimal",
    masterVariant: tokens.masterVariant,
    content: column(
      { vAlign: tokens.vAlign, hAlign: tokens.hAlign, height: SIZE.FILL },
      plainText(title, tokens.title),
    ),
  }),
});

// --- body ---

export const BODY_LAYOUT_TOKEN = {
  TITLE: "title",
  EYEBROW: "eyebrow",
  TEXT: "text",
  LIST: "list",
  V_ALIGN: "vAlign",
  H_ALIGN: "hAlign",
  GAP: "gap",
} as const;

export interface BodyLayoutTokens {
  [BODY_LAYOUT_TOKEN.TITLE]: PlainTextTokens;
  [BODY_LAYOUT_TOKEN.EYEBROW]: PlainTextTokens;
  [BODY_LAYOUT_TOKEN.TEXT]: TextTokens;
  [BODY_LAYOUT_TOKEN.LIST]: ListTokens;
  [BODY_LAYOUT_TOKEN.V_ALIGN]: VerticalAlignment;
  [BODY_LAYOUT_TOKEN.H_ALIGN]: HorizontalAlignment;
  [BODY_LAYOUT_TOKEN.GAP]: GapSize;
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
    title: textComponent.schema.optional(),
    eyebrow: textComponent.schema.optional(),
  },
  slots: ["body"],
  tokens: Object.values(BODY_LAYOUT_TOKEN),
  render: ({ title, eyebrow, body }, tokens: BodyLayoutTokens) =>
    masteredSlide(
      ...(title ? [headerBlock(title, tokens, eyebrow)] : []),
      column({ height: SIZE.FILL, vAlign: tokens.vAlign, hAlign: tokens.hAlign, gap: tokens.gap }, ...body),
    ),
});

// --- stat ---

export const STAT_LAYOUT_TOKEN = {
  VALUE: "value",
  LABEL: "label",
  CAPTION: "caption",
  SURFACE: "surface",
  V_ALIGN: "vAlign",
  H_ALIGN: "hAlign",
  GAP: "gap",
  PADDING: "padding",
} as const;

export interface StatLayoutTokens {
  [STAT_LAYOUT_TOKEN.VALUE]: PlainTextTokens;
  [STAT_LAYOUT_TOKEN.LABEL]: PlainTextTokens;
  [STAT_LAYOUT_TOKEN.CAPTION]: TextTokens;
  [STAT_LAYOUT_TOKEN.SURFACE]: ShapeTokens;
  [STAT_LAYOUT_TOKEN.V_ALIGN]: VerticalAlignment;
  [STAT_LAYOUT_TOKEN.H_ALIGN]: HorizontalAlignment;
  [STAT_LAYOUT_TOKEN.GAP]: GapSize;
  [STAT_LAYOUT_TOKEN.PADDING]: number;
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
    value: textComponent.schema,
    label: textComponent.schema,
    caption: textComponent.schema.optional(),
  },
  tokens: Object.values(STAT_LAYOUT_TOKEN),
  render: ({ value, label, caption }, tokens: StatLayoutTokens) => {
    const content = column(
      { vAlign: tokens.vAlign, hAlign: tokens.hAlign, gap: tokens.gap, height: SIZE.FILL, padding: tokens.padding },
      plainText(value, tokens.value),
      plainText(label, tokens.label),
      ...(caption ? [text(caption, tokens.caption)] : []),
    );

    const surfaced =
      tokens.surface.fillOpacity > 0
        ? stack({ height: SIZE.FILL }, shape(tokens.surface, { shape: SHAPE.ROUND_RECT }), content)
        : content;

    return masteredSlide(
      column({ height: SIZE.FILL, vAlign: tokens.vAlign, hAlign: tokens.hAlign }, surfaced),
    );
  },
});

// --- quote ---

export const QUOTE_LAYOUT_TOKEN = {
  QUOTE: "quote",
  V_ALIGN: "vAlign",
  H_ALIGN: "hAlign",
  GAP: "gap",
} as const;

export interface QuoteLayoutTokens {
  [QUOTE_LAYOUT_TOKEN.QUOTE]: QuoteTokens;
  [QUOTE_LAYOUT_TOKEN.V_ALIGN]: VerticalAlignment;
  [QUOTE_LAYOUT_TOKEN.H_ALIGN]: HorizontalAlignment;
  [QUOTE_LAYOUT_TOKEN.GAP]: GapSize;
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
    quote: textComponent.schema,
    attribution: textComponent.schema.optional(),
  },
  tokens: Object.values(QUOTE_LAYOUT_TOKEN),
  render: ({ quote: quoteText, attribution }, tokens: QuoteLayoutTokens) =>
    masteredSlide(
      column(
        { height: SIZE.FILL, vAlign: tokens.vAlign, hAlign: tokens.hAlign, gap: tokens.gap },
        component(Component.Quote, { quote: quoteText, attribution }, tokens.quote),
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
    title: textComponent.schema,
    subtitle: textComponent.schema.optional(),
  },
  tokens: Object.values(TITLE_LAYOUT_TOKEN),
  render: ({ title, subtitle }, tokens: TitleLayoutTokens) => ({
    masterName: "minimal",
    masterVariant: tokens.masterVariant,
    content: column(
      { vAlign: tokens.vAlign, hAlign: tokens.hAlign, gap: tokens.gap, height: SIZE.FILL },
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
export const BLANK_LAYOUT_TOKEN = {
  MASTER_VARIANT: "masterVariant",
} as const;

export interface BlankLayoutTokens {
  [BLANK_LAYOUT_TOKEN.MASTER_VARIANT]: string;
}

export const blankLayout = defineLayout({
  name: "blank",
  description: "No chrome. Full canvas for custom content.",
  params: {},
  slots: ["body"],
  tokens: Object.values(BLANK_LAYOUT_TOKEN),
  render: ({ body }, tokens: BlankLayoutTokens) => ({
    masterName: "minimal",
    masterVariant: tokens.masterVariant,
    content: column({ height: SIZE.FILL }, ...body),
  }),
});

// --- two-column ---

export const TWO_COLUMN_LAYOUT_TOKEN = {
  TITLE: "title",
  EYEBROW: "eyebrow",
  TEXT: "text",
  LIST: "list",
  V_ALIGN: "vAlign",
  H_ALIGN: "hAlign",
  GAP: "gap",
  SIDE_VALIGN: "sideVAlign",
  SIDE_GAP: "sideGap",
} as const;

export interface TwoColumnLayoutTokens {
  [TWO_COLUMN_LAYOUT_TOKEN.TITLE]: PlainTextTokens;
  [TWO_COLUMN_LAYOUT_TOKEN.EYEBROW]: PlainTextTokens;
  [TWO_COLUMN_LAYOUT_TOKEN.TEXT]: TextTokens;
  [TWO_COLUMN_LAYOUT_TOKEN.LIST]: ListTokens;
  [TWO_COLUMN_LAYOUT_TOKEN.V_ALIGN]: VerticalAlignment;
  [TWO_COLUMN_LAYOUT_TOKEN.H_ALIGN]: HorizontalAlignment;
  [TWO_COLUMN_LAYOUT_TOKEN.GAP]: GapSize;
  [TWO_COLUMN_LAYOUT_TOKEN.SIDE_VALIGN]: VerticalAlignment;
  [TWO_COLUMN_LAYOUT_TOKEN.SIDE_GAP]: GapSize;
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
    title: textComponent.schema.optional(),
    eyebrow: textComponent.schema.optional(),
  },
  slots: ["left", "right"],
  tokens: Object.values(TWO_COLUMN_LAYOUT_TOKEN),
  render: ({ title, eyebrow, left, right }, tokens: TwoColumnLayoutTokens) =>
    masteredSlide(
      ...(title ? [headerBlock(title, tokens, eyebrow)] : []),
      column(
        { height: SIZE.FILL, vAlign: tokens.vAlign, hAlign: tokens.hAlign, gap: tokens.gap },
        row(
          { height: SIZE.FILL },
          column({ vAlign: tokens.sideVAlign, gap: tokens.sideGap, height: SIZE.FILL }, ...left),
          column({ vAlign: tokens.sideVAlign, gap: tokens.sideGap, height: SIZE.FILL }, ...right),
        ),
      ),
    ),
});

// --- statement ---

export const STATEMENT_LAYOUT_TOKEN = {
  BODY: "body",
  CAPTION: "caption",
  V_ALIGN: "vAlign",
  H_ALIGN: "hAlign",
  GAP: "gap",
  MASTER_VARIANT: "masterVariant",
} as const;

export interface StatementLayoutTokens {
  [STATEMENT_LAYOUT_TOKEN.BODY]: TextTokens;
  [STATEMENT_LAYOUT_TOKEN.CAPTION]: TextTokens;
  [STATEMENT_LAYOUT_TOKEN.V_ALIGN]: VerticalAlignment;
  [STATEMENT_LAYOUT_TOKEN.H_ALIGN]: HorizontalAlignment;
  [STATEMENT_LAYOUT_TOKEN.GAP]: GapSize;
  [STATEMENT_LAYOUT_TOKEN.MASTER_VARIANT]: string;
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
    body: textComponent.schema,
    caption: textComponent.schema.optional(),
  },
  tokens: Object.values(STATEMENT_LAYOUT_TOKEN),
  render: ({ body, caption }, tokens: StatementLayoutTokens) => ({
    masterName: "minimal",
    masterVariant: tokens.masterVariant,
    content: column(
      { height: SIZE.FILL, vAlign: tokens.vAlign, hAlign: tokens.hAlign, gap: tokens.gap },
      text(body, tokens.body),
      ...(caption ? [text(caption, tokens.caption)] : []),
    ),
  }),
});

// --- agenda ---

export const AGENDA_LAYOUT_TOKEN = {
  TITLE: "title",
  EYEBROW: "eyebrow",
  V_ALIGN: "vAlign",
  H_ALIGN: "hAlign",
  ITEMS: "items",
  ITEM_BACKGROUND: "itemBackground",
  ITEM_NUMBER: "itemNumber",
  ITEM_PADDING: "itemPadding",
  ITEM_V_ALIGN: "itemVAlign",
  ITEM_GAP: "itemGap",
  GRID_COLUMNS: "gridColumns",
  GRID_GAP: "gridGap",
} as const;

export interface AgendaLayoutTokens {
  [AGENDA_LAYOUT_TOKEN.TITLE]: PlainTextTokens;
  [AGENDA_LAYOUT_TOKEN.EYEBROW]: PlainTextTokens;
  [AGENDA_LAYOUT_TOKEN.V_ALIGN]: VerticalAlignment;
  [AGENDA_LAYOUT_TOKEN.H_ALIGN]: HorizontalAlignment;
  [AGENDA_LAYOUT_TOKEN.ITEMS]: TextTokens;
  [AGENDA_LAYOUT_TOKEN.ITEM_BACKGROUND]: ShapeTokens;
  [AGENDA_LAYOUT_TOKEN.ITEM_NUMBER]: PlainTextTokens;
  [AGENDA_LAYOUT_TOKEN.ITEM_PADDING]: number;
  [AGENDA_LAYOUT_TOKEN.ITEM_V_ALIGN]: VerticalAlignment;
  [AGENDA_LAYOUT_TOKEN.ITEM_GAP]: GapSize;
  [AGENDA_LAYOUT_TOKEN.GRID_COLUMNS]: number;
  [AGENDA_LAYOUT_TOKEN.GRID_GAP]: GapSize;
}

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
    title: textComponent.schema,
    eyebrow: textComponent.schema.optional(),
    items: schema.array(textComponent.schema),
  },
  tokens: Object.values(AGENDA_LAYOUT_TOKEN),
  render: ({ title, eyebrow, items }, tokens: AgendaLayoutTokens) => {
    // Inline card component: stack composes a rounded-rect background shape
    // with padded content in a single node. Layouts can build ad-hoc visuals
    // by composing primitives directly — not everything needs to be a registered component.
    const itemCards = items.map((item, i) =>
      stack(
        shape(tokens.itemBackground, { shape: SHAPE.ROUND_RECT }),
        row(
          { padding: tokens.itemPadding, vAlign: tokens.itemVAlign, gap: tokens.itemGap },
          column({ width: SIZE.HUG, vAlign: tokens.itemVAlign }, plainText(String(i + 1), tokens.itemNumber)),
          text(item, tokens.items),
        ),
      ),
    );
    return masteredSlide(
      headerBlock(title, tokens, eyebrow),
      column(
        { height: SIZE.FILL, vAlign: tokens.vAlign, hAlign: tokens.hAlign },
        grid({ columns: tokens.gridColumns, gap: tokens.gridGap, height: SIZE.HUG }, ...itemCards),
      ),
    );
  },
});

// --- cards ---

export const CARDS_LAYOUT_TOKEN = {
  TITLE: "title",
  EYEBROW: "eyebrow",
  INTRO: "intro",
  CAPTION: "caption",
  CARD: "card",
  V_ALIGN: "vAlign",
  H_ALIGN: "hAlign",
  GAP: "gap",
  GRID_GAP: "gridGap",
} as const;

export interface CardsLayoutTokens {
  [CARDS_LAYOUT_TOKEN.TITLE]: PlainTextTokens;
  [CARDS_LAYOUT_TOKEN.EYEBROW]: PlainTextTokens;
  [CARDS_LAYOUT_TOKEN.INTRO]: TextTokens;
  [CARDS_LAYOUT_TOKEN.CAPTION]: TextTokens;
  [CARDS_LAYOUT_TOKEN.CARD]: CardTokens;
  [CARDS_LAYOUT_TOKEN.V_ALIGN]: VerticalAlignment;
  [CARDS_LAYOUT_TOKEN.H_ALIGN]: HorizontalAlignment;
  [CARDS_LAYOUT_TOKEN.GAP]: GapSize;
  [CARDS_LAYOUT_TOKEN.GRID_GAP]: GapSize;
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
    title: textComponent.schema,
    eyebrow: textComponent.schema.optional(),
    intro: textComponent.schema.optional(),
    cards: schema.array(cardComponent.schema),
    caption: textComponent.schema.optional(),
  },
  tokens: Object.values(CARDS_LAYOUT_TOKEN),
  render: ({ title, eyebrow, intro, cards: cardItems, caption }, tokens: CardsLayoutTokens) => {
    const built = cardItems.map((c) => component(Component.Card, { ...c }, tokens.card));
    const perRow = built.length <= 2 ? built.length : built.length === 4 ? 2 : built.length >= 7 ? 4 : 3;
    return masteredSlide(
      headerBlock(title, tokens, eyebrow),
      column(
        { height: SIZE.FILL, vAlign: tokens.vAlign, hAlign: tokens.hAlign, gap: tokens.gap },
        ...(intro ? [text(intro, tokens.intro)] : []),
        grid({ columns: perRow, gap: tokens.gridGap }, ...built),
        ...(caption ? [text(caption, tokens.caption)] : []),
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
];
