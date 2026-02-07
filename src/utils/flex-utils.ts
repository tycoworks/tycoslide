// Flex Utilities
// Shared helpers for flex distribution in layout containers

import type { FlexChild } from '../core/flex.js';
import type { ElementNode } from '../core/nodes.js';
import { NODE_TYPE } from '../core/nodes.js';
import { SIZE } from '../core/types.js';

export interface FlexChildOptions {
  getFixedSize?: (child: ElementNode, index: number) => number | undefined;
  getIntrinsicSize?: (child: ElementNode, index: number) => number | undefined;
}

export function buildRowFlexChildren(
  children: ElementNode[],
  options?: FlexChildOptions
): FlexChild[] {
  return children.map((child, i) => {
    if (child.type === NODE_TYPE.ROW || child.type === NODE_TYPE.COLUMN) {
      if (child.width === SIZE.FILL) return { fillsRemaining: true };
      if (typeof child.width === 'number') return { fixedSize: child.width };
    }
    const fixedSize = options?.getFixedSize?.(child, i);
    if (fixedSize !== undefined) return { fixedSize };
    const intrinsicSize = options?.getIntrinsicSize?.(child, i);
    if (intrinsicSize !== undefined) return { intrinsicSize };
    return {};
  });
}
