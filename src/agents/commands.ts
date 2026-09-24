import { readFileSync, writeFileSync } from "node:fs";
import { basename, posix, resolve } from "node:path";
import type { Command } from "commander";
import { loadThemeConfig } from "../index.js";
import { loadAssetCatalog } from "./catalog.js";
import { extractTemplate, summarizeExtraction } from "./extract.js";
import {
  ASSETS_DIR,
  ASSETS_FILE,
  MANIFEST_FILE,
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

  program
    .command("package")
    .description("Zip the theme into an Agent Skill for AI agents")
    .option(`-c, --config <path>`, "path to theme config file", THEME_CONFIG)
    .action(async (opts: { config: string }) => {
      const config = loadThemeConfig(resolve(process.cwd(), opts.config));
      const catalog = loadAssetCatalog(config.rootDir);

      const themePkg = JSON.parse(readFileSync(resolve(process.cwd(), PACKAGE_JSON), "utf-8"));
      if (!themePkg.name) {
        throw new Error(`Cannot name the skill: the theme's ${PACKAGE_JSON} has no "name" field.`);
      }
      // basename drops any npm scope, e.g. "@acme/acme-slides" -> "acme-slides".
      const skillName = basename(themePkg.name);

      let skillMd: string;
      try {
        skillMd = renameSkill(readFileSync(skillMdPath, "utf-8"), skillName);
      } catch (err) {
        throw new Error(`${skillMdPath}: ${(err as Error).message}`);
      }

      // Bundle the WHOLE theme so the skill is self-contained: unzip ->
      // `npm install` (pulls the engine, its docs and its deps) -> `npx tycoslide build`.
      const generated = {
        [PACKAGE_JSON]: skillPackageJson(themePkg, tool),
        [SKILL_FILE]: skillMd,
        [MANIFEST_FILE]: generateManifest(config),
      };
      const zipFile = `${skillName}${SKILL_ZIP_EXT}`;
      const zip = await zipDir(process.cwd(), skillName, config, catalog, [opts.config, ASSETS_FILE], generated);
      writeFileSync(resolve(process.cwd(), zipFile), zip);
      wrote(zipFile);
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
