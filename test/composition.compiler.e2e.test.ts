import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import JSZip from "jszip";
import { buildDeck, compileMarkdownDeck, toEngineThemeConfig } from "../dist/index.js";
import type { CompilerConfig, CompilerThemeConfig } from "../dist/markdown/types.js";

// End-to-end coverage of the COMPILER path exposing sampled-composition: a real
// theme.json FILE + a markdown deck routes a GFM table into a slot whose base
// shows text, transplanting the table specimen and removing the base text —
// exercised through the public compiler (compileMarkdownDeck + buildDeck), NOT a
// hand-built engine Config. Fixture: test/fixtures/template/composition.pptx
// (slide 1 base has "Text 0"/"Text 1"; slide 2 has "Table 0").

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(HERE, "fixtures");
const THEME_PATH = join(FIXTURES, "composition-theme.json");

const BODY_FRAME = { x: 457200, y: 1371600, cx: 8229600, cy: 2743200 };

// Output lands at deck.output (an absolute path); tests bake a fresh temp dir
// into it via outPath() so they never collide.
const OUTDIR = mkdtempSync(join(tmpdir(), "tycoslide-compiler-e2e-"));
const outPath = (name: string): string => join(OUTDIR, name);

// Mirror cli.ts loadConfig: parse theme.json + attach rootDir.
function loadThemeConfig(): CompilerConfig {
  const raw = JSON.parse(readFileSync(THEME_PATH, "utf-8")) as CompilerThemeConfig;
  return { ...raw, rootDir: FIXTURES };
}

async function outputZip(path: string): Promise<JSZip> {
  const buf = readFileSync(path);
  return JSZip.loadAsync(buf);
}

async function concatMatching(zip: JSZip, re: RegExp): Promise<string> {
  const parts = await Promise.all(
    Object.keys(zip.files)
      .filter((f) => re.test(f))
      .map((f) => zip.file(f)?.async("string") ?? Promise.resolve("")),
  );
  return parts.join("\n");
}
const slideXml = (zip: JSZip) => concatMatching(zip, /ppt\/slides\/slide\d+\.xml$/);

describe("compiler end-to-end: theme.json file + markdown deck → transplant", () => {
  it("routes a GFM table into a text-base slot, transplants it, and removes the base text", async () => {
    const config = loadThemeConfig();
    const source = `---
theme: ./composition-theme.json
---
---
layout: Composed
---
| Plan | Price |
|------|-------|
| Pro  | $9    |`;

    const deck = await compileMarkdownDeck(source, config);
    deck.output = outPath("compiled.pptx");
    await buildDeck(deck, config);

    const zip = await outputZip(deck.output);
    const slide = await slideXml(zip);

    assert.ok(slide.includes("<a:tbl"), "transplanted table should be present");
    assert.ok(slide.includes("Pro") && slide.includes("$9"), "table refilled with deck data");
    assert.ok(
      !slide.includes("superseded on transplant"),
      "base body text shape (Text 1) removed on transplant",
    );
    assert.ok(
      slide.includes(`<a:off x="${BODY_FRAME.x}" y="${BODY_FRAME.y}"/>`),
      "table positioned to the theme's slot frame (a:off)",
    );
    assert.ok(
      slide.includes(`<a:ext cx="${BODY_FRAME.cx}" cy="${BODY_FRAME.cy}"/>`),
      "table sized to the theme's slot frame (a:ext)",
    );
  });

  it("routes a standalone markdown image ($category.name) into a text-base slot and transplants it", async () => {
    const config = loadThemeConfig();
    const source = `---
theme: ./composition-theme.json
---
---
layout: Composed
---
![logo]($logos.primary)`;

    const deck = await compileMarkdownDeck(source, config);
    deck.output = outPath("image.pptx");
    await buildDeck(deck, config);

    const zip = await outputZip(deck.output);
    const slide = await slideXml(zip);

    assert.ok(slide.includes("<a:blip"), "transplanted image should carry a drawing blip");
    assert.ok(
      !slide.includes("superseded on transplant"),
      "base body text shape (Text 1) removed on transplant",
    );
    assert.ok(
      Object.keys(zip.files).some((f) => /ppt\/media\/.+\.\w+$/.test(f)),
      "output carries an embedded media part for the image",
    );

    // The image is `contain`-fit, so it is centered/letterboxed *inside* the
    // slot frame rather than filling it exactly; assert its box sits within the
    // theme's frame (proves it was positioned to the slot, not left at source).
    const pic = slide.match(/<p:pic>[\s\S]*?<\/p:pic>/);
    assert.ok(pic, "output slide has a picture shape");
    const off = pic[0].match(/<a:off x="(-?\d+)" y="(-?\d+)"\/>/);
    const ext = pic[0].match(/<a:ext cx="(\d+)" cy="(\d+)"\/>/);
    assert.ok(off && ext, "picture has an xfrm offset and extent");
    const [x, y, cx, cy] = [+off[1], +off[2], +ext[1], +ext[2]];
    assert.ok(x >= BODY_FRAME.x && y >= BODY_FRAME.y, "image origin is inside the slot frame");
    assert.ok(
      x + cx <= BODY_FRAME.x + BODY_FRAME.cx && y + cy <= BODY_FRAME.y + BODY_FRAME.cy,
      "image box fits within the slot frame",
    );
  });

  it("fails fast on a malformed body-image reference (raw path, not $category.name)", async () => {
    const config = loadThemeConfig();
    const rawPath = `---
theme: ./composition-theme.json
---
---
layout: Composed
---
![logo](logo.png)`;

    await assert.rejects(
      compileMarkdownDeck(rawPath, config),
      (err: Error) => {
        assert.ok(/must be in the form/.test(err.message), err.message);
        assert.ok(err.message.includes("$category.name"), "names the required form");
        return true;
      },
    );

    const badRef = `---
theme: ./composition-theme.json
---
---
layout: Composed
---
![logo]($bad)`;

    await assert.rejects(
      compileMarkdownDeck(badRef, config),
      (err: Error) => {
        assert.ok(/must be in the form/.test(err.message), err.message);
        assert.ok(err.message.includes("$category.name"), "names the required form");
        return true;
      },
    );
  });

  it("fails fast on an unknown body-image reference, listing available assets", async () => {
    const config = loadThemeConfig();
    const source = `---
theme: ./composition-theme.json
---
---
layout: Composed
---
![logo]($logos.missing)`;

    await assert.rejects(
      compileMarkdownDeck(source, config),
      (err: Error) => {
        assert.ok(/Unknown asset reference/.test(err.message), err.message);
        assert.ok(err.message.includes("$logos.primary"), "lists the available asset");
        return true;
      },
    );
  });

  it("fails fast when a resolvable body-image is routed into a slot that does not accept image", async () => {
    // "TextOnly" accepts only text; a well-formed, resolvable image ref folds to
    // `image` → rejected by assertSlotRegion, through the public compiler path.
    const config = loadThemeConfig();
    const source = `---
theme: ./composition-theme.json
---
---
layout: TextOnly
---
![logo]($logos.primary)`;

    await assert.rejects(
      compileMarkdownDeck(source, config),
      (err: Error) => {
        assert.ok(/does not accept image content/.test(err.message), err.message);
        assert.ok(err.message.includes("TextOnly"), "names the layout");
        assert.ok(err.message.includes("body"), "names the slot");
        return true;
      },
    );
  });

  it("fails fast when the deck routes a content type the slot does not accept", async () => {
    // "TextOnly" accepts only text; a GFM table folds to `table` → rejected at
    // compile time, through the public compiler path.
    const config = loadThemeConfig();
    const source = `---
theme: ./composition-theme.json
---
---
layout: TextOnly
---
| Plan | Price |
|------|-------|
| Pro  | $9    |`;

    await assert.rejects(
      compileMarkdownDeck(source, config),
      (err: Error) => {
        assert.ok(/does not accept table content/.test(err.message), err.message);
        assert.ok(err.message.includes("TextOnly"), "names the layout");
        assert.ok(err.message.includes("body"), "names the slot");
        return true;
      },
    );
  });

  it("fails fast when a slot has a transplant block but no frame", () => {
    // A table block on sourceSlide 2 transplants (≠ slideNumber 1), so a `frame`
    // is mandatory. Missing → throw at the compiler→engine boundary.
    const bad: CompilerThemeConfig = {
      template: "template/composition.pptx",
      assets: {},
      layouts: [
        {
          name: "NoFrame",
          slideNumber: 1,
          parameters: [],
          slots: [
            {
              key: "body",
              accepts: [
                { type: "text", sourceSlide: 1, shapeName: "Text 1" },
                { type: "table", sourceSlide: 2, shapeName: "Table 0" },
              ],
            },
          ],
        },
      ],
    };

    assert.throws(
      () => toEngineThemeConfig(bad),
      (err: Error) => {
        assert.ok(/requires a "frame"/.test(err.message), err.message);
        assert.ok(err.message.includes("NoFrame"), "names the layout");
        assert.ok(err.message.includes("body"), "names the slot");
        return true;
      },
    );
  });
});
