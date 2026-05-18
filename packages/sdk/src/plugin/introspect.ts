// Param introspection utility for the skill compiler.
// Reads Zod ParamShape and produces structured ParamInfo descriptions.

import { z } from "zod";
import type { ParamShape } from "../authoring/param.js";

// ============================================
// TYPES
// ============================================

export const PARAM_TYPE = {
  STRING: "string",
  NUMBER: "number",
  BOOLEAN: "boolean",
  ARRAY: "array",
  OBJECT: "object",
  ENUM: "enum",
} as const;

export type ParamType = (typeof PARAM_TYPE)[keyof typeof PARAM_TYPE];

export interface ParamInfo {
  name: string;
  type: ParamType;
  required: boolean;
  enumValues?: string[];
  itemType?: ParamType;
  objectShape?: ParamInfo[];
}

// ============================================
// INTROSPECTION
// ============================================

/** Unwrap ZodOptional / ZodDefault / ZodNullable to get the inner type. */
function unwrap(schema: z.ZodTypeAny): { inner: z.ZodTypeAny; required: boolean } {
  if (schema instanceof z.ZodOptional) {
    return { inner: schema.unwrap() as z.ZodTypeAny, required: false };
  }
  if (schema instanceof z.ZodDefault) {
    return { inner: schema.unwrap() as z.ZodTypeAny, required: false };
  }
  if (schema instanceof z.ZodNullable) {
    return { inner: schema.unwrap() as z.ZodTypeAny, required: false };
  }
  return { inner: schema, required: true };
}

/** Classify a Zod type into a ParamType. */
function classifyType(schema: z.ZodTypeAny): ParamType {
  if (schema instanceof z.ZodString) return PARAM_TYPE.STRING;
  if (schema instanceof z.ZodNumber) return PARAM_TYPE.NUMBER;
  if (schema instanceof z.ZodBoolean) return PARAM_TYPE.BOOLEAN;
  if (schema instanceof z.ZodEnum) return PARAM_TYPE.ENUM;
  if (schema instanceof z.ZodArray) return PARAM_TYPE.ARRAY;
  if (schema instanceof z.ZodObject) return PARAM_TYPE.OBJECT;
  throw new Error(
    `[compilePlugin] Unknown Zod type "${schema.constructor.name}" — add support for this type in introspect.ts.`,
  );
}

/** Introspect a single Zod type into a ParamInfo (without name). */
function introspectType(name: string, schema: z.ZodTypeAny): ParamInfo {
  const { inner, required } = unwrap(schema);
  const type = classifyType(inner);

  const info: ParamInfo = { name, type, required };

  if (inner instanceof z.ZodEnum) {
    info.enumValues = inner.options as string[];
  }

  if (inner instanceof z.ZodArray) {
    const element = inner.element as z.ZodTypeAny;
    info.itemType = classifyType(element);
    if (element instanceof z.ZodObject) {
      info.objectShape = introspectParams(element.shape as ParamShape);
    }
  }

  if (inner instanceof z.ZodObject) {
    info.objectShape = introspectParams(inner.shape as ParamShape);
  }

  return info;
}

/**
 * Introspect a Zod ParamShape into structured ParamInfo descriptions.
 * Used by the skill compiler to generate template parameter documentation.
 */
export function introspectParams(params: ParamShape): ParamInfo[] {
  return Object.entries(params).map(([name, schema]) => introspectType(name, schema));
}
