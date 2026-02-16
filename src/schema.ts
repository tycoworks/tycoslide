// Schema module
// Domain-specific schema helpers for layout and component definitions.
// Layout authors use these instead of importing Zod directly.

import { z } from 'zod';
import { compileBlocks } from './compiler/blockCompiler.js';
import type { ComponentNode } from './core/registry.js';

export const schema = {
  // Structural — how values compose
  array:    <T extends z.ZodTypeAny>(item: T)         => z.array(item),
  enum:     <T extends [string, ...string[]]>(v: T)   => z.enum(v),

  // Scalar — configuration values
  string:   ()                                        => z.string(),
  number:   ()                                        => z.number(),
  boolean:  ()                                        => z.boolean(),

  // Compiler pipeline — block-level markdown → ComponentNode[]
  block:    ()                                        =>
    z.string().transform((s): ComponentNode[] => compileBlocks(s)),
};
