// Layout Token Tests
// - resolveVariantTokens() for variant lookup
// - Slot token injection in documentCompiler
// - Backward compatibility (layouts without tokens)

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { compileDocument } from "../src/core/markdown/documentCompiler.js";
import { isComponentNode, NODE_TYPE } from "../src/core/model/nodes.js";
import { schema } from "../src/core/model/schema.js";
import { resolveVariantTokens, token } from "../src/core/model/token.js";
import type { Slide } from "../src/core/model/types.js";
import {
  componentRegistry,
  defineLayout,
  layoutRegistry,
} from "../src/core/rendering/registry.js";
import { mockTheme } from "./mocks.js";
import { testComponents } from "./test-components.js";

// Register test components (idempotent — may already be registered by other test files)
componentRegistry.register(testComponents);

// ============================================
// LAYOUT TOKEN RESOLUTION (resolveVariantTokens)
// ============================================

describe("resolveVariantTokens", () => {

  it("resolves default variant tokens", () => {
    const theme = mockTheme({
      layouts: {
        title: {
          variants: {
            default: { background: "#FF0000", title: { style: "h1", color: "#FFFFFF" } },
          },
        },
      },
    });
    const result = resolveVariantTokens(theme.layouts?.title, "title", "default", undefined, "Layout");
    assert.strictEqual(result.background, "#FF0000");
    assert.deepStrictEqual(result.title, { style: "h1", color: "#FFFFFF" });
  });

  it("resolves non-default variant tokens", () => {
    const theme = mockTheme({
      layouts: {
        title: {
          variants: {
            default: { background: "#FF0000" },
            dark: { background: "#000000" },
          },
        },
      },
    });
    const result = resolveVariantTokens(theme.layouts?.title, "title", "dark", undefined, "Layout");
    assert.strictEqual(result.background, "#000000");
  });

  it("throws when layout is not in theme.layouts", () => {
    const theme = mockTheme({ layouts: {} });
    assert.throws(
      () => resolveVariantTokens(theme.layouts?.nonexistent, "nonexistent", "default", undefined, "Layout"),
      /theme\.layouts\.nonexistent is missing/,
    );
  });

  it("throws when theme has no layouts at all", () => {
    const theme = mockTheme();
    assert.throws(
      () => resolveVariantTokens(theme.layouts?.title, "title", "default", undefined, "Layout"),
      /theme\.layouts\.title is missing/,
    );
  });

  it("throws when requested variant does not exist", () => {
    const theme = mockTheme({
      layouts: {
        title: {
          variants: {
            default: { background: "#FF0000" },
          },
        },
      },
    });
    assert.throws(
      () => resolveVariantTokens(theme.layouts?.title, "title", "nonexistent", undefined, "Layout"),
      /Unknown variant 'nonexistent' for layout 'title'/,
    );
  });

  it("rejects unknown keys for non-slotted layouts", () => {
    const shape = { background: token.required<any>() };
    const theme = mockTheme({
      layouts: {
        title: {
          variants: {
            default: { background: "#FF0000", bogus: "oops" },
          },
        },
      },
    });
    assert.throws(
      () => resolveVariantTokens(theme.layouts?.title, "title", "default", shape, "Layout"),
      /unknown tokens.*bogus/,
    );
  });

  it("allows extra keys for slotted layouts", () => {
    const shape = { background: token.required<any>() };
    const theme = mockTheme({
      layouts: {
        body: {
          variants: {
            default: { background: "#FF0000", text: { style: "body" }, table: { headerBg: "#CCC" } },
          },
        },
      },
    });
    // strict = false → extra keys allowed (slot injection tokens)
    const result = resolveVariantTokens(theme.layouts?.body, "body", "default", shape, "Layout", false);
    assert.strictEqual(result.background, "#FF0000");
  });
});

// ============================================
// DOCUMENT COMPILER: VARIANT + TOKEN PASSING
// ============================================

describe("Document Compiler: Layout Tokens", () => {
  const HEADER = `---\ntheme: test\n---\n\n`;
  let receivedProps: any[];
  let receivedTokens: any[];

  // Register a token-bearing layout for testing
  const tokenLayout = defineLayout({
    name: "tokenBody",
    description: "Test layout with tokens and body slot",
    params: { title: schema.string().optional() },
    slots: ["body"],
    tokens: { background: token.required<any>(), title: token.required<any>(), text: token.required<any>() },
    render: (props: any, tokens?: Record<string, unknown>): Slide => {
      receivedProps.push(props);
      receivedTokens.push(tokens);
      return {
        masterName: "default",
        masterVariant: "default",
        content: { type: NODE_TYPE.COMPONENT, componentName: "test", props },
      };
    },
  });

  const tokenNoSlotLayout = defineLayout({
    name: "tokenSimple",
    description: "Test layout with tokens but no slots",
    params: { title: schema.string() },
    tokens: { background: token.required<any>(), titleTokens: token.required<any>() },
    render: (props: any, tokens?: Record<string, unknown>): Slide => {
      receivedProps.push(props);
      receivedTokens.push(tokens);
      return {
        masterName: "default",
        masterVariant: "default",
        content: { type: NODE_TYPE.COMPONENT, componentName: "test", props },
      };
    },
  });

  layoutRegistry.register([tokenLayout, tokenNoSlotLayout]);

  beforeEach(() => {
    receivedProps = [];
    receivedTokens = [];
  });

  it("passes resolved tokens to layout render (no slots)", () => {
    const theme = mockTheme({
      layouts: {
        tokenSimple: {
          variants: {
            default: { background: "#AAAAAA", titleTokens: { style: "h1", color: "#FFFFFF" } },
          },
        },
      },
    });

    const md = `${HEADER}---\nlayout: tokenSimple\nvariant: default\ntitle: Hello\n---`;
    compileDocument(md, { theme });

    assert.strictEqual(receivedTokens.length, 1);
    assert.strictEqual(receivedTokens[0].background, "#AAAAAA");
    assert.deepStrictEqual(receivedTokens[0].titleTokens, { style: "h1", color: "#FFFFFF" });
  });

  it("passes resolved tokens with non-default variant", () => {
    const theme = mockTheme({
      layouts: {
        tokenSimple: {
          variants: {
            default: { background: "#AAAAAA", titleTokens: { style: "h1" } },
            dark: { background: "#000000", titleTokens: { style: "h2" } },
          },
        },
      },
    });

    const md = `${HEADER}---\nlayout: tokenSimple\ntitle: Hello\nvariant: dark\n---`;
    compileDocument(md, { theme });

    assert.strictEqual(receivedTokens.length, 1);
    assert.strictEqual(receivedTokens[0].background, "#000000");
  });

  it("resolves tokens for explicitly specified default variant", () => {
    const theme = mockTheme({
      layouts: {
        tokenSimple: {
          variants: {
            default: { background: "#FFFFFF", titleTokens: {} },
            dark: { background: "#000000", titleTokens: {} },
          },
        },
      },
    });

    const md = `${HEADER}---\nlayout: tokenSimple\nvariant: default\ntitle: Hello\n---`;
    compileDocument(md, { theme });

    assert.strictEqual(receivedTokens[0].background, "#FFFFFF");
  });

  it("does not strip variant from params (it is a reserved key)", () => {
    const theme = mockTheme({
      layouts: {
        tokenSimple: {
          variants: {
            default: { background: "#FFFFFF", titleTokens: {} },
            dark: { background: "#000000", titleTokens: {} },
          },
        },
      },
    });

    const md = `${HEADER}---\nlayout: tokenSimple\ntitle: Hello\nvariant: dark\n---`;
    // variant is reserved, so it should NOT appear in props passed to render
    // (it would fail validation if the layout doesn't declare it as a param)
    // But since tokenSimple doesn't have variant as a param, Zod strips it
    compileDocument(md, { theme });
    assert.strictEqual(receivedProps[0].variant, undefined);
  });

  it("backward compat: layout without tokens receives undefined tokens", () => {
    // Use the existing 'simple' layout registered in documentCompiler tests
    // which has no tokens
    let capturedTokens: any = "NOT_CALLED";

    const noTokenLayout = defineLayout({
      name: "noTokenTest",
      description: "no tokens layout",
      params: { title: schema.string() },
      render: (props: any, tokens?: Record<string, unknown>): Slide => {
        capturedTokens = tokens;
        return {
          masterName: "default",
          masterVariant: "default",
          content: { type: NODE_TYPE.COMPONENT, componentName: "test", props },
        };
      },
    });
    layoutRegistry.register(noTokenLayout);

    const md = `${HEADER}---\nlayout: noTokenTest\nvariant: default\ntitle: Hello\n---`;
    compileDocument(md, { theme: mockTheme() });

    assert.strictEqual(capturedTokens, undefined);
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
    params: { title: schema.string().optional() },
    slots: ["body"],
    tokens: { background: token.required<any>(), text: token.required<any>() },
    render: (props: any, tokens?: Record<string, unknown>): Slide => {
      receivedProps.push(props);
      receivedTokens.push(tokens);
      return {
        masterName: "default",
        masterVariant: "default",
        content: { type: NODE_TYPE.COMPONENT, componentName: "test", props },
      };
    },
  });

  layoutRegistry.register(slotTokenLayout);

  beforeEach(() => {
    receivedProps = [];
    receivedTokens = [];
  });

  it("injects text tokens into slot-compiled text nodes", () => {
    const textTokens = { style: "h2", color: "#FF0000", lineHeightMultiplier: 1.5 };
    const theme = mockTheme({
      layouts: {
        slotTokenTest: {
          variants: {
            default: {
              background: "#FFFFFF",
              text: textTokens,
            },
          },
        },
      },
    });

    const md = `${HEADER}---\nlayout: slotTokenTest\nvariant: default\n---\n\nHello world`;
    compileDocument(md, { theme });

    assert.strictEqual(receivedProps.length, 1);
    const bodyNodes = receivedProps[0].body;
    assert.ok(Array.isArray(bodyNodes));
    assert.ok(bodyNodes.length > 0);

    // The first body node should be a text ComponentNode with injected tokens
    const textNode = bodyNodes[0];
    assert.ok(isComponentNode(textNode), "body node should be a ComponentNode");
    assert.strictEqual(textNode.componentName, "text");
    // Token values should be in node.tokens (not merged into props)
    const tokens = textNode.tokens as Record<string, unknown>;
    assert.ok(tokens, "tokens should be set on the node");
    assert.strictEqual(tokens.style, "h2");
    assert.strictEqual(tokens.color, "#FF0000");
    assert.strictEqual(tokens.lineHeightMultiplier, 1.5);
  });

  it("preserves explicit props over injected tokens", () => {
    const textTokens = { style: "body", color: "#000000" };
    const theme = mockTheme({
      layouts: {
        slotTokenTest: {
          variants: {
            default: {
              background: "#FFFFFF",
              text: textTokens,
            },
          },
        },
      },
    });

    // Use a heading which sets style explicitly
    const md = `${HEADER}---\nlayout: slotTokenTest\nvariant: default\n---\n\n## Heading`;
    compileDocument(md, { theme });

    const bodyNodes = receivedProps[0].body;
    const textNode = bodyNodes[0];
    const tokens = textNode.tokens as Record<string, unknown>;
    assert.ok(tokens, "tokens should be set on the node");
    // Heading mdast compile puts style:'h2' in node.tokens.
    // Slot injection merges: { ...layoutDefaults, ...nodeTokens }
    // So heading's 'h2' overrides layout's 'body'.
    assert.strictEqual(tokens.style, "h2");
    assert.strictEqual(tokens.color, "#000000");
  });

  it("throws when required token is missing from theme variant", () => {
    const theme = mockTheme({
      layouts: {
        slotTokenTest: {
          variants: {
            default: {
              background: "#FFFFFF",
              // No 'text' key — required token missing
              text: undefined as any,
            },
          },
        },
      },
    });

    // Remove the undefined key to truly test absence
    delete (theme.layouts as any).slotTokenTest.variants.default.text;

    const md = `${HEADER}---\nlayout: slotTokenTest\nvariant: default\n---\n\nHello`;
    assert.throws(
      () => compileDocument(md, { theme }),
      /missing required tokens.*text/,
    );
  });

  it("does not inject tokens for layouts without slots", () => {
    let capturedProps: any;
    const noSlotTokenLayout = defineLayout({
      name: "noSlotTokenTest",
      description: "Tokens but no slots",
      params: { title: schema.string() },
      tokens: { background: token.required<any>(), text: token.required<any>() },
      render: (props: any, _tokens?: Record<string, unknown>): Slide => {
        capturedProps = props;
        return {
          masterName: "default",
          masterVariant: "default",
          content: { type: NODE_TYPE.COMPONENT, componentName: "test", props },
        };
      },
    });
    layoutRegistry.register(noSlotTokenLayout);

    const theme = mockTheme({
      layouts: {
        noSlotTokenTest: {
          variants: {
            default: {
              background: "#FFFFFF",
              text: { style: "body", color: "#000000" },
            },
          },
        },
      },
    });

    const md = `${HEADER}---\nlayout: noSlotTokenTest\nvariant: default\ntitle: Hello\n---`;
    compileDocument(md, { theme });

    // Props should just be the validated params, no injection
    assert.strictEqual(capturedProps.title, "Hello");
  });
});

// ============================================
// RESERVED FRONTMATTER KEYS
// ============================================

describe("RESERVED_FRONTMATTER_KEYS includes variant", () => {
  it("rejects layout param named variant", () => {
    assert.throws(
      () =>
        defineLayout({
          name: "badLayout",
          description: "test",
          params: { variant: schema.string() },
          render: () => ({
            masterName: "default",
            masterVariant: "default",
            content: { type: NODE_TYPE.COMPONENT, componentName: "test", props: {} },
          }),
        }),
      /reserved frontmatter key/,
    );
  });
});
