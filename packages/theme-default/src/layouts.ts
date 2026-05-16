// Default Theme Layouts
// Reusable structural blueprints for slide templates.
// Each layout is a self-contained section: token interface, ASCII diagram, Layout object.
// Templates are defined per-format using defineTemplate() with these layouts.

import type { CardTokens, HorizontalAlignment, ImageTokens, LabelTokens, Layout, LineTokens, ListTokens, ScalarShape, SlideNode, TextTokens, VerticalAlignment } from "@tycoslide/sdk";
import {
  component,
  Component,
  param,
  schema,
  SIZE,
  SPACING_MODE,
  cardComponent,
  column,
  grid,
  image,
  imageComponent,
  label,
  line,
  row,
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

// --- title ---

interface TitleLayoutTokens {
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
      ? row({ vAlign: tokens.vAlign, height: SIZE.FILL }, textBlock, image(imagePath, tokens.image))
      : textBlock;
  },
};

// --- section ---

interface SectionLayoutTokens {
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
      { vAlign: tokens.vAlign, hAlign: tokens.hAlign, height: SIZE.FILL },
      label(params.title as string, tokens.title),
    ),
};

// --- body ---

interface BodyLayoutTokens {
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
      { height: SIZE.FILL },
      ...(titleText ? [headerBlock(titleText, tokens, eyebrow)] : []),
      column({ height: SIZE.FILL, vAlign: tokens.vAlign, hAlign: tokens.hAlign, spacing: tokens.spacing }, ...bodySlot),
    );
  },
};

// --- statement ---

interface StatementLayoutTokens {
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

interface AgendaLayoutTokens {
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
        column({ width: SIZE.HUG, vAlign: tokens.itemVAlign }, label(String(i + 1), tokens.itemNumber)),
        text(item, tokens.items),
      ),
    ]);

    const itemsColumn = column({ spacing: tokens.spacing, vAlign: tokens.vAlign, height: SIZE.FILL }, ...itemRows);

    return column(
      { height: SIZE.FILL },
      headerBlock(titleText, tokens, eyebrow),
      imageSrc
        ? row({ spacing: tokens.spacing, height: SIZE.FILL }, itemsColumn, image(imageSrc, tokens.image))
        : itemsColumn,
    );
  },
};

// --- cards ---

interface CardsLayoutTokens {
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
      { height: SIZE.FILL },
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

interface TransformLayoutTokens {
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
