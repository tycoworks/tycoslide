// Default Theme Layouts
// 19 layouts covering universal presentation patterns.
// Naming convention: kebab-case (matching SlideDev).

import { component, defineLayout, GAP, HALIGN, SIZE, type Slide, type SlideNode, schema, VALIGN } from "tycoslide";
import type { CardTokens, ListTokens, PlainTextTokens, QuoteTokens, TextTokens } from "tycoslide-components";
import {
  Component,
  cardComponent,
  column,
  grid,
  image,
  imageComponent,
  list,
  plainText,
  row,
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

/** Fill-height body, content flows from top */
export function contentBody(...elements: SlideNode[]): SlideNode {
  return column({ height: SIZE.FILL, vAlign: VALIGN.TOP, hAlign: HALIGN.LEFT, gap: GAP.NORMAL }, ...elements);
}

/** Centered, fill-height body */
function centeredBody(...elements: SlideNode[]): SlideNode {
  return column({ height: SIZE.FILL, vAlign: VALIGN.MIDDLE, hAlign: HALIGN.CENTER, gap: GAP.NORMAL }, ...elements);
}

/** Wrap content in the default master (footer chrome + content bounds) */
export function masteredSlide(...content: SlideNode[]): Slide {
  return {
    masterName: "default",
    masterVariant: "default",
    content: column({ gap: GAP.NONE, height: SIZE.FILL }, ...content),
  };
}

/** Wrap a side of a two-column layout */
function wrapSide(content: SlideNode | SlideNode[]): SlideNode {
  const items = Array.isArray(content) ? content : [content];
  return column({ vAlign: VALIGN.TOP, gap: GAP.NORMAL, height: SIZE.FILL }, ...items);
}

/** Shared implementation for image-left and image-right */
function imageSplitSlide(
  imagePath: string,
  body: SlideNode[],
  imageOnLeft: boolean,
  tokens: HeaderTokens,
  title?: string,
  eyebrow?: string,
): Slide {
  const img = image(imagePath);
  const prose = column({ vAlign: VALIGN.MIDDLE, gap: GAP.NORMAL, height: SIZE.FILL }, ...body);
  const [l, r] = imageOnLeft ? [img, prose] : [prose, img];
  return masteredSlide(...(title ? [headerBlock(title, tokens, eyebrow)] : []), row({ height: SIZE.FILL }, l, r));
}

// ============================================
// FULL-SLIDE LAYOUTS (no master)
// ============================================

// --- title, end ---

export const TITLE_LAYOUT_TOKEN = {
  TITLE: "title",
  SUBTITLE: "subtitle",
} as const;

export interface TitleLayoutTokens {
  [TITLE_LAYOUT_TOKEN.TITLE]: PlainTextTokens;
  [TITLE_LAYOUT_TOKEN.SUBTITLE]: PlainTextTokens;
}

// +----------------------------+
// |                            |
// |           TITLE            |
// |          subtitle          |
// |                            |
// +----------------------------+
export const titleLayout = defineLayout({
  name: "title",
  description: "Opening slide with large title and optional subtitle.",
  params: {
    title: textComponent.schema,
    subtitle: textComponent.schema.optional(),
  },
  tokens: [TITLE_LAYOUT_TOKEN.TITLE, TITLE_LAYOUT_TOKEN.SUBTITLE],
  render: ({ title, subtitle }, tokens: TitleLayoutTokens) => {
    return {
      masterName: "minimal",
      masterVariant: "dark",
      content: column(
        { vAlign: VALIGN.MIDDLE, hAlign: HALIGN.CENTER, gap: GAP.TIGHT, height: SIZE.FILL },
        plainText(title, tokens.title),
        ...(subtitle ? [plainText(subtitle, tokens.subtitle)] : []),
      ),
    };
  },
});

// --- section ---

export const SECTION_LAYOUT_TOKEN = {
  TITLE: "title",
} as const;

export interface SectionLayoutTokens {
  [SECTION_LAYOUT_TOKEN.TITLE]: PlainTextTokens;
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
  tokens: [SECTION_LAYOUT_TOKEN.TITLE],
  render: ({ title }, tokens: SectionLayoutTokens) => {
    return {
      masterName: "minimal",
      masterVariant: "dark",
      content: column(
        { vAlign: VALIGN.MIDDLE, hAlign: HALIGN.CENTER, height: SIZE.FILL },
        plainText(title, tokens.title),
      ),
    };
  },
});

// --- body, image-left, image-right, two-column ---

export const BODY_LAYOUT_TOKEN = {
  TITLE: "title",
  EYEBROW: "eyebrow",
  TEXT: "text",
  LIST: "list",
} as const;

export interface BodyLayoutTokens {
  [BODY_LAYOUT_TOKEN.TITLE]: PlainTextTokens;
  [BODY_LAYOUT_TOKEN.EYEBROW]: PlainTextTokens;
  [BODY_LAYOUT_TOKEN.TEXT]: TextTokens;
  [BODY_LAYOUT_TOKEN.LIST]: ListTokens;
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
  tokens: [BODY_LAYOUT_TOKEN.TITLE, BODY_LAYOUT_TOKEN.EYEBROW, BODY_LAYOUT_TOKEN.TEXT, BODY_LAYOUT_TOKEN.LIST],
  render: ({ title, eyebrow, body }, tokens: BodyLayoutTokens) => {
    return masteredSlide(...(title ? [headerBlock(title, tokens, eyebrow)] : []), contentBody(...body));
  },
});

// --- stat ---

export const STAT_LAYOUT_TOKEN = {
  VALUE: "value",
  LABEL: "label",
  CAPTION: "caption",
} as const;

export interface StatLayoutTokens {
  [STAT_LAYOUT_TOKEN.VALUE]: PlainTextTokens;
  [STAT_LAYOUT_TOKEN.LABEL]: PlainTextTokens;
  [STAT_LAYOUT_TOKEN.CAPTION]: TextTokens;
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
  tokens: [STAT_LAYOUT_TOKEN.VALUE, STAT_LAYOUT_TOKEN.LABEL, STAT_LAYOUT_TOKEN.CAPTION],
  render: ({ value, label, caption }, tokens: StatLayoutTokens) => {
    return masteredSlide(
      centeredBody(
        plainText(value, tokens.value),
        plainText(label, tokens.label),
        ...(caption ? [text(caption, tokens.caption)] : []),
      ),
    );
  },
});

export const QUOTE_LAYOUT_TOKEN = {
  QUOTE: "quote",
} as const;

export interface QuoteLayoutTokens {
  [QUOTE_LAYOUT_TOKEN.QUOTE]: QuoteTokens;
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
  tokens: [QUOTE_LAYOUT_TOKEN.QUOTE],
  render: ({ quote: quoteText, attribution }, tokens: QuoteLayoutTokens) =>
    masteredSlide(centeredBody(component(Component.Quote, { quote: quoteText, attribution }, tokens.quote))),
});

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
  tokens: [TITLE_LAYOUT_TOKEN.TITLE, TITLE_LAYOUT_TOKEN.SUBTITLE],
  render: ({ title, subtitle }, tokens: TitleLayoutTokens) => {
    return {
      masterName: "minimal",
      masterVariant: "dark",
      content: column(
        { vAlign: VALIGN.MIDDLE, hAlign: HALIGN.CENTER, gap: GAP.TIGHT, height: SIZE.FILL },
        plainText(title, tokens.title),
        ...(subtitle ? [plainText(subtitle, tokens.subtitle)] : []),
      ),
    };
  },
});

// +----------------------------+
// |                            |
// |       (raw content)        |
// |                            |
// +----------------------------+
export const blankLayout = defineLayout({
  name: "blank",
  description: "No chrome. Full canvas for custom content.",
  params: {},
  slots: ["body"],
  render: ({ body }) => ({
    masterName: "minimal",
    masterVariant: "default",
    content: column({ height: SIZE.FILL }, ...body),
  }),
});

// --- image, title-only ---

export const IMAGE_LAYOUT_TOKEN = {
  TITLE: "title",
  EYEBROW: "eyebrow",
} as const;

export interface ImageLayoutTokens {
  [IMAGE_LAYOUT_TOKEN.TITLE]: PlainTextTokens;
  [IMAGE_LAYOUT_TOKEN.EYEBROW]: PlainTextTokens;
}

// +----------------------------+
// | EYEBROW                    |
// | Title                      |
// |----------------------------|
// |      +------------+        |
// |      |            |        |
// |      |   IMAGE    |        |
// |      |            |        |
// |      +------------+        |
// +----------------------------+
// | footer                     |
// +----------------------------+
export const imageLayout = defineLayout({
  name: "image",
  description: "Full image with title and optional eyebrow.",
  params: {
    title: textComponent.schema,
    eyebrow: textComponent.schema.optional(),
    image: imageComponent.schema,
  },
  tokens: [IMAGE_LAYOUT_TOKEN.TITLE, IMAGE_LAYOUT_TOKEN.EYEBROW],
  render: ({ title, eyebrow, image: imagePath }, tokens: ImageLayoutTokens) => {
    return masteredSlide(headerBlock(title, tokens, eyebrow), centeredBody(image(imagePath)));
  },
});

// +----------------------------+
// | +----------+ Prose text    |
// | |          | flows here    |
// | |  IMAGE   | on the right  |
// | |          | side.         |
// | +----------+               |
// +----------------------------+
// | footer                     |
// +----------------------------+
export const imageLeftLayout = defineLayout({
  name: "image-left",
  description: "Image on left, markdown prose on right.",
  params: {
    title: textComponent.schema.optional(),
    eyebrow: textComponent.schema.optional(),
    image: imageComponent.schema,
  },
  slots: ["body"],
  tokens: [BODY_LAYOUT_TOKEN.TITLE, BODY_LAYOUT_TOKEN.EYEBROW, BODY_LAYOUT_TOKEN.TEXT, BODY_LAYOUT_TOKEN.LIST],
  render: ({ title, eyebrow, image: imagePath, body }, tokens: BodyLayoutTokens) => {
    return imageSplitSlide(imagePath, body, true, tokens, title, eyebrow);
  },
});

// +----------------------------+
// | Prose text  +----------+   |
// | flows here  |          |   |
// | on the left |  IMAGE   |   |
// | side.       |          |   |
// |             +----------+   |
// +----------------------------+
// | footer                     |
// +----------------------------+
export const imageRightLayout = defineLayout({
  name: "image-right",
  description: "Image on right, markdown prose on left.",
  params: {
    title: textComponent.schema.optional(),
    eyebrow: textComponent.schema.optional(),
    image: imageComponent.schema,
  },
  slots: ["body"],
  tokens: [BODY_LAYOUT_TOKEN.TITLE, BODY_LAYOUT_TOKEN.EYEBROW, BODY_LAYOUT_TOKEN.TEXT, BODY_LAYOUT_TOKEN.LIST],
  render: ({ title, eyebrow, image: imagePath, body }, tokens: BodyLayoutTokens) => {
    return imageSplitSlide(imagePath, body, false, tokens, title, eyebrow);
  },
});

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
  tokens: [BODY_LAYOUT_TOKEN.TITLE, BODY_LAYOUT_TOKEN.EYEBROW, BODY_LAYOUT_TOKEN.TEXT, BODY_LAYOUT_TOKEN.LIST],
  render: ({ title, eyebrow, left, right }, tokens: BodyLayoutTokens) => {
    return masteredSlide(
      ...(title ? [headerBlock(title, tokens, eyebrow)] : []),
      contentBody(row({ height: SIZE.FILL }, wrapSide(left), wrapSide(right))),
    );
  },
});

// --- comparison ---

export const COMPARISON_LAYOUT_TOKEN = {
  TITLE: "title",
  EYEBROW: "eyebrow",
  COLUMN_TITLE: "columnTitle",
  TEXT: "text",
  LIST: "list",
} as const;

export interface ComparisonLayoutTokens {
  [COMPARISON_LAYOUT_TOKEN.TITLE]: PlainTextTokens;
  [COMPARISON_LAYOUT_TOKEN.EYEBROW]: PlainTextTokens;
  [COMPARISON_LAYOUT_TOKEN.COLUMN_TITLE]: PlainTextTokens;
  [COMPARISON_LAYOUT_TOKEN.TEXT]: TextTokens;
  [COMPARISON_LAYOUT_TOKEN.LIST]: ListTokens;
}

// +----------------------------+
// | EYEBROW                    |
// | Title                      |
// |----------------------------|
// | Left Title  | Right Title  |
// | ::left::    | ::right::    |
// | Markdown    | Markdown     |
// | content     | content      |
// +----------------------------+
// | footer                     |
// +----------------------------+
export const comparisonLayout = defineLayout({
  name: "comparison",
  description: "Two columns with individual headers. Use for pros/cons, before/after.",
  params: {
    title: textComponent.schema.optional(),
    eyebrow: textComponent.schema.optional(),
    leftTitle: textComponent.schema,
    rightTitle: textComponent.schema,
  },
  slots: ["left", "right"],
  tokens: [
    COMPARISON_LAYOUT_TOKEN.TITLE,
    COMPARISON_LAYOUT_TOKEN.EYEBROW,
    COMPARISON_LAYOUT_TOKEN.COLUMN_TITLE,
    COMPARISON_LAYOUT_TOKEN.TEXT,
    COMPARISON_LAYOUT_TOKEN.LIST,
  ],
  render: ({ title, eyebrow, leftTitle, rightTitle, left, right }, tokens: ComparisonLayoutTokens) => {
    return masteredSlide(
      ...(title ? [headerBlock(title, tokens, eyebrow)] : []),
      contentBody(
        row(
          { height: SIZE.FILL },
          column(
            { vAlign: VALIGN.TOP, gap: GAP.NORMAL, height: SIZE.FILL },
            plainText(leftTitle, tokens.columnTitle),
            ...left,
          ),
          column(
            { vAlign: VALIGN.TOP, gap: GAP.NORMAL, height: SIZE.FILL },
            plainText(rightTitle, tokens.columnTitle),
            ...right,
          ),
        ),
      ),
    );
  },
});

// --- statement ---

export const STATEMENT_LAYOUT_TOKEN = {
  TITLE: "title",
  EYEBROW: "eyebrow",
  BODY: "body",
  CAPTION: "caption",
} as const;

export interface StatementLayoutTokens {
  [STATEMENT_LAYOUT_TOKEN.TITLE]: PlainTextTokens;
  [STATEMENT_LAYOUT_TOKEN.EYEBROW]: PlainTextTokens;
  [STATEMENT_LAYOUT_TOKEN.BODY]: TextTokens;
  [STATEMENT_LAYOUT_TOKEN.CAPTION]: TextTokens;
}

// +----------------------------+
// | EYEBROW                    |
// | Title                      |
// |----------------------------|
// |                            |
// |   Body text, centered      |
// |      optional caption      |
// |                            |
// +----------------------------+
// | footer                     |
// +----------------------------+
export const statementLayout = defineLayout({
  name: "statement",
  description: "Body text with optional caption. Use for value props.",
  params: {
    title: textComponent.schema,
    eyebrow: textComponent.schema.optional(),
    body: textComponent.schema,
    caption: textComponent.schema.optional(),
  },
  tokens: [
    STATEMENT_LAYOUT_TOKEN.TITLE,
    STATEMENT_LAYOUT_TOKEN.EYEBROW,
    STATEMENT_LAYOUT_TOKEN.BODY,
    STATEMENT_LAYOUT_TOKEN.CAPTION,
  ],
  render: ({ title, eyebrow, body, caption }, tokens: StatementLayoutTokens) => {
    return masteredSlide(
      headerBlock(title, tokens, eyebrow),
      centeredBody(text(body, tokens.body), ...(caption ? [text(caption, tokens.caption)] : [])),
    );
  },
});

// --- agenda ---

export const AGENDA_LAYOUT_TOKEN = {
  TITLE: "title",
  EYEBROW: "eyebrow",
  INTRO: "intro",
  ITEMS: "items",
} as const;

export interface AgendaLayoutTokens {
  [AGENDA_LAYOUT_TOKEN.TITLE]: PlainTextTokens;
  [AGENDA_LAYOUT_TOKEN.EYEBROW]: PlainTextTokens;
  [AGENDA_LAYOUT_TOKEN.INTRO]: TextTokens;
  [AGENDA_LAYOUT_TOKEN.ITEMS]: ListTokens;
}

// +----------------------------+
// | EYEBROW                    |
// | Title                      |
// |----------------------------|
// | Intro text                 |
// |                            |
// | - Item one                 |
// | - Item two                 |
// | - Item three               |
// +----------------------------+
// | footer                     |
// +----------------------------+
export const agendaLayout = defineLayout({
  name: "agenda",
  description: "Eyebrow, title, optional intro, and bullet list.",
  params: {
    title: textComponent.schema,
    eyebrow: textComponent.schema.optional(),
    intro: textComponent.schema.optional(),
    items: schema.array(textComponent.schema),
  },
  tokens: [
    AGENDA_LAYOUT_TOKEN.TITLE,
    AGENDA_LAYOUT_TOKEN.EYEBROW,
    AGENDA_LAYOUT_TOKEN.INTRO,
    AGENDA_LAYOUT_TOKEN.ITEMS,
  ],
  render: ({ title, eyebrow, intro, items }, tokens: AgendaLayoutTokens) => {
    return masteredSlide(
      headerBlock(title, tokens, eyebrow),
      contentBody(...(intro ? [text(intro, tokens.intro)] : []), list(items, tokens.items)),
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
} as const;

export interface CardsLayoutTokens {
  [CARDS_LAYOUT_TOKEN.TITLE]: PlainTextTokens;
  [CARDS_LAYOUT_TOKEN.EYEBROW]: PlainTextTokens;
  [CARDS_LAYOUT_TOKEN.INTRO]: TextTokens;
  [CARDS_LAYOUT_TOKEN.CAPTION]: TextTokens;
  [CARDS_LAYOUT_TOKEN.CARD]: CardTokens;
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
  tokens: [
    CARDS_LAYOUT_TOKEN.TITLE,
    CARDS_LAYOUT_TOKEN.EYEBROW,
    CARDS_LAYOUT_TOKEN.INTRO,
    CARDS_LAYOUT_TOKEN.CAPTION,
    CARDS_LAYOUT_TOKEN.CARD,
  ],
  render: ({ title, eyebrow, intro, cards: cardItems, caption }, tokens: CardsLayoutTokens) => {
    const built = cardItems.map((c) => component(Component.Card, { ...c }, tokens.card));
    const perRow = built.length <= 2 ? built.length : built.length === 4 ? 2 : built.length >= 7 ? 4 : 3;
    return masteredSlide(
      headerBlock(title, tokens, eyebrow),
      centeredBody(
        ...(intro ? [text(intro, tokens.intro)] : []),
        grid(perRow, ...built),
        ...(caption ? [text(caption, tokens.caption)] : []),
      ),
    );
  },
});

// --- caption ---

export const CAPTION_LAYOUT_TOKEN = {
  CAPTION: "caption",
} as const;

export interface CaptionLayoutTokens {
  [CAPTION_LAYOUT_TOKEN.CAPTION]: PlainTextTokens;
}

// +----------------------------+
// | +------------------------+ |
// | |                        | |
// | |        IMAGE           | |
// | |                        | |
// | +------------------------+ |
// |     Caption text below     |
// +----------------------------+
// | footer                     |
// +----------------------------+
export const captionLayout = defineLayout({
  name: "caption",
  description: "Image with caption text below.",
  params: {
    image: imageComponent.schema,
    caption: textComponent.schema,
  },
  tokens: [CAPTION_LAYOUT_TOKEN.CAPTION],
  render: ({ image: imagePath, caption }, tokens: CaptionLayoutTokens) => {
    return masteredSlide(
      column({ height: SIZE.FILL, gap: GAP.TIGHT }, image(imagePath), plainText(caption, tokens.caption)),
    );
  },
});

// +----------------------------+
// | EYEBROW                    |
// | Title                      |
// |----------------------------|
// |                            |
// |      (empty canvas)        |
// |                            |
// +----------------------------+
// | footer                     |
// +----------------------------+
export const titleOnlyLayout = defineLayout({
  name: "title-only",
  description: "Title bar with empty canvas below. Use for diagrams or screenshots.",
  params: {
    title: textComponent.schema,
    eyebrow: textComponent.schema.optional(),
  },
  tokens: [IMAGE_LAYOUT_TOKEN.TITLE, IMAGE_LAYOUT_TOKEN.EYEBROW],
  render: ({ title, eyebrow }, tokens: ImageLayoutTokens) => {
    return masteredSlide(headerBlock(title, tokens, eyebrow), contentBody());
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
  imageLayout,
  imageLeftLayout,
  imageRightLayout,
  twoColumnLayout,
  comparisonLayout,
  statementLayout,
  agendaLayout,
  cardsLayout,
  captionLayout,
  titleOnlyLayout,
];
