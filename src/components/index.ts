// Components Index
// Exports component builders (hybrid pattern, theme-free construction)

export {
  DiagramBuilder,
  diagram,
  DIAGRAM_COMPONENT,
  DIAGRAM_DIRECTION,
  NODE_SHAPE,
  type DiagramProps,
  type DiagramNodeRef,
  type DiagramShape,
  type DiagramDirection,
  type EdgeOptions,
  type SubgraphOptions,
} from './diagram.js';

export {
  card,
  CARD_COMPONENT,
  type CardProps,
} from './card.js';

export {
  markdown,
  MARKDOWN_COMPONENT,
  type MarkdownProps,
  type MarkdownStyleProps,
} from './markdown/index.js';
