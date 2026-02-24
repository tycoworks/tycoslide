// Text Component
// Single component with three content modes, all producing TextNode with NormalizedRun[]:
//   label()  — CONTENT.PLAIN: no parsing, single run (eyebrows, attributions, copyright)
//   text()   — CONTENT.RICH:  inline-only rich text (bold, italic, :color[highlights], no bullets/paragraphs)
//   prose()  — CONTENT.PROSE: structured rich text (bullets, paragraphs, inline formatting)

import { unified } from 'unified';
import type { Processor } from 'unified';
import remarkParse from 'remark-parse';
import remarkDirective from 'remark-directive';
import type { Root, PhrasingContent, List, Paragraph, ListItem } from 'mdast';
import type { TextDirective } from 'mdast-util-directive';
import type { RootContent, Heading } from 'mdast';
import type { NormalizedRun, ColorScheme, ContentType, TextStyleName, HorizontalAlignment, VerticalAlignment, TextTokens } from 'tycoslide';
import { HALIGN, VALIGN, TEXT_STYLE, CONTENT, TEXT_TOKEN, Component, SYNTAX, markdown } from 'tycoslide';
import { NODE_TYPE, type ElementNode } from 'tycoslide';
import { componentRegistry, component, type ComponentNode, type InferProps, type SchemaShape } from 'tycoslide';
import { schema } from 'tycoslide';

// ============================================
// PARSERS
// ============================================

/** Plugin that disables block-level constructs at the micromark level.
 *  Used by CONTENT.RICH to prevent `1. Problem` being parsed as an ordered list. */
function remarkDisableBlocks(this: Processor): void {
  const data = this.data();
  const ext = (data.micromarkExtensions as any[]) || ((data as any).micromarkExtensions = []);
  ext.push({
    disable: {
      null: [
        'list', 'headingAtx', 'setextUnderline', 'blockQuote',
        'thematicBreak', 'codeFenced', 'codeIndented', 'htmlFlow', 'definition',
      ],
    },
  });
}

/** Full parser — all constructs enabled (for CONTENT.PROSE) */
const proseProcessor = unified().use(remarkParse).use(remarkDirective);

/** Inline-only parser — block constructs disabled (for CONTENT.RICH) */
const inlineProcessor = unified().use(remarkParse).use(remarkDirective).use(remarkDisableBlocks);

// ============================================
// SCHEMAS & TYPES
// ============================================

/** Directive schema — author-facing props only.
 *  Styling props (color, bulletColor, lineHeightMultiplier) removed:
 *  authors style via variant selection, not individual color props. */
const textSchema = {
  style: schema.textStyle().optional(),
  hAlign: schema.hAlign().optional(),
  vAlign: schema.vAlign().optional(),
  content: schema.content().optional(),
  variant: schema.string().optional(),
} satisfies SchemaShape;

/** Props accepted by DSL functions text(), prose(), label().
 *  DSL callers can pass styling props (color, bulletColor, lineHeightMultiplier)
 *  that are NOT in the directive schema — only available to TypeScript developers. */
export interface TextProps {
  style?: TextStyleName;
  color?: string;
  hAlign?: HorizontalAlignment;
  vAlign?: VerticalAlignment;
  bulletColor?: string;
  lineHeightMultiplier?: number;
  variant?: string;
}

/** Full props including body content and content kind (used internally by expansion) */
export type TextComponentProps = { body: string; content?: ContentType } & TextProps;

// ============================================
// TRANSFORMER
// ============================================

/**
 * Transform a parsed MDAST tree into NormalizedRun[].
 *
 * Supported node types:
 * - paragraph: text runs, with breakLine between paragraphs
 * - list (ordered/unordered): bullet runs
 * - strong: bold: true
 * - emphasis: italic: true
 * - textDirective: :name[text] -> accent color from theme
 */
function mdastToRuns(
  tree: Root,
  colors: ColorScheme
): NormalizedRun[] {
  const runs: NormalizedRun[] = [];
  let isFirstBlock = true;

  for (const node of tree.children) {
    if (node.type === SYNTAX.PARAGRAPH) {
      if (!isFirstBlock && runs.length > 0) {
        // Add breakLine to the first run of non-first paragraphs
        // (means "start a new paragraph before this run")
        const paragraphRuns: NormalizedRun[] = [];
        transformInline(node.children, colors, paragraphRuns, {});
        if (paragraphRuns.length > 0) {
          paragraphRuns[0] = { ...paragraphRuns[0], breakLine: true };
          runs.push(...paragraphRuns);
        }
      } else {
        transformInline(node.children, colors, runs, {});
      }
      isFirstBlock = false;
    } else if (node.type === SYNTAX.LIST) {
      transformList(node as List, colors, runs);
      isFirstBlock = false;
    }
  }

  return runs;
}

/**
 * Transform a list node into bullet/numbered runs.
 */
function transformList(
  list: List,
  colors: ColorScheme,
  runs: NormalizedRun[]
): void {
  const bulletType = list.ordered
    ? { type: 'number' as const }
    : true;

  for (const item of list.children as ListItem[]) {
    const firstChild = item.children[0];
    if (firstChild && firstChild.type === SYNTAX.PARAGRAPH) {
      // Collect item runs separately — only the first run gets bullet
      const itemRuns: NormalizedRun[] = [];
      transformInline(
        (firstChild as Paragraph).children,
        colors,
        itemRuns,
        {}
      );
      if (itemRuns.length > 0) {
        itemRuns[0] = { ...itemRuns[0], bullet: bulletType };
        runs.push(...itemRuns);
      }
    } else if (firstChild && firstChild.type === SYNTAX.LIST) {
      // Nested list (e.g. `- 1. text`) — recurse, but use outer bullet type
      transformList(firstChild as List, colors, runs);
    }
  }
}

/**
 * Transform inline/phrasing content into NormalizedRun[].
 * Recurses for strong, emphasis, and textDirective nodes.
 */
function transformInline(
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
      case SYNTAX.IMAGE:
        throw new Error('Images cannot be embedded inline in text.');
      default:
        throw new Error(`Unsupported inline markdown type "${node.type}".`);
    }
  }
}

// ============================================
// HEADING STYLE MAP (exported for document component)
// ============================================

export const HEADING_STYLE: Record<number, TextProps['style']> = {
  1: TEXT_STYLE.H1,
  2: TEXT_STYLE.H2,
  3: TEXT_STYLE.H3,
  4: TEXT_STYLE.H4,
};

// ============================================
// EXPAND — single function, switches on content kind
// ============================================

function expandText(props: TextComponentProps, context: { theme: any }, tokens: TextTokens): ElementNode {
  const contentKind = props.content ?? CONTENT.RICH;

  // Props override tokens: DSL/parent callers can pass explicit values
  const resolvedStyle = props.style ?? tokens.style;
  const resolvedColor = props.color ?? tokens.color;
  const resolvedBulletColor = props.bulletColor ?? tokens.bulletColor;
  const resolvedLineHeight = props.lineHeightMultiplier ?? tokens.lineHeightMultiplier;

  // PLAIN — no parsing, single run
  if (contentKind === CONTENT.PLAIN) {
    return {
      type: NODE_TYPE.TEXT,
      content: [{ text: props.body }],
      style: resolvedStyle,
      color: resolvedColor,
      hAlign: props.hAlign ?? HALIGN.LEFT,
      vAlign: props.vAlign ?? VALIGN.TOP,
      lineHeightMultiplier: resolvedLineHeight,
    };
  }

  // RICH or PROSE — parse markdown
  const parser = contentKind === CONTENT.RICH ? inlineProcessor : proseProcessor;
  const tree = parser.parse(props.body) as Root;

  // RICH: validate single paragraph (no multi-block)
  if (contentKind === CONTENT.RICH) {
    const blocks = tree.children.filter(c => c.type !== SYNTAX.THEMATIC_BREAK);
    if (blocks.length > 1 || (blocks.length === 1 && blocks[0].type !== SYNTAX.PARAGRAPH)) {
      throw new Error(
        `text() only supports inline formatting (bold, italic, colors). ` +
        `For bullets or multiple paragraphs, use prose().`
      );
    }
  }

  const runs = mdastToRuns(tree, context.theme.colors);

  // PROSE: apply bulletColor to all bullet runs
  if (contentKind === CONTENT.PROSE && resolvedBulletColor) {
    for (const run of runs) {
      if (run.bullet && typeof run.bullet === 'object') {
        run.bullet = { ...run.bullet, color: resolvedBulletColor };
      } else if (run.bullet === true) {
        run.bullet = { color: resolvedBulletColor };
      }
    }
  }

  return {
    type: NODE_TYPE.TEXT,
    content: runs,
    style: resolvedStyle,
    color: resolvedColor,
    hAlign: props.hAlign ?? HALIGN.LEFT,
    vAlign: props.vAlign ?? VALIGN.TOP,
    lineHeightMultiplier: resolvedLineHeight,
  };
}

// ============================================
// COMPONENT REGISTRATION
// ============================================

export const textComponent = componentRegistry.define({
  name: Component.Text,
  body: schema.string(),
  params: textSchema,
  tokens: [TEXT_TOKEN.COLOR, TEXT_TOKEN.BULLET_COLOR, TEXT_TOKEN.STYLE, TEXT_TOKEN.LINE_HEIGHT_MULTIPLIER],
  mdast: {
    nodeTypes: [SYNTAX.PARAGRAPH, SYNTAX.LIST, SYNTAX.HEADING],
    compile: (node: RootContent, source: string): ComponentNode | null => {
      if (node.type === SYNTAX.HEADING) {
        const heading = node as Heading;
        const style = HEADING_STYLE[heading.depth] ?? TEXT_STYLE.H3;
        const raw = markdown.extractSource(heading, source);
        const content = raw.replace(/^#{1,6}\s*/, '');
        return component(Component.Text, { body: content, content: CONTENT.PROSE, style });
      }
      if (node.type === SYNTAX.PARAGRAPH) {
        const para = node as { children: { type: string }[] };
        if (para.children.length === 1 && para.children[0].type === SYNTAX.IMAGE) {
          throw new Error('Images cannot be embedded inline in text. Use :::image directive.');
        }
      }
      return component(Component.Text, { body: markdown.extractSource(node, source), content: CONTENT.PROSE });
    },
  },
  expand: expandText,
});

// Semantic aliases — used in layout param schemas to communicate intent
// (e.g., `title: labelComponent.schema` = "this param is plain text")
export const labelComponent = textComponent;
export const proseComponent = textComponent;

// ============================================
// DSL HELPERS
// ============================================

/**
 * Create a plain text component node (no markdown parsing).
 * Use for structural chrome: eyebrows, attributions, copyright.
 *
 * @example
 * ```typescript
 * label("ARCHITECTURE", { style: TEXT_STYLE.EYEBROW })
 * label("— Jane Doe, CTO", { style: TEXT_STYLE.SMALL })
 * ```
 */
export function label(body: string, props?: TextProps): ComponentNode<TextComponentProps> {
  return component(Component.Text, { body, content: CONTENT.PLAIN, ...props });
}

/**
 * Create an inline rich text component node.
 * Supports bold, italic, and :color[highlights].
 * Block constructs (lists, headings) are disabled — `1. Problem` stays literal.
 * Rejects multi-paragraph input — use prose() for that.
 *
 * @example
 * ```typescript
 * text("1. Problem statement", { style: TEXT_STYLE.H4 })
 * text("**Bold** and :teal[highlighted]")
 * ```
 */
export function text(body: string, props?: TextProps): ComponentNode<TextComponentProps> {
  return component(Component.Text, { body, content: CONTENT.RICH, ...props });
}

/**
 * Create a structured rich text component node.
 * Supports bullets, paragraphs, bold, italic, and :color[highlights].
 *
 * @example
 * ```typescript
 * prose("**Bold** and :teal[highlighted] text.")
 * prose("- First bullet\n- Second bullet", { style: TEXT_STYLE.BODY })
 * ```
 */
export function prose(body: string, props?: TextProps): ComponentNode<TextComponentProps> {
  return component(Component.Text, { body, content: CONTENT.PROSE, ...props });
}
