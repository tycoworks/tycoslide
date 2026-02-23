// Default Theme Layouts
// Three essential layouts: title, section, body

import {
  HALIGN,
  VALIGN,
  TEXT_STYLE,
  GAP,
  SIZE,
  layoutRegistry,
  type SlideNode,
  type Slide,
} from 'tycoslide';
import { labelComponent, label, column } from 'tycoslide-components';
import { DEFAULT_MASTER } from './master.js';
import { theme } from './theme.js';

// ============================================
// COMPOSITION PRIMITIVES
// ============================================

/** Title header block with optional eyebrow */
export function headerBlock(title: string, eyebrow?: string): SlideNode {
  if (eyebrow) {
    return column(
      { gap: GAP.TIGHT },
      label(eyebrow.toUpperCase(), { style: TEXT_STYLE.EYEBROW }),
      label(title, { style: TEXT_STYLE.H3 }),
    );
  }
  return label(title, { style: TEXT_STYLE.H3 });
}

/** Fill-height body, content flows from top */
export function contentBody(...elements: SlideNode[]): SlideNode {
  return column(
    { height: SIZE.FILL, vAlign: VALIGN.TOP, hAlign: HALIGN.LEFT, gap: GAP.NORMAL },
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

// ============================================
// REGISTERED LAYOUTS
// ============================================

export const titleLayout = layoutRegistry.define({
  name: 'title',
  description: 'Opening slide with large title and optional subtitle.',
  params: {
    title: labelComponent.schema,
    subtitle: labelComponent.schema.optional(),
  },
  render: ({ title, subtitle }) => ({
    content: column(
      { vAlign: VALIGN.MIDDLE, hAlign: HALIGN.CENTER, gap: GAP.TIGHT, height: SIZE.FILL },
      label(title, { style: TEXT_STYLE.H1, hAlign: HALIGN.CENTER }),
      ...(subtitle
        ? [label(subtitle, { style: TEXT_STYLE.H3, hAlign: HALIGN.CENTER, color: theme.colors.textMuted })]
        : []),
    ),
  }),
});

export const sectionLayout = layoutRegistry.define({
  name: 'section',
  description: 'Section divider with centered title.',
  params: { title: labelComponent.schema },
  render: ({ title }) => ({
    content: column(
      { vAlign: VALIGN.MIDDLE, hAlign: HALIGN.CENTER, height: SIZE.FILL },
      label(title, { style: TEXT_STYLE.H2, hAlign: HALIGN.CENTER }),
    ),
  }),
});

export const bodyLayout = layoutRegistry.define({
  name: 'body',
  description: 'Markdown body with optional title. Default layout.',
  params: {
    title: labelComponent.schema.optional(),
    eyebrow: labelComponent.schema.optional(),
  },
  slots: ['body'],
  render: ({ title, eyebrow, body }) =>
    masteredSlide(
      ...(title ? [headerBlock(title, eyebrow)] : []),
      contentBody(...body),
    ),
});
