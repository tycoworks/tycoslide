import * as assert from "node:assert";
import { describe, it } from "node:test";
import type { RootContent } from "mdast";
import type { TextStyle } from "tycoslide";
import { componentRegistry, NODE_TYPE, SYNTAX } from "tycoslide";
import { type CodeTokens, code, codeComponent, renderCodeToHtml } from "../src/code.js";
import { HIGHLIGHT_THEME, HIGHLIGHT_THEME_VALUES, LANGUAGE, LANGUAGE_VALUES } from "../src/highlighting.js";
import {
  cardComponent,
  columnComponent,
  gridComponent,
  imageComponent,
  lineComponent,
  mermaidComponent,
  quoteComponent,
  rowComponent,
  shapeComponent,
  slideNumberComponent,
  stackComponent,
  tableComponent,
  textComponent,
} from "../src/index.js";
import { Component } from "../src/names.js";
import { DEFAULT_CODE_TOKENS, mockTheme, noopCanvas } from "./mocks.js";

// Register components explicitly
componentRegistry.register([
  textComponent,
  imageComponent,
  cardComponent,
  quoteComponent,
  tableComponent,
  codeComponent,
  mermaidComponent,
  lineComponent,
  shapeComponent,
  slideNumberComponent,
  rowComponent,
  columnComponent,
  stackComponent,
  gridComponent,
]);

// ============================================
// DSL FUNCTION
// ============================================

describe("code() DSL function", () => {
  it("returns ComponentNode with correct type", () => {
    const node = code("SELECT 1", "sql", DEFAULT_CODE_TOKENS);
    assert.strictEqual(node.type, NODE_TYPE.COMPONENT);
  });

  it("returns ComponentNode with correct componentName", () => {
    const node = code("SELECT 1", "sql", DEFAULT_CODE_TOKENS);
    assert.strictEqual(node.componentName, Component.Code);
  });

  it("stores code string in content", () => {
    const node = code("SELECT 1", "sql", DEFAULT_CODE_TOKENS);
    assert.strictEqual(node.content, "SELECT 1");
  });

  it("stores language in params.language", () => {
    const node = code("SELECT 1", "sql", DEFAULT_CODE_TOKENS);
    assert.strictEqual((node.params as any).language, "sql");
  });
});

// ============================================
// COMPONENT REGISTRATION
// ============================================

describe("code component registration", () => {
  it("should be available after register()", () => {
    assert.ok(componentRegistry.has(Component.Code));
  });
});

// ============================================
// EXPANSION
// ============================================

describe("code expansion", () => {
  it("renders to stack(shape, column(image)) via canvas", async () => {
    const theme = mockTheme();
    const canvas = noopCanvas();
    const context = { theme, assets: undefined, canvas } as any;

    const node = code("SELECT 1", "sql", DEFAULT_CODE_TOKENS);
    const result = await componentRegistry.render(node, context);

    assert.strictEqual(result.type, NODE_TYPE.COMPONENT);
    assert.strictEqual(result.componentName, Component.Stack);
    // Stack children stored in content: [shape, column]
    const content = (result as any).content as any[];
    assert.strictEqual(content.length, 2);
    assert.strictEqual(content[0].componentName, Component.Shape);
    assert.strictEqual(content[1].componentName, Component.Column);
    // Column wraps the image (in content array)
    const columnContent = content[1].content as any[];
    assert.strictEqual(columnContent.length, 1);
    assert.strictEqual(columnContent[0].componentName, Component.Image);
  });

  it("passes transparent: true to canvas.renderHtml", async () => {
    const theme = mockTheme();
    let capturedTransparent: boolean | undefined;
    const canvas = {
      renderHtml: async (_html: string, transparent?: boolean) => {
        capturedTransparent = transparent;
        return "mock://render.png";
      },
    };
    const context = { theme, assets: undefined, canvas } as any;

    const node = code("SELECT 1", "sql", DEFAULT_CODE_TOKENS);
    await componentRegistry.render(node, context);

    assert.strictEqual(capturedTransparent, true);
  });

  it("throws on empty code body", async () => {
    const theme = mockTheme();
    const canvas = noopCanvas();
    const context = { theme, assets: undefined, canvas } as any;

    const node = code("   ", "text", DEFAULT_CODE_TOKENS);
    await assert.rejects(() => componentRegistry.render(node, context), /Code block is empty/);
  });

  it("HTML passed to render contains the code text", async () => {
    const theme = mockTheme();
    let capturedHtml = "";
    const canvas = {
      renderHtml: async (html: string, _transparent?: boolean) => {
        capturedHtml = html;
        return "mock://render.png";
      },
    };
    const context = { theme, assets: undefined, canvas } as any;

    const node = code("SELECT * FROM orders", "sql", DEFAULT_CODE_TOKENS);
    await componentRegistry.render(node, context);

    assert.ok(capturedHtml.includes("SELECT"), "HTML should contain code text");
  });

  it("HTML does not contain background style (handled by shape)", async () => {
    const theme = mockTheme();
    let capturedHtml = "";
    const canvas = {
      renderHtml: async (html: string, _transparent?: boolean) => {
        capturedHtml = html;
        return "mock://render.png";
      },
    };
    const context = { theme, assets: undefined, canvas } as any;

    const node = code("x = 1", "python", DEFAULT_CODE_TOKENS);
    await componentRegistry.render(node, context);

    assert.ok(!capturedHtml.includes("30, 30, 30"), "HTML should not contain background color (now on shape)");
    assert.ok(!capturedHtml.includes("border-radius"), "HTML should not contain border-radius (now on shape)");
  });
});

// ============================================
// MDAST COMPILE
// ============================================

describe("code MDAST compile handler", () => {
  it("compiles code fence to ComponentNode with correct body", () => {
    const handler = componentRegistry.getMdastHandler(SYNTAX.CODE);
    assert.ok(handler, "MDAST handler should be registered for code");

    const mdastNode = {
      type: "code",
      value: "SELECT 1",
      lang: "sql",
      meta: null,
      position: { start: { line: 1, column: 1, offset: 0 }, end: { line: 3, column: 4, offset: 20 } },
    } as unknown as RootContent;

    const result = handler.mdast!.compile(mdastNode, "```sql\nSELECT 1\n```");
    assert.ok(result);
    assert.strictEqual(result!.componentName, Component.Code);
    assert.strictEqual(result!.content, "SELECT 1");
  });

  it("compiles code fence with language", () => {
    const handler = componentRegistry.getMdastHandler(SYNTAX.CODE)!;
    const mdastNode = {
      type: "code",
      value: "const x = 1;",
      lang: "typescript",
      meta: null,
    } as unknown as RootContent;

    const result = handler.mdast!.compile(mdastNode, "");
    assert.ok(result);
    assert.strictEqual((result!.params as any).language, "typescript");
  });

  it("throws when code fence has no language", () => {
    const handler = componentRegistry.getMdastHandler(SYNTAX.CODE)!;
    const mdastNode = {
      type: "code",
      value: "hello world",
      lang: null,
      meta: null,
    } as unknown as RootContent;

    assert.throws(() => handler.mdast!.compile(mdastNode, ""), /no language specified/);
  });

  it("throws on unsupported language", () => {
    const handler = componentRegistry.getMdastHandler(SYNTAX.CODE)!;
    const mdastNode = {
      type: "code",
      value: "hello world",
      lang: "notareallanguage",
      meta: null,
    } as unknown as RootContent;

    assert.throws(
      () => handler.mdast!.compile(mdastNode, ""),
      /Unsupported code language "notareallanguage".*Supported languages include/,
    );
  });

  it("accepts all LANGUAGE_VALUES as valid", () => {
    const handler = componentRegistry.getMdastHandler(SYNTAX.CODE)!;
    // Spot-check a few common languages
    for (const lang of ["sql", "typescript", "python", "rust", "go"]) {
      const mdastNode = {
        type: "code",
        value: "x",
        lang,
        meta: null,
      } as unknown as RootContent;
      const result = handler.mdast!.compile(mdastNode, "");
      assert.ok(result, `Language "${lang}" should be accepted`);
      assert.strictEqual((result!.params as any).language, lang);
    }
  });
});

// ============================================
// RENDER CODE TO HTML (direct)
// ============================================

describe("renderCodeToHtml()", () => {
  const tokens: CodeTokens = {
    textStyle: "code",
    theme: HIGHLIGHT_THEME.GITHUB_DARK,
    padding: 0.25,
    background: { fill: "#1E1E1E", fillOpacity: 100, cornerRadius: 0.1 },
  };

  const codeStyle: TextStyle = {
    fontFamily: { name: "Fira Code", regular: { path: "/fake/fira-code.woff", weight: 400 } },
    fontSize: 12,
    lineHeightMultiplier: 1.4,
    bulletIndentPt: 0,
  };

  it("returns a complete HTML document", async () => {
    const html = await renderCodeToHtml("const x = 1;", "typescript", tokens, codeStyle);
    assert.ok(html.includes("<!DOCTYPE html>"), "should start with DOCTYPE");
    assert.ok(html.includes("<html>"), "should have html tag");
    assert.ok(html.includes("<body>"), "should have body tag");
  });

  it('contains data-render-signal="done"', async () => {
    const html = await renderCodeToHtml("x = 1", "python", tokens, codeStyle);
    assert.ok(html.includes('data-render-signal="done"'), "should have render signal for Playwright");
  });

  it("does not contain background color (handled by shape)", async () => {
    const html = await renderCodeToHtml("x", "text", tokens, codeStyle);
    assert.ok(!html.includes("30, 30, 30"), "should not contain background color (now on shape)");
  });

  it("contains font-family from textStyle", async () => {
    const html = await renderCodeToHtml("x", "text", tokens, codeStyle);
    assert.ok(html.includes("Fira Code"), "should contain font family");
  });

  it("contains font-weight from textStyle regular font", async () => {
    const html = await renderCodeToHtml("x", "text", tokens, codeStyle);
    assert.ok(html.includes("font-weight: 400"), "should contain font-weight from regular font");
  });

  it("contains font-size from textStyle", async () => {
    const html = await renderCodeToHtml("x", "text", tokens, codeStyle);
    assert.ok(html.includes("12pt"), "should contain font size in pt");
  });

  it("contains line-height from textStyle", async () => {
    const html = await renderCodeToHtml("x", "text", tokens, codeStyle);
    assert.ok(html.includes("1.4"), "should contain line height");
  });

  it("preserves multiline code", async () => {
    const multiline = "line 1\nline 2\nline 3";
    const html = await renderCodeToHtml(multiline, "text", tokens, codeStyle);
    assert.ok(html.includes("line 1"), "should contain first line");
    assert.ok(html.includes("line 3"), "should contain last line");
  });

  it("handles special characters in code", async () => {
    const code = 'if (x < 10 && y > 20) { return "ok"; }';
    const html = await renderCodeToHtml(code, "javascript", tokens, codeStyle);
    assert.ok(html.includes("10"), "should contain the code content");
    assert.ok(!html.includes("x < 10 &&"), "angle brackets should be escaped");
  });
});

// ============================================
// EXPANSION — ADDITIONAL TESTS
// ============================================

describe("code expansion — additional", () => {
  it("trims whitespace from code before rendering", async () => {
    const theme = mockTheme();
    let capturedHtml = "";
    const canvas = {
      renderHtml: async (html: string) => {
        capturedHtml = html;
        return "mock://render.png";
      },
    };
    const context = { theme, assets: undefined, canvas } as any;

    const node = code("  \n  SELECT 1  \n  ", "sql", DEFAULT_CODE_TOKENS);
    await componentRegistry.render(node, context);

    assert.ok(capturedHtml.includes("SELECT"), "should contain trimmed code");
  });

  it("shadow on background token is passed to shape child", async () => {
    const theme = mockTheme();
    const canvas = noopCanvas();
    const context = { theme, assets: undefined, canvas } as any;

    const shadow = { type: "outer" as const, color: "#000000", opacity: 50, blur: 4, offset: 2, angle: 45 };
    const tokensWithShadow: CodeTokens = {
      ...DEFAULT_CODE_TOKENS,
      background: { ...DEFAULT_CODE_TOKENS.background, shadow },
    };
    const node = code("SELECT 1", "sql", tokensWithShadow);
    const result = await componentRegistry.render(node, context);

    // Stack content[0] is the shape — shadow is in its tokens
    const content = (result as any).content as any[];
    const shapeNode = content[0];
    assert.strictEqual(shapeNode.componentName, Component.Shape);
    assert.deepStrictEqual(shapeNode.tokens?.shadow, shadow, "shadow should be on the shape component");
  });

  it("image child has no shadow", async () => {
    const theme = mockTheme();
    const canvas = noopCanvas();
    const context = { theme, assets: undefined, canvas } as any;

    const node = code("SELECT 1", "sql", DEFAULT_CODE_TOKENS);
    const result = await componentRegistry.render(node, context);

    // Stack content[1] = column, column content[0] = image
    const content = (result as any).content as any[];
    const imageNode = content[1].content[0];
    assert.strictEqual(imageNode.componentName, Component.Image);
    assert.strictEqual(imageNode.tokens, undefined, "image should not have shadow tokens");
  });

  it("multiline code produces valid HTML", async () => {
    const theme = mockTheme();
    let capturedHtml = "";
    const canvas = {
      renderHtml: async (html: string) => {
        capturedHtml = html;
        return "mock://render.png";
      },
    };
    const context = { theme, assets: undefined, canvas } as any;

    const multiline = 'function hello() {\n  return "world";\n}';
    const node = code(multiline, "javascript", DEFAULT_CODE_TOKENS);
    const result = await componentRegistry.render(node, context);

    assert.strictEqual(result.type, NODE_TYPE.COMPONENT);
    assert.ok(capturedHtml.includes("hello"), "HTML should contain function name");
    assert.ok(capturedHtml.includes("world"), "HTML should contain string content");
  });
});

// ============================================
// LANGUAGE CONSTANT
// ============================================

describe("LANGUAGE constant", () => {
  it("LANGUAGE_VALUES is non-empty", () => {
    assert.ok(LANGUAGE_VALUES.length > 0, "should have language values");
  });

  it("contains common languages", () => {
    const values = new Set(LANGUAGE_VALUES);
    assert.ok(values.has("typescript"), "should contain typescript");
    assert.ok(values.has("python"), "should contain python");
    assert.ok(values.has("sql"), "should contain sql");
    assert.ok(values.has("rust"), "should contain rust");
    assert.ok(values.has("go"), "should contain go");
    assert.ok(values.has("java"), "should contain java");
    assert.ok(values.has("bash"), "should contain bash");
  });

  it("LANGUAGE keys are UPPER_SNAKE_CASE", () => {
    for (const key of Object.keys(LANGUAGE)) {
      assert.match(key, /^[A-Z][A-Z0-9_]*$/, `Key "${key}" should be UPPER_SNAKE_CASE`);
    }
  });

  it("includes aliases (TS for typescript, PY for python)", () => {
    assert.strictEqual(LANGUAGE.TS, "ts");
    assert.strictEqual(LANGUAGE.TYPESCRIPT, "typescript");
    assert.strictEqual(LANGUAGE.PY, "py");
    assert.strictEqual(LANGUAGE.PYTHON, "python");
  });
});

// ============================================
// HIGHLIGHT_THEME CONSTANT
// ============================================

describe("HIGHLIGHT_THEME constant", () => {
  it("HIGHLIGHT_THEME_VALUES is non-empty", () => {
    assert.ok(HIGHLIGHT_THEME_VALUES.length > 0, "should have theme values");
  });

  it("contains common themes", () => {
    const values = new Set(HIGHLIGHT_THEME_VALUES);
    assert.ok(values.has("github-dark"), "should contain github-dark");
    assert.ok(values.has("github-light"), "should contain github-light");
    assert.ok(values.has("dracula"), "should contain dracula");
    assert.ok(values.has("nord"), "should contain nord");
    assert.ok(values.has("monokai"), "should contain monokai");
    assert.ok(values.has("one-dark-pro"), "should contain one-dark-pro");
  });

  it("HIGHLIGHT_THEME keys are UPPER_SNAKE_CASE", () => {
    for (const key of Object.keys(HIGHLIGHT_THEME)) {
      assert.match(key, /^[A-Z][A-Z0-9_]*$/, `Key "${key}" should be UPPER_SNAKE_CASE`);
    }
  });

  it("includes light and dark variants", () => {
    assert.strictEqual(HIGHLIGHT_THEME.GITHUB_DARK, "github-dark");
    assert.strictEqual(HIGHLIGHT_THEME.GITHUB_LIGHT, "github-light");
    assert.strictEqual(HIGHLIGHT_THEME.SOLARIZED_DARK, "solarized-dark");
    assert.strictEqual(HIGHLIGHT_THEME.SOLARIZED_LIGHT, "solarized-light");
  });
});
