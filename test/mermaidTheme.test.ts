import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateMermaidDefinition,
  extractGroups,
  buildClassDefs,
  buildSubgraphStyles,
  buildMermaidRenderConfig,
  injectClassDefs,
  type MermaidVariant,
} from "../dist/markdown/blocks/mermaidTheme.js";

// ── validateMermaidDefinition ──

describe("validateMermaidDefinition", () => {
  it("returns definition when no forbidden directives", () => {
    const def = "flowchart LR\n  A --> B\n  class A backend";
    assert.equal(validateMermaidDefinition(def), def);
  });

  it("rejects style directive", () => {
    assert.throws(
      () => validateMermaidDefinition("flowchart LR\n  A --> B\n  style A fill:#f00"),
      /forbidden style directive/,
    );
  });

  it("rejects linkStyle directive", () => {
    assert.throws(
      () => validateMermaidDefinition("flowchart LR\n  A --> B\n  linkStyle 0 stroke:#f00"),
      /forbidden style directive/,
    );
  });

  it("rejects classDef directive", () => {
    assert.throws(
      () => validateMermaidDefinition("flowchart LR\n  A --> B\n  classDef red fill:#f00"),
      /forbidden style directive/,
    );
  });

  it("rejects %%{init} directive", () => {
    assert.throws(
      () => validateMermaidDefinition('%%{init: {"theme":"dark"}}%%\nflowchart LR\n  A --> B'),
      /forbidden style directive/,
    );
  });

  it("reports all forbidden lines", () => {
    const def = "flowchart LR\n  style A fill:#f00\n  classDef red fill:#f00";
    try {
      validateMermaidDefinition(def);
      assert.fail("should throw");
    } catch (e: any) {
      assert.match(e.message, /2 forbidden/);
    }
  });
});

// ── extractGroups ──

describe("extractGroups", () => {
  it("extracts class statement groups", () => {
    const def = "flowchart LR\n  A --> B\n  class A backend\n  class B frontend";
    assert.deepEqual(extractGroups(def), ["backend", "frontend"]);
  });

  it("extracts inline ::: groups", () => {
    const def = "flowchart LR\n  A:::backend --> B:::frontend";
    assert.deepEqual(extractGroups(def), ["backend", "frontend"]);
  });

  it("deduplicates groups", () => {
    const def = "flowchart LR\n  A:::backend --> B:::backend\n  class A backend";
    assert.deepEqual(extractGroups(def), ["backend"]);
  });

  it("preserves encounter order (class statements first)", () => {
    const def = "flowchart LR\n  A:::alpha\n  class B beta\n  class C alpha";
    assert.deepEqual(extractGroups(def), ["beta", "alpha"]);
  });

  it("returns empty for no groups", () => {
    assert.deepEqual(extractGroups("flowchart LR\n  A --> B"), []);
  });

  it("handles multi-node class statements", () => {
    const def = "flowchart LR\n  class A,B,C backend";
    assert.deepEqual(extractGroups(def), ["backend"]);
  });
});

// ── buildClassDefs ──

describe("buildClassDefs", () => {
  const accents = ["#FF0000", "#00FF00", "#0000FF"];

  it("assigns accents round-robin", () => {
    const result = buildClassDefs(["a", "b", "c"], accents, 30, "#FFFFFF");
    assert.match(result, /classDef a fill:#FF00004d,stroke:#FF0000,color:#FFFFFF/);
    assert.match(result, /classDef b fill:#00FF004d,stroke:#00FF00,color:#FFFFFF/);
    assert.match(result, /classDef c fill:#0000FF4d,stroke:#0000FF,color:#FFFFFF/);
  });

  it("wraps when more groups than accents", () => {
    const result = buildClassDefs(["a", "b", "c", "d"], accents, 30, "#FFFFFF");
    assert.match(result, /classDef d fill:#FF00004d/);
  });

  it("returns empty string for no groups", () => {
    assert.equal(buildClassDefs([], accents, 30, "#FFFFFF"), "");
  });

  it("returns empty string for no accents", () => {
    assert.equal(buildClassDefs(["a"], [], 30, "#FFFFFF"), "");
  });

  it("handles 100% opacity", () => {
    const result = buildClassDefs(["a"], ["#FF0000"], 100, "#FFFFFF");
    assert.match(result, /fill:#FF0000ff/);
  });

  it("handles 0% opacity", () => {
    const result = buildClassDefs(["a"], ["#FF0000"], 0, "#FFFFFF");
    assert.match(result, /fill:#FF000000/);
  });
});

// ── buildSubgraphStyles ──

describe("buildSubgraphStyles", () => {
  it("generates style directives for subgraphs", () => {
    const def = "flowchart LR\n  subgraph Backend\n    A --> B\n  end";
    const result = buildSubgraphStyles(def, "#FF0000", 30, 8);
    assert.equal(result, "style Backend fill:#FF00004d,rx:8,ry:8");
  });

  it("handles multiple subgraphs", () => {
    const def = "flowchart LR\n  subgraph FE\n  end\n  subgraph BE\n  end";
    const result = buildSubgraphStyles(def, "#FF0000", 30, 8);
    const lines = result.split("\n");
    assert.equal(lines.length, 2);
    assert.match(lines[0], /style FE/);
    assert.match(lines[1], /style BE/);
  });

  it("returns empty for no subgraphs", () => {
    assert.equal(buildSubgraphStyles("flowchart LR\n  A --> B", "#FF0000", 30, 8), "");
  });

  it("omits radius when zero", () => {
    const def = "flowchart LR\n  subgraph S\n  end";
    const result = buildSubgraphStyles(def, "#FF0000", 30, 0);
    assert.equal(result, "style S fill:#FF00004d");
  });
});

// ── buildMermaidRenderConfig ──

describe("buildMermaidRenderConfig", () => {
  const variant: MermaidVariant = {
    primary: "#7F4EFF",
    primaryContrast: "#FFFFFF",
    text: "#E8E4F0",
    line: "#C0B2E4",
    surface: "#1A1528",
    surfaceBorder: "#3D3555",
    fontFamily: "Inter",
    accents: ["#FB00E6", "#08F0D4"],
    accentOpacity: 30,
    accentTextColor: "#FFFFFF",
    groupCornerRadius: 8,
  };

  it("maps variant fields to themeVariables", () => {
    const config = buildMermaidRenderConfig(variant) as any;
    assert.equal(config.theme, "base");
    assert.equal(config.themeVariables.primaryColor, "#7F4EFF");
    assert.equal(config.themeVariables.primaryTextColor, "#FFFFFF");
    assert.equal(config.themeVariables.lineColor, "#C0B2E4");
    assert.equal(config.themeVariables.fontFamily, "Inter");
    assert.equal(config.themeVariables.background, "transparent");
  });
});

// ── injectClassDefs ──

describe("injectClassDefs", () => {
  const accents = ["#FF0000", "#00FF00"];

  it("injects classDefs after flowchart header", () => {
    const def = "flowchart LR\n  A:::backend --> B:::frontend";
    const result = injectClassDefs(def, accents, 30, "#FFFFFF", "#333333", 8);
    const lines = result.split("\n");
    assert.match(lines[0], /flowchart LR/);
    assert.match(lines[1], /classDef backend/);
    assert.match(lines[2], /classDef frontend/);
  });

  it("returns unchanged for non-flowchart diagrams", () => {
    const def = "sequenceDiagram\n  Alice->>Bob: Hello";
    const result = injectClassDefs(def, accents, 30, "#FFFFFF", "#333333", 8);
    assert.equal(result, def);
  });

  it("handles graph keyword", () => {
    const def = "graph TD\n  A:::backend --> B";
    const result = injectClassDefs(def, accents, 30, "#FFFFFF", "#333333", 8);
    assert.match(result, /classDef backend/);
  });

  it("appends subgraph styles at end", () => {
    const def = "flowchart LR\n  subgraph S\n    A:::backend\n  end";
    const result = injectClassDefs(def, accents, 30, "#FFFFFF", "#333333", 8);
    const lines = result.split("\n");
    assert.match(lines[lines.length - 1], /style S fill:/);
  });

  it("handles no groups gracefully", () => {
    const def = "flowchart LR\n  A --> B";
    const result = injectClassDefs(def, accents, 30, "#FFFFFF", "#333333", 8);
    assert.equal(result, def);
  });
});
