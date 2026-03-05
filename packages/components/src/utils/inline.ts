// Inline text formatting utilities
// Shared between text and list components.

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkDirective from 'remark-directive';
import type { Processor } from 'unified';
import type { PhrasingContent } from 'mdast';
import type { TextDirective } from 'mdast-util-directive';
import type { NormalizedRun, ColorScheme } from 'tycoslide';
import { SYNTAX } from 'tycoslide';

// ============================================
// PARSER
// ============================================

/** Plugin that disables block-level constructs at the micromark level.
 *  Used by CONTENT.RICH to prevent `1. Problem` being parsed as an ordered list. */
function remarkDisableBlocks(this: Processor): void {
  const data = this.data() as { micromarkExtensions?: unknown[] };
  const ext = data.micromarkExtensions ?? (data.micromarkExtensions = []);
  ext.push({
    disable: {
      null: [
        'list', 'headingAtx', 'setextUnderline', 'blockQuote',
        'thematicBreak', 'codeFenced', 'codeIndented', 'htmlFlow', 'definition',
      ],
    },
  });
}

/** Inline-only parser — block constructs disabled (for CONTENT.RICH) */
export const inlineProcessor = unified().use(remarkParse).use(remarkDirective).use(remarkDisableBlocks);

// ============================================
// INLINE TRANSFORMER
// ============================================

/**
 * Transform inline/phrasing content into NormalizedRun[].
 * Recurses for strong, emphasis, and textDirective nodes.
 */
export function transformInline(
  nodes: PhrasingContent[],
  colors: ColorScheme,
  runs: NormalizedRun[],
  defaults: Partial<NormalizedRun>
): void {
  for (const node of nodes) {
    switch (node.type) {
      case SYNTAX.TEXT:
        runs.push({ text: node.value, ...defaults });
        break;
      case SYNTAX.STRONG:
        transformInline(node.children, colors, runs, { ...defaults, bold: true });
        break;
      case SYNTAX.EMPHASIS:
        transformInline(node.children, colors, runs, { ...defaults, italic: true });
        break;
      case SYNTAX.TEXT_DIRECTIVE: {
        const directive = node as unknown as TextDirective;
        const accentColor = colors.accents[directive.name];
        if (!accentColor) {
          const available = Object.keys(colors.accents).join(', ');
          throw new Error(
            `Unknown accent '${directive.name}'. Available: ${available}`
          );
        }
        transformInline(
          directive.children as PhrasingContent[],
          colors,
          runs,
          { ...defaults, color: accentColor }
        );
        break;
      }
      case SYNTAX.BREAK:
        runs.push({ text: '', softBreak: true, ...defaults });
        break;
      default:
        // Graceful degradation: recurse into children or extract value.
        // Handles: inlineCode, link, delete, html, image, footnoteReference, etc.
        if ('children' in node && Array.isArray((node as any).children)) {
          transformInline((node as any).children as PhrasingContent[], colors, runs, defaults);
        } else if ('value' in node && typeof (node as any).value === 'string') {
          runs.push({ text: (node as any).value, ...defaults });
        }
        break;
    }
  }
}
