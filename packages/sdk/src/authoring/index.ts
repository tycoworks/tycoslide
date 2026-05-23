// Authoring module barrel
// Component, layout, param, and token authoring helpers.
// Theme and component authors import these for defining components and layouts.

export type {
  AuthoringFields,
  ComponentSpec,
  ContentComponentSpec,
  DirectiveDeserializer,
  SyntaxHandler,
} from "./component.js";
export { defineComponent } from "./component.js";
export type { LayoutConfig } from "./layout.js";
export { defineLayout } from "./layout.js";
export type { InferParams, ParamShape, ScalarParam, ScalarShape } from "./param.js";
export { param, schema } from "./param.js";
export type { InferTokens, TokenDescriptor, TokenShape } from "./token.js";
export { token } from "./token.js";
