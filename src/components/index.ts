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
  tableComponent,
  TABLE_COMPONENT,
  type TableComponentProps,
  type TableCellContent,
} from './table.js';

export {
  cardComponent,
  CARD_COMPONENT,
  type CardComponentProps,
} from './card.js';

export {
  listComponent,
  bulletListComponent,
  numberedListComponent,
  LIST_COMPONENT,
  type ListComponentProps,
  type ListItemContent,
} from './list.js';
