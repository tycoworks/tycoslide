/**
 * Fill-strategy discriminator carried on every Slot. Required — there is no
 * silent default. The engine dispatches to fillTemplate / fillText / fillTable /
 * fillImage based on this value.
 */
export const SlotType = {
  /** fillTemplate: walk existing runs, replace each in place. */
  Template: "template",
  /** fillText: rebuild paragraphs from harvested specimen styles. */
  Text: "text",
  /** fillTable: clone specimen rows in an `<a:tbl>`. */
  Table: "table",
  /** fillImage: swap the picture's blip and adjust frame geometry. */
  Image: "image",
} as const;
export type SlotType = (typeof SlotType)[keyof typeof SlotType];

/**
 * The role a specimen table row plays, labelled per row on a table `Block`. The
 * fill composer maps the deck's data rows onto specimen rows by role rather than
 * cloning positionally: `Header` styles the header, `First` styles the single row
 * under it (used once, never looped — looping the under-header row erases the
 * divider above interior rows), and `Body` rows cycle to fill the middle.
 */
export const RowRole = {
  Header: "header",
  First: "first",
  Body: "body",
} as const;
export type RowRole = (typeof RowRole)[keyof typeof RowRole];

/** A single styled span of text within a paragraph. */
export type TextRun = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  underline?: boolean;
  link?: string;
  color?: string;
};

/**
 * The engine's one normalized text shape. `bullet` presence encodes both
 * bullet-ness and level: absent = non-bullet, present = bullet at that level.
 */
export type StyledParagraph = {
  runs: TextRun[];
  bullet?: { level: number };
};

/**
 * One piece of a template line handed to fillTemplate: a fixed `literal`, or a
 * `variable` carrying its already-substituted `value` (the `key` is kept only
 * for error messages). The compiler parses each template line into an ordered
 * list of these; the engine matches the literals against the shape's sample
 * text to place each variable's value in the run that carries its style. The
 * engine never parses `{}` syntax.
 */
export type TemplateSegment = { kind: "literal"; text: string } | { kind: "variable"; key: string; value: string };

/**
 * Input to fillTemplate — one segment list per line (mapping to the shape's `<a:p>`
 * in order). Distinguished from the other fills by its `lines` array.
 */
export type TemplateFill = { lines: TemplateSegment[][] };

/**
 * Input to fillText — a shape's paragraphs rebuilt from harvested specimen
 * styles. Distinguished from the other fills by its `paragraphs` array. Like
 * the other three fills, `fillText` takes this whole object; the four
 * `DeckStep.content` value shapes read as one family.
 */
export type TextFill = { paragraphs: StyledParagraph[] };

/** Input to fillTable — headers and body rows as styled cells. */
export type TableFill = {
  headers: StyledParagraph[];
  rows: StyledParagraph[][];
};

/**
 * How a picture is scaled into its frame — the engine's image-sizing directive,
 * mirroring CSS `object-fit`. `contain`: fit the whole image, scale both ways,
 * letterbox. `cover`: fill the frame, centre-crop the overflow. `scale-down`:
 * like contain but never enlarge past native (a small image sits at native size).
 */
export const ImageFit = {
  Contain: "contain",
  Cover: "cover",
  ScaleDown: "scale-down",
} as const;
export type ImageFit = (typeof ImageFit)[keyof typeof ImageFit];

/**
 * Input to fillImage — a resolved image path plus its object-fit directive.
 * `path` must be absolute; the compiler resolves it (and maps the asset's
 * semantic type to a `fit`) before the ImageFill reaches the engine.
 */
export type ImageFill = {
  type: typeof SlotType.Image;
  path: string;
  fit: ImageFit;
};

/** A shape's absolute position and size, in EMU — the slot's frame. */
export type Frame = { x: number; y: number; cx: number; cy: number };

/**
 * A kind of content a slot accepts, and the real template shape that realizes
 * it — a union discriminated by `type` (the fill-strategy selector), so each
 * variant carries only its own specimen options. `shapeName` names the shape on
 * `sourceSlide` that carries the specimen styling; when `sourceSlide` equals the
 * layout's `baseSlide` the shape is already on the cloned slide (fill in place),
 * otherwise it is transplanted from `sourceSlide` into the slot's frame. A text
 * block may pin `startAt` (leave the first N specimen paragraphs untouched); a
 * table block MUST label each `<a:tbl>` specimen row with a `RowRole` (required);
 * a template or image block carries neither. `Template` reaches the engine only
 * via a frontmatter parameter (`paramToEngineSlot`), never as an author body block.
 *
 * Named `Block` — a kind of content the way an author thinks of it. Distinct
 * from the compiler's `MarkdownBlock` (a parsed markdown block); different layer,
 * kept separate on purpose.
 */
export type TemplateBlock = { type: typeof SlotType.Template; sourceSlide: number; shapeName: string };
export type TextBlock = { type: typeof SlotType.Text; sourceSlide: number; shapeName: string; startAt?: number };
export type TableBlock = { type: typeof SlotType.Table; sourceSlide: number; shapeName: string; rows: RowRole[] };
export type ImageBlock = { type: typeof SlotType.Image; sourceSlide: number; shapeName: string };
export type Block = TemplateBlock | TextBlock | TableBlock | ImageBlock;

/**
 * An author-facing fill region. Not welded to one shape+type: a slot owns its
 * `frame` and `accepts` a set of `Block`s; the supplied value's shape selects
 * which block fills. A block whose `sourceSlide === baseSlide` fills in place;
 * any other block is transplanted into the slot's `frame`.
 */
export type Slot = {
  key: string;
  frame: Frame;
  accepts: Block[];
};

export type Layout = {
  name: string;
  /**
   * The template slide cloned for chrome/background. A block whose `sourceSlide`
   * equals this is filled in place; any other block is transplanted onto the clone.
   */
  baseSlide: number;
  slots: Slot[];
};

export type DeckStep = {
  layout: string;
  content?: Record<string, TextFill | TableFill | ImageFill | TemplateFill>;
  /** Slide-level speaker notes — plain text, one paragraph per line. Not a slot. */
  notes?: string;
};

export type Deck = {
  theme: string;
  /** Absolute output path for the .pptx. Required — no silent default. */
  output: string;
  steps: DeckStep[];
};

export type ThemeConfig = {
  layouts: Layout[];
  template: string;
};

export type Config = ThemeConfig & {
  rootDir: string;
};
