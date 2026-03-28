#!/usr/bin/env node
// tycoslide CLI

import { Command } from "commander";
import { build } from "./build.js";

const program = new Command();

program.name("tycoslide").description("Build editable PowerPoint presentations from markdown").version("0.1.1");

program
  .command("build")
  .description("Compile a markdown file into a PPTX presentation")
  .argument("<input>", "path to markdown file")
  .option("-p, --preview", "skip PPTX generation, output HTML preview only")
  .option("-f, --force", "write PPTX despite layout or missing font errors")
  .option("-d, --debug", "enable verbose logging")
  .option("--no-notes", "exclude speaker notes from output")
  .option("--render-scale <factor>", "pixel density multiplier for rendered diagrams and code (default: 2)")
  .action(
    async (
      input: string,
      opts: { preview?: boolean; force?: boolean; debug?: boolean; notes: boolean; renderScale?: string },
    ) => {
      const renderScale = opts.renderScale ? parseFloat(opts.renderScale) : undefined;
      if (renderScale !== undefined && (!Number.isFinite(renderScale) || renderScale < 1)) {
        throw new Error(`--render-scale must be a positive number, got: ${opts.renderScale}`);
      }
      await build(input, { ...opts, renderScale });
    },
  );

program.parse();
