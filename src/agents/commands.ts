import { readFileSync, writeFileSync } from "node:fs";
import { basename, posix, resolve } from "node:path";
import type { Command } from "commander";
import { loadThemeConfig } from "../index.js";
import { loadAssetCatalog } from "./catalog.js";
import { extractTemplate, summarizeExtraction } from "./extract.js";
import {
  ASSETS_DIR,
  ASSETS_FILE,
  DOCS_DIR,
  MANIFEST_FILE,
  MARKDOWN_DOC_FILE,
  PACKAGE_JSON,
  SKILL_FILE,
  SKILL_ZIP_EXT,
  TEMPLATE_FILE,
  THEME_CONFIG,
  THEME_PACKAGE_DIR,
} from "./files.js";
import { generateManifest } from "./manifest.js";
import { renameSkill, skillPackageJson, zipDir } from "./skill.js";

/** The installed tycoslide package: where its shipped files live, and what a skill pins. */
export type ToolPackage = { root: string; name: string; version: string };

/** The CLI's line for something written, with an optional note on what it holds. */
function wrote(target: string, detail?: string): void {
  console.log(detail ? `WROTE ${target}  ${detail}` : `WROTE ${target}`);
}

/** Register the agent layer's commands on the CLI program. */
export function registerAgentCommands(program: Command, tool: ToolPackage): void {
  const skillMdPath = resolve(tool.root, THEME_PACKAGE_DIR, SKILL_FILE);
  const markdownDocPath = resolve(tool.root, DOCS_DIR, MARKDOWN_DOC_FILE);

  program
    .command("package")
    .description(`Generate the Agent Skill (${MANIFEST_FILE}, ${SKILL_FILE}, ${MARKDOWN_DOC_FILE}) for AI agents`)
    .option(`-c, --config <path>`, "path to theme config file", THEME_CONFIG)
    .action(async (opts: { config: string }) => {
      const config = loadThemeConfig(resolve(process.cwd(), opts.config));
      const catalog = loadAssetCatalog(config.rootDir);
      const write = (file: string, content: string | Buffer): void => {
        writeFileSync(resolve(process.cwd(), file), content);
        wrote(file);
      };

      const themePkg = JSON.parse(readFileSync(resolve(process.cwd(), PACKAGE_JSON), "utf-8"));
      if (!themePkg.name) {
        throw new Error(`Cannot name the skill: the theme's ${PACKAGE_JSON} has no "name" field.`);
      }
      // basename drops any npm scope, e.g. "@acme/acme-slides" -> "acme-slides".
      const skillName = basename(themePkg.name);

      write(MANIFEST_FILE, generateManifest(config));

      let skillMd: string;
      try {
        skillMd = renameSkill(readFileSync(skillMdPath, "utf-8"), skillName);
      } catch (err) {
        throw new Error(`${skillMdPath}: ${(err as Error).message}`);
      }
      write(SKILL_FILE, skillMd);
      write(MARKDOWN_DOC_FILE, readFileSync(markdownDocPath, "utf-8"));

      // Bundle the WHOLE theme so the skill is self-contained: unzip ->
      // `npm install` (pulls the engine + its deps) -> `npx tycoslide build`.
      const shipped = [opts.config, ASSETS_FILE, MANIFEST_FILE, SKILL_FILE, MARKDOWN_DOC_FILE];
      const skillPkg = skillPackageJson(themePkg, tool);
      write(`${skillName}${SKILL_ZIP_EXT}`, await zipDir(process.cwd(), skillName, config, catalog, shipped, skillPkg));
    });

  program
    .command("extract")
    .description(
      `Read a template for a theme: write ${TEMPLATE_FILE}, and copy its master and layout images into ${ASSETS_DIR}/`,
    )
    .argument("<template>", "path to the .pptx template")
    .action(async (template: string) => {
      const summary = summarizeExtraction(await extractTemplate(resolve(process.cwd(), template), process.cwd()));
      wrote(TEMPLATE_FILE, summary.template);
      wrote(ASSETS_DIR + posix.sep, summary.images);
    });
}
