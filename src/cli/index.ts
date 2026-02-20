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
  .option('--theme <name>', 'theme name (overrides frontmatter)')
  .option('--default-layout <name>', 'default layout for slides without layout: field')
  .action(async (input: string, opts: { output?: string; theme?: string; defaultLayout?: string }) => {
    try {
      await build(input, opts);
    } catch (err: any) {
      console.error(err.message);
      process.exit(1);
    }
  });

program.parse();
