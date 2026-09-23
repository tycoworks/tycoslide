import { readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import type { Command } from "commander";
import { loadThemeConfig } from "../index.js";
import { loadAssetCatalog } from "./catalog.js";
import {
  ASSETS_FILE,
  DOCS_DIR,
  MANIFEST_FILE,
  PACKAGE_JSON,
  SKILL_FILE,
  SKILL_ZIP_EXT,
  SYNTAX_FILE,
  THEME_CONFIG,
  THEME_PACKAGE_DIR,
} from "./files.js";
import { generateManifest } from "./manifest.js";
import { renameSkill, skillPackageJson, zipDir } from "./skill.js";

/** The installed tycoslide package: where its shipped files live, and what a skill pins. */
export type ToolPackage = { root: string; name: string; version: string };

/** Register the agent layer's commands on the CLI program. */
export function registerAgentCommands(program: Command, tool: ToolPackage): void {
  const skillMdPath = resolve(tool.root, THEME_PACKAGE_DIR, SKILL_FILE);
  const syntaxMdPath = resolve(tool.root, DOCS_DIR, SYNTAX_FILE);

  program
    .command("package")
    .description(`Generate the Agent Skill (${MANIFEST_FILE}, ${SKILL_FILE}, ${SYNTAX_FILE}) for AI agents`)
    .option(`-c, --config <path>`, "path to theme config file", THEME_CONFIG)
    .action(async (opts: { config: string }) => {
      const config = loadThemeConfig(resolve(process.cwd(), opts.config));
      const catalog = loadAssetCatalog(config.rootDir);
      const write = (file: string, content: string | Buffer): void => {
        writeFileSync(resolve(process.cwd(), file), content);
        console.log(`WROTE ${file}`);
      };

      const themePkg = JSON.parse(readFileSync(resolve(process.cwd(), PACKAGE_JSON), "utf-8"));
      if (!themePkg.name) {
        throw new Error(`Cannot name the skill: the theme's ${PACKAGE_JSON} has no "name" field.`);
      }
      // basename drops any npm scope, e.g. "@acme/acme-slides" -> "acme-slides".
      const skillName = basename(themePkg.name);

      write(MANIFEST_FILE, `${generateManifest(config)}\n`);

      let skillMd: string;
      try {
        skillMd = renameSkill(readFileSync(skillMdPath, "utf-8"), skillName);
      } catch (err) {
        throw new Error(`${skillMdPath}: ${(err as Error).message}`);
      }
      write(SKILL_FILE, skillMd);
      write(SYNTAX_FILE, readFileSync(syntaxMdPath, "utf-8"));

      // Bundle the WHOLE theme so the skill is self-contained: unzip ->
      // `npm install` (pulls the engine + its deps) -> `npx tycoslide build`.
      const shipped = [opts.config, ASSETS_FILE, MANIFEST_FILE, SKILL_FILE, SYNTAX_FILE];
      const skillPkg = skillPackageJson(themePkg, tool);
      write(`${skillName}${SKILL_ZIP_EXT}`, await zipDir(process.cwd(), skillName, config, catalog, shipped, skillPkg));
    });
}
