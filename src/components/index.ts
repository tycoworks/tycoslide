// Core Components
// Class exports from individual component files

export { Text, type TextProps, type TextRun, type TextContent } from './text.js';
export { Image, sizeOf } from './image.js';
export { List, LIST_TYPE, type ListProps, type ListType } from './list.js';
export { Table, type TableProps, type TableData, type TableCell, type CellProps } from './table.js';
export { Line, type LineProps, ARROW_TYPE, DASH_TYPE } from './line.js';
export { Card, type CardProps } from './card.js';
export { SlideNumber, type SlideNumberProps } from './slide-number.js';
export {
  Diagram,
  diagram,
  DIAGRAM_DIRECTION,
  NODE_SHAPE,
  type DiagramProps,
  type DiagramNode,
  type DiagramDirection,
  type NodeShape,
  type EdgeOptions,
  type SubgraphOptions,
} from './diagram.js';
