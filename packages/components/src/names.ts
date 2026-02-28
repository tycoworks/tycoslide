// Built-in component names
// Canonical registry of all standard component identifiers.
// Core is name-agnostic — these live here in the components package.

export const Component = {
  // Scalar components: have schema, support :::directives, usable in layout params
  Image: 'image',
  Line: 'line',
  Shape: 'shape',
  SlideNumber: 'slideNumber',
  Text: 'text',
  Card: 'card',
  Quote: 'quote',
  Table: 'table',
  Mermaid: 'mermaid',
  Code: 'code',
  // Container components: have slots, support :::directives with compiled body
  Row: 'row',
  Column: 'column',
  Stack: 'stack',
  Grid: 'grid',
} as const;

export type ComponentName = typeof Component[keyof typeof Component];
