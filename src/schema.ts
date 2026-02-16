// Schema module
// Domain-specific schema helpers for layout and component definitions.
// Layout authors use these instead of importing Zod directly.

import { z } from 'zod';
import { compileBlocks } from './markdown/blockCompiler.js';
import type { ComponentNode } from './core/registry.js';
import { TEXT_STYLE_VALUES, GAP_VALUES, HALIGN_VALUES, VALIGN_VALUES } from './core/types.js';

export const schema = {
  // Structural — how values compose
  object:   <T extends z.ZodRawShape>(shape: T)       => z.object(shape),
  array:    <T extends z.ZodTypeAny>(item: T)         => z.array(item),
  enum:     <T extends [string, ...string[]]>(v: T)   => z.enum(v),

  // Scalar — configuration values
  string:   ()                                        => z.string(),
  number:   ()                                        => z.number(),
  boolean:  ()                                        => z.boolean(),

  // Domain — common enum types (saves importing _VALUES tuples)
  textStyle: ()                                       => z.enum(TEXT_STYLE_VALUES),
  gap:       ()                                       => z.enum(GAP_VALUES),
  hAlign:    ()                                       => z.enum(HALIGN_VALUES),
  vAlign:    ()                                       => z.enum(VALIGN_VALUES),

  // Compiler pipeline — block-level markdown → ComponentNode[]
  block:    ()                                        =>
    z.string().transform((s): ComponentNode[] => compileBlocks(s)),
};
