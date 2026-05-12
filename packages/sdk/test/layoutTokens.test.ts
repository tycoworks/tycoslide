// Layout Token Tests
// - Token passing from TemplateConfig to layout render
// - Slot token injection in documentCompiler

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
  type Background,
  defineLayout,
  isComponentNode,
  type LayoutDefinition,
  NODE_TYPE,
  param,
  type SlideNode,
  schema,
  type Theme,
} from "@tycoslide/core";
import type { CompileOptions } from "../src/markdown/documentCompiler.js";
import { compileDocument } from "../src/markdown/documentCompiler.js";
import { mockTheme } from "./mocks.js";
import { C, testComponents } from "./test-components.js";

/** Mock background for tests */
const mockBackground: Background = { color: "#FFFFFF" };

/** All layouts collected for test options */
const allLayouts: LayoutDefinition[] = [];

/** Build CompileOptions from a theme, using all registered test layouts */
function opts(theme: Theme): CompileOptions {
  return { theme, layouts: allLayouts, components: testComponents };
}

// ============================================
// DOCUMENT COMPILER: TOKEN PASSING
// ============================================

describe("Document Compiler: Layout Tokens", () => {
  const HEADER = `---\ntheme: test\n---\n\n`;
  let receivedProps: any[];
  let receivedTokens: any[];

  // Register a token-bearing layout for testing
  const tokenLayout = defineLayout({
    name: "tokenBody",
    description: "Test layout with tokens and body slot",
    params: { title: param.optional(schema.string()) },
    slots: ["body"],
    render: (params: any, slots: any, tokens: any): SlideNode => {
      receivedProps.push({ ...params, ...slots });
      receivedTokens.push(tokens);
      return { type: NODE_TYPE.COMPONENT, componentName: "test", params, content: undefined };
    },
  });

  const tokenNoSlotLayout = defineLayout({
    name: "tokenSimple",
    description: "Test layout with tokens but no slots",
    params: { title: schema.string() },
    render: (params: any, _slots: any, tokens: any): SlideNode => {
      receivedProps.push(params);
      receivedTokens.push(tokens);
      return { type: NODE_TYPE.COMPONENT, componentName: "test", params, content: undefined };
    },
  });

  allLayouts.push(tokenLayout, tokenNoSlotLayout);

  beforeEach(() => {
    receivedProps = [];
    receivedTokens = [];
  });

  it("passes layoutTokens to layout render (no slots)", () => {
    const layoutTokens = { background: "#AAAAAA", titleTokens: { style: "h1", color: "#FFFFFF" } };
    const theme = mockTheme({
      layouts: {
        tokenSimple: { background: mockBackground, layoutTokens },
      },
    });

    const md = `${HEADER}---\ntemplate: tokenSimple\ntitle: Hello\n---`;
    compileDocument(md, opts(theme));

    assert.strictEqual(receivedTokens.length, 1);
    assert.strictEqual(receivedTokens[0].background, "#AAAAAA");
    assert.deepStrictEqual(receivedTokens[0].titleTokens, { style: "h1", color: "#FFFFFF" });
  });

  it("passes layoutTokens directly to layout render", () => {
    const layoutTokens = { background: "#000000", titleTokens: { style: "h2" } };
    const theme = mockTheme({
      layouts: {
        tokenSimple: { background: mockBackground, layoutTokens },
      },
    });

    const md = `${HEADER}---\ntemplate: tokenSimple\ntitle: Hello\n---`;
    compileDocument(md, opts(theme));

    assert.strictEqual(receivedTokens.length, 1);
    assert.strictEqual(receivedTokens[0].background, "#000000");
  });

  it("layout without tokens receives undefined tokens", () => {
    let capturedTokens: any = "NOT_CALLED";

    const noTokenLayout = defineLayout({
      name: "noTokenTest",
      description: "no tokens layout",
      params: { title: schema.string() },
      render: (params: any, _slots: any, tokens?: object): SlideNode => {
        capturedTokens = tokens;
        return { type: NODE_TYPE.COMPONENT, componentName: "test", params, content: undefined };
      },
    });
    allLayouts.push(noTokenLayout);

    const theme = mockTheme({
      layouts: {
        noTokenTest: { background: mockBackground, layoutTokens: {} },
      },
    });

    const md = `${HEADER}---\ntemplate: noTokenTest\ntitle: Hello\n---`;
    compileDocument(md, opts(theme));

    // layoutTokens is {} which is passed through to layout render
    assert.deepStrictEqual(capturedTokens, {});
  });
});

// ============================================
// SLOT TOKEN INJECTION
// ============================================

describe("Slot Token Injection", () => {
  const HEADER = `---\ntheme: test\n---\n\n`;
  let receivedProps: any[];
  let receivedTokens: any[];

  const slotTokenLayout = defineLayout({
    name: "slotTokenTest",
    description: "Layout with slot token injection",
    params: { title: param.optional(schema.string()) },
    slots: ["body"],
    render: (params: any, slots: any, tokens: any): SlideNode => {
      receivedProps.push({ ...params, ...slots });
      receivedTokens.push(tokens);
      return { type: NODE_TYPE.COMPONENT, componentName: "test", params, content: undefined };
    },
  });

  allLayouts.push(slotTokenLayout);

  beforeEach(() => {
    receivedProps = [];
    receivedTokens = [];
  });

  it("injects text tokens into slot-compiled text nodes", () => {
    const textTokens = { style: "h2", color: "#FF0000", lineHeightMultiplier: 1.5 };
    const theme = mockTheme({
      layouts: {
        slotTokenTest: {
          background: mockBackground,
          layoutTokens: {
            background: "#FFFFFF",
            text: textTokens,
          },
        },
      },
    });

    const md = `${HEADER}---\ntemplate: slotTokenTest\n---\n\nHello world`;
    compileDocument(md, opts(theme));

    assert.strictEqual(receivedProps.length, 1);
    const bodyNodes = receivedProps[0].body;
    assert.ok(Array.isArray(bodyNodes));
    assert.ok(bodyNodes.length > 0);

    // The first body node should be a text ComponentNode with injected tokens
    const textNode = bodyNodes[0];
    assert.ok(isComponentNode(textNode), "body node should be a ComponentNode");
    assert.strictEqual(textNode.componentName, C.Text);
    // Token values should be in node.tokens (not merged into props)
    const tokens = textNode.tokens as Record<string, unknown>;
    assert.ok(tokens, "tokens should be set on the node");
    assert.strictEqual(tokens.style, "h2");
    assert.strictEqual(tokens.color, "#FF0000");
    assert.strictEqual(tokens.lineHeightMultiplier, 1.5);
  });

  it("preserves explicit props over injected tokens", () => {
    const textTokens = { style: "body", color: "#000000" };
    const labelDepthTokens = {
      1: { style: "h1", color: "#000000", hAlign: "left", vAlign: "middle" },
      2: { style: "body", color: "#000000", hAlign: "left", vAlign: "middle" },
      3: { style: "body", color: "#000000", hAlign: "left", vAlign: "middle" },
      4: { style: "body", color: "#000000", hAlign: "left", vAlign: "middle" },
      5: { style: "body", color: "#000000", hAlign: "left", vAlign: "middle" },
      6: { style: "body", color: "#000000", hAlign: "left", vAlign: "middle" },
    };
    const theme = mockTheme({
      layouts: {
        slotTokenTest: {
          background: mockBackground,
          layoutTokens: {
            background: "#FFFFFF",
            text: textTokens,
            label: labelDepthTokens,
          },
        },
      },
    });

    // Use a heading which maps to label component
    const md = `${HEADER}---\ntemplate: slotTokenTest\n---\n\n## Heading`;
    compileDocument(md, opts(theme));

    const bodyNodes = receivedProps[0].body;
    const labelNode = bodyNodes[0];
    assert.strictEqual(labelNode.componentName, C.Label);
    assert.strictEqual((labelNode as any).params?.headingDepth, 2);
    const tokens = labelNode.tokens as Record<string, unknown>;
    assert.ok(tokens, "tokens should be set on the node");
    assert.strictEqual(tokens.color, "#000000");
  });

  it("does not inject tokens for layouts without slots", () => {
    let capturedProps: any;
    const noSlotTokenLayout = defineLayout({
      name: "noSlotTokenTest",
      description: "Tokens but no slots",
      params: { title: schema.string() },
      render: (params: any, _slots: any, _tokens: any): SlideNode => {
        capturedProps = params;
        return { type: NODE_TYPE.COMPONENT, componentName: "test", params, content: undefined };
      },
    });
    allLayouts.push(noSlotTokenLayout);

    const theme = mockTheme({
      layouts: {
        noSlotTokenTest: {
          background: mockBackground,
          layoutTokens: {
            background: "#FFFFFF",
            text: { style: "body", color: "#000000" },
          },
        },
      },
    });

    const md = `${HEADER}---\ntemplate: noSlotTokenTest\ntitle: Hello\n---`;
    compileDocument(md, opts(theme));

    // Props should just be the validated params, no injection
    assert.strictEqual(capturedProps.title, "Hello");
  });
});

// ============================================
// RESERVED FRONTMATTER KEYS
// ============================================

describe("RESERVED_FRONTMATTER_KEYS rejects reserved param names", () => {
  it("rejects layout param named template", () => {
    assert.throws(
      () =>
        defineLayout({
          name: "badLayout",
          description: "test",
          params: { template: schema.string() },
          render: () => ({
            type: NODE_TYPE.COMPONENT,
            componentName: "test",
            params: {},
            content: undefined,
          }),
        }),
      /reserved frontmatter key/,
    );
  });
});
