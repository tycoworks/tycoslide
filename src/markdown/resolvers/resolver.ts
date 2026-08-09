import type { ImageFill, TextFill } from "../../engine/index.js";
import {
  type CodeFence,
  type CompilerConfig,
  type CompilerDeck,
  type CompilerLayout,
  type CompilerSlot,
  FenceType,
  type MarkdownBlock,
  type MermaidFence,
} from "../types.js";
import { CodeResolver } from "./code.js";
import { MermaidResolver } from "./mermaid.js";

/**
 * Everything a resolver needs to turn one fence into a fill: the step's layout
 * (its name feeds diagnostics), the slot the fence fills (carries the per-slot
 * config a resolver reads — `codeTheme` / `mermaidVariant`), the slot key (error
 * messages), and the theme-level config (mermaid variants, output dir).
 */
export type ResolveContext = {
  layout: CompilerLayout;
  slot: CompilerSlot;
  key: string;
  config: CompilerConfig;
};

/**
 * A compiler-side strategy that turns ONE unresolved fence into the engine fill
 * it becomes. Mirrors the engine's `Filler` in shape only — it shares no code,
 * interface, or registry with the engine layer. A resolver owns solely its
 * transform: it reads only its own slot field and never walks the deck.
 */
export interface Resolver<F extends CodeFence | MermaidFence> {
  matches(v: MarkdownBlock): v is F;
  /** Transform one fence into the engine fill it resolves to. */
  resolve(fence: F, ctx: ResolveContext): Promise<TextFill | ImageFill>;
}

/**
 * Registry keyed by the fence discriminator (`FenceType`). A missing entry for
 * a fence's `type` throws at lookup — every fence kind must register a resolver.
 * Mirrors the engine's `FILLERS`; `any` widens the value type exactly as
 * `Filler<any>` does, since each entry already narrows its own fence.
 */
export const RESOLVERS: Record<FenceType, Resolver<any>> = {
  [FenceType.Code]: CodeResolver,
  [FenceType.Mermaid]: MermaidResolver,
};

/** A content value is a fence when it carries a `type` that names a FenceType. */
export function isFence(v: MarkdownBlock): v is CodeFence | MermaidFence {
  return "type" in v && (Object.values(FenceType) as string[]).includes(v.type);
}

/** Find a layout by name; throws if absent (deckCompiler guarantees presence). */
function layoutByName(config: CompilerConfig, name: string): CompilerLayout {
  const layout = config.layouts.find((l) => l.name === name);
  if (!layout) throw new Error(`resolveFences: unknown layout "${name}".`);
  return layout;
}

/** Find a slot by key within a layout; throws if absent (a fence always has one). */
function slotByKey(layout: CompilerLayout, key: string): CompilerSlot {
  const slot = layout.slots.find((s) => s.key === key);
  if (!slot) throw new Error(`resolveFences: layout "${layout.name}" has no slot "${key}".`);
  return slot;
}

/**
 * The single walk that replaces the two bespoke fence walkers. For each step,
 * resolve every fence in `step.content` in place: dispatch on the fence's `type`
 * to its resolver, hand it the fence plus its slot config, and swap the resolved
 * fill back into `step.content[key]`. Traversal lives here; each resolver owns
 * only its transform.
 */
export async function resolveFences(deck: CompilerDeck, config: CompilerConfig): Promise<void> {
  for (const step of deck.steps) {
    if (!step.content) continue;
    const layout = layoutByName(config, step.layout);
    for (const [key, value] of Object.entries(step.content)) {
      if (!isFence(value)) continue;
      const resolver = RESOLVERS[value.type];
      const slot = slotByKey(layout, key);
      step.content[key] = await resolver.resolve(value, { layout, slot, key, config });
    }
  }
}
