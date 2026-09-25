export { childrenByTag, collectElements } from "./dom.js";
export { FILLERS } from "./fillers/filler.js";
export { fillImage } from "./fillers/image.js";
export { fillTable, isTableFill } from "./fillers/table.js";
export { fillTemplate } from "./fillers/template.js";
export { fillText, isTextFill } from "./fillers/text.js";
export type { GenerateOptions } from "./generate.js";
export { generate } from "./generate.js";
export type { Relationship } from "./ooxml.js";
export { PRESENTATION_PART, parseXml, readRelationships, relsPathFor, resolveTarget } from "./ooxml.js";
export type {
  Block,
  BodyRows,
  Config,
  Deck,
  DeckStep,
  Frame,
  ImageFill,
  Layout,
  Slot,
  StyledParagraph,
  TableFill,
  TemplateFill,
  TemplateSegment,
  TextFill,
  TextRun,
  ThemeConfig,
} from "./types.js";
export { ImageFit, SlotType, TEMPLATE_DIR } from "./types.js";
