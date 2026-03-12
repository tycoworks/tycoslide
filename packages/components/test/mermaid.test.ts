// Mermaid Tests
// Tests for mermaid() DSL function and sanitizeMermaidDefinition

import assert from "node:assert";
import { describe, it } from "node:test";
import { componentRegistry, NODE_TYPE, TEXT_STYLE } from "tycoslide";
import {
  cardComponent,
  codeComponent,
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
import {
  buildClassDefs,
  buildMermaidConfig,
  injectClassDefs,
  type MermaidTokens,
  mermaid,
  sanitizeMermaidDefinition,
} from "../src/mermaid.js";
import { Component } from "../src/names.js";
import { DEFAULT_MERMAID_TOKENS, mockTheme } from "./mocks.js";

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

describe("mermaid() DSL function", () => {
  it("returns ComponentNode with correct type", () => {
    const m = mermaid("flowchart LR\n  A --> B");
    assert.strictEqual(m.type, NODE_TYPE.COMPONENT);
  });

  it("returns ComponentNode with correct componentName", () => {
    const m = mermaid("flowchart LR\n  A --> B");
    assert.strictEqual(m.componentName, Component.Mermaid);
  });

  it("stores definition in props.body", () => {
    const definition = "flowchart LR\n  A --> B";
    const m = mermaid(definition);
    assert.strictEqual(m.props.body, definition);
  });
});

describe("sanitizeMermaidDefinition", () => {
  it("throws on style NodeId fill:#f00 lines", () => {
    const input = `flowchart LR
  A[Node A]
  style A fill:#ff0000
  B[Node B]`;
    assert.throws(() => sanitizeMermaidDefinition(input), /forbidden style directive/);
  });

  it("throws on linkStyle 0 stroke:#f00 lines", () => {
    const input = `flowchart LR
  A --> B
  linkStyle 0 stroke:#ff0000`;
    assert.throws(() => sanitizeMermaidDefinition(input), /forbidden style directive/);
  });

  it("throws on classDef myClass fill:#f00 lines", () => {
    const input = `flowchart LR
  classDef myClass fill:#ff0000
  A[Node A]`;
    assert.throws(() => sanitizeMermaidDefinition(input), /forbidden style directive/);
  });

  it("throws on %%{init: ...}%% lines", () => {
    const input = `%%{init: {"flowchart": {"curve": "linear"}}}%%
flowchart LR
  A --> B`;
    assert.throws(() => sanitizeMermaidDefinition(input), /forbidden style directive/);
  });

  it("preserves class NodeId primary lines", () => {
    const input = `flowchart LR
  A[Node A]
  class A primary`;
    const result = sanitizeMermaidDefinition(input);
    assert.strictEqual(
      result,
      `flowchart LR
  A[Node A]
  class A primary`,
    );
  });

  it("preserves A:::primary inline class syntax", () => {
    const input = `flowchart LR
  A[Node A]:::primary
  B[Node B]`;
    const result = sanitizeMermaidDefinition(input);
    assert.strictEqual(
      result,
      `flowchart LR
  A[Node A]:::primary
  B[Node B]`,
    );
  });

  it("preserves all other mermaid syntax", () => {
    const input = `flowchart LR
  subgraph Sources
    DB[(Database)]
  end
  A[Start] --> B[End]
  B --> C{Decision}`;
    const result = sanitizeMermaidDefinition(input);
    assert.strictEqual(result, input);
  });

  it("throws on mixed content with multiple forbidden directives", () => {
    const input = `%%{init: {"flowchart": {"curve": "linear"}}}%%
flowchart LR
  classDef primary fill:#ff0000
  A[Node A]
  style A fill:#00ff00
  B[Node B]
  class A primary
  A --> B
  linkStyle 0 stroke:#0000ff`;
    assert.throws(() => sanitizeMermaidDefinition(input), /4 forbidden style directive/);
  });

  it("includes offending lines in error message", () => {
    const input = `flowchart LR
  A[Node A]
  style A fill:#ff0000`;
    try {
      sanitizeMermaidDefinition(input);
      assert.fail("should have thrown");
    } catch (e: any) {
      assert.ok(e.message.includes("style A fill:#ff0000"), "error should include the offending line");
      assert.ok(e.message.includes("class NodeId primary"), "error should suggest the fix");
    }
  });
});

// ============================================
// THEME INTEGRATION (pure functions)
// ============================================

const testTokens: MermaidTokens = {
  primaryColor: "#FF0000",
  primaryTextColor: "#FFFFFF",
  primaryBorderColor: "#666666",
  lineColor: "#000000",
  secondaryColor: "#333333",
  tertiaryColor: "#333333",
  textColor: "#000000",
  nodeTextColor: "#111111",
  clusterBackground: "#AABBCC",
  clusterBorderColor: "#666666",
  edgeLabelBackground: "#FFFFFF",
  titleColor: "#222222",
  textStyle: TEXT_STYLE.BODY,
  accentOpacity: 20,
  accents: { teal: "#00CCCC", pink: "#FF00FF", orange: "#FF8800" },
};

describe("buildMermaidConfig", () => {
  it("maps all tokens to #-prefixed themeVariables", () => {
    const config = buildMermaidConfig(testTokens, "Inter") as any;
    assert.strictEqual(config.themeVariables.primaryColor, "#FF0000");
    assert.strictEqual(config.themeVariables.primaryTextColor, "#FFFFFF");
    assert.strictEqual(config.themeVariables.lineColor, "#000000");
    assert.strictEqual(config.themeVariables.nodeTextColor, "#111111");
    assert.strictEqual(config.themeVariables.titleColor, "#222222");
    assert.strictEqual(config.themeVariables.edgeLabelBackground, "#FFFFFF");
  });

  it("sets fontFamily from parameter", () => {
    const config = buildMermaidConfig(testTokens, "CustomFont") as any;
    assert.strictEqual(config.themeVariables.fontFamily, "CustomFont");
  });

  it("sets background to transparent", () => {
    const config = buildMermaidConfig(testTokens, "Inter") as any;
    assert.strictEqual(config.themeVariables.background, "transparent");
  });

  it("converts clusterBkg to rgba with accentOpacity", () => {
    const config = buildMermaidConfig(testTokens, "Inter") as any;
    // AABBCC at 20% → rgba(170, 187, 204, 0.2)
    assert.strictEqual(config.themeVariables.clusterBkg, "rgba(170, 187, 204, 0.2)");
  });

  it("uses mermaid base theme", () => {
    const config = buildMermaidConfig(testTokens, "Inter") as any;
    assert.strictEqual(config.theme, "base");
  });
});

describe("buildClassDefs", () => {
  it("generates classDef for each accent with hex alpha", () => {
    const accents = { teal: "#00CCCC", pink: "#FF00FF" };
    const result = buildClassDefs(testTokens, accents);
    // 20% of 255 = 51 → hex '33'
    assert.ok(result.includes("classDef teal fill:#00CCCC33"));
    assert.ok(result.includes("classDef pink fill:#FF00FF33"));
  });

  it("generates primary classDef at full opacity with text color", () => {
    const result = buildClassDefs(testTokens, {});
    assert.ok(result.includes("classDef primary fill:#FF0000,color:#FFFFFF"));
  });

  it("primary classDef has no alpha suffix", () => {
    const result = buildClassDefs(testTokens, {});
    // Should NOT have hex alpha appended to primary fill
    assert.ok(!result.includes("classDef primary fill:#FF000033"));
  });
});

describe("injectClassDefs", () => {
  const accents = { teal: "#00CCCC" };

  it("injects classDefs after flowchart declaration", () => {
    const def = "flowchart LR\n  A --> B";
    const result = injectClassDefs(def, testTokens, accents);
    assert.ok(result.startsWith("flowchart LR\n"));
    assert.ok(result.includes("classDef teal"));
    assert.ok(result.includes("classDef primary"));
    // Original content preserved
    assert.ok(result.includes("A --> B"));
  });

  it("injects after graph declaration too", () => {
    const def = "graph TD\n  A --> B";
    const result = injectClassDefs(def, testTokens, accents);
    assert.ok(result.includes("classDef teal"));
  });

  it("skips injection for non-flowchart diagrams", () => {
    const def = "sequenceDiagram\n  Alice->>Bob: Hello";
    const result = injectClassDefs(def, testTokens, accents);
    assert.strictEqual(result, def);
  });

  it("adds subgraph style directives when subgraphs present", () => {
    const def = "flowchart LR\n  subgraph Sources\n    A[Node]\n  end";
    const result = injectClassDefs(def, testTokens, accents);
    // Subgraph style uses clusterBackground + accentOpacity hex alpha
    assert.ok(result.includes("style Sources fill:#AABBCC33"));
  });

  it("skips subgraph styles when no subgraphs", () => {
    const def = "flowchart LR\n  A --> B";
    const result = injectClassDefs(def, testTokens, accents);
    assert.ok(!result.includes("style "));
  });
});

describe("mermaid expansion", () => {
  it("should be available after register()", () => {
    const registered = componentRegistry.has(Component.Mermaid);
    assert.ok(registered, "mermaid component should be registered");
  });

  it("expands to ImageNode via canvas", async () => {
    const m = mermaid("flowchart LR\n  A[Start] --> B[End]");
    m.tokens = { ...DEFAULT_MERMAID_TOKENS };
    const expanded = await componentRegistry.expand(m, {
      theme: mockTheme(),
      canvas: {
        renderHtml: async (html: string, transparent?: boolean) => {
          assert.ok(html.includes("mermaid"), "HTML should contain mermaid bundle");
          assert.strictEqual(transparent, true, "mermaid renders with transparent background");
          return "mock://mermaid.png";
        },
      },
    });

    assert.strictEqual(expanded.type, NODE_TYPE.IMAGE);
    assert.strictEqual((expanded as any).src, "mock://mermaid.png");
  });
});
