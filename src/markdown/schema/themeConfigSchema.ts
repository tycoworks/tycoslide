import { readFileSync } from "node:fs";
import { basename, dirname } from "node:path";
import * as z from "zod";
import {
  AcceptType,
  AssetType,
  type CompilerConfig,
  type CompilerThemeConfig,
  ParameterType,
  RowRole,
  Variant,
} from "../types.js";
import { strict } from "./strict.js";

/**
 * Fail-fast runtime validation for a `theme.json`. The hand-written types in
 * `types.ts` stay canonical (they carry load-bearing doc-comments and export the
 * const-object enums used as runtime values); this schema is declared alongside
 * and bound to them by a compile-time drift guard (`_drift` below). The guard
 * catches required-field and type drift in either direction, but — because TS
 * structural assignability is lenient about ADDITIVE optional fields — it will
 * NOT catch a schema that's missing an optional field the hand-written type
 * declares. The `fullTheme()` fixture in `themeConfigSchema.test.ts`, which
 * populates every optional field, is the runtime backstop for that gap.
 *
 * Every object is a `strictObject` so an unknown key throws instead of being
 * silently dropped — strictness does NOT propagate, so each nested object is
 * independently strict. The two exceptions are the `AssetCatalog` and `mermaid`
 * records, whose keys are user-defined category/asset/variant names (a
 * `z.record`, open by design); strictness lands on their leaf entries.
 */

// Reuse the const-object enums as runtime values — no third copy of the literals.
const assetTypeSchema = z.enum(Object.values(AssetType) as [AssetType, ...AssetType[]]);
const variantSchema = z.enum(Object.values(Variant) as [Variant, ...Variant[]]);
const rowRoleSchema = z.enum(Object.values(RowRole) as [RowRole, ...RowRole[]]);

// Re-declared here (not imported from the engine) so the schema layer never
// depends on the engine — mirrors engine `Frame`, guarded by `_drift`.
const FrameSchema = strict({
  x: z.number(),
  y: z.number(),
  cx: z.number(),
  cy: z.number(),
});

const LimitSchema = strict({
  maxChars: z.number().optional(),
  maxLines: z.number().optional(),
  maxItems: z.number().optional(),
});

const AssetEntrySchema = strict({
  path: z.string(),
  type: assetTypeSchema,
  description: z.string(),
});

// AssetCatalog: `{ category: { name: AssetEntry } }`. The two record levels are
// OPEN (names are user-defined); only the leaf entry is strict.
const AssetCatalogSchema = z.record(z.string(), z.record(z.string(), AssetEntrySchema));

const MermaidVariantSchema = strict({
  primary: z.string(),
  primaryContrast: z.string(),
  text: z.string(),
  line: z.string(),
  surface: z.string(),
  surfaceBorder: z.string(),
  fontFamily: z.string(),
  accents: z.array(z.string()),
  accentOpacity: z.number(),
  accentTextColor: z.string(),
  groupCornerRadius: z.number(),
});

// MermaidConfig: `Record<variantName, MermaidVariant>` — open keys, strict leaf.
const MermaidConfigSchema = z.record(z.string(), MermaidVariantSchema);

const ThemeFontSchema = strict({
  family: z.string(),
  path: z.string(),
  weight: z.number().optional(),
});

const TemplateParamSchema = strict({
  shapeName: z.string(),
  limit: LimitSchema.optional(),
  required: z.boolean().optional(),
  type: z.literal(ParameterType.Template),
  template: z.string(),
});

const ImageParamSchema = strict({
  shapeName: z.string(),
  required: z.boolean().optional(),
  key: z.string(),
  type: z.literal(ParameterType.Image),
});

const ParameterSchema = z.discriminatedUnion("type", [TemplateParamSchema, ImageParamSchema]);

// One arm per accept type, discriminated by `type`, mirroring `CompilerBlock`:
// `startAt` lives only on the text arm, and a non-empty `rows` only on the table
// arm (a table block MUST label each `<a:tbl>` row; text/image arms have no
// `rows` field, so a stray one is an unknown key the `strict` arm rejects).
const TextBlockSchema = strict({
  type: z.literal(AcceptType.Text),
  sourceSlide: z.number(),
  shapeName: z.string(),
  startAt: z.number().optional(),
});
const TableBlockSchema = strict({
  type: z.literal(AcceptType.Table),
  sourceSlide: z.number(),
  shapeName: z.string(),
  rows: z.array(rowRoleSchema).min(1),
});
const ImageBlockSchema = strict({
  type: z.literal(AcceptType.Image),
  sourceSlide: z.number(),
  shapeName: z.string(),
});
const BlockSchema = z.discriminatedUnion("type", [TextBlockSchema, TableBlockSchema, ImageBlockSchema]);

const SlotSchema = strict({
  key: z.string(),
  accepts: z.array(BlockSchema),
  frame: FrameSchema.optional(),
  limit: LimitSchema.optional(),
  required: z.boolean().optional(),
});

const LayoutSchema = strict({
  name: z.string(),
  slideNumber: z.number(),
  description: z.string().optional(),
  variant: variantSchema.optional(),
  parameters: z.array(ParameterSchema),
  slots: z.array(SlotSchema),
});

export const ThemeConfigSchema = strict({
  layouts: z.array(LayoutSchema),
  assets: AssetCatalogSchema,
  template: z.string(),
  mermaid: MermaidConfigSchema.optional(),
  fonts: z.array(ThemeFontSchema).optional(),
  codeTheme: z.union([z.string(), strict({ light: z.string().min(1), dark: z.string().min(1) })]).optional(),
  mermaidVariant: z.string().optional(),
});

// Compile-time drift guard: tsc fails if the schema's inferred type and the
// canonical hand-written type diverge in either direction. `rootDir` is added
// AFTER load (see `CompilerConfig`), so it is intentionally absent here.
type Mutual<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;

// Top-level-only strengthening of `Mutual`: also requires the two sides' key
// sets to match exactly. Plain structural assignability lets a type with FEWER
// optional properties satisfy one with more (that's the gap `Mutual` alone
// misses), but `keyof` comparison in both directions forces the key sets
// themselves to be identical before `Mutual` even runs.
type Exact<A, B> = [keyof A] extends [keyof B] ? ([keyof B] extends [keyof A] ? Mutual<A, B> : never) : never;
const _drift: Exact<z.infer<typeof ThemeConfigSchema>, CompilerThemeConfig> = true;
void _drift;

/**
 * Parse+validate a raw `theme.json` value into a `CompilerThemeConfig`, throwing
 * a fail-fast error (naming the source file and, for unknown keys, the valid set)
 * on any structural violation. This is the ONE loader both the CLI and the
 * programmatic entry route through, so every caller validates identically.
 */
export function parseThemeConfig(raw: unknown, sourcePath: string): CompilerThemeConfig {
  const r = ThemeConfigSchema.safeParse(raw);
  if (!r.success) {
    throw new Error(`${basename(sourcePath)}: invalid theme config\n${z.prettifyError(r.error)}`);
  }
  return r.data;
}

/**
 * Read, validate, and root a `theme.json` at `absPath` into a `CompilerConfig`.
 * The single loader the CLI and programmatic callers share: file read/JSON
 * failures fail fast with the path; structural failures go through
 * `parseThemeConfig`. `rootDir` (the config's directory) is attached AFTER
 * validation — it is not a JSON field.
 */
export function loadThemeConfig(absPath: string): CompilerConfig {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(absPath, "utf-8"));
  } catch {
    throw new Error(`Config file not found or invalid JSON: ${absPath}`);
  }
  return { ...parseThemeConfig(raw, absPath), rootDir: dirname(absPath) };
}
