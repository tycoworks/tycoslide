// Mermaid Tests
// Tests for mermaid() DSL function and validateMermaidDefinition

import assert from "node:assert";
import { describe, it } from "node:test";
import { NODE_TYPE } from "@tycoslide/core";
import {
  buildClassDefs,
  buildMermaidConfig,
  extractGroups,
  injectClassDefs,
  type MermaidTokens,
  mermaid,
  validateMermaidDefinition,
} from "../src/components/mermaid.js";
import { Component } from "../src/presets/names.js";
import { DEFAULT_MERMAID_TOKENS, mermaidComponent, mockTheme, renderComponent } from "./mocks.js";

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
      assert.ok(e.message.includes("class NodeId backend"), "error should suggest the fix");
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
  accents: ["#00CCCC", "#FF00FF", "#FF8800"],
  accentOpacity: 20,
  accentTextColor: "#000000",
  style: "body",
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

describe("extractGroups", () => {
  it("extracts class statement group names in order", () => {
    const def = "flowchart LR\n  A --> B\n  class A backend\n  class B frontend";
    assert.deepStrictEqual(extractGroups(def), ["backend", "frontend"]);
  });

  it("deduplicates group names", () => {
    const def = "flowchart LR\n  class A svc\n  class B svc\n  class C other";
    assert.deepStrictEqual(extractGroups(def), ["svc", "other"]);
  });

  it("extracts inline :::groupName syntax", () => {
    const def = "flowchart LR\n  A:::backend --> B:::frontend";
    assert.deepStrictEqual(extractGroups(def), ["backend", "frontend"]);
  });

  it("merges class statements and inline syntax", () => {
    const def = "flowchart LR\n  A:::svc --> B\n  class B svc\n  class C other";
    assert.deepStrictEqual(extractGroups(def), ["svc", "other"]);
  });

  it("returns empty for no classes", () => {
    const def = "flowchart LR\n  A --> B";
    assert.deepStrictEqual(extractGroups(def), []);
  });
});

describe("buildClassDefs", () => {
  it("round-robin assigns accent colors to groups", () => {
    const result = buildClassDefs(testTokens, ["backend", "frontend"]);
    // testTokens.accents = ["#00CCCC", "#FF00FF", "#FF8800"], opacity 20 → 33
    assert.ok(result.includes("classDef backend fill:#00CCCC33,stroke:#00CCCC"));
    assert.ok(result.includes("classDef frontend fill:#FF00FF33,stroke:#FF00FF"));
  });

  it("wraps around when more groups than colors", () => {
    const result = buildClassDefs(testTokens, ["a", "b", "c", "d"]);
    // 4th group wraps to first color
    assert.ok(result.includes("classDef d fill:#00CCCC33"));
  });

  it("returns empty string for no groups", () => {
    assert.strictEqual(buildClassDefs(testTokens, []), "");
  });
});

describe("injectClassDefs", () => {
  it("injects classDefs for groups found in definition", () => {
    const def = "flowchart LR\n  A --> B\n  class B backend";
    const result = injectClassDefs(def, testTokens);
    assert.ok(result.startsWith("flowchart LR\n"));
    assert.ok(result.includes("classDef backend"));
    assert.ok(result.includes("A --> B"));
  });

  it("injects after graph declaration too", () => {
    const def = "graph TD\n  A --> B\n  class B svc";
    const result = injectClassDefs(def, testTokens);
    assert.ok(result.includes("classDef svc"));
  });

  it("skips injection for non-flowchart diagrams", () => {
    const def = "sequenceDiagram\n  Alice->>Bob: Hello";
    const result = injectClassDefs(def, testTokens);
    assert.strictEqual(result, def);
  });

  it("adds subgraph style directives when subgraphs present", () => {
    const def = "flowchart LR\n  subgraph Sources\n    A[Node]\n  end";
    const result = injectClassDefs(def, testTokens);
    assert.ok(result.includes("style Sources fill:#AABBCC"));
  });

  it("styles subgraphs with bracket labels by ID", () => {
    const def = 'flowchart LR\n  subgraph infra ["Infrastructure"]\n    A[Node]\n  end';
    const result = injectClassDefs(def, testTokens);
    assert.ok(result.includes("style infra fill:#AABBCC"));
  });

  it("skips classDef injection when no classes in definition", () => {
    const def = "flowchart LR\n  A --> B";
    const result = injectClassDefs(def, testTokens);
    assert.ok(!result.includes("classDef"));
  });
});

describe("mermaid expansion", () => {
  it("should be available after register()", () => {
    assert.ok(mermaidComponent);
  });

  it("renders to image component via canvas", async () => {
    const m = mermaid("flowchart LR\n  A[Start] --> B[End]", DEFAULT_MERMAID_TOKENS);
    const rendered = await renderComponent(m, {
      theme: mockTheme(),
      canvas: {
        renderHtml: async (html: string, transparent?: boolean) => {
          assert.ok(html.includes("mermaid"), "HTML should contain mermaid bundle");
          assert.strictEqual(transparent, true, "mermaid renders with transparent background");
          return "mock://mermaid.png";
        },
      },
      slideNumber: 1,
      renderTree: async (n: any) => n,
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
    const rendered = await renderComponent(m, {
      theme: mockTheme(),
      canvas: { renderHtml: async () => "mock://mermaid.png" },
      slideNumber: 1,
      renderTree: async (n: any) => n,
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
    const rendered = await renderComponent(m, {
      theme: mockTheme(),
      canvas: { renderHtml: async () => "mock://mermaid.png" },
      slideNumber: 1,
      renderTree: async (n: any) => n,
    });

    assert.strictEqual((rendered as any).componentName, Component.Stack);
    const content = (rendered as any).content as any[];
    assert.strictEqual(content.length, 2);
    assert.strictEqual(content[0].componentName, Component.Shape);
    assert.strictEqual(content[1].componentName, Component.Column);
  });

  it("returns bare image when no background token", async () => {
    const m = mermaid("flowchart LR\n  A --> B", DEFAULT_MERMAID_TOKENS);
    const rendered = await renderComponent(m, {
      theme: mockTheme(),
      canvas: { renderHtml: async () => "mock://mermaid.png" },
      slideNumber: 1,
      renderTree: async (n: any) => n,
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
    const rendered = await renderComponent(m, {
      theme: mockTheme(),
      canvas: { renderHtml: async () => "mock://mermaid.png" },
      slideNumber: 1,
      renderTree: async (n: any) => n,
    });

    assert.strictEqual((rendered as any).componentName, Component.Stack);
    const content = (rendered as any).content as any[];
    assert.strictEqual(content.length, 2);
    assert.strictEqual(content[0].componentName, Component.Shape);
    assert.strictEqual(content[1].componentName, Component.Image);
  });
});
