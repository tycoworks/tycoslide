// Debug logging for tycoslide
// Enable with DEBUG=tycoslide:* or specific namespaces like DEBUG=tycoslide:layout:*

import createDebug from 'debug';

// Custom formatter: %f → 3 decimal places
createDebug.formatters.f = (v: number) => v.toFixed(3);

// Hierarchical loggers for different pipeline stages
export const log = {
  // DSL node creation (usually off - very verbose)
  dsl: createDebug('tycoslide:dsl'),

  // Rendering operations
  render: {
    _: createDebug('tycoslide:render'),
    text: createDebug('tycoslide:render:text'),
    shape: createDebug('tycoslide:render:shape'),
    image: createDebug('tycoslide:render:image'),
    diagram: createDebug('tycoslide:render:diagram'),
  },

  // PPTX generation
  pptx: {
    _: createDebug('tycoslide:pptx'),
    master: createDebug('tycoslide:pptx:master'),
    slide: createDebug('tycoslide:pptx:slide'),
  },

  // Layout measurement
  layout: {
    _: createDebug('tycoslide:layout'),
    font: createDebug('tycoslide:layout:font'),
    measure: createDebug('tycoslide:layout:measure'),
    html: createDebug('tycoslide:layout:html'),
  },
};

// Helper to preview text content for logging
export function contentPreview(content: unknown, maxLen = 30): string {
  if (typeof content === 'string') {
    return content.length > maxLen ? content.slice(0, maxLen) + '...' : content;
  }
  if (Array.isArray(content)) {
    const text = content.map(r => typeof r === 'string' ? r : (r as { text?: string }).text ?? '').join('');
    return text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
  }
  return String(content).slice(0, maxLen);
}
