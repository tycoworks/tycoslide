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

export type Slot = {
  key: string;
  shapeName: string;
  /** Fill strategy discriminator — required, no silent default. */
  type: SlotType;
  /** Leave the first N specimen paragraphs untouched (fillText only). */
  startAt?: number;
};

export type Layout = {
  name: string;
  slideNumber: number;
  description: string;
  whenToUse: string;
  whenNotToUse: string;
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
  /** Output filename. Required — no silent default. */
  output: string;
  steps: DeckStep[];
};

export type ThemeConfig = {
  layouts: Layout[];
  template: string;
  outputDir?: string;
};

export type Config = ThemeConfig & {
  rootDir: string;
};
