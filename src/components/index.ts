// Components Index
// Exports component builders (hybrid pattern, theme-free construction)

export {
  DiagramBuilder,
  diagram,
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
  registerTableComponent,
  type TableComponentProps,
  type TableCellContent,
} from './table.js';

export {
  cardComponent,
  registerCardComponent,
  type CardComponentProps,
} from './card.js';

export {
  listComponent,
  bulletListComponent,
  numberedListComponent,
  registerListComponent,
  type ListComponentProps,
  type ListItemContent,
} from './list.js';
