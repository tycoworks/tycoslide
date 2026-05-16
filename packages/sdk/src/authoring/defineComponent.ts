// Define Component
// Factory for creating component definitions.
// Moved from core — defineComponent is authoring-time, not runtime.

import type { ComponentDefinition, MdastHandler, RenderContext, SlideNode } from "@tycoslide/core";
import { type ComponentNode, component } from "@tycoslide/core";
import type { RootContent } from "mdast";
import { z } from "zod";
import type { ParamShape } from "./param.js";

// Re-export ComponentNode — required for declaration emit (defineComponent return type)
export type { ComponentNode } from "@tycoslide/core";

// ============================================
// SCALAR COMPONENT DEFINITION
// ============================================

/** A scalar component definition — has .schema for YAML validation and layout params. */
export type ScalarComponentDefinition<
  TSchema extends z.ZodTypeAny = z.ZodTypeAny,
  TTokens = undefined,
> = ComponentDefinition<any, any, TTokens> & {
  /** Content schema. Use in schema.array() or layout params (e.g., param.required(textComponent.schema)). */
  schema: TSchema;
  /** Params ZodObject schema (when component has both content and params). */
  paramsSchema?: z.ZodObject<any>;
};

// ============================================
// DIRECTIVE DESERIALIZATION
// ============================================

/** Deserializer: converts directive attributes + body text into a ComponentNode. */
export type DirectiveDeserializer = (
  attributes: Record<string, string | null | undefined>,
  body: string,
) => ComponentNode;

/**
 * Coerce string attribute values from directive markup to JS types.
 * Directive attributes are always strings; schemas expect booleans/numbers.
 */
function coerceAttributes(attrs: Record<string, string | null | undefined>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(attrs)) {
    if (v === "true") result[k] = true;
    else if (v === "false") result[k] = false;
    else if (typeof v === "string" && v !== "" && !Number.isNaN(Number(v))) result[k] = Number(v);
    else result[k] = v;
  }
  return result;
}

/**
 * Build a deserializer for :::name directives.
 * Attributes → typed params (with coercion), body → content channel (separate from params).
 */
function buildDeserializer(componentName: string, paramsSchema: z.ZodObject<ParamShape> | null): DirectiveDeserializer {
  return (attributes, body) => {
    const coerced = coerceAttributes(attributes);
    let params: Record<string, unknown>;
    if (paramsSchema) {
      try {
        params = paramsSchema.strict().parse(coerced);
      } catch (e: unknown) {
        if (e instanceof z.ZodError) {
          const issues = e.issues.map((i) => i.message).join("; ");
          throw new Error(`Invalid parameters for component '${componentName}': ${issues}`);
        }
        throw e;
      }
    } else {
      const keys = Object.keys(coerced);
      if (keys.length) {
        throw new Error(`Component '${componentName}' does not accept parameters, but received: [${keys.join(", ")}].`);
      }
      params = {};
    }
    const content = body?.trim() || undefined;
    return component(componentName, params, content);
  };
}

// ============================================
// DEFINE COMPONENT (standalone)
// ============================================

/**
 * Define a content component — has a `content` schema (primary content) and optional params.
 * Returns a definition with `.schema` (= content type) for use in layout params.
 * Pure factory — does NOT register the component.
 */
export function defineComponent<
  TContent extends z.ZodTypeAny,
  TParams extends ParamShape = Record<string, never>,
  TTokens extends object = Record<string, unknown>,
>(def: {
  name: string;
  content: TContent;
  params?: TParams;
  directive?: boolean;
  mdast?: MdastHandler;
  render: (
    params: z.infer<z.ZodObject<TParams>>,
    content: z.infer<TContent>,
    context: RenderContext,
    tokens: TTokens,
  ) => SlideNode | Promise<SlideNode>;
}): ScalarComponentDefinition<TContent, TTokens>;

/**
 * Define a container component — accepts children (SlideNode[]) as content.
 * No `.schema` — container components aren't usable in layout params.
 * Pure factory — does NOT register the component.
 */
export function defineComponent<TParams, TTokens extends object = Record<string, unknown>>(def: {
  name: string;
  children: true;
  directive?: boolean;
  render: (
    params: TParams,
    children: SlideNode[],
    context: RenderContext,
    tokens: TTokens,
  ) => SlideNode | Promise<SlideNode>;
}): ComponentDefinition<TParams, SlideNode[], TTokens>;

/**
 * Define a params-only component (no content, no children).
 * Supports directive deserialization if params are declared.
 * Pure factory — does NOT register the component.
 */
export function defineComponent<
  TParams extends ParamShape = Record<string, never>,
  TTokens extends object = Record<string, unknown>,
>(def: {
  name: string;
  params?: TParams;
  directive?: boolean;
  mdast?: MdastHandler;
  render: (
    params: z.infer<z.ZodObject<TParams>>,
    content: undefined,
    context: RenderContext,
    tokens: TTokens,
  ) => SlideNode | Promise<SlideNode>;
}): ScalarComponentDefinition<z.ZodObject<TParams>, TTokens>;

// Implementation
export function defineComponent(def: any): ComponentDefinition<any, any, any> & { schema?: z.ZodTypeAny } {
  const contentSchema: z.ZodTypeAny | null = "content" in def ? def.content : null;
  const paramsShape: ParamShape = def.params ?? {};
  const paramsSchema = Object.keys(paramsShape).length > 0 ? z.object(paramsShape) : null;
  const isContainer: boolean = def.children === true;

  const mdast: MdastHandler | undefined = def.mdast;

  const result: ComponentDefinition & { schema?: z.ZodTypeAny; paramsSchema?: z.ZodObject<any> } = {
    name: def.name as string,
    render: def.render as ComponentDefinition["render"],
    params: def.params,
    children: isContainer || undefined,
    mdast,
  };

  if (isContainer) {
    // Container component: no auto-deserializer, no .schema.
    // Nothing to do — containers are DSL-only.
  } else if (contentSchema || paramsSchema) {
    // Content/scalar component: auto-generate .schema and directive deserializer
    result.schema = contentSchema ?? paramsSchema!;
    if (contentSchema && paramsSchema) {
      result.paramsSchema = paramsSchema;
    }
    if (def.directive !== false) {
      result.deserialize = buildDeserializer(def.name, paramsSchema);
    }
  } else if (def.directive !== false) {
    // No content or params, but still directive-invocable (e.g. :::line)
    result.deserialize = buildDeserializer(def.name as string, null);
  }

  return result;
}
