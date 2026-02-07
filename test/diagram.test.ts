// Diagram Tests
// Tests for DiagramBuilder as ComponentNode
// DiagramBuilder implements ComponentNode<DiagramComponentProps>

import { describe, test } from 'node:test';
import * as assert from 'node:assert';
import { diagram, DiagramBuilder, DIAGRAM_DIRECTION, NODE_STYLE, DIAGRAM_COMPONENT } from '../src/components/diagram.js';
import { COMPONENT_TYPE } from '../src/core/component-registry.js';

describe('DiagramBuilder', () => {

  // ------------------------------------------
  // ComponentNode Interface
  // ------------------------------------------
  test('creates ComponentNode with correct type', () => {
    const d = diagram(DIAGRAM_DIRECTION.LEFT_TO_RIGHT);
    assert.strictEqual(d.type, COMPONENT_TYPE);
    assert.strictEqual(d.componentName, DIAGRAM_COMPONENT);
  });

  test('stores direction correctly in props', () => {
    const d = diagram(DIAGRAM_DIRECTION.TOP_TO_BOTTOM);
    assert.strictEqual(d.props.direction, 'TB');
  });

  test('defaults to LEFT_TO_RIGHT direction', () => {
    const d = diagram();
    assert.strictEqual(d.props.direction, 'LR');
  });

  // ------------------------------------------
  // Node Creation
  // ------------------------------------------
  test('rect() creates node with rect shape', () => {
    const d = diagram();
    const a = d.rect('A', 'Start');

    assert.strictEqual(a.id, 'A');
    assert.strictEqual(a.label, 'Start');
    assert.strictEqual(a.shape, 'rect');
    assert.strictEqual(d.props.nodes.length, 1);
    assert.deepStrictEqual(d.props.nodes[0], { id: 'A', label: 'Start', shape: 'rect' });
  });

  test('rect() uses id as label when label not provided', () => {
    const d = diagram();
    const a = d.rect('MyNode');

    assert.strictEqual(a.label, 'MyNode');
    assert.strictEqual(d.props.nodes[0].label, 'MyNode');
  });

  test('cylinder() creates node with cylinder shape', () => {
    const d = diagram();
    const db = d.cylinder('DB', 'Postgres');

    assert.strictEqual(db.shape, 'cylinder');
    assert.strictEqual(d.props.nodes[0].shape, 'cylinder');
  });

  test('hexagon() creates node with hexagon shape', () => {
    const d = diagram();
    const k = d.hexagon('K', 'Kafka');

    assert.strictEqual(k.shape, 'hexagon');
    assert.strictEqual(d.props.nodes[0].shape, 'hexagon');
  });

  test('round() creates node with round shape', () => {
    const d = diagram();
    const r = d.round('R', 'Rounded');

    assert.strictEqual(r.shape, 'round');
  });

  test('stadium() creates node with stadium shape', () => {
    const d = diagram();
    const s = d.stadium('S', 'Stadium');

    assert.strictEqual(s.shape, 'stadium');
  });

  test('diamond() creates node with diamond shape', () => {
    const d = diagram();
    const dm = d.diamond('D', 'Decision');

    assert.strictEqual(dm.shape, 'diamond');
  });

  test('parallelogram() creates node with parallelogram shape', () => {
    const d = diagram();
    const p = d.parallelogram('P', 'Input');

    assert.strictEqual(p.shape, 'parallelogram');
  });

  test('subroutine() creates node with subroutine shape', () => {
    const d = diagram();
    const sr = d.subroutine('SR', 'Subroutine');

    assert.strictEqual(sr.shape, 'subroutine');
  });

  // ------------------------------------------
  // Edges
  // ------------------------------------------
  test('edge() creates edge between two nodes', () => {
    const d = diagram();
    const a = d.rect('A', 'Start');
    const b = d.rect('B', 'End');
    d.edge(a, b);

    assert.strictEqual(d.props.edges.length, 1);
    assert.deepStrictEqual(d.props.edges[0], { from: ['A'], to: ['B'], label: undefined });
  });

  test('edge() with label stores label', () => {
    const d = diagram();
    const a = d.rect('A');
    const b = d.rect('B');
    d.edge(a, b, { label: 'connects' });

    assert.strictEqual(d.props.edges[0].label, 'connects');
  });

  test('edge() with multiple targets creates multi-target edge', () => {
    const d = diagram();
    const a = d.rect('A');
    const b = d.rect('B');
    const c = d.rect('C');
    d.edge(a, [b, c]);

    assert.deepStrictEqual(d.props.edges[0].from, ['A']);
    assert.deepStrictEqual(d.props.edges[0].to, ['B', 'C']);
  });

  test('edge() with multiple sources creates multi-source edge', () => {
    const d = diagram();
    const a = d.rect('A');
    const b = d.rect('B');
    const c = d.rect('C');
    d.edge([a, b], c);

    assert.deepStrictEqual(d.props.edges[0].from, ['A', 'B']);
    assert.deepStrictEqual(d.props.edges[0].to, ['C']);
  });

  // ------------------------------------------
  // Subgraphs
  // ------------------------------------------
  test('subgraph() creates subgraph with nodes', () => {
    const d = diagram();
    const db = d.cylinder('DB', 'Postgres');
    d.subgraph('Sources', db);

    assert.strictEqual(d.props.subgraphs.length, 1);
    assert.strictEqual(d.props.subgraphs[0].id, 'Sources');
    assert.deepStrictEqual(d.props.subgraphs[0].nodeIds, ['DB']);
  });

  test('subgraph() with custom label', () => {
    const d = diagram();
    const p = d.rect('P', 'processor');
    d.subgraph('Core', { label: 'Processing' }, p);

    assert.strictEqual(d.props.subgraphs[0].label, 'Processing');
  });

  test('subgraph() with direction', () => {
    const d = diagram();
    const p = d.rect('P', 'processor');
    d.subgraph('Core', { direction: DIAGRAM_DIRECTION.TOP_TO_BOTTOM }, p);

    assert.strictEqual(d.props.subgraphs[0].direction, 'TB');
  });

  test('subgraph() with multiple nodes', () => {
    const d = diagram();
    const a = d.rect('A');
    const b = d.rect('B');
    const c = d.rect('C');
    d.subgraph('Group', a, b, c);

    assert.deepStrictEqual(d.props.subgraphs[0].nodeIds, ['A', 'B', 'C']);
  });

  // ------------------------------------------
  // Class Styling
  // ------------------------------------------
  test('class() applies style to single node', () => {
    const d = diagram();
    const a = d.rect('A');
    d.class(NODE_STYLE.PRIMARY, a);

    assert.strictEqual(d.props.classes.length, 1);
    assert.strictEqual(d.props.classes[0].nodeId, 'A');
    assert.strictEqual(d.props.classes[0].style, NODE_STYLE.PRIMARY);
  });

  test('class() applies style to multiple nodes', () => {
    const d = diagram();
    const a = d.rect('A');
    const b = d.rect('B');
    d.class(NODE_STYLE.PRIMARY, a, b);

    assert.strictEqual(d.props.classes.length, 2);
    assert.strictEqual(d.props.classes[0].nodeId, 'A');
    assert.strictEqual(d.props.classes[1].nodeId, 'B');
  });

  test('multiple class() calls accumulate', () => {
    const d = diagram();
    const a = d.rect('A');
    const b = d.rect('B');
    const c = d.rect('C');
    d.class(NODE_STYLE.PRIMARY, a)
     .class(NODE_STYLE.BACKGROUND, b, c);

    assert.strictEqual(d.props.classes.length, 3);
    assert.strictEqual(d.props.classes[0].style, NODE_STYLE.PRIMARY);
    assert.strictEqual(d.props.classes[1].style, NODE_STYLE.BACKGROUND);
    assert.strictEqual(d.props.classes[2].style, NODE_STYLE.BACKGROUND);
  });

  // ------------------------------------------
  // Fluent API
  // ------------------------------------------
  test('methods return this for chaining', () => {
    const d = diagram();
    const a = d.rect('A');
    const b = d.rect('B');

    const result = d
      .subgraph('S', a)
      .edge(a, b)
      .class(NODE_STYLE.PRIMARY, a);

    assert.strictEqual(result, d);
  });

  // ------------------------------------------
  // Scale Option
  // ------------------------------------------
  test('scale option is stored', () => {
    const d = diagram(DIAGRAM_DIRECTION.LEFT_TO_RIGHT, { scale: 3 });
    assert.strictEqual(d.props.scale, 3);
  });

  test('scale defaults to undefined', () => {
    const d = diagram();
    assert.strictEqual(d.props.scale, undefined);
  });

  // ------------------------------------------
  // Full Demo (from old tests)
  // ------------------------------------------
  test('full demo-style diagram has correct structure', () => {
    const d = diagram(DIAGRAM_DIRECTION.LEFT_TO_RIGHT);

    const db = d.cylinder('DB');
    const T = d.rect('T', 'orders');
    const I = d.rect('I', 'products');
    const M = d.rect('M', 'inventory');
    const P = d.rect('P', 'summary');
    const ui = d.rect('UI', 'Dashboard');

    d.subgraph('Sources', db)
     .subgraph('Core', { label: 'Processing', direction: DIAGRAM_DIRECTION.LEFT_TO_RIGHT }, T, I, M, P)
     .subgraph('Consumers', ui)
     .edge(db, [T, I, M])
     .edge([T, I, M], P)
     .edge(P, ui, { label: 'STREAM' })
     .class(NODE_STYLE.PRIMARY, db, T, I, M)
     .class(NODE_STYLE.BACKGROUND, P, ui);

    // Verify nodes
    assert.strictEqual(d.props.nodes.length, 6);
    assert.strictEqual(d.props.nodes[0].id, 'DB');
    assert.strictEqual(d.props.nodes[0].shape, 'cylinder');

    // Verify subgraphs
    assert.strictEqual(d.props.subgraphs.length, 3);
    assert.strictEqual(d.props.subgraphs[0].id, 'Sources');
    assert.strictEqual(d.props.subgraphs[1].id, 'Core');
    assert.strictEqual(d.props.subgraphs[1].label, 'Processing');
    assert.strictEqual(d.props.subgraphs[1].direction, 'LR');
    assert.deepStrictEqual(d.props.subgraphs[1].nodeIds, ['T', 'I', 'M', 'P']);

    // Verify edges
    assert.strictEqual(d.props.edges.length, 3);
    assert.deepStrictEqual(d.props.edges[0].to, ['T', 'I', 'M']);
    assert.deepStrictEqual(d.props.edges[1].from, ['T', 'I', 'M']);
    assert.strictEqual(d.props.edges[2].label, 'STREAM');

    // Verify classes
    assert.strictEqual(d.props.classes.length, 6); // 4 PRIMARY + 2 BACKGROUND
  });

  // ------------------------------------------
  // Component Expansion
  // ------------------------------------------
  test('componentRegistry can expand diagram', async () => {
    const { componentRegistry } = await import('../src/core/component-registry.js');
    const { NODE_TYPE } = await import('../src/core/nodes.js');
    const { mockTheme, mockMeasurer } = await import('./mocks.js');

    const d = diagram(DIAGRAM_DIRECTION.LEFT_TO_RIGHT);
    d.rect('A', 'Node A');
    d.rect('B', 'Node B');
    d.edge(d.props.nodes[0] as any, d.props.nodes[1] as any);

    const expanded = componentRegistry.expand(d, {
      theme: mockTheme(),
      measurer: mockMeasurer({ lineHeight: 0.5, lines: 1 })
    });

    // Expansion should produce DiagramNode
    assert.strictEqual(expanded.type, NODE_TYPE.DIAGRAM);
    assert.strictEqual((expanded as any).direction, 'LR');
    assert.strictEqual((expanded as any).nodes.length, 2);
  });
});
