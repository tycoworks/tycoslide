// Default Theme Layouts
// 19 layouts covering universal presentation patterns.
// Naming convention: kebab-case (matching SlideDev).

import {
  HALIGN,
  VALIGN,
  TEXT_STYLE,
  TEXT_STYLE_VALUES,
  GAP,
  SIZE,
  CONTENT,
  layoutRegistry,
  schema,
  type SlideNode,
  type Slide,
} from 'tycoslide';
import {
  textComponent,
  imageComponent,
  cardComponent,
  text,
  image,
  row,
  column,
  card,
  quote as quoteBlock,
  grid,
} from 'tycoslide-components';
import { DEFAULT_MASTER } from './master.js';
import { colors } from './theme.js';

// ============================================
// COMPOSITION PRIMITIVES
// ============================================

/** Title header block with optional eyebrow */
export function headerBlock(title: string, eyebrow?: string): SlideNode {
  if (eyebrow) {
    return column(
      { gap: GAP.TIGHT },
      text(eyebrow, { content: CONTENT.PLAIN, variant: 'eyebrow' }),
      text(title, { content: CONTENT.PLAIN, style: TEXT_STYLE.H3 }),
    );
  }
  return text(title, { content: CONTENT.PLAIN, style: TEXT_STYLE.H3 });
}

/** Fill-height body, content flows from top */
export function contentBody(...elements: SlideNode[]): SlideNode {
  return column(
    { height: SIZE.FILL, vAlign: VALIGN.TOP, hAlign: HALIGN.LEFT, gap: GAP.NORMAL },
    ...elements,
  );
}

/** Centered, fill-height body */
function centeredBody(...elements: SlideNode[]): SlideNode {
  return column(
    { height: SIZE.FILL, vAlign: VALIGN.MIDDLE, hAlign: HALIGN.CENTER, gap: GAP.NORMAL },
    ...elements,
  );
}

/** Wrap content in the DEFAULT_MASTER (footer + content bounds) */
export function masteredSlide(...content: SlideNode[]): Slide {
  return {
    master: DEFAULT_MASTER,
    content: column({ gap: GAP.NONE, height: SIZE.FILL }, ...content),
  };
}

/** Wrap a side of a two-column layout */
function wrapSide(content: SlideNode | SlideNode[]): SlideNode {
  const items = Array.isArray(content) ? content : [content];
  return column({ vAlign: VALIGN.TOP, gap: GAP.NORMAL, height: SIZE.FILL }, ...items);
}

/** Shared implementation for image-left and image-right */
function imageSplitSlide(imagePath: string, body: SlideNode[], imageOnLeft: boolean, title?: string, eyebrow?: string): Slide {
  const img = image(imagePath);
  const prose = column({ vAlign: VALIGN.MIDDLE, gap: GAP.NORMAL, height: SIZE.FILL }, ...body);
  const [l, r] = imageOnLeft ? [img, prose] : [prose, img];
  return masteredSlide(
    ...(title ? [headerBlock(title, eyebrow)] : []),
    row({ height: SIZE.FILL }, l, r),
  );
}

// ============================================
// FULL-SLIDE LAYOUTS (no master)
// ============================================

// +----------------------------+
// |                            |
// |           TITLE            |
// |          subtitle          |
// |                            |
// +----------------------------+
export const titleLayout = layoutRegistry.define({
  name: 'title',
  description: 'Opening slide with large title and optional subtitle.',
  params: {
    title: textComponent.schema,
    subtitle: textComponent.schema.optional(),
  },
  render: ({ title, subtitle }) => ({
    background: colors.text,
    content: column(
      { vAlign: VALIGN.MIDDLE, hAlign: HALIGN.CENTER, gap: GAP.TIGHT, height: SIZE.FILL },
      text(title, { content: CONTENT.PLAIN, style: TEXT_STYLE.H1, hAlign: HALIGN.CENTER, color: colors.onPrimary }),
      ...(subtitle
        ? [text(subtitle, { content: CONTENT.PLAIN, style: TEXT_STYLE.H3, hAlign: HALIGN.CENTER, color: colors.onPrimary })]
        : []),
    ),
  }),
});

// +----------------------------+
// |                            |
// |           TITLE            |
// |                            |
// +----------------------------+
export const sectionLayout = layoutRegistry.define({
  name: 'section',
  description: 'Section divider with centered title.',
  params: { title: textComponent.schema },
  render: ({ title }) => ({
    background: colors.text,
    content: column(
      { vAlign: VALIGN.MIDDLE, hAlign: HALIGN.CENTER, height: SIZE.FILL },
      text(title, { content: CONTENT.PLAIN, style: TEXT_STYLE.H2, hAlign: HALIGN.CENTER, color: colors.onPrimary }),
    ),
  }),
});

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
export const bodyLayout = layoutRegistry.define({
  name: 'body',
  description: 'Markdown body with optional title. Default layout.',
  params: {
    title: textComponent.schema.optional(),
    eyebrow: textComponent.schema.optional(),
  },
  slots: ['body'],
  render: ({ title, eyebrow, body }) =>
    masteredSlide(
      ...(title ? [headerBlock(title, eyebrow)] : []),
      contentBody(...body),
    ),
});

// +----------------------------+
// |                            |
// |            47%             |
// |       Metric Label         |
// |      optional caption      |
// |                            |
// +----------------------------+
// | footer                     |
// +----------------------------+
export const statLayout = layoutRegistry.define({
  name: 'stat',
  description: 'Big number or key metric with label and optional caption.',
  params: {
    value: textComponent.schema,
    label: textComponent.schema,
    caption: textComponent.schema.optional(),
  },
  render: ({ value, label, caption }) =>
    masteredSlide(
      centeredBody(
        text(value, { content: CONTENT.PLAIN, style: TEXT_STYLE.H1, hAlign: HALIGN.CENTER }),
        text(label, { content: CONTENT.PLAIN, style: TEXT_STYLE.H3, hAlign: HALIGN.CENTER, color: colors.textMuted }),
        ...(caption ? [text(caption, { style: TEXT_STYLE.SMALL, color: colors.textMuted, hAlign: HALIGN.CENTER })] : []),
      ),
    ),
});

// +----------------------------+
// |                            |
// |  "Quote text here..."      |
// |       -- Attribution       |
// |                            |
// +----------------------------+
// | footer                     |
// +----------------------------+
export const quoteLayout = layoutRegistry.define({
  name: 'quote',
  description: 'Standalone pull quote with optional attribution and image.',
  params: {
    quote: textComponent.schema,
    attribution: textComponent.schema.optional(),
    image: imageComponent.schema.optional(),
  },
  render: ({ quote: quoteText, attribution, image: imagePath }) =>
    masteredSlide(
      centeredBody(
        quoteBlock({ quote: quoteText, attribution, image: imagePath }),
      ),
    ),
});

// +----------------------------+
// |                            |
// |           TITLE            |
// |          subtitle          |
// |                            |
// +----------------------------+
export const endLayout = layoutRegistry.define({
  name: 'end',
  description: 'Closing slide. Mirrors the title layout.',
  params: {
    title: textComponent.schema,
    subtitle: textComponent.schema.optional(),
  },
  render: ({ title, subtitle }) => ({
    background: colors.text,
    content: column(
      { vAlign: VALIGN.MIDDLE, hAlign: HALIGN.CENTER, gap: GAP.TIGHT, height: SIZE.FILL },
      text(title, { content: CONTENT.PLAIN, style: TEXT_STYLE.H1, hAlign: HALIGN.CENTER, color: colors.onPrimary }),
      ...(subtitle
        ? [text(subtitle, { content: CONTENT.PLAIN, style: TEXT_STYLE.H3, hAlign: HALIGN.CENTER, color: colors.onPrimary })]
        : []),
    ),
  }),
});

// +----------------------------+
// |                            |
// |       (raw content)        |
// |                            |
// +----------------------------+
export const blankLayout = layoutRegistry.define({
  name: 'blank',
  description: 'No chrome. Full canvas for custom content.',
  params: {},
  slots: ['body'],
  render: ({ body }) => ({
    content: column({ height: SIZE.FILL }, ...body),
  }),
});

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
export const imageLayout = layoutRegistry.define({
  name: 'image',
  description: 'Full image with title and optional eyebrow.',
  params: {
    title: textComponent.schema,
    eyebrow: textComponent.schema.optional(),
    image: imageComponent.schema,
  },
  render: ({ title, eyebrow, image: imagePath }) =>
    masteredSlide(
      headerBlock(title, eyebrow),
      centeredBody(image(imagePath)),
    ),
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
export const imageLeftLayout = layoutRegistry.define({
  name: 'image-left',
  description: 'Image on left, markdown prose on right.',
  params: {
    title: textComponent.schema.optional(),
    eyebrow: textComponent.schema.optional(),
    image: imageComponent.schema,
  },
  slots: ['body'],
  render: ({ title, eyebrow, image: imagePath, body }) =>
    imageSplitSlide(imagePath, body, true, title, eyebrow),
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
export const imageRightLayout = layoutRegistry.define({
  name: 'image-right',
  description: 'Image on right, markdown prose on left.',
  params: {
    title: textComponent.schema.optional(),
    eyebrow: textComponent.schema.optional(),
    image: imageComponent.schema,
  },
  slots: ['body'],
  render: ({ title, eyebrow, image: imagePath, body }) =>
    imageSplitSlide(imagePath, body, false, title, eyebrow),
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
export const twoColumnLayout = layoutRegistry.define({
  name: 'two-column',
  description: 'Two equal markdown columns with optional header.',
  params: {
    title: textComponent.schema.optional(),
    eyebrow: textComponent.schema.optional(),
  },
  slots: ['left', 'right'],
  render: ({ title, eyebrow, left, right }) =>
    masteredSlide(
      ...(title ? [headerBlock(title, eyebrow)] : []),
      contentBody(row({ height: SIZE.FILL }, wrapSide(left), wrapSide(right))),
    ),
});

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
export const comparisonLayout = layoutRegistry.define({
  name: 'comparison',
  description: 'Two columns with individual headers. Use for pros/cons, before/after.',
  params: {
    title: textComponent.schema.optional(),
    eyebrow: textComponent.schema.optional(),
    leftTitle: textComponent.schema,
    rightTitle: textComponent.schema,
  },
  slots: ['left', 'right'],
  render: ({ title, eyebrow, leftTitle, rightTitle, left, right }) =>
    masteredSlide(
      ...(title ? [headerBlock(title, eyebrow)] : []),
      contentBody(
        row(
          { height: SIZE.FILL },
          column({ vAlign: VALIGN.TOP, gap: GAP.NORMAL, height: SIZE.FILL },
            text(leftTitle, { content: CONTENT.PLAIN, style: TEXT_STYLE.H4 }),
            ...left,
          ),
          column({ vAlign: VALIGN.TOP, gap: GAP.NORMAL, height: SIZE.FILL },
            text(rightTitle, { content: CONTENT.PLAIN, style: TEXT_STYLE.H4 }),
            ...right,
          ),
        ),
      ),
    ),
});

// +----------------------------+
// | EYEBROW                    |
// | Title                      |
// |----------------------------|
// |                            |
// |   Body text, centered      |
// |   with optional style      |
// |      optional caption      |
// |                            |
// +----------------------------+
// | footer                     |
// +----------------------------+
export const statementLayout = layoutRegistry.define({
  name: 'statement',
  description: 'Body text with optional style and caption. Use for value props.',
  params: {
    title: textComponent.schema,
    eyebrow: textComponent.schema.optional(),
    body: textComponent.schema,
    bodyStyle: schema.enum(TEXT_STYLE_VALUES).optional(),
    caption: textComponent.schema.optional(),
  },
  render: ({ title, eyebrow, body, bodyStyle, caption }) =>
    masteredSlide(
      headerBlock(title, eyebrow),
      centeredBody(
        text(body, { content: CONTENT.PROSE, ...(bodyStyle ? { style: bodyStyle } : {}) }),
        ...(caption ? [text(caption, { style: TEXT_STYLE.SMALL, color: colors.textMuted, hAlign: HALIGN.CENTER })] : []),
      ),
    ),
});

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
export const agendaLayout = layoutRegistry.define({
  name: 'agenda',
  description: 'Eyebrow, title, optional intro, and bullet list.',
  params: {
    title: textComponent.schema,
    eyebrow: textComponent.schema.optional(),
    intro: textComponent.schema.optional(),
    items: schema.array(textComponent.schema),
  },
  render: ({ title, eyebrow, intro, items }) => {
    const body = [
      ...(intro ? [intro] : []),
      items.map(item => `- ${item}`).join('\n'),
    ].join('\n\n');
    return masteredSlide(
      headerBlock(title, eyebrow),
      contentBody(text(body, { content: CONTENT.PROSE })),
    );
  },
});

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
export const cardsLayout = layoutRegistry.define({
  name: 'cards',
  description: 'Card grid with intro text and optional caption.',
  params: {
    title: textComponent.schema,
    eyebrow: textComponent.schema.optional(),
    intro: textComponent.schema.optional(),
    cards: schema.array(cardComponent.schema),
    caption: textComponent.schema.optional(),
    variant: schema.string().optional(),
  },
  render: ({ title, eyebrow, intro, cards, caption, variant }) => {
    const built = cards.map(c => card(variant ? { ...c, variant } : c));
    const perRow = built.length <= 2 ? built.length : built.length === 4 ? 2 : built.length >= 7 ? 4 : 3;
    return masteredSlide(
      headerBlock(title, eyebrow),
      centeredBody(
        ...(intro ? [text(intro)] : []),
        grid(perRow, ...built),
        ...(caption ? [text(caption, { style: TEXT_STYLE.SMALL, color: colors.textMuted, hAlign: HALIGN.CENTER })] : []),
      ),
    );
  },
});

// +----------------------------+
// | +------+  Name             |
// | |IMAGE |  Role             |
// | |      |                   |
// | +------+  Bio text from    |
// |           body slot...     |
// +----------------------------+
// | footer                     |
// +----------------------------+
export const bioLayout = layoutRegistry.define({
  name: 'bio',
  description: 'Person introduction with photo, name, role, and bio.',
  params: {
    person: textComponent.schema,
    role: textComponent.schema.optional(),
    image: imageComponent.schema.optional(),
  },
  slots: ['body'],
  render: ({ person, role, image: imagePath, body }) =>
    masteredSlide(
      row(
        { height: SIZE.FILL },
        ...(imagePath ? [image(imagePath)] : []),
        column(
          { vAlign: VALIGN.MIDDLE, gap: GAP.NORMAL, height: SIZE.FILL },
          text(person, { content: CONTENT.PLAIN, style: TEXT_STYLE.H4 }),
          ...(role ? [text(role, { content: CONTENT.PLAIN, style: TEXT_STYLE.BODY, color: colors.textMuted })] : []),
          ...body,
        ),
      ),
    ),
});

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
export const captionLayout = layoutRegistry.define({
  name: 'caption',
  description: 'Image with caption text below.',
  params: {
    image: imageComponent.schema,
    caption: textComponent.schema,
  },
  render: ({ image: imagePath, caption }) =>
    masteredSlide(
      column(
        { height: SIZE.FILL, gap: GAP.TIGHT },
        image(imagePath),
        text(caption, { content: CONTENT.PLAIN, style: TEXT_STYLE.SMALL, color: colors.textMuted, hAlign: HALIGN.CENTER }),
      ),
    ),
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
export const titleOnlyLayout = layoutRegistry.define({
  name: 'title-only',
  description: 'Title bar with empty canvas below. Use for diagrams or screenshots.',
  params: {
    title: textComponent.schema,
    eyebrow: textComponent.schema.optional(),
  },
  render: ({ title, eyebrow }) =>
    masteredSlide(
      headerBlock(title, eyebrow),
      contentBody(),
    ),
});

// +----------------------------+
// | EYEBROW                    |
// | Title                      |
// |----------------------------|
// | +------+ +------+ +------+ |
// | | Name | | Name | | Name | |
// | | Role | | Role | | Role | |
// | +------+ +------+ +------+ |
// +----------------------------+
// | footer                     |
// +----------------------------+
export const teamLayout = layoutRegistry.define({
  name: 'team',
  description: 'Grid of team members with name, role, and optional photo.',
  params: {
    title: textComponent.schema.optional(),
    eyebrow: textComponent.schema.optional(),
    members: schema.array(schema.object({
      name: schema.string(),
      role: schema.string().optional(),
      image: imageComponent.schema.optional(),
    })),
  },
  render: ({ title, eyebrow, members }) => {
    const built = members.map(m => card({
      title: m.name,
      description: m.role,
      image: m.image,
      variant: 'flat',
    }));
    const perRow = built.length <= 3 ? built.length : built.length <= 6 ? 3 : 4;
    return masteredSlide(
      ...(title ? [headerBlock(title, eyebrow)] : []),
      centeredBody(grid(perRow, ...built)),
    );
  },
});
