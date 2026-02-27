// Markdown Toolkit
// Component Author API for parsing and processing markdown.
// Component authors import { markdown } from 'tycoslide' alongside schema, component, etc.

import type { Root } from 'mdast';
import { markdownProcessor, extractDirectiveBody } from '../../utils/parser.js';
import { extractSource, extractInlineText, SYNTAX } from '../model/syntax.js';
import { dispatchDirective } from './slotCompiler.js';

export const markdown = {
  parse(content: string): Root {
    return markdownProcessor.parse(content) as Root;
  },
  extractSource,
  extractInlineText,
  extractDirectiveBody,
  dispatchDirective,
  SYNTAX,
};

// Re-export types for component authors
export type { ContainerDirective } from '../model/syntax.js';
