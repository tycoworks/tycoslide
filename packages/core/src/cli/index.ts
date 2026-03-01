#!/usr/bin/env node
// tycoslide CLI

import { Command } from 'commander';
import { build } from './build.js';

const program = new Command();

program
  .name('tycoslide')
  .description('Build editable PowerPoint presentations from markdown')
  .version('1.0.0');

program
  .command('build')
  .description('Compile a markdown file into a PPTX presentation')
  .argument('<input>', 'path to markdown file')
  .option('-o, --output <path>', 'output PPTX path (default: input basename + .pptx)')
  .option('-f, --force', 'write PPTX despite layout validation errors')
  .option('-d, --debug <dir>', 'write debug HTML files and enable verbose logging')
  .option('--no-notes', 'exclude speaker notes from output')
  .option('--render-scale <factor>', 'pixel density multiplier for rendered diagrams and code (default: 2)')
  .action(async (input: string, opts: { output?: string; force?: boolean; debug?: string; notes: boolean; renderScale?: string }) => {
    const renderScale = opts.renderScale ? parseInt(opts.renderScale, 10) : undefined;
    if (renderScale !== undefined && (!Number.isFinite(renderScale) || renderScale < 1)) {
      throw new Error(`--render-scale must be a positive integer, got: ${opts.renderScale}`);
    }
    await build(input, { ...opts, renderScale });
  });

program.parse();
