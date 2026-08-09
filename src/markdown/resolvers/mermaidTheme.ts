/**
 * Mermaid theme types and definition-processing utilities.
 *
 * Owner of MermaidVariant / MermaidConfig — these types are compiler-facing
 * (the engine has no idea mermaid exists). `resolvers/mermaid.ts` consumes
 * them to build --configFile input for `mmdc`.
 */

export type MermaidVariant = {
  primary: string;
  primaryContrast: string;
  text: string;
  line: string;
  surface: string;
  surfaceBorder: string;
  fontFamily: string;
  accents: string[];
  accentOpacity: number;
  accentTextColor: string;
  groupCornerRadius: number;
};

export type MermaidConfig = Record<string, MermaidVariant>;

const FORBIDDEN_PATTERNS = [/^\s*style\s+\S+\s+/, /^\s*linkStyle\s+/, /^\s*classDef\s+/, /^\s*%%\{init/];

export function validateMermaidDefinition(definition: string): string {
  const forbidden: string[] = [];
  for (const line of definition.split("\n")) {
    if (FORBIDDEN_PATTERNS.some((p) => p.test(line))) {
      forbidden.push(line.trim());
    }
  }
  if (forbidden.length > 0) {
    throw new Error(
      `Mermaid: found ${forbidden.length} forbidden style directive(s). ` +
        `Use theme classes instead (e.g. "class NodeId backend"):\n` +
        forbidden.map((s) => `  - ${s}`).join("\n"),
    );
  }
  return definition;
}

export function extractGroups(definition: string): string[] {
  const seen = new Set<string>();
  const groups: string[] = [];

  const classPattern = /^\s*class\s+[\w,]+\s+(\w+)/gm;
  let match: RegExpExecArray | null = null;
  while ((match = classPattern.exec(definition)) !== null) {
    const name = match[1];
    if (!seen.has(name)) {
      seen.add(name);
      groups.push(name);
    }
  }

  const inlinePattern = /:::(\w+)/g;
  while ((match = inlinePattern.exec(definition)) !== null) {
    const name = match[1];
    if (!seen.has(name)) {
      seen.add(name);
      groups.push(name);
    }
  }

  return groups;
}

export function buildClassDefs(
  groups: string[],
  accents: string[],
  accentOpacity: number,
  accentTextColor: string,
): string {
  if (groups.length === 0 || accents.length === 0) return "";
  const alpha = Math.round((accentOpacity / 100) * 255)
    .toString(16)
    .padStart(2, "0");

  return groups
    .map((name, i) => {
      const color = accents[i % accents.length];
      return `classDef ${name} fill:${color}${alpha},stroke:${color},color:${accentTextColor}`;
    })
    .join("\n");
}

export function buildSubgraphStyles(
  definition: string,
  groupColor: string,
  accentOpacity: number,
  groupCornerRadius: number,
): string {
  const alpha = Math.round((accentOpacity / 100) * 255)
    .toString(16)
    .padStart(2, "0");
  const fillColor = `${groupColor}${alpha}`;

  const subgraphPattern = /subgraph\s+(\w+)/g;
  const ids: string[] = [];
  let match: RegExpExecArray | null = null;
  while ((match = subgraphPattern.exec(definition)) !== null) {
    ids.push(match[1]);
  }

  if (ids.length === 0) return "";
  const radiusPx = Math.round(groupCornerRadius);
  const radiusPart = radiusPx > 0 ? `,rx:${radiusPx},ry:${radiusPx}` : "";
  return ids.map((id) => `style ${id} fill:${fillColor}${radiusPart}`).join("\n");
}

export function buildMermaidRenderConfig(variant: MermaidVariant): object {
  return {
    startOnLoad: false,
    securityLevel: "loose",
    theme: "base",
    themeVariables: {
      fontFamily: variant.fontFamily,
      background: "transparent",
      primaryColor: variant.primary,
      primaryTextColor: variant.primaryContrast,
      primaryBorderColor: variant.surfaceBorder,
      lineColor: variant.line,
      secondaryColor: variant.surface,
      tertiaryColor: variant.surface,
      textColor: variant.text,
      titleColor: variant.text,
      nodeTextColor: variant.text,
      clusterBkg: variant.surface,
      clusterBorder: variant.surfaceBorder,
      edgeLabelBackground: variant.surface,
    },
  };
}

export function injectClassDefs(
  definition: string,
  accents: string[],
  accentOpacity: number,
  accentTextColor: string,
  groupColor: string,
  groupCornerRadius: number,
): string {
  const flowchartPattern = /^(\s*(?:flowchart|graph)\s+\w*\s*\n)/m;
  const match = definition.match(flowchartPattern);

  if (!match) {
    return definition;
  }

  const groups = extractGroups(definition);
  const classDefs = buildClassDefs(groups, accents, accentOpacity, accentTextColor);
  const subgraphStyles = buildSubgraphStyles(definition, groupColor, accentOpacity, groupCornerRadius);

  const [fullMatch] = match;
  let result = classDefs ? definition.replace(fullMatch, `${fullMatch}${classDefs}\n`) : definition;
  if (subgraphStyles) {
    result = `${result.trimEnd()}\n${subgraphStyles}`;
  }
  return result;
}
