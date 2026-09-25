/**
 * Inventory: what a template holds, in the terms `theme.json` needs. The slide
 * size, the colour and font schemes, the embedded typefaces; each slide's
 * position, layout, background tone and shapes (with frames in EMU, as
 * `theme.json` takes them); and which slides share the same geometry.
 */

import { AcceptType, collectElements, type Frame, PRESENTATION_PART } from "../index.js";
import { attributes, elementChildren, find, Part, type Presentation, partNumber, RelType } from "./pptx.js";

/** The element and attribute names the inventory reads. */
const Tag = {
  SLIDE_SIZE: "p:sldSz",
  SLIDE_ID_LIST: "p:sldIdLst",
  SLIDE_ID: "p:sldId",
  MASTER_ID_LIST: "p:sldMasterIdLst",
  MASTER_ID: "p:sldMasterId",
  EMBEDDED_FONT_LIST: "p:embeddedFontLst",
  EMBEDDED_FONT: "p:embeddedFont",
  FONT: "p:font",
  COMMON_SLIDE_DATA: "p:cSld",
  BACKGROUND: "p:bg",
  BACKGROUND_PROPS: "p:bgPr",
  BACKGROUND_REF: "p:bgRef",
  COLOR_MAP: "p:clrMap",
  COLOR_MAP_OVERRIDE: "p:clrMapOvr",
  OVERRIDE_COLOR_MAPPING: "a:overrideClrMapping",
  THEME_ELEMENTS: "a:themeElements",
  COLOR_SCHEME: "a:clrScheme",
  FONT_SCHEME: "a:fontScheme",
  MAJOR_FONT: "a:majorFont",
  MINOR_FONT: "a:minorFont",
  LATIN: "a:latin",
  FORMAT_SCHEME: "a:fmtScheme",
  FILL_STYLES: "a:fillStyleLst",
  BACKGROUND_FILL_STYLES: "a:bgFillStyleLst",
  SOLID_FILL: "a:solidFill",
  GRADIENT_FILL: "a:gradFill",
  PICTURE_FILL: "a:blipFill",
  GRADIENT_STOPS: "a:gsLst",
  GRADIENT_STOP: "a:gs",
  RGB_COLOR: "a:srgbClr",
  SCHEME_COLOR: "a:schemeClr",
  SYSTEM_COLOR: "a:sysClr",
  PRESET_COLOR: "a:prstClr",
  LUMINANCE_MOD: "a:lumMod",
  LUMINANCE_OFF: "a:lumOff",
  TINT: "a:tint",
  SHADE: "a:shade",
  SHAPE_TREE: "p:spTree",
  SHAPE: "p:sp",
  PICTURE: "p:pic",
  GRAPHIC_FRAME: "p:graphicFrame",
  GROUP: "p:grpSp",
  CONNECTOR: "p:cxnSp",
  SHAPE_PROPS: "p:spPr",
  GROUP_PROPS: "p:grpSpPr",
  TRANSFORM: "a:xfrm",
  GRAPHIC_FRAME_TRANSFORM: "p:xfrm",
  OFFSET: "a:off",
  EXTENT: "a:ext",
  TABLE: "a:tbl",
  TABLE_ROW: "a:tr",
  TABLE_GRID: "a:tblGrid",
  GRID_COLUMN: "a:gridCol",
  NON_VISUAL_PROPS: "p:cNvPr",
  NON_VISUAL_SHAPE: "p:nvSpPr",
  NON_VISUAL_SHAPE_PROPS: "p:cNvSpPr",
  APP_PROPS: "p:nvPr",
  PLACEHOLDER: "p:ph",
  PARAGRAPH: "a:p",
  LINE_BREAK: "a:br",
  TEXT: "a:t",
} as const;

/** Every shape's non-visual properties element is named `p:nv…Pr`, whatever the shape. */
const NON_VISUAL_PREFIX = "p:nv";

/** A colour-scheme slot's element, e.g. `a:accent1`. */
const schemeSlotElement = (slot: SchemeSlot) => `a:${slot}`;

const Attr = {
  REL_ID: "r:id",
  CX: "cx",
  CY: "cy",
  NAME: "name",
  TYPEFACE: "typeface",
  VALUE: "val",
  LAST_COLOR: "lastClr",
  INDEX: "idx",
  TYPE: "type",
  X: "x",
  Y: "y",
  TEXT_BOX: "txBox",
  WIDTH: "w",
  HEIGHT: "h",
} as const;

/** The twelve colour-scheme slots, in the order PowerPoint lists them. */
export const SCHEME_SLOTS = [
  "dk1",
  "lt1",
  "dk2",
  "lt2",
  "accent1",
  "accent2",
  "accent3",
  "accent4",
  "accent5",
  "accent6",
  "hlink",
  "folHlink",
] as const;
type SchemeSlot = (typeof SCHEME_SLOTS)[number];

/** A background's tone, as a layout's `variant` would describe it; `image` for a picture fill. */
export const Background = { Light: "light", Dark: "dark", Image: "image", Unknown: "unknown" } as const;
export type Background = (typeof Background)[keyof typeof Background];

/** Scheme slot → `#RRGGBB`. */
type SchemeColors = Partial<Record<SchemeSlot, string>>;
export type ColorScheme = { name: string } & SchemeColors;
export type FontScheme = { name: string; major?: string; minor?: string };

/** A shape's kind. A fillable shape's kind is the `theme.json` block type that fills it. */
export const ShapeKind = {
  Text: AcceptType.Text,
  Image: AcceptType.Image,
  Table: AcceptType.Table,
  Group: "group",
  Other: "other",
} as const;
export type ShapeKind = (typeof ShapeKind)[keyof typeof ShapeKind];

/** Where a placeholder that doesn't position itself takes its frame from. */
export const FrameSource = { Layout: "layout", Master: "master" } as const;
export type FrameSource = (typeof FrameSource)[keyof typeof FrameSource];

export type InventoryShape = {
  /** The shape's name; a group's members are prefixed with the group's name and `/`. */
  name: string;
  kind: ShapeKind;
  /** In EMU, as `theme.json` takes it. */
  frame?: Frame;
  frameFrom?: FrameSource;
  rows?: number;
  cols?: number;
  /**
   * The start of the shape's text, with `¶` between paragraphs and `↵` for line
   * breaks: where a parameter template puts `\n`.
   */
  text: string;
};

export type InventorySlide = {
  /** The number in the part name, `ppt/slides/slideN.xml`: what `theme.json`'s `slideNumber` means. */
  slide: number;
  /** 1-based position in presentation order (how rendered previews are numbered); absent when not shown. */
  position?: number;
  layout?: string;
  background: Background;
  shapes: InventoryShape[];
};

export type Inventory = {
  slideSize: { cx: number; cy: number };
  colorScheme: ColorScheme;
  fontScheme: FontScheme;
  embeddedFonts: string[];
  slides: InventorySlide[];
  /** Groups of slide numbers whose shapes have the same kinds and frames, to within a point. */
  duplicates: number[][];
};

/** A scheme colour's placeholder value, `phClr`: the colour its reference supplies. */
const PLACEHOLDER_COLOR = "phClr";
/** `sysClr` without a `lastClr` renders mid grey. */
const SYSTEM_COLOR_FALLBACK = "808080";
const PRESET_COLORS: Record<string, Rgb> = { white: [255, 255, 255], black: [0, 0, 0] };
/** OOXML percentages are in thousandths of a percent. */
const PERCENT = 100000;
/** `bgRef` indexes 1001 and up point into the background fill styles, 1–999 into the ordinary ones. */
const BACKGROUND_FILL_INDEX = 1001;
const FILL_INDEX = 1;
/** Above this relative luminance a background reads as light. */
const LIGHT_LUMINANCE = 0.5;
/** An 8-bit colour channel's maximum. */
const CHANNEL_MAX = 255;
/** `#RRGGBB`: the prefix, then two hex digits per channel. */
const HEX_PREFIX = "#";
const HEX_RADIX = 16;
const HEX_DIGITS = 2;
/** WCAG 2 relative luminance: sRGB linearisation, then per-channel weights. */
const WCAG = {
  LINEAR_BELOW: 0.03928,
  LINEAR_DIVISOR: 12.92,
  OFFSET: 0.055,
  SCALE: 1.055,
  GAMMA: 2.4,
  WEIGHTS: [0.2126, 0.7152, 0.0722],
} as const;

type Rgb = [number, number, number];
/** `bg1`/`tx1`/`bg2`/`tx2` → scheme slot. */
type ColorMap = Record<string, string>;

/** Read a template's inventory. */
export async function readInventory(presentation: Presentation): Promise<Inventory> {
  const root = await presentation.xml(PRESENTATION_PART);
  const targets = new Map((await presentation.relationships(PRESENTATION_PART)).map((rel) => [rel.id, rel.target]));
  const master = firstMaster(presentation, root, targets);
  const theme = master && (await presentation.related(master, RelType.Theme))[0];
  if (!master || !theme) throw new Error("Could not find a theme part for the first slide master.");

  const themeRoot = await presentation.xml(theme);
  const colorScheme = readColorScheme(themeRoot);
  const order = presentationOrder(root, targets);
  const slides: InventorySlide[] = [];
  for (const part of presentation.numbered(Part.Slide)) {
    const layout = (await presentation.related(part, RelType.SlideLayout))[0];
    const position = order.get(part);
    const layoutName = layout && find(await presentation.xml(layout), Tag.COMMON_SLIDE_DATA)?.getAttribute(Attr.NAME);
    const parts = { slide: part, layout, master };
    slides.push({
      slide: partNumber(part, Part.Slide),
      ...(position !== undefined && { position }),
      ...(layoutName && { layout: layoutName }),
      background: await classifyBackground(presentation, parts, themeRoot, colorScheme),
      shapes: await readShapes(presentation, parts),
    });
  }

  const size = find(root, Tag.SLIDE_SIZE);
  return {
    slideSize: { cx: Number(size.getAttribute(Attr.CX)), cy: Number(size.getAttribute(Attr.CY)) },
    colorScheme,
    fontScheme: readFontScheme(themeRoot),
    embeddedFonts: elementChildren(find(root, Tag.EMBEDDED_FONT_LIST), Tag.EMBEDDED_FONT).map((font) =>
      find(font, Tag.FONT).getAttribute(Attr.TYPEFACE),
    ),
    slides,
    duplicates: findDuplicates(slides),
  };
}

/** Relationship id → target part, for the presentation part. */
type Targets = Map<string, string>;

/** The presentation's first slide master, by its master list or else the lowest-numbered part. */
function firstMaster(presentation: Presentation, root: any, targets: Targets): string | undefined {
  for (const id of elementChildren(find(root, Tag.MASTER_ID_LIST), Tag.MASTER_ID)) {
    const target = targets.get(id.getAttribute(Attr.REL_ID));
    if (target) return target;
  }
  return presentation.numbered(Part.Master)[0];
}

/** Slide part → 1-based position in the presentation's slide list. */
function presentationOrder(root: any, targets: Targets): Map<string, number> {
  const order = new Map<string, number>();
  elementChildren(find(root, Tag.SLIDE_ID_LIST), Tag.SLIDE_ID).forEach((id, index) => {
    const target = targets.get(id.getAttribute(Attr.REL_ID));
    if (target) order.set(target, index + 1);
  });
  return order;
}

function readColorScheme(themeRoot: any): ColorScheme {
  const scheme = find(themeRoot, Tag.THEME_ELEMENTS, Tag.COLOR_SCHEME);
  const colors: ColorScheme = { name: scheme.getAttribute(Attr.NAME) };
  for (const slot of SCHEME_SLOTS) {
    const color = elementChildren(find(scheme, schemeSlotElement(slot)))[0];
    const rgb = color && resolveColor(color, {}, {});
    if (rgb) colors[slot] = hex(rgb);
  }
  return colors;
}

function readFontScheme(themeRoot: any): FontScheme {
  const scheme = find(themeRoot, Tag.THEME_ELEMENTS, Tag.FONT_SCHEME);
  const fonts: FontScheme = { name: scheme.getAttribute(Attr.NAME) };
  const major = find(scheme, Tag.MAJOR_FONT, Tag.LATIN)?.getAttribute(Attr.TYPEFACE);
  const minor = find(scheme, Tag.MINOR_FONT, Tag.LATIN)?.getAttribute(Attr.TYPEFACE);
  if (major) fonts.major = major;
  if (minor) fonts.minor = minor;
  return fonts;
}

// ── Backgrounds ───────────────────────────────────────────────────────────────

type Parts = { slide: string; layout?: string; master: string };

/** Light, dark or image, from the first background the slide, its layout or its master declares. */
async function classifyBackground(
  presentation: Presentation,
  parts: Parts,
  themeRoot: any,
  scheme: SchemeColors,
): Promise<Background> {
  let background: any;
  for (const part of [parts.slide, parts.layout, parts.master]) {
    background = part && find(await presentation.xml(part), Tag.COMMON_SLIDE_DATA, Tag.BACKGROUND);
    if (background) break;
  }
  if (!background) return Background.Unknown;

  const map = await colorMap(presentation, parts);
  const { fill, placeholder } = backgroundFill(background, themeRoot, scheme, map);
  if (!fill) return Background.Unknown;
  if (fill.tagName === Tag.PICTURE_FILL) return Background.Image;
  const rgb = fillColor(fill, scheme, map, placeholder);
  if (!rgb) return Background.Unknown;
  return relativeLuminance(rgb) > LIGHT_LUMINANCE ? Background.Light : Background.Dark;
}

/** The master's colour map, with the layout's then the slide's overrides applied. */
async function colorMap(presentation: Presentation, parts: Parts): Promise<ColorMap> {
  const map = attributes(find(await presentation.xml(parts.master), Tag.COLOR_MAP));
  for (const part of [parts.layout, parts.slide]) {
    if (!part) continue;
    const override = find(await presentation.xml(part), Tag.COLOR_MAP_OVERRIDE, Tag.OVERRIDE_COLOR_MAPPING);
    if (override) Object.assign(map, attributes(override));
  }
  return map;
}

/** The background's fill element, and the colour it gives `phClr` when it comes from a theme style. */
function backgroundFill(
  background: any,
  themeRoot: any,
  scheme: SchemeColors,
  map: ColorMap,
): { fill?: any; placeholder?: Rgb } {
  const props = find(background, Tag.BACKGROUND_PROPS);
  if (props) return { fill: elementChildren(props)[0] };
  const ref = find(background, Tag.BACKGROUND_REF);
  if (!ref) return {};
  const index = Number(ref.getAttribute(Attr.INDEX) ?? 0);
  const [list, first] =
    index >= BACKGROUND_FILL_INDEX
      ? [Tag.BACKGROUND_FILL_STYLES, BACKGROUND_FILL_INDEX]
      : [Tag.FILL_STYLES, FILL_INDEX];
  const styles = elementChildren(find(themeRoot, Tag.THEME_ELEMENTS, Tag.FORMAT_SCHEME, list));
  const fill = styles[index - first];
  if (!fill) return {};
  const color = elementChildren(ref)[0];
  return { fill, placeholder: color && resolveColor(color, scheme, map) };
}

/** A solid fill's colour, or a gradient's stops averaged. */
function fillColor(fill: any, scheme: SchemeColors, map: ColorMap, placeholder?: Rgb): Rgb | undefined {
  if (fill.tagName === Tag.SOLID_FILL) {
    const color = elementChildren(fill)[0];
    return color && resolveColor(color, scheme, map, placeholder);
  }
  if (fill.tagName === Tag.GRADIENT_FILL) {
    const stops = elementChildren(find(fill, Tag.GRADIENT_STOPS), Tag.GRADIENT_STOP)
      .map((stop) => elementChildren(stop)[0])
      .filter(Boolean)
      .map((color) => resolveColor(color, scheme, map, placeholder))
      .filter((rgb): rgb is Rgb => rgb !== undefined);
    if (stops.length) return [0, 1, 2].map((i) => stops.reduce((sum, rgb) => sum + rgb[i], 0) / stops.length) as Rgb;
  }
  return undefined;
}

// ── Shapes ────────────────────────────────────────────────────────────────────

const SHAPE_ELEMENTS: ReadonlySet<string> = new Set([
  Tag.SHAPE,
  Tag.PICTURE,
  Tag.GRAPHIC_FRAME,
  Tag.GROUP,
  Tag.CONNECTOR,
]);
const GROUP_SEPARATOR = "/";
const PARAGRAPH_MARK = "¶";
const LINE_BREAK_MARK = "↵";
const TEXT_PREVIEW_CHARS = 80;
const TEXT_BOX_ON = "1";
/** A placeholder with no `type` is a body placeholder. */
const DEFAULT_PLACEHOLDER_TYPE = "body";
/** Placeholder types that stand in for one another when a layout or master is searched for a frame. */
const EQUIVALENT_PLACEHOLDER: Record<string, string> = { ctrTitle: "title", subTitle: "body", obj: "body" };

type PlaceholderFrame = { type: string; idx?: string; frame?: Frame };

/** The slide's shapes in document order, groups' members after the group, placeholder frames inherited. */
async function readShapes(presentation: Presentation, parts: Parts): Promise<InventoryShape[]> {
  const tree = find(await presentation.xml(parts.slide), Tag.COMMON_SLIDE_DATA, Tag.SHAPE_TREE);
  const found = walkShapes(tree, "");
  const sources: [FrameSource, PlaceholderFrame[]][] = [
    [FrameSource.Layout, parts.layout ? placeholderFrames(await presentation.xml(parts.layout)) : []],
    [FrameSource.Master, placeholderFrames(await presentation.xml(parts.master))],
  ];
  for (const { shape, el } of found) {
    const placeholder = el.tagName === Tag.SHAPE && placeholderOf(el);
    if (shape.frame || !placeholder) continue;
    for (const [source, frames] of sources) {
      const frame = matchingFrame(placeholder, frames);
      if (frame) {
        shape.frame = frame;
        shape.frameFrom = source;
        break;
      }
    }
  }
  // Set fields only, in a fixed order, and the text cut to a preview.
  return found.map(({ shape: { name, kind, frame, frameFrom, rows, cols, text } }) => ({
    name,
    kind,
    ...(frame && { frame }),
    ...(frameFrom && { frameFrom }),
    ...(rows !== undefined && { rows, cols }),
    text: Array.from(text).slice(0, TEXT_PREVIEW_CHARS).join(""),
  }));
}

function walkShapes(container: any, prefix: string): { shape: InventoryShape; el: any }[] {
  return elementChildren(container)
    .filter((el) => SHAPE_ELEMENTS.has(el.tagName))
    .flatMap((el) => {
      const shape = describeShape(el, prefix);
      const members = el.tagName === Tag.GROUP ? walkShapes(el, shape.name + GROUP_SEPARATOR) : [];
      return [{ shape, el }, ...members];
    });
}

function describeShape(el: any, prefix: string): InventoryShape {
  const table = collectElements(el, Tag.TABLE)[0];
  return {
    name: prefix + (find(nonVisualProps(el), Tag.NON_VISUAL_PROPS)?.getAttribute(Attr.NAME) ?? ""),
    kind: shapeKind(el, table),
    frame: table ? tableFrame(el, table) : shapeFrame(el),
    rows: table && elementChildren(table, Tag.TABLE_ROW).length,
    cols: table && elementChildren(find(table, Tag.TABLE_GRID), Tag.GRID_COLUMN).length,
    text: el.tagName === Tag.GROUP ? "" : shapeText(el),
  };
}

function shapeKind(el: any, table: any): ShapeKind {
  switch (el.tagName) {
    case Tag.PICTURE:
      return ShapeKind.Image;
    case Tag.GROUP:
      return ShapeKind.Group;
    case Tag.GRAPHIC_FRAME:
      return table ? ShapeKind.Table : ShapeKind.Other;
    case Tag.SHAPE: {
      const isTextBox =
        find(el, Tag.NON_VISUAL_SHAPE, Tag.NON_VISUAL_SHAPE_PROPS)?.getAttribute(Attr.TEXT_BOX) === TEXT_BOX_ON;
      return placeholderOf(el) || isTextBox || shapeText(el) ? ShapeKind.Text : ShapeKind.Other;
    }
    default:
      return ShapeKind.Other;
  }
}

/** The shape's text, `¶` between paragraphs and `↵` for line breaks, whitespace collapsed. */
function shapeText(el: any): string {
  const paragraphs = collectElements(el, Tag.PARAGRAPH).map((paragraph) =>
    elementChildren(paragraph)
      .flatMap((child) =>
        child.tagName === Tag.LINE_BREAK
          ? [LINE_BREAK_MARK]
          : collectElements(child, Tag.TEXT).map((text) => text.textContent ?? ""),
      )
      .join(" ")
      .split(/\s+/)
      .filter(Boolean)
      .join(" "),
  );
  return paragraphs.filter(Boolean).join(` ${PARAGRAPH_MARK} `);
}

/** The shape's own frame, if it declares one. */
function shapeFrame(el: any): Frame | undefined {
  const transform =
    (el.tagName === Tag.GRAPHIC_FRAME
      ? find(el, Tag.GRAPHIC_FRAME_TRANSFORM)
      : find(el, Tag.SHAPE_PROPS, Tag.TRANSFORM)) ?? find(el, Tag.GROUP_PROPS, Tag.TRANSFORM);
  const offset = find(transform, Tag.OFFSET);
  const extent = find(transform, Tag.EXTENT);
  if (!offset || !extent) return undefined;
  return {
    x: Number(offset.getAttribute(Attr.X)),
    y: Number(offset.getAttribute(Attr.Y)),
    cx: Number(extent.getAttribute(Attr.CX)),
    cy: Number(extent.getAttribute(Attr.CY)),
  };
}

/**
 * A table's frame: where its graphic frame puts it, at the size its column widths
 * and row heights give it. PowerPoint draws a table at that size, rows growing
 * taller when their text needs it, and some tools (Google Slides among them)
 * write a placeholder size on the frame.
 */
function tableFrame(el: any, table: any): Frame | undefined {
  const frame = shapeFrame(el);
  if (!frame) return undefined;
  const total = (els: any[], attr: string) => els.reduce((sum, e) => sum + Number(e.getAttribute(attr) || 0), 0);
  return {
    ...frame,
    cx: total(elementChildren(find(table, Tag.TABLE_GRID), Tag.GRID_COLUMN), Attr.WIDTH) || frame.cx,
    cy: total(elementChildren(table, Tag.TABLE_ROW), Attr.HEIGHT) || frame.cy,
  };
}

function nonVisualProps(el: any): any {
  return elementChildren(el).find((child) => child.tagName.startsWith(NON_VISUAL_PREFIX));
}

function placeholderOf(el: any): any {
  return find(nonVisualProps(el), Tag.APP_PROPS, Tag.PLACEHOLDER);
}

/** Every placeholder in a layout or master, with its type, index and frame. */
function placeholderFrames(root: any): PlaceholderFrame[] {
  return collectElements(root, Tag.SHAPE).flatMap((el) => {
    const placeholder = placeholderOf(el);
    if (!placeholder) return [];
    const frame = shapeFrame(el);
    return [{ type: placeholderType(placeholder), idx: placeholder.getAttribute(Attr.INDEX) ?? undefined, frame }];
  });
}

/** The frame of the placeholder with the same index, or else of an equivalent type. */
function matchingFrame(placeholder: any, frames: PlaceholderFrame[]): Frame | undefined {
  const idx = placeholder.getAttribute(Attr.INDEX);
  const type = equivalentType(placeholderType(placeholder));
  return (
    (idx ? frames.find((candidate) => candidate.idx === idx && candidate.frame)?.frame : undefined) ??
    frames.find((candidate) => equivalentType(candidate.type) === type && candidate.frame)?.frame
  );
}

function placeholderType(placeholder: any): string {
  return placeholder.getAttribute(Attr.TYPE) || DEFAULT_PLACEHOLDER_TYPE;
}

function equivalentType(type: string): string {
  return EQUIVALENT_PLACEHOLDER[type] ?? type;
}

// ── Duplicates ────────────────────────────────────────────────────────────────

/** Frames closer than this (one point, in EMU) count as equal. */
const GEOMETRY_TOLERANCE = 12700;

type Geometry = { kind: ShapeKind; frame: Frame }[];

/** Groups of slide numbers whose shapes have the same kinds and frames. */
function findDuplicates(slides: InventorySlide[]): number[][] {
  const groups: { geometry: Geometry; slides: number[] }[] = [];
  for (const slide of slides) {
    if (!slide.shapes.length) continue;
    const geometry = slide.shapes.flatMap(({ kind, frame }) => (frame ? [{ kind, frame }] : []));
    const group = groups.find((candidate) => sameGeometry(geometry, candidate.geometry));
    if (group) group.slides.push(slide.slide);
    else groups.push({ geometry, slides: [slide.slide] });
  }
  return groups.filter((group) => group.slides.length > 1).map((group) => group.slides);
}

/** True when the two sets of (kind, frame) match one for one, within the tolerance. */
function sameGeometry(a: Geometry, b: Geometry): boolean {
  if (a.length !== b.length) return false;
  const remaining = [...b];
  for (const { kind, frame } of a) {
    const match = remaining.findIndex(
      (other) =>
        other.kind === kind &&
        (Object.keys(frame) as (keyof Frame)[]).every(
          (key) => Math.abs(frame[key] - other.frame[key]) <= GEOMETRY_TOLERANCE,
        ),
    );
    if (match === -1) return false;
    remaining.splice(match, 1);
  }
  return true;
}

// ── Colours ───────────────────────────────────────────────────────────────────

/**
 * An `a:srgbClr` / `a:schemeClr` / `a:sysClr` / `a:prstClr` as RGB, modifiers applied.
 * Scheme slots are looked up as named (a scheme can be deliberately inverted); only
 * `bg1`/`tx1`/`bg2`/`tx2`, which aren't slots, go through the colour map.
 */
function resolveColor(el: any, scheme: SchemeColors, map: ColorMap, placeholder?: Rgb): Rgb | undefined {
  let rgb: Rgb | undefined;
  switch (el.tagName) {
    case Tag.RGB_COLOR:
      rgb = parseHex(el.getAttribute(Attr.VALUE));
      break;
    case Tag.SYSTEM_COLOR:
      rgb = parseHex(el.getAttribute(Attr.LAST_COLOR) || SYSTEM_COLOR_FALLBACK);
      break;
    case Tag.PRESET_COLOR:
      rgb = PRESET_COLORS[el.getAttribute(Attr.VALUE)];
      break;
    case Tag.SCHEME_COLOR: {
      const value = el.getAttribute(Attr.VALUE);
      if (value === PLACEHOLDER_COLOR) return placeholder;
      const slotHex = scheme[(map[value] ?? value) as SchemeSlot];
      rgb = slotHex ? parseHex(slotHex.slice(HEX_PREFIX.length)) : undefined;
      break;
    }
    default:
      return undefined;
  }
  return rgb && applyModifiers(rgb, el);
}

/** Approximate `lumMod` / `lumOff` / `tint` / `shade`, so "accent1 at 20%" reads correctly. */
function applyModifiers(rgb: Rgb, el: any): Rgb {
  let [r, g, b] = rgb.map((c) => c / CHANNEL_MAX);
  for (const mod of elementChildren(el)) {
    const value = Number(mod.getAttribute(Attr.VALUE) || 0) / PERCENT;
    if (mod.tagName === Tag.LUMINANCE_MOD || mod.tagName === Tag.LUMINANCE_OFF) {
      const [h, l, s] = rgbToHls(r, g, b);
      const lightness = mod.tagName === Tag.LUMINANCE_MOD ? l * value : l + value;
      [r, g, b] = hlsToRgb(h, Math.min(Math.max(lightness, 0), 1), s);
    } else if (mod.tagName === Tag.TINT) {
      [r, g, b] = [r, g, b].map((c) => 1 - (1 - c) * value);
    } else if (mod.tagName === Tag.SHADE) {
      [r, g, b] = [r, g, b].map((c) => c * value);
    }
  }
  return [r, g, b].map((c) => c * CHANNEL_MAX) as Rgb;
}

function relativeLuminance(rgb: Rgb): number {
  return rgb.reduce((sum, channel, i) => {
    const v = channel / CHANNEL_MAX;
    const linear = v <= WCAG.LINEAR_BELOW ? v / WCAG.LINEAR_DIVISOR : ((v + WCAG.OFFSET) / WCAG.SCALE) ** WCAG.GAMMA;
    return sum + WCAG.WEIGHTS[i] * linear;
  }, 0);
}

function rgbToHls(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, l, 0];
  const range = max - min;
  const s = l <= 0.5 ? range / (max + min) : range / (2 - max - min);
  const [rc, gc, bc] = [(max - r) / range, (max - g) / range, (max - b) / range];
  const h = r === max ? bc - gc : g === max ? 2 + rc - bc : 4 + gc - rc;
  return [mod1(h / 6), l, s];
}

function hlsToRgb(h: number, l: number, s: number): [number, number, number] {
  if (s === 0) return [l, l, l];
  const m2 = l <= 0.5 ? l * (1 + s) : l + s - l * s;
  const m1 = 2 * l - m2;
  const channel = (hue: number) => {
    const t = mod1(hue);
    if (t < 1 / 6) return m1 + (m2 - m1) * t * 6;
    if (t < 0.5) return m2;
    if (t < 2 / 3) return m1 + (m2 - m1) * (2 / 3 - t) * 6;
    return m1;
  };
  return [channel(h + 1 / 3), channel(h), channel(h - 1 / 3)];
}

/** `x` wrapped into [0, 1). */
function mod1(x: number): number {
  return ((x % 1) + 1) % 1;
}

/** `RRGGBB` → RGB. */
function parseHex(hexValue: string): Rgb {
  return [0, 1, 2].map((i) => Number.parseInt(hexValue.slice(i * HEX_DIGITS, (i + 1) * HEX_DIGITS), HEX_RADIX)) as Rgb;
}

/** `#RRGGBB`, each channel rounded half to even. */
function hex(rgb: Rgb): string {
  const digits = rgb.map((c) => roundHalfEven(c).toString(HEX_RADIX).toUpperCase().padStart(HEX_DIGITS, "0"));
  return HEX_PREFIX + digits.join("");
}

function roundHalfEven(x: number): number {
  const floor = Math.floor(x);
  const diff = x - floor;
  if (diff !== 0.5) return Math.round(x);
  return floor % 2 === 0 ? floor : floor + 1;
}
