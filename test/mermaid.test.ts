// Diagram Tests
// Tests for mermaid() DSL function and sanitizeMermaidDefinition

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { mermaid, sanitizeMermaidDefinition } from '../src/dsl/mermaid.js';
import { Component } from '../src/core/types.js';
import { componentRegistry } from '../src/core/registry.js';
import { NODE_TYPE } from '../src/core/nodes.js';
import { mockTheme } from './mocks.js';

describe('mermaid() DSL function', () => {
  it('returns ComponentNode with correct type', () => {
    const m = mermaid('flowchart LR\n  A --> B');
    assert.strictEqual(m.type, NODE_TYPE.COMPONENT);
  });

  it('returns ComponentNode with correct componentName', () => {
    const m = mermaid('flowchart LR\n  A --> B');
    assert.strictEqual(m.componentName, Component.Mermaid);
  });

  it('stores definition in props.body', () => {
    const definition = 'flowchart LR\n  A --> B';
    const m = mermaid(definition);
    assert.strictEqual(m.props.body, definition);
  });

  it('stores scale in props.scale', () => {
    const m = mermaid('flowchart LR\n  A --> B', { scale: 3 });
    assert.strictEqual(m.props.scale, 3);
  });

  it('scale defaults to undefined when not provided', () => {
    const m = mermaid('flowchart LR\n  A --> B');
    assert.strictEqual(m.props.scale, undefined);
  });
});

describe('sanitizeMermaidDefinition', () => {
  it('throws on style NodeId fill:#f00 lines', () => {
    const input = `flowchart LR
  A[Node A]
  style A fill:#ff0000
  B[Node B]`;
    assert.throws(() => sanitizeMermaidDefinition(input), /forbidden style directive/);
  });

  it('throws on linkStyle 0 stroke:#f00 lines', () => {
    const input = `flowchart LR
  A --> B
  linkStyle 0 stroke:#ff0000`;
    assert.throws(() => sanitizeMermaidDefinition(input), /forbidden style directive/);
  });

  it('throws on classDef myClass fill:#f00 lines', () => {
    const input = `flowchart LR
  classDef myClass fill:#ff0000
  A[Node A]`;
    assert.throws(() => sanitizeMermaidDefinition(input), /forbidden style directive/);
  });

  it('throws on %%{init: ...}%% lines', () => {
    const input = `%%{init: {"flowchart": {"curve": "linear"}}}%%
flowchart LR
  A --> B`;
    assert.throws(() => sanitizeMermaidDefinition(input), /forbidden style directive/);
  });

  it('preserves class NodeId primary lines', () => {
    const input = `flowchart LR
  A[Node A]
  class A primary`;
    const result = sanitizeMermaidDefinition(input);
    assert.strictEqual(result, `flowchart LR
  A[Node A]
  class A primary`);
  });

  it('preserves A:::primary inline class syntax', () => {
    const input = `flowchart LR
  A[Node A]:::primary
  B[Node B]`;
    const result = sanitizeMermaidDefinition(input);
    assert.strictEqual(result, `flowchart LR
  A[Node A]:::primary
  B[Node B]`);
  });

  it('preserves all other mermaid syntax', () => {
    const input = `flowchart LR
  subgraph Sources
    DB[(Database)]
  end
  A[Start] --> B[End]
  B --> C{Decision}`;
    const result = sanitizeMermaidDefinition(input);
    assert.strictEqual(result, input);
  });

  it('throws on mixed content with multiple forbidden directives', () => {
    const input = `%%{init: {"flowchart": {"curve": "linear"}}}%%
flowchart LR
  classDef primary fill:#ff0000
  A[Node A]
  style A fill:#00ff00
  B[Node B]
  class A primary
  A --> B
  linkStyle 0 stroke:#0000ff`;
    assert.throws(() => sanitizeMermaidDefinition(input), /4 forbidden style directive/);
  });

  it('includes offending lines in error message', () => {
    const input = `flowchart LR
  A[Node A]
  style A fill:#ff0000`;
    try {
      sanitizeMermaidDefinition(input);
      assert.fail('should have thrown');
    } catch (e: any) {
      assert.ok(e.message.includes('style A fill:#ff0000'), 'error should include the offending line');
      assert.ok(e.message.includes('class NodeId primary'), 'error should suggest the fix');
    }
  });
});

describe('mermaid expansion', () => {
  it('auto-registers mermaid component on import', () => {
    const registered = componentRegistry.has(Component.Mermaid);
    assert.ok(registered, 'mermaid component should be auto-registered');
  });

  it('expands to ImageNode with src pointing to PNG', async () => {
    const m = mermaid('flowchart LR\n  A[Start] --> B[End]');
    const expanded = await componentRegistry.expand(m, {
      theme: mockTheme(),
    });

    assert.strictEqual(expanded.type, NODE_TYPE.IMAGE);
    assert.ok((expanded as any).src, 'ImageNode should have src pointing to PNG');
    assert.strictEqual(typeof (expanded as any).src, 'string');
  });
});
