// Mermaid Tests
// Tests for mermaid() DSL function and validateMermaidDefinition

import assert from "node:assert";
import { describe, it } from "node:test";
import { componentRegistry, NODE_TYPE } from "@tycoslide/core";
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
  validateMermaidDefinition,
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
    const m = mermaid("flowchart LR\n  A --> B", DEFAULT_MERMAID_TOKENS);
    assert.strictEqual(m.type, NODE_TYPE.COMPONENT);
  });

  it("returns ComponentNode with correct componentName", () => {
    const m = mermaid("flowchart LR\n  A --> B", DEFAULT_MERMAID_TOKENS);
    assert.strictEqual(m.componentName, Component.Mermaid);
  });

  it("stores definition in content", () => {
    const definition = "flowchart LR\n  A --> B";
    const m = mermaid(definition, DEFAULT_MERMAID_TOKENS);
    assert.strictEqual(m.content, definition);
  });
});

describe("validateMermaidDefinition", () => {
  it("throws on style NodeId fill:#f00 lines", () => {
    const input = `flowchart LR
  A[Node A]
  style A fill:#ff0000
  B[Node B]`;
    assert.throws(() => validateMermaidDefinition(input), /forbidden style directive/);
  });

  it("throws on linkStyle 0 stroke:#f00 lines", () => {
    const input = `flowchart LR
  A --> B
  linkStyle 0 stroke:#ff0000`;
    assert.throws(() => validateMermaidDefinition(input), /forbidden style directive/);
  });

  it("throws on classDef myClass fill:#f00 lines", () => {
    const input = `flowchart LR
  classDef myClass fill:#ff0000
  A[Node A]`;
    assert.throws(() => validateMermaidDefinition(input), /forbidden style directive/);
  });

  it("throws on %%{init: ...}%% lines", () => {
    const input = `%%{init: {"flowchart": {"curve": "linear"}}}%%
flowchart LR
  A --> B`;
    assert.throws(() => validateMermaidDefinition(input), /forbidden style directive/);
  });

  it("preserves class NodeId primary lines", () => {
    const input = `flowchart LR
  A[Node A]
  class A primary`;
    const result = validateMermaidDefinition(input);
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
    const result = validateMermaidDefinition(input);
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
    const result = validateMermaidDefinition(input);
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
    assert.throws(() => validateMermaidDefinition(input), /4 forbidden style directive/);
  });

  it("includes offending lines in error message", () => {
    const input = `flowchart LR
  A[Node A]
  style A fill:#ff0000`;
    try {
      validateMermaidDefinition(input);
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
  primary: "#FF0000",
  primaryContrast: "#FFFFFF",
  text: "#000000",
  line: "#000000",
  surface: "#333333",
  surfaceBorder: "#666666",
  surfaceSubtle: "#FFFFFF",
  group: "#AABBCC",
  groupCornerRadius: 0.08,
  accents: { teal: "#00CCCC", pink: "#FF00FF", orange: "#FF8800" },
  accentStyle: { opacity: 20, textColor: "#000000" },
  textStyle: "body",
  image: { padding: 0 },
};

describe("buildMermaidConfig", () => {
  it("maps semantic tokens to mermaid themeVariables", () => {
    const config = buildMermaidConfig(testTokens, "Inter") as any;
    assert.strictEqual(config.themeVariables.primaryColor, "#FF0000");
    assert.strictEqual(config.themeVariables.primaryTextColor, "#FFFFFF");
    assert.strictEqual(config.themeVariables.primaryBorderColor, "#666666");
    assert.strictEqual(config.themeVariables.lineColor, "#000000");
    assert.strictEqual(config.themeVariables.secondaryColor, "#333333");
    assert.strictEqual(config.themeVariables.tertiaryColor, "#333333");
    assert.strictEqual(config.themeVariables.edgeLabelBackground, "#FFFFFF");
  });

  it("fans text token into textColor, nodeTextColor, and titleColor", () => {
    const config = buildMermaidConfig(testTokens, "Inter") as any;
    assert.strictEqual(config.themeVariables.textColor, "#000000");
    assert.strictEqual(config.themeVariables.nodeTextColor, "#000000");
    assert.strictEqual(config.themeVariables.titleColor, "#000000");
  });

  it("fans surfaceBorder into primaryBorderColor and clusterBorder", () => {
    const config = buildMermaidConfig(testTokens, "Inter") as any;
    assert.strictEqual(config.themeVariables.primaryBorderColor, "#666666");
    assert.strictEqual(config.themeVariables.clusterBorder, "#666666");
  });

  it("passes raw cluster color as clusterBkg (no opacity)", () => {
    const config = buildMermaidConfig(testTokens, "Inter") as any;
    // Raw color — opacity is applied only by buildSubgraphStyles for flowcharts
    assert.strictEqual(config.themeVariables.clusterBkg, "#AABBCC");
  });

  it("sets fontFamily from parameter", () => {
    const config = buildMermaidConfig(testTokens, "CustomFont") as any;
    assert.strictEqual(config.themeVariables.fontFamily, "CustomFont");
  });

  it("sets background to transparent", () => {
    const config = buildMermaidConfig(testTokens, "Inter") as any;
    assert.strictEqual(config.themeVariables.background, "transparent");
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
    // Subgraph style uses cluster color + accentStyle.opacity hex alpha
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

  it("renders to image component via canvas", async () => {
    const m = mermaid("flowchart LR\n  A[Start] --> B[End]", DEFAULT_MERMAID_TOKENS);
    const rendered = await componentRegistry.render(m, {
      theme: mockTheme(),
      canvas: {
        renderHtml: async (html: string, transparent?: boolean) => {
          assert.ok(html.includes("mermaid"), "HTML should contain mermaid bundle");
          assert.strictEqual(transparent, true, "mermaid renders with transparent background");
          return "mock://mermaid.png";
        },
      },
    });

    assert.strictEqual(rendered.type, NODE_TYPE.COMPONENT);
    assert.strictEqual((rendered as any).componentName, Component.Image);
    assert.strictEqual((rendered as any).content, "mock://mermaid.png");
  });

  it("wraps in stack+shape when background token is set", async () => {
    const tokens: MermaidTokens = {
      ...DEFAULT_MERMAID_TOKENS,
      background: { fill: "#FFFFFF", fillOpacity: 100, cornerRadius: 0.1 },
    };
    const m = mermaid("flowchart LR\n  A --> B", tokens);
    const rendered = await componentRegistry.render(m, {
      theme: mockTheme(),
      canvas: { renderHtml: async () => "mock://mermaid.png" },
    });

    assert.strictEqual((rendered as any).componentName, Component.Stack);
    const content = (rendered as any).content as any[];
    assert.strictEqual(content.length, 2);
    assert.strictEqual(content[0].componentName, Component.Shape);
    assert.strictEqual(content[1].componentName, Component.Image);
  });

  it("wraps image in column when backgroundPadding is set", async () => {
    const tokens: MermaidTokens = {
      ...DEFAULT_MERMAID_TOKENS,
      background: { fill: "#FFFFFF", fillOpacity: 100, cornerRadius: 0.1 },
      backgroundPadding: 0.2,
    };
    const m = mermaid("flowchart LR\n  A --> B", tokens);
    const rendered = await componentRegistry.render(m, {
      theme: mockTheme(),
      canvas: { renderHtml: async () => "mock://mermaid.png" },
    });

    assert.strictEqual((rendered as any).componentName, Component.Stack);
    const content = (rendered as any).content as any[];
    assert.strictEqual(content.length, 2);
    assert.strictEqual(content[0].componentName, Component.Shape);
    assert.strictEqual(content[1].componentName, Component.Column);
  });

  it("returns bare image when no background token", async () => {
    const m = mermaid("flowchart LR\n  A --> B", DEFAULT_MERMAID_TOKENS);
    const rendered = await componentRegistry.render(m, {
      theme: mockTheme(),
      canvas: { renderHtml: async () => "mock://mermaid.png" },
    });

    assert.strictEqual((rendered as any).componentName, Component.Image);
  });

  it("skips column wrapper when backgroundPadding is 0", async () => {
    const tokens: MermaidTokens = {
      ...DEFAULT_MERMAID_TOKENS,
      background: { fill: "#FFFFFF", fillOpacity: 100, cornerRadius: 0.1 },
      backgroundPadding: 0,
    };
    const m = mermaid("flowchart LR\n  A --> B", tokens);
    const rendered = await componentRegistry.render(m, {
      theme: mockTheme(),
      canvas: { renderHtml: async () => "mock://mermaid.png" },
    });

    assert.strictEqual((rendered as any).componentName, Component.Stack);
    const content = (rendered as any).content as any[];
    assert.strictEqual(content.length, 2);
    assert.strictEqual(content[0].componentName, Component.Shape);
    assert.strictEqual(content[1].componentName, Component.Image);
  });
});
