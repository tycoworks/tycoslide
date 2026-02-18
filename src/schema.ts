// Schema module
// Domain-specific schema helpers for layout and component definitions.
// Layout authors use these instead of importing Zod directly.

import { z } from 'zod';
import { compileSlot } from './markdown/slotCompiler.js';
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

  // Compiler pipeline — slot content → ComponentNode[]
  slot:     ()                                        =>
    z.string().transform((s): ComponentNode[] => compileSlot(s)),
};

// Leaf types derived from the schema object — the single source of truth
// for what's expressible in YAML/markdown frontmatter.
type SchemaLeaf =
  | ReturnType<typeof schema.string>
  | ReturnType<typeof schema.number>
  | ReturnType<typeof schema.boolean>
  | ReturnType<typeof schema.textStyle>
  | ReturnType<typeof schema.gap>
  | ReturnType<typeof schema.hAlign>
  | ReturnType<typeof schema.vAlign>
  | ReturnType<typeof schema.slot>
  | ReturnType<typeof schema.enum>
  | ReturnType<typeof schema.array>
  | ReturnType<typeof schema.object>;

/** A Zod type that accepts YAML/markdown input. Only types producible by the schema object qualify. */
export type MarkdownParam =
  | SchemaLeaf
  | z.ZodOptional<SchemaLeaf>
  | z.ZodDefault<SchemaLeaf>;
