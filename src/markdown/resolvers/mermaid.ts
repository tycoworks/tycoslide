import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { ImageFill } from "../../engine/index.js";
import { FitMode, SlotType } from "../../engine/index.js";
import { type CompilerConfig, CompilerSlotType, FenceType, type MermaidFence } from "../types.js";
import {
  buildMermaidRenderConfig,
  injectClassDefs,
  type MermaidVariant,
  validateMermaidDefinition,
} from "./mermaidTheme.js";
import type { Resolver } from "./resolver.js";

/** Discriminator for MermaidFence values. Doubles as `MermaidResolver.matches`. */
export function isMermaidBlock(v: unknown): v is MermaidFence {
  return (
    typeof v === "object" && v !== null && !Array.isArray(v) && (v as { type?: unknown }).type === FenceType.Mermaid
  );
}

function findMmdc(): string {
  try {
    const resolved = execFileSync("npx", ["--no-install", "which", "mmdc"], {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    if (resolved) return resolved;
  } catch {
    // fall through
  }
  throw new Error("mermaid-cli is required for mermaid diagrams. Install it: npm i -D @mermaid-js/mermaid-cli");
}

function hashKey(definition: string, variantName: string): string {
  return createHash("sha256").update(variantName).update("\n").update(definition).digest("hex").slice(0, 16);
}

function ensureCacheDir(config: CompilerConfig): string {
  const base = resolve(config.outputDir ?? process.cwd(), ".tycoslide-cache", "mermaid");
  mkdirSync(base, { recursive: true });
  return base;
}

function renderOne(
  definition: string,
  variantName: string,
  variant: MermaidVariant,
  cacheDir: string,
  mmdcPath: string,
): string {
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
  const scratch = tmpdir();
  const configPath = join(scratch, `tycoslide-mermaid-config-${key}.json`);
  const inputPath = join(scratch, `tycoslide-mermaid-${key}.mmd`);

  writeFileSync(configPath, JSON.stringify(config));
  writeFileSync(inputPath, processed);

  try {
    execFileSync(
      mmdcPath,
      ["-i", inputPath, "-o", outputPath, "--configFile", configPath, "-b", "transparent", "-s", "2"],
      { stdio: ["pipe", "pipe", "pipe"], timeout: 30_000 },
    );
  } catch (e: any) {
    const stderr = e.stderr?.toString() ?? e.message;
    throw new Error(`Mermaid render failed:\n${stderr}`);
  }

  return outputPath;
}

/**
 * Resolve one MermaidFence into an ImageFill by rendering it to a PNG (cached
 * under `<outputDir>/.tycoslide-cache/mermaid/<hash>.png`). Fit is always `contain` —
 * mermaid diagrams are shown in their entirety.
 *
 * Resolution is strict: the deck's theme MUST carry a `mermaid` block, the
 * fence's slot MUST declare `mermaidVariant`, and that variant MUST exist in
 * the theme — each missing piece throws by name.
 */
export const MermaidResolver: Resolver<MermaidFence> = {
  matches: isMermaidBlock,
  async resolve(fence, ctx): Promise<ImageFill> {
    const { config } = ctx;
    if (!config.mermaid) {
      throw new Error(
        'Deck contains mermaid diagrams, but theme has no "mermaid" block. ' +
          "Add mermaid color configuration to theme.json.",
      );
    }

    const variantName = ctx.slot.type === CompilerSlotType.Mermaid ? ctx.slot.mermaidVariant : undefined;
    if (variantName === undefined) {
      throw new Error(
        `Layout "${ctx.layout.name}": mermaid slot "${ctx.key}" has no "mermaidVariant" declared. ` +
          "Every slot with type=mermaid must declare its variant explicitly.",
      );
    }

    const variant = config.mermaid[variantName];
    if (!variant) {
      throw new Error(
        `Slide layout "${ctx.layout.name}": mermaid variant "${variantName}" not found in theme. ` +
          `Available variants: ${Object.keys(config.mermaid).join(", ")}`,
      );
    }

    const mmdcPath = findMmdc();
    const cacheDir = ensureCacheDir(config);
    const pngPath = renderOne(fence.definition, variantName, variant, cacheDir, mmdcPath);
    return { type: SlotType.Image, path: pngPath, fit: FitMode.Contain };
  },
};
