// Skill compiler: generates SKILL.md and plugin.json from a ThemeDefinition.

import type { ThemeDefinition } from "../theme/index.js";
import type { Template } from "../theme/template.js";
import { introspectParams, type ParamInfo } from "./introspect.js";

// ============================================
// CONSTANTS
// ============================================

/** Output paths for generated skill files (relative to theme root). */
export const SKILL_PATHS = {
  SKILL_MD: "skills/tycoslide/SKILL.md",
  PLUGIN_JSON: ".claude-plugin/plugin.json",
  REFERENCES_DIR: "skills/tycoslide/references",
} as const;

// ============================================
// TYPES
// ============================================

export interface CompileSkillOptions {
  /** Theme package name (e.g., "@tycoslide/theme-default"). */
  name: string;
  /** One-line description of the theme. */
  description: string;
  /** Package version (semver). */
  version?: string;
}

export interface CompileSkillResult {
  /** Generated file contents. Keys are relative paths from the theme root. */
  files: Record<string, string>;
  /** Plugin manifest metadata. */
  plugin: { name: string; description: string; version: string };
}

// ============================================
// GENERATION HELPERS
// ============================================

/** Format a ParamInfo into a concise type string for the template table. */
function formatParamType(info: ParamInfo): string {
  if (info.type === "enum" && info.enumValues) {
    return info.enumValues.map((v) => `"${v}"`).join(" | ");
  }
  if (info.type === "array" && info.itemType) {
    return `${info.itemType}[]`;
  }
  return info.type;
}

/** Generate the params column for a template row. */
function formatParams(params: ParamInfo[]): string {
  if (params.length === 0) return "—";
  return params
    .map((p) => {
      const opt = p.required ? "" : "?";
      return `\`${p.name}${opt}\`: ${formatParamType(p)}`;
    })
    .join(", ");
}

/** Generate the template reference table for one format. */
function generateFormatSection(formatName: string, templates: Template[]): string {
  const lines: string[] = [];
  lines.push(`### ${formatName}`);
  lines.push("");
  lines.push("| Template | Description | Params | Slots |");
  lines.push("|----------|-------------|--------|-------|");

  for (const t of templates) {
    const name = t.layout.name;
    const desc = t.documentation.description;
    const params = introspectParams(t.layout.params);
    const paramsStr = formatParams(params);
    const slotsStr = t.layout.slots?.length ? t.layout.slots.join(", ") : "—";
    lines.push(`| \`${name}\` | ${desc} | ${paramsStr} | ${slotsStr} |`);
  }

  // Add doc details (whenToUse, limits, gotchas) for templates that have them
  const documented = templates.filter(
    (t) => t.documentation.whenToUse || t.documentation.limits?.length || t.documentation.gotchas?.length,
  );
  if (documented.length > 0) {
    lines.push("");
    lines.push("#### Template Guidance");
    lines.push("");
    for (const t of documented) {
      const doc = t.documentation;
      lines.push(`**${t.layout.name}**`);
      if (doc.whenToUse) lines.push(`- Use when: ${doc.whenToUse}`);
      if (doc.whenNotToUse) lines.push(`- Do not use when: ${doc.whenNotToUse}`);
      if (doc.limits?.length) {
        for (const limit of doc.limits) lines.push(`- Limit: ${limit}`);
      }
      if (doc.gotchas?.length) {
        for (const gotcha of doc.gotchas) lines.push(`- Gotcha: ${gotcha}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

/** Generate the full SKILL.md content. */
function generateSkillMd(definition: ThemeDefinition, options: CompileSkillOptions): string {
  const sections: string[] = [];

  // Header
  sections.push(`# tycoslide Slide Authoring`);
  sections.push("");
  sections.push(`Theme: ${options.name}`);
  sections.push("");
  sections.push(`${options.description}`);
  sections.push("");

  // Workflow
  sections.push("## Workflow");
  sections.push("");
  sections.push("1. **Discover** — Read the template reference below for available templates.");
  sections.push("2. **Compose** — Plan deck structure, select templates by content shape.");
  sections.push("3. **Build** — Write `.md` file, run `npx tycoslide build deck.md`.");
  sections.push("4. **QA** — Read build errors, fix, rebuild until clean (see `references/troubleshooting.md`).");
  sections.push("");

  // Template reference per format
  sections.push("## Templates");
  sections.push("");

  for (const [formatName, format] of Object.entries(definition.formats)) {
    if (format.templates && format.templates.length > 0) {
      sections.push(generateFormatSection(formatName, format.templates));
      sections.push("");
    }
  }

  // Quick syntax reference (only if we have a real format + template to show)
  const firstFormat = Object.keys(definition.formats)[0];
  const firstTemplate = firstFormat ? definition.formats[firstFormat]?.templates?.[0] : undefined;

  if (firstFormat && firstTemplate) {
    sections.push("## Syntax Quick Reference");
    sections.push("");
    sections.push("See `references/markdown-syntax.md` for the full markdown dialect.");
    sections.push("");
    sections.push("```markdown");
    sections.push("---");
    sections.push(`theme: "${options.name}"`);
    sections.push(`format: ${firstFormat}`);
    sections.push("---");
    sections.push("");
    sections.push("---");
    sections.push(`template: ${firstTemplate.layout.name}`);
    sections.push("title: Slide Title");
    sections.push("---");
    sections.push("");
    sections.push("Body content here.");
    sections.push("```");
    sections.push("");
  }

  // Error recovery
  sections.push("## Error Recovery");
  sections.push("");
  sections.push("See `references/troubleshooting.md` for the full error table. Key rule:");
  sections.push("");
  sections.push("**Fix content, never modify theme behavior.** When the validator says content does not fit,");
  sections.push("reduce or restructure — never weaken constraints.");
  sections.push("");

  // References
  sections.push("## References");
  sections.push("");
  sections.push("- `references/markdown-syntax.md` — Markdown dialect (frontmatter, directives, formatting)");
  sections.push("- `references/troubleshooting.md` — Error → fix table");
  sections.push("- `references/cli.md` — Build commands and debug flags");

  return `${sections.join("\n")}\n`;
}

/** Generate plugin.json content. */
function generatePluginJson(options: CompileSkillOptions): string {
  return `${JSON.stringify(
    {
      name: options.name,
      description: options.description,
      version: options.version ?? "0.0.0",
    },
    null,
    2,
  )}\n`;
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Compile a ThemeDefinition into skill files for distribution as a Claude Code plugin.
 *
 * Returns a map of relative file paths → content. The caller is responsible for
 * writing them to disk (the CLI command handles that).
 */
export function compileSkill(definition: ThemeDefinition, options: CompileSkillOptions): CompileSkillResult {
  if (!options.name) {
    throw new Error("compileSkill: options.name is required.");
  }
  if (!definition.formats || Object.keys(definition.formats).length === 0) {
    throw new Error("compileSkill: ThemeDefinition must have at least one format.");
  }

  const version = options.version ?? "0.0.0";

  const files: Record<string, string> = {
    [SKILL_PATHS.SKILL_MD]: generateSkillMd(definition, options),
    [SKILL_PATHS.PLUGIN_JSON]: generatePluginJson(options),
  };

  return {
    files,
    plugin: { name: options.name, description: options.description, version },
  };
}
