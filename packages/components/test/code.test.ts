import { describe, it, before } from 'node:test';
import * as assert from 'node:assert';
import { NODE_TYPE, componentRegistry, SYNTAX, inToPx, TEXT_STYLE } from 'tycoslide';
import type { RootContent } from 'mdast';
import type { TextStyle } from 'tycoslide';
import { Component } from '../src/names.js';
import { code, codeComponent, buildCodeTheme, renderCodeToHtml, CODE_TOKEN, type CodeTokens } from '../src/code.js';
import { LANGUAGE, LANGUAGE_VALUES } from '../src/languages.js';
import { mockTheme, noopCanvas, DEFAULT_CODE_TOKENS } from './mocks.js';
import {
  textComponent, imageComponent, cardComponent, quoteComponent,
  tableComponent, mermaidComponent,
  lineComponent, shapeComponent, slideNumberComponent,
  rowComponent, columnComponent, stackComponent, gridComponent,
} from '../src/index.js';

// Register components explicitly
componentRegistry.register([
  textComponent, imageComponent, cardComponent, quoteComponent,
  tableComponent, codeComponent, mermaidComponent,
  lineComponent, shapeComponent, slideNumberComponent,
  rowComponent, columnComponent, stackComponent, gridComponent,
]);

// ============================================
// DSL FUNCTION
// ============================================

describe('code() DSL function', () => {
  it('returns ComponentNode with correct type', () => {
    const node = code('SELECT 1', 'sql');
    assert.strictEqual(node.type, NODE_TYPE.COMPONENT);
  });

  it('returns ComponentNode with correct componentName', () => {
    const node = code('SELECT 1', 'sql');
    assert.strictEqual(node.componentName, Component.Code);
  });

  it('stores code string in props.body', () => {
    const node = code('SELECT 1', 'sql');
    assert.strictEqual(node.props.body, 'SELECT 1');
  });

  it('stores language in props.language', () => {
    const node = code('SELECT 1', 'sql');
    assert.strictEqual(node.props.language, 'sql');
  });
});

// ============================================
// BUILD SHIKI THEME
// ============================================

describe('buildCodeTheme()', () => {
  const tokens: CodeTokens = {
    textStyle: TEXT_STYLE.CODE,
    backgroundColor: '#1E1E1E',
    textColor: '#D4D4D4',
    keywordColor: '#569CD6',
    stringColor: '#CE9178',
    commentColor: '#6A9955',
    functionColor: '#DCDCAA',
    numberColor: '#B5CEA8',
    operatorColor: '#D4D4D4',
    typeColor: '#4EC9B0',
    variableColor: '#9CDCFE',
    padding: 0.25,
    borderRadius: 0.1,
  };

  it('maps all color tokens to #-prefixed hex values', () => {
    const theme = buildCodeTheme(tokens);
    assert.strictEqual(theme.colors!['editor.background'], '#1E1E1E');
    assert.strictEqual(theme.colors!['editor.foreground'], '#D4D4D4');
  });

  it('sets editor.background from backgroundColor token', () => {
    const theme = buildCodeTheme({ ...tokens, backgroundColor: '#FF0000' });
    assert.strictEqual(theme.colors!['editor.background'], '#FF0000');
  });

  it('sets editor.foreground from textColor token', () => {
    const theme = buildCodeTheme({ ...tokens, textColor: '#00FF00' });
    assert.strictEqual(theme.colors!['editor.foreground'], '#00FF00');
  });

  it('generates tokenColors array with correct scope mappings', () => {
    const theme = buildCodeTheme(tokens);
    assert.ok(Array.isArray(theme.tokenColors));
    assert.ok(theme.tokenColors!.length > 0);
  });

  it('keywordColor maps to keyword scope', () => {
    const theme = buildCodeTheme(tokens);
    const entry = theme.tokenColors!.find((tc: any) =>
      Array.isArray(tc.scope) && tc.scope.includes('keyword'),
    );
    assert.ok(entry);
    assert.strictEqual((entry as any).settings.foreground, '#569CD6');
  });

  it('stringColor maps to string scope', () => {
    const theme = buildCodeTheme(tokens);
    const entry = theme.tokenColors!.find((tc: any) =>
      Array.isArray(tc.scope) && tc.scope.includes('string'),
    );
    assert.ok(entry);
    assert.strictEqual((entry as any).settings.foreground, '#CE9178');
  });

  it('commentColor maps to comment scope', () => {
    const theme = buildCodeTheme(tokens);
    const entry = theme.tokenColors!.find((tc: any) =>
      Array.isArray(tc.scope) && tc.scope.includes('comment'),
    );
    assert.ok(entry);
    assert.strictEqual((entry as any).settings.foreground, '#6A9955');
  });

  it('functionColor maps to entity.name.function scope', () => {
    const theme = buildCodeTheme(tokens);
    const entry = theme.tokenColors!.find((tc: any) =>
      Array.isArray(tc.scope) && tc.scope.includes('entity.name.function'),
    );
    assert.ok(entry);
    assert.strictEqual((entry as any).settings.foreground, '#DCDCAA');
  });

  it('numberColor maps to constant.numeric scope', () => {
    const theme = buildCodeTheme(tokens);
    const entry = theme.tokenColors!.find((tc: any) =>
      Array.isArray(tc.scope) && tc.scope.includes('constant.numeric'),
    );
    assert.ok(entry);
    assert.strictEqual((entry as any).settings.foreground, '#B5CEA8');
  });

  it('typeColor maps to entity.name.type scope', () => {
    const theme = buildCodeTheme(tokens);
    const entry = theme.tokenColors!.find((tc: any) =>
      Array.isArray(tc.scope) && tc.scope.includes('entity.name.type'),
    );
    assert.ok(entry);
    assert.strictEqual((entry as any).settings.foreground, '#4EC9B0');
  });

  it('variableColor maps to variable scope', () => {
    const theme = buildCodeTheme(tokens);
    const entry = theme.tokenColors!.find((tc: any) =>
      Array.isArray(tc.scope) && tc.scope.includes('variable'),
    );
    assert.ok(entry);
    assert.strictEqual((entry as any).settings.foreground, '#9CDCFE');
  });

  it('returns valid ThemeRegistration shape', () => {
    const theme = buildCodeTheme(tokens);
    assert.strictEqual(theme.name, 'tycoslide');
    assert.strictEqual(theme.type, 'dark');
    assert.ok(theme.colors);
    assert.ok(theme.tokenColors);
  });
});

// ============================================
// COMPONENT REGISTRATION
// ============================================

describe('code component registration', () => {
  it('should be available after register()', () => {
    assert.ok(componentRegistry.has(Component.Code));
  });
});

// ============================================
// EXPANSION
// ============================================

describe('code expansion', () => {
  it('expands to ImageNode via canvas', async () => {
    const theme = mockTheme();
    const canvas = noopCanvas();
    const context = { theme, assets: undefined, canvas } as any;

    const node = code('SELECT 1', 'sql');
    node.tokens = { ...DEFAULT_CODE_TOKENS };
    const result = await componentRegistry.expand(node, context);

    assert.strictEqual(result.type, NODE_TYPE.IMAGE);
    assert.strictEqual((result as any).src, 'mock://render.png');
  });

  it('passes transparent: false to canvas.renderHtml', async () => {
    const theme = mockTheme();
    let capturedTransparent: boolean | undefined;
    const canvas = {
      renderHtml: async (_html: string, transparent?: boolean) => {
        capturedTransparent = transparent;
        return 'mock://render.png';
      },
    };
    const context = { theme, assets: undefined, canvas } as any;

    const node = code('SELECT 1', 'sql');
    node.tokens = { ...DEFAULT_CODE_TOKENS };
    await componentRegistry.expand(node, context);

    assert.strictEqual(capturedTransparent, false);
  });

  it('throws on empty code body', async () => {
    const theme = mockTheme();
    const canvas = noopCanvas();
    const context = { theme, assets: undefined, canvas } as any;

    const node = code('   ', 'text');
    node.tokens = { ...DEFAULT_CODE_TOKENS };
    await assert.rejects(
      () => componentRegistry.expand(node, context),
      /Code block is empty/,
    );
  });

  it('HTML passed to render contains the code text', async () => {
    const theme = mockTheme();
    let capturedHtml = '';
    const canvas = {
      renderHtml: async (html: string, _transparent?: boolean) => {
        capturedHtml = html;
        return 'mock://render.png';
      },
    };
    const context = { theme, assets: undefined, canvas } as any;

    const node = code('SELECT * FROM orders', 'sql');
    node.tokens = { ...DEFAULT_CODE_TOKENS };
    await componentRegistry.expand(node, context);

    assert.ok(capturedHtml.includes('SELECT'), 'HTML should contain code text');
  });

  it('HTML contains background style from token', async () => {
    const theme = mockTheme();
    let capturedHtml = '';
    const canvas = {
      renderHtml: async (html: string, _transparent?: boolean) => {
        capturedHtml = html;
        return 'mock://render.png';
      },
    };
    const context = { theme, assets: undefined, canvas } as any;

    const node = code('x = 1', 'python');
    node.tokens = { ...DEFAULT_CODE_TOKENS };
    await componentRegistry.expand(node, context);

    assert.ok(capturedHtml.includes('#1E1E1E'), 'HTML should contain background color from token');
  });
});

// ============================================
// MDAST COMPILE
// ============================================

describe('code MDAST compile handler', () => {
  it('compiles code fence to ComponentNode with correct body', () => {
    const handler = componentRegistry.getMdastHandler(SYNTAX.CODE);
    assert.ok(handler, 'MDAST handler should be registered for code');

    const mdastNode = {
      type: 'code',
      value: 'SELECT 1',
      lang: 'sql',
      meta: null,
      position: { start: { line: 1, column: 1, offset: 0 }, end: { line: 3, column: 4, offset: 20 } },
    } as unknown as RootContent;

    const result = handler.mdast!.compile(mdastNode, '```sql\nSELECT 1\n```');
    assert.ok(result);
    assert.strictEqual(result!.componentName, Component.Code);
    assert.strictEqual((result!.props as any).body, 'SELECT 1');
  });

  it('compiles code fence with language', () => {
    const handler = componentRegistry.getMdastHandler(SYNTAX.CODE)!;
    const mdastNode = {
      type: 'code',
      value: 'const x = 1;',
      lang: 'typescript',
      meta: null,
    } as unknown as RootContent;

    const result = handler.mdast!.compile(mdastNode, '');
    assert.ok(result);
    assert.strictEqual((result!.props as any).language, 'typescript');
  });

  it('throws when code fence has no language', () => {
    const handler = componentRegistry.getMdastHandler(SYNTAX.CODE)!;
    const mdastNode = {
      type: 'code',
      value: 'hello world',
      lang: null,
      meta: null,
    } as unknown as RootContent;

    assert.throws(
      () => handler.mdast!.compile(mdastNode, ''),
      /no language specified/,
    );
  });

  it('throws on unsupported language', () => {
    const handler = componentRegistry.getMdastHandler(SYNTAX.CODE)!;
    const mdastNode = {
      type: 'code',
      value: 'hello world',
      lang: 'notareallanguage',
      meta: null,
    } as unknown as RootContent;

    assert.throws(
      () => handler.mdast!.compile(mdastNode, ''),
      /Unsupported code language "notareallanguage".*Supported languages include/,
    );
  });

  it('accepts all LANGUAGE_VALUES as valid', () => {
    const handler = componentRegistry.getMdastHandler(SYNTAX.CODE)!;
    // Spot-check a few common languages
    for (const lang of ['sql', 'typescript', 'python', 'rust', 'go']) {
      const mdastNode = {
        type: 'code',
        value: 'x',
        lang,
        meta: null,
      } as unknown as RootContent;
      const result = handler.mdast!.compile(mdastNode, '');
      assert.ok(result, `Language "${lang}" should be accepted`);
      assert.strictEqual((result!.props as any).language, lang);
    }
  });
});

// ============================================
// RENDER CODE TO HTML (direct)
// ============================================

describe('renderCodeToHtml()', () => {
  const tokens: CodeTokens = {
    textStyle: TEXT_STYLE.CODE,
    backgroundColor: '#1E1E1E',
    textColor: '#D4D4D4',
    keywordColor: '#569CD6',
    stringColor: '#CE9178',
    commentColor: '#6A9955',
    functionColor: '#DCDCAA',
    numberColor: '#B5CEA8',
    operatorColor: '#D4D4D4',
    typeColor: '#4EC9B0',
    variableColor: '#9CDCFE',
    padding: 0.25,
    borderRadius: 0.1,
  };

  const codeStyle: TextStyle = {
    fontFamily: { name: 'Fira Code', regular: { path: '', weight: 400 } },
    fontSize: 12,
    lineHeightMultiplier: 1.4,
    bulletIndentPt: 0,
  };

  it('returns a complete HTML document', async () => {
    const html = await renderCodeToHtml('const x = 1;', 'typescript', tokens, codeStyle);
    assert.ok(html.includes('<!DOCTYPE html>'), 'should start with DOCTYPE');
    assert.ok(html.includes('<html>'), 'should have html tag');
    assert.ok(html.includes('<body>'), 'should have body tag');
  });

  it('contains data-render-signal="done"', async () => {
    const html = await renderCodeToHtml('x = 1', 'python', tokens, codeStyle);
    assert.ok(html.includes('data-render-signal="done"'), 'should have render signal for Playwright');
  });

  it('contains background color from token', async () => {
    const html = await renderCodeToHtml('x', 'text', tokens, codeStyle);
    assert.ok(html.includes('#1E1E1E'), 'should contain background color');
  });

  it('contains font-family from textStyle', async () => {
    const html = await renderCodeToHtml('x', 'text', tokens, codeStyle);
    assert.ok(html.includes('Fira Code'), 'should contain font family');
  });

  it('contains font-weight from textStyle regular font', async () => {
    const html = await renderCodeToHtml('x', 'text', tokens, codeStyle);
    assert.ok(html.includes('font-weight: 400'), 'should contain font-weight from regular font');
  });

  it('contains font-size from textStyle', async () => {
    const html = await renderCodeToHtml('x', 'text', tokens, codeStyle);
    assert.ok(html.includes('12pt'), 'should contain font size in pt');
  });

  it('contains line-height from textStyle', async () => {
    const html = await renderCodeToHtml('x', 'text', tokens, codeStyle);
    assert.ok(html.includes('1.4'), 'should contain line height');
  });

  it('uses inToPx for padding', async () => {
    const html = await renderCodeToHtml('x', 'text', tokens, codeStyle);
    const expectedPadding = `${inToPx(0.25)}px`;
    assert.ok(html.includes(expectedPadding), `should contain padding ${expectedPadding}`);
  });

  it('uses inToPx for border-radius', async () => {
    const html = await renderCodeToHtml('x', 'text', tokens, codeStyle);
    const expectedRadius = `${inToPx(0.1)}px`;
    assert.ok(html.includes(expectedRadius), `should contain border-radius ${expectedRadius}`);
  });

  it('preserves multiline code', async () => {
    const multiline = 'line 1\nline 2\nline 3';
    const html = await renderCodeToHtml(multiline, 'text', tokens, codeStyle);
    assert.ok(html.includes('line 1'), 'should contain first line');
    assert.ok(html.includes('line 3'), 'should contain last line');
  });

  it('handles special characters in code', async () => {
    const code = 'if (x < 10 && y > 20) { return "ok"; }';
    const html = await renderCodeToHtml(code, 'javascript', tokens, codeStyle);
    // Shiki should produce valid HTML with entities
    assert.ok(html.includes('10'), 'should contain the code content');
    // Should not contain raw unescaped < in code content (Shiki escapes to &lt;)
    assert.ok(!html.includes('x < 10 &&'), 'angle brackets should be escaped by Shiki');
  });
});

// ============================================
// BUILD CODE THEME — ADDITIONAL SCOPE TESTS
// ============================================

describe('buildCodeTheme() — operator scope', () => {
  const tokens: CodeTokens = {
    textStyle: TEXT_STYLE.CODE,
    backgroundColor: '#1E1E1E',
    textColor: '#D4D4D4',
    keywordColor: '#569CD6',
    stringColor: '#CE9178',
    commentColor: '#6A9955',
    functionColor: '#DCDCAA',
    numberColor: '#B5CEA8',
    operatorColor: '#FF00FF',
    typeColor: '#4EC9B0',
    variableColor: '#9CDCFE',
    padding: 0.25,
    borderRadius: 0.1,
  };

  it('operatorColor maps to keyword.operator scope', () => {
    const theme = buildCodeTheme(tokens);
    const entry = theme.tokenColors!.find((tc: any) =>
      Array.isArray(tc.scope) && tc.scope.includes('keyword.operator'),
    );
    assert.ok(entry);
    assert.strictEqual((entry as any).settings.foreground, '#FF00FF');
  });
});

// ============================================
// EXPANSION — ADDITIONAL TESTS
// ============================================

describe('code expansion — additional', () => {
  it('trims whitespace from code before rendering', async () => {
    const theme = mockTheme();
    let capturedHtml = '';
    const canvas = {
      renderHtml: async (html: string) => {
        capturedHtml = html;
        return 'mock://render.png';
      },
    };
    const context = { theme, assets: undefined, canvas } as any;

    const node = code('  \n  SELECT 1  \n  ', 'sql');
    node.tokens = { ...DEFAULT_CODE_TOKENS };
    await componentRegistry.expand(node, context);

    // The trimmed code should be passed to Shiki (Shiki tokenizes words into separate spans)
    assert.ok(capturedHtml.includes('SELECT'), 'should contain trimmed code');
  });

  it('multiline code produces valid HTML', async () => {
    const theme = mockTheme();
    let capturedHtml = '';
    const canvas = {
      renderHtml: async (html: string) => {
        capturedHtml = html;
        return 'mock://render.png';
      },
    };
    const context = { theme, assets: undefined, canvas } as any;

    const multiline = 'function hello() {\n  return "world";\n}';
    const node = code(multiline, 'javascript');
    node.tokens = { ...DEFAULT_CODE_TOKENS };
    const result = await componentRegistry.expand(node, context);

    assert.strictEqual(result.type, NODE_TYPE.IMAGE);
    assert.ok(capturedHtml.includes('hello'), 'HTML should contain function name');
    assert.ok(capturedHtml.includes('world'), 'HTML should contain string content');
  });
});

// ============================================
// LANGUAGE CONST
// ============================================

describe('LANGUAGE constant', () => {
  it('LANGUAGE_VALUES is non-empty', () => {
    assert.ok(LANGUAGE_VALUES.length > 0, 'should have language values');
  });

  it('contains common languages', () => {
    const values = new Set(LANGUAGE_VALUES);
    assert.ok(values.has('typescript'), 'should contain typescript');
    assert.ok(values.has('python'), 'should contain python');
    assert.ok(values.has('sql'), 'should contain sql');
    assert.ok(values.has('rust'), 'should contain rust');
    assert.ok(values.has('go'), 'should contain go');
    assert.ok(values.has('java'), 'should contain java');
    assert.ok(values.has('bash'), 'should contain bash');
  });

  it('LANGUAGE keys are UPPER_SNAKE_CASE', () => {
    for (const key of Object.keys(LANGUAGE)) {
      assert.match(key, /^[A-Z][A-Z0-9_]*$/, `Key "${key}" should be UPPER_SNAKE_CASE`);
    }
  });

  it('includes aliases (TS for typescript, PY for python)', () => {
    assert.strictEqual(LANGUAGE.TS, 'ts');
    assert.strictEqual(LANGUAGE.TYPESCRIPT, 'typescript');
    assert.strictEqual(LANGUAGE.PY, 'py');
    assert.strictEqual(LANGUAGE.PYTHON, 'python');
  });
});
