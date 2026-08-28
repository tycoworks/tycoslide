import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { Code } from "mdast";
import type { ImageFill } from "../../engine/index.js";
import { ImageFit, SlotType } from "../../engine/index.js";
import { MdastType } from "../mdast.js";
import { AcceptType, type BlockHandler, type CompilerConfig, type ThemeFont } from "../types.js";
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
 * `<rootDir>/.tycoslide-cache/mermaid/<hash>.png`, in the theme directory) and wrapping it as an
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
    const pngPath = await renderOne(definition, variantName, variant, cacheDir, config);
    return { type: SlotType.Image, path: pngPath, fit: ImageFit.Contain };
  },
};

/** A theme font resolved to an absolute file URL + CSS `format()` for an in-page `@font-face`. */
type ResolvedFont = { family: string; url: string; weight: number; format: string };

const FONT_FORMATS: Record<string, string> = {
  ".woff2": "woff2",
  ".woff": "woff",
  ".ttf": "truetype",
  ".otf": "opentype",
};

/** The `#output` div's DOM contract, shared by the in-page script and the
 * Playwright poller — one const so a rename can't drift the two sides into a
 * silent 30s timeout. */
const RENDER_SIGNAL_ATTR = "data-render-signal";
const RENDER_ERROR_ATTR = "data-render-error";
const RenderSignal = { Pending: "pending", Done: "done" } as const;

function hashKey(definition: string, variantName: string, renderConfig: object, fonts: ResolvedFont[]): string {
  const hash = createHash("sha256")
    .update(variantName)
    .update("\n")
    .update(definition)
    .update("\n")
    .update(JSON.stringify(renderConfig));
  for (const f of fonts) hash.update("\n").update(`${f.family}:${f.weight}:${f.url}`);
  return hash.digest("hex").slice(0, 16);
}

function ensureCacheDir(config: CompilerConfig): string {
  const base = resolve(config.rootDir, ".tycoslide-cache", "mermaid");
  mkdirSync(base, { recursive: true });
  return base;
}

/**
 * Resolve each theme font's `path` to an absolute `file://` URL. A bare specifier
 * (`@fontsource/inter/files/...`) resolves through the theme's node_modules; a
 * `./`- or `/`-prefixed path resolves against `rootDir`. A missing file fails fast
 * naming the family + path — never a silent skip.
 */
function resolveFonts(rootDir: string, fonts: ThemeFont[]): ResolvedFont[] {
  const require = createRequire(join(rootDir, "package.json"));
  return fonts.map((font) => {
    const isFsPath = font.path.startsWith(".") || font.path.startsWith("/");
    let absPath: string;
    if (isFsPath) {
      absPath = resolve(rootDir, font.path);
    } else {
      try {
        absPath = require.resolve(font.path);
      } catch {
        throw new Error(
          `Theme font "${font.family}": could not resolve "${font.path}" from ${rootDir}. ` +
            "Install the package, or use a ./- or /-prefixed file path.",
        );
      }
    }
    if (!existsSync(absPath)) {
      throw new Error(`Theme font "${font.family}": file not found at ${absPath} (from "${font.path}").`);
    }
    const format = FONT_FORMATS[extname(absPath).toLowerCase()];
    if (!format) {
      throw new Error(
        `Theme font "${font.family}": unsupported format "${extname(absPath)}". ` +
          `Supported: ${Object.keys(FONT_FORMATS).join(", ")}.`,
      );
    }
    return { family: font.family, url: pathToFileURL(absPath).href, weight: font.weight ?? 400, format };
  });
}

async function renderOne(
  definition: string,
  variantName: string,
  variant: MermaidVariant,
  cacheDir: string,
  compilerConfig: CompilerConfig,
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

  const fonts = resolveFonts(compilerConfig.rootDir, compilerConfig.fonts ?? []);

  // The variant asks mermaid for `fontFamily` by name; if the theme declared
  // fonts but none provide that family, Chromium substitutes silently — the exact
  // failure this feature exists to prevent — so surface the likely typo. Not fatal:
  // a theme may intentionally target an OS-installed font and declare no faces.
  if (fonts.length > 0 && !fonts.some((f) => f.family === variant.fontFamily)) {
    console.warn(
      `Mermaid variant "${variantName}": fontFamily "${variant.fontFamily}" matches none of the ` +
        `declared theme fonts (${[...new Set(fonts.map((f) => f.family))].join(", ")}); ` +
        "the diagram will fall back to a substitute font.",
    );
  }

  const renderConfig = buildMermaidRenderConfig(variant);
  const key = hashKey(processed, variantName, renderConfig, fonts);
  const outputPath = join(cacheDir, `${key}.png`);
  if (existsSync(outputPath)) return outputPath;

  await renderMermaidToPng(processed, renderConfig, fonts, outputPath, compilerConfig.browserPath);
  return outputPath;
}

let bundleCache: string | null = null;

/** The mermaid browser bundle, read once and reused across renders. */
function getMermaidBundle(): string {
  if (bundleCache === null) {
    const require = createRequire(import.meta.url);
    bundleCache = readFileSync(require.resolve("mermaid/dist/mermaid.min.js"), "utf-8");
  }
  return bundleCache;
}

function fontFaceCss(fonts: ResolvedFont[]): string {
  return fonts
    .map(
      (f) =>
        `@font-face { font-family: '${f.family}'; src: url('${f.url}') format('${f.format}'); font-weight: ${f.weight}; font-style: normal; }`,
    )
    .join("\n");
}

type Chromium = typeof import("playwright-core")["chromium"];

const LAUNCH_ARGS = { headless: true, args: ["--no-sandbox"] };

/**
 * Find a browser rather than ship one. tycoslide never downloads Chromium: the
 * binary comes from a CDN rather than the npm registry, so bundling it breaks
 * installs anywhere egress is restricted to the registry, and pins the build to
 * one revision that a machine's existing browser will rarely match.
 *
 * Three ways in, most explicit first: `--browser-path` names an executable
 * outright (any build, the revision is not checked), `channel: "chrome"` picks
 * up a system Chrome install, and the bare launch falls back to whatever `npx
 * playwright install` put in Playwright's own cache. If none work, the error
 * names every remedy a caller can act on.
 */
export async function launchChromium(
  chromium: Chromium,
  browserPath?: string,
): Promise<Awaited<ReturnType<Chromium["launch"]>>> {
  const attempts: { label: string; launch: () => ReturnType<Chromium["launch"]> }[] = [
    ...(browserPath
      ? [
          {
            label: `--browser-path ${browserPath}`,
            launch: () => chromium.launch({ ...LAUNCH_ARGS, executablePath: browserPath }),
          },
        ]
      : []),
    { label: "system Chrome", launch: () => chromium.launch({ ...LAUNCH_ARGS, channel: "chrome" }) },
    { label: "system Edge", launch: () => chromium.launch({ ...LAUNCH_ARGS, channel: "msedge" }) },
    { label: "Playwright's downloaded browser", launch: () => chromium.launch(LAUNCH_ARGS) },
  ];

  const failures: string[] = [];
  for (const attempt of attempts) {
    try {
      return await attempt.launch();
    } catch (e) {
      failures.push(`  ${attempt.label}: ${e instanceof Error ? e.message.split("\n")[0] : String(e)}`);
    }
  }
  throw new Error(
    `No Chromium available to render mermaid. Tried:\n${failures.join("\n")}\n` +
      "Fix by any one of: pass --browser-path, install Google Chrome, " +
      "or run `npx playwright install chromium-headless-shell`.",
  );
}

/**
 * Render a mermaid definition to a transparent PNG via a headless Chromium
 * (Playwright — the proven old driver, stronger headless font fidelity). The
 * theme fonts are injected as `@font-face` and every registered face is awaited
 * (`document.fonts.load()`) BEFORE `mermaid.render()` measures text — the only
 * cross-platform, zero-install way to make Chromium lay out labels in the brand
 * font instead of a substitute. mmdc's `--cssFile` injects too late (after layout)
 * to affect metrics, which is why this replaces its programmatic API.
 */
async function renderMermaidToPng(
  processed: string,
  renderConfig: object,
  fonts: ResolvedFont[],
  outputPath: string,
  browserPath?: string,
): Promise<void> {
  const bundle = getMermaidBundle();
  // JSON script blocks pass data without escaping issues; escape `</` so a value
  // can't close the surrounding <script>.
  const defJson = JSON.stringify(processed).replace(/<\//g, "<\\/");
  const configJson = JSON.stringify(renderConfig).replace(/<\//g, "<\\/");

  const html = `<!DOCTYPE html>
<html><head>
<style>
body { margin: 0; background: transparent; }
${fontFaceCss(fonts)}
</style>
</head>
<body>
  <div id="output" ${RENDER_SIGNAL_ATTR}="${RenderSignal.Pending}"></div>
  <script id="mermaid-def" type="application/json">${defJson}</script>
  <script id="mermaid-config" type="application/json">${configJson}</script>
  <script>${bundle}</script>
  <script>
    (async () => {
      const out = document.getElementById('output');
      try {
        const def = JSON.parse(document.getElementById('mermaid-def').textContent);
        const config = JSON.parse(document.getElementById('mermaid-config').textContent);
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.top = '-9999px';
        document.body.appendChild(container);
        // document.fonts.ready alone resolves early (nothing references the face
        // yet); iterating and .load()-ing each forces the fetch before mermaid
        // measures text.
        await Promise.all([...document.fonts].map(f => f.load()));
        await document.fonts.ready;
        mermaid.initialize(config);
        const { svg } = await mermaid.render('mermaid-0', def, container);
        container.remove();
        out.innerHTML = svg;
        out.setAttribute('${RENDER_SIGNAL_ATTR}', '${RenderSignal.Done}');
      } catch (e) {
        out.setAttribute('${RENDER_ERROR_ATTR}', (e && e.message) || String(e));
        out.setAttribute('${RENDER_SIGNAL_ATTR}', '${RenderSignal.Done}');
      }
    })();
  </script>
</body></html>`;

  // Serve the page from a real file:// URL, not setContent — an about:blank
  // origin can't fetch the file:// font resources (@font-face silently fails),
  // whereas a file://-origin document loads them.
  const htmlPath = `${outputPath}.html`;
  const { chromium } = await import("playwright-core");
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    // Written inside the try so the finally always cleans it up, even if launch throws.
    writeFileSync(htmlPath, html);
    browser = await launchChromium(chromium, browserPath);
    const page = await browser.newPage({ viewport: { width: 800, height: 600 }, deviceScaleFactor: 2 });
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "load" });
    await page.waitForSelector(`#output[${RENDER_SIGNAL_ATTR}="${RenderSignal.Done}"]`, { timeout: 30000 });
    const error = await page.getAttribute("#output", RENDER_ERROR_ATTR);
    if (error) throw new Error(error);
    const svg = page.locator("#output svg");
    if ((await svg.count()) === 0) throw new Error("mermaid produced no SVG");
    await svg.screenshot({ path: outputPath, omitBackground: true });
  } catch (e) {
    throw new Error(`Mermaid render failed:\n${e instanceof Error ? e.message : String(e)}`);
  } finally {
    await browser?.close();
    rmSync(htmlPath, { force: true });
  }
}
