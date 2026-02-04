import { describe, test } from 'node:test';
import assert from 'node:assert';
import { diagram, DIAGRAM_DIRECTION, NODE_STYLE } from '../dist/components/diagram.js';
import type { Theme } from '../dist/core/types.js';

// Minimal mock theme for diagram builder tests (only needs colors for classDef generation)
const theme = {
  colors: {
    primary: 'FF0000',
    background: 'FFFFFF',
    secondary: '333333',
    accent1: '00FF00',
    accent2: '0000FF',
    accent3: 'FFFF00',
    accent4: 'FF00FF',
    accent5: '00FFFF',
    text: '000000',
    textMuted: '666666',
    subtleOpacity: 20,
  },
  textStyles: {
    body: { fontFamily: { normal: { name: 'Arial', path: '' } }, fontSize: 12 },
  },
} as Theme;

describe('Diagram', () => {
  test('simple diagram with rect nodes', () => {
    const d = diagram(theme, DIAGRAM_DIRECTION.LEFT_TO_RIGHT);
    const a = d.rect('A', 'Start');
    const b = d.rect('B', 'End');
    d.edge(a, b);

    const output = d.build();
    assert.ok(output.includes('flowchart LR'));
    assert.ok(output.includes('A[Start]'));
    assert.ok(output.includes('B[End]'));
    assert.ok(output.includes('A --> B'));
  });

  test('cylinder nodes render correctly', () => {
    const d = diagram(theme);
    const db = d.cylinder('DB', 'Postgres');
    d.edge(db, d.rect('App'));

    const output = d.build();
    assert.ok(output.includes('DB[(Postgres)]'));
  });

  test('hexagon nodes render correctly', () => {
    const d = diagram(theme);
    const kafka = d.hexagon('K', 'Kafka');

    const output = d.build();
    assert.ok(output.includes('K{{Kafka}}'));
  });

  test('subgraphs with labels', () => {
    const d = diagram(theme, DIAGRAM_DIRECTION.LEFT_TO_RIGHT);
    const db = d.cylinder('DB', 'Postgres');
    d.subgraph('Sources', db);

    const output = d.build();
    assert.ok(output.includes('subgraph Sources'));
    assert.ok(output.includes('DB[(Postgres)]'));
    assert.ok(output.includes('end'));
  });

  test('subgraphs with custom labels', () => {
    const d = diagram(theme, DIAGRAM_DIRECTION.LEFT_TO_RIGHT);
    const p = d.rect('P', 'processor');
    d.subgraph('Core', { label: 'Processing' }, p);

    const output = d.build();
    assert.ok(output.includes('subgraph Core[Processing]'));
  });

  test('subgraphs with direction', () => {
    const d = diagram(theme, DIAGRAM_DIRECTION.LEFT_TO_RIGHT);
    const p = d.rect('P', 'processor');
    d.subgraph('Core', { label: 'Processing', direction: DIAGRAM_DIRECTION.TOP_TO_BOTTOM }, p);

    const output = d.build();
    assert.ok(output.includes('direction TB'));
  });

  test('edge with label', () => {
    const d = diagram(theme);
    const a = d.rect('A');
    const b = d.rect('B');
    d.edge(a, b, { label: 'connects' });

    const output = d.build();
    assert.ok(output.includes('A -->|connects| B'));
  });

  test('multi-target edges', () => {
    const d = diagram(theme);
    const a = d.rect('A');
    const b = d.rect('B');
    const c = d.rect('C');
    d.edge(a, [b, c]);

    const output = d.build();
    assert.ok(output.includes('A --> B & C'));
  });

  test('multi-source edges', () => {
    const d = diagram(theme);
    const a = d.rect('A');
    const b = d.rect('B');
    const c = d.rect('C');
    d.edge([a, b], c);

    const output = d.build();
    assert.ok(output.includes('A & B --> C'));
  });

  test('class styling', () => {
    const d = diagram(theme);
    const a = d.rect('A');
    const b = d.rect('B');
    d.class(NODE_STYLE.PRIMARY, a, b);

    const output = d.build();
    assert.ok(output.includes('class A,B primary'));
  });

  test('multiple class styles', () => {
    const d = diagram(theme);
    const a = d.rect('A');
    const b = d.rect('B');
    const c = d.rect('C');
    d.class(NODE_STYLE.PRIMARY, a)
     .class(NODE_STYLE.BACKGROUND, b, c);

    const output = d.build();
    assert.ok(output.includes('class A primary'));
    assert.ok(output.includes('class B,C background'));
  });

  test('includes linear curve init', () => {
    const d = diagram(theme);
    const output = d.build();
    assert.ok(output.includes('%%{init: {"flowchart": {"curve": "linear"}}}%%'));
  });

  test('full demo-style diagram', () => {
    const d = diagram(theme, DIAGRAM_DIRECTION.LEFT_TO_RIGHT);

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

    const output = d.build();

    // Verify structure
    assert.ok(output.includes('flowchart LR'));
    assert.ok(output.includes('subgraph Sources'));
    assert.ok(output.includes('DB[(DB)]'));
    assert.ok(output.includes('subgraph Core[Processing]'));
    assert.ok(output.includes('direction LR'));
    assert.ok(output.includes('T[orders]'));
    assert.ok(output.includes('subgraph Consumers'));
    assert.ok(output.includes('UI[Dashboard]'));

    // Verify edges
    assert.ok(output.includes('DB --> T & I & M'));
    assert.ok(output.includes('T & I & M --> P'));
    assert.ok(output.includes('P -->|STREAM| UI'));

    // Verify classes
    assert.ok(output.includes('class DB,T,I,M primary'));
    assert.ok(output.includes('class P,UI background'));
  });
});
