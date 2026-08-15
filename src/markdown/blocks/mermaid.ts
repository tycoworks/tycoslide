import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { Code } from "mdast";
import type { ImageFill } from "../../engine/index.js";
import { ImageFit, SlotType } from "../../engine/index.js";
import { MdastType } from "../mdast.js";
import { AcceptType, type BlockHandler, type CompilerConfig } from "../types.js";
import {
  buildMermaidRenderConfig,
  injectClassDefs,
  type MermaidVariant,
  validateMermaidDefinition,
} from "./mermaidTheme.js";

/** The markdown code-fence *language* that selects mermaid rendering. The CODE
 * handler reuses this to exclude mermaid so the two fence kinds match disjointly
 * on `lang`. */
export const MERMAID_LANG = "mermaid";

/**
 * Recognize a ```mermaid fenced block at a region's top level, folding it to an
 * Image fill, and compile it by rendering the definition to a PNG (cached under
 * `<outputDir>/.tycoslide-cache/mermaid/<hash>.png`) and wrapping it as an
 * ImageFill. Fit is always `contain` — mermaid diagrams are shown in their
 * entirety. Resolution is strict: the theme MUST carry a `mermaid` block, MUST
 * declare a `mermaidVariant`, and that variant MUST exist — each missing piece
 * throws by name.
 */
export const MERMAID: BlockHandler = {
  match: (node) => node.type === MdastType.Code && (node as Code).lang === MERMAID_LANG,
  acceptType: AcceptType.Image,
  compile: async (node, ctx): Promise<ImageFill> => {
    const definition = (node as Code).value;
    const { config } = ctx;
    if (!config.mermaid) {
      throw new Error(
        'Deck contains mermaid diagrams, but theme has no "mermaid" block. ' +
          "Add mermaid color configuration to theme.json.",
      );
    }

    const variantName = config.mermaidVariant;
    if (variantName === undefined) {
      throw new Error(
        `Layout "${ctx.layoutName}" slot content (from ${ctx.source}): deck contains a mermaid diagram but the theme ` +
          'declares no "mermaidVariant". Add a theme-level "mermaidVariant" naming a "mermaid" entry to theme.json.',
      );
    }

    const variant = config.mermaid[variantName];
    if (!variant) {
      throw new Error(
        `Slide layout "${ctx.layoutName}": mermaid variant "${variantName}" not found in theme. ` +
          `Available variants: ${Object.keys(config.mermaid).join(", ")}`,
      );
    }

    const cacheDir = ensureCacheDir(config);
    const pngPath = await renderOne(definition, variantName, variant, cacheDir);
    return { type: SlotType.Image, path: pngPath, fit: ImageFit.Contain };
  },
};

function hashKey(definition: string, variantName: string): string {
  return createHash("sha256").update(variantName).update("\n").update(definition).digest("hex").slice(0, 16);
}

function ensureCacheDir(config: CompilerConfig): string {
  const base = resolve(config.outputDir ?? process.cwd(), ".tycoslide-cache", "mermaid");
  mkdirSync(base, { recursive: true });
  return base;
}

async function renderOne(
  definition: string,
  variantName: string,
  variant: MermaidVariant,
  cacheDir: string,
): Promise<string> {
  const validated = validateMermaidDefinition(definition);

  const processed = injectClassDefs(
    validated,
    variant.accents,
    variant.accentOpacity,
    variant.accentTextColor,
    variant.surface,
    variant.groupCornerRadius,
  );

  const key = hashKey(processed, variantName);
  const outputPath = join(cacheDir, `${key}.png`);
  if (existsSync(outputPath)) return outputPath;

  const config = buildMermaidRenderConfig(variant);
  const inputPath = join(tmpdir(), `tycoslide-mermaid-${key}.mmd`);
  writeFileSync(inputPath, processed);

  // mermaid-cli's programmatic API (lazy-imported so puppeteer only loads when a
  // deck actually renders mermaid). Mirrors the old CLI flags: --configFile →
  // mermaidConfig, -b transparent → backgroundColor, -s 2 → deviceScaleFactor.
  const { run } = await import("@mermaid-js/mermaid-cli");
  try {
    await run(inputPath, outputPath as `${string}.png`, {
      quiet: true,
      outputFormat: "png",
      parseMMDOptions: {
        mermaidConfig: config,
        backgroundColor: "transparent",
        viewport: { width: 800, height: 600, deviceScaleFactor: 2 },
      },
    });
  } catch (e: any) {
    throw new Error(`Mermaid render failed:\n${e?.message ?? e}`);
  }

  return outputPath;
}
