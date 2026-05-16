// Authoring module barrel
// Component, layout, param, and token authoring helpers.
// Theme and component authors import these for defining components and layouts.

export type { DirectiveDeserializer, ScalarComponentDefinition } from "./defineComponent.js";
export { defineComponent } from "./defineComponent.js";
export type { LayoutConfig } from "./defineLayout.js";
export { defineLayout } from "./defineLayout.js";
export type { InferParams, ParamShape, ScalarParam, ScalarShape } from "./param.js";
export { param, schema } from "./param.js";
export type { InferTokens, TokenDescriptor, TokenShape } from "./token.js";
export { token } from "./token.js";
