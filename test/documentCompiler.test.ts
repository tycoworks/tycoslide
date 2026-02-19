// Document Compiler Tests
// Tests for compileDocument: markdown file → Presentation
//
// IMPORTANT: The slide parser treats the first ---...--- block as GLOBAL
// frontmatter. Slide frontmatter starts AFTER the global block.
// Every test document must begin with a global FM header.

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { compileDocument, buildSlideName } from '../src/markdown/documentCompiler.js';
import { layoutRegistry } from '../src/core/registry.js';
import { NODE_TYPE } from '../src/core/nodes.js';
import { mockTheme } from './mocks.js';
import type { Slide } from '../src/presentation.js';
import { schema } from '../src/schema.js';

// ============================================
// TEST SETUP
// ============================================

let receivedProps: any[] = [];
let renderedSlides: Slide[] = [];

/** Global FM header — required before any slide frontmatter */
const HEADER = `---\ntheme: test\n---\n\n`;

function makeOptions(overrides?: { defaultLayout?: string }) {
  return { theme: mockTheme(), ...overrides };
}

// Mock layouts
const simpleLayout = {
  name: 'simple',
  description: 'Test layout with just title',
  params: { title: schema.string() },
  render: (props: any): Slide => {
    receivedProps.push(props);
    const slide: Slide = { content: { type: NODE_TYPE.COMPONENT, componentName: 'test', props } };
    renderedSlides.push(slide);
    return slide;
  },
};

const bodyLayout = {
  name: 'body',
  description: 'Body layout with title and body',
  params: { title: schema.string().optional() },
  slots: ['body'],
  render: (props: any): Slide => {
    receivedProps.push(props);
    const slide: Slide = { content: { type: NODE_TYPE.COMPONENT, componentName: 'test', props } };
    renderedSlides.push(slide);
    return slide;
  },
};

const slotLayout = {
  name: 'slots',
  description: 'Slot layout with named slots',
  params: { title: schema.string(), eyebrow: schema.string() },
  slots: ['left', 'right'],
  render: (props: any): Slide => {
    receivedProps.push(props);
    const slide: Slide = { content: { type: NODE_TYPE.COMPONENT, componentName: 'test', props } };
    renderedSlides.push(slide);
    return slide;
  },
};

const strictLayout = {
  name: 'strict',
  description: 'Strict layout with required field',
  params: { title: schema.string(), required_field: schema.string() },
  render: (props: any): Slide => {
    receivedProps.push(props);
    const slide: Slide = { content: { type: NODE_TYPE.COMPONENT, componentName: 'test', props } };
    renderedSlides.push(slide);
    return slide;
  },
};

const defaultLayout = {
  name: 'default',
  description: 'Default layout with optional body',
  params: { title: schema.string().optional(), body: schema.string().optional() },
  render: (props: any): Slide => {
    receivedProps.push(props);
    const slide: Slide = { content: { type: NODE_TYPE.COMPONENT, componentName: 'test', props } };
    renderedSlides.push(slide);
    return slide;
  },
};

// ============================================
// TESTS
// ============================================

describe('Document Compiler', () => {
  beforeEach(() => {
    layoutRegistry.register(simpleLayout);
    layoutRegistry.register(bodyLayout);
    layoutRegistry.register(slotLayout);
    layoutRegistry.register(strictLayout);
    layoutRegistry.register(defaultLayout);
    receivedProps = [];
    renderedSlides = [];
  });

  afterEach(() => {
    layoutRegistry.clear();
  });

  describe('parameter mapping', () => {
    it('should compile a minimal frontmatter-only slide', () => {
      const md = HEADER + `---
layout: simple
title: Hello World
---`;
      compileDocument(md, makeOptions());
      assert.strictEqual(receivedProps.length, 1);
      assert.strictEqual(receivedProps[0].title, 'Hello World');
    });

    it('should pass title from frontmatter', () => {
      const md = HEADER + `---
layout: simple
title: Frontmatter Title
---`;
      compileDocument(md, makeOptions());
      assert.strictEqual(receivedProps.length, 1);
      assert.strictEqual(receivedProps[0].title, 'Frontmatter Title');
    });

    it('should compile markdown body to ComponentNode[]', () => {
      const md = HEADER + `---
layout: body
---

This is the body content.

Multiple paragraphs are preserved.`;
      compileDocument(md, makeOptions());
      assert.strictEqual(receivedProps.length, 1);
      assert.ok(Array.isArray(receivedProps[0].body));
      assert.ok(receivedProps[0].body.length > 0);
    });

    it('should compile named slots to ComponentNode[]', () => {
      const md = HEADER + `---
layout: slots
title: Two Column Slide
eyebrow: ARCHITECTURE
---

::left::
Left column content here.

::right::
Right column content here.`;
      compileDocument(md, makeOptions());
      assert.strictEqual(receivedProps.length, 1);
      assert.strictEqual(receivedProps[0].title, 'Two Column Slide');
      assert.strictEqual(receivedProps[0].eyebrow, 'ARCHITECTURE');
      assert.ok(Array.isArray(receivedProps[0].left));
      assert.ok(receivedProps[0].left.length > 0);
      assert.ok(Array.isArray(receivedProps[0].right));
      assert.ok(receivedProps[0].right.length > 0);
    });

    it('should attach speaker notes from frontmatter', () => {
      const md = HEADER + `---
layout: simple
title: Slide with Notes
notes: These are speaker notes.
---`;
      compileDocument(md, makeOptions());
      assert.strictEqual(renderedSlides.length, 1);
      assert.strictEqual(renderedSlides[0].notes, 'These are speaker notes.');
    });

    it('should compile multiple slides', () => {
      const md = HEADER + `---
layout: simple
title: Slide One
---

---
layout: simple
title: Slide Two
---

---
layout: simple
title: Slide Three
---`;
      compileDocument(md, makeOptions());
      assert.strictEqual(receivedProps.length, 3);
      assert.strictEqual(receivedProps[0].title, 'Slide One');
      assert.strictEqual(receivedProps[1].title, 'Slide Two');
      assert.strictEqual(receivedProps[2].title, 'Slide Three');
    });

    it('should prefer frontmatter body over markdown body', () => {
      const md = HEADER + `---
layout: default
body: Frontmatter body content
---

Markdown body content`;
      compileDocument(md, makeOptions());
      assert.strictEqual(receivedProps.length, 1);
      assert.strictEqual(receivedProps[0].body, 'Frontmatter body content');
    });

    it('should ignore ::slot:: markers that match param names (separate namespaces)', () => {
      const md = HEADER + `---
layout: slots
title: Title
eyebrow: FROM_FM
---

::left::
Left content

::right::
Right content

::eyebrow::
FROM_SLOT`;
      compileDocument(md, makeOptions());
      assert.strictEqual(receivedProps.length, 1);
      // eyebrow comes from params (frontmatter), not slots — ::eyebrow:: is ignored
      assert.strictEqual(receivedProps[0].eyebrow, 'FROM_FM');
    });
  });

  describe('default layout', () => {
    it('should use defaultLayout when layout is omitted', () => {
      const md = HEADER + `---
title: No Layout Specified
---`;
      compileDocument(md, makeOptions({ defaultLayout: 'simple' }));
      assert.strictEqual(receivedProps.length, 1);
      assert.strictEqual(receivedProps[0].title, 'No Layout Specified');
    });

    it('should throw when layout omitted and no defaultLayout set', () => {
      const md = HEADER + `---
title: Missing Layout
---`;
      assert.throws(
        () => compileDocument(md, makeOptions()),
        (err: any) => {
          assert.ok(err.message.includes("missing 'layout'"));
          assert.ok(err.message.includes('Slide 1'));
          return true;
        },
      );
    });
  });

  describe('errors', () => {
    it('should throw on missing layout without defaultLayout', () => {
      // Slide without frontmatter (just a heading after global FM)
      const md = HEADER + `# Just a heading`;
      assert.throws(
        () => compileDocument(md, makeOptions()),
        (err: any) => {
          assert.ok(err.message.includes("missing 'layout'"));
          return true;
        },
      );
    });

    it('should throw on unknown layout name', () => {
      const md = HEADER + `---
layout: nonexistent
---`;
      assert.throws(
        () => compileDocument(md, makeOptions()),
        (err: any) => {
          assert.ok(err.message.includes('nonexistent'));
          assert.ok(err.message.includes('unknown layout'));
          assert.ok(err.message.includes('Available:'));
          return true;
        },
      );
    });

    it('should throw on validation failure with missing required field', () => {
      const md = HEADER + `---
layout: strict
title: Has Title
---`;
      assert.throws(
        () => compileDocument(md, makeOptions()),
        (err: any) => {
          assert.ok(err.message.includes('required_field') || err.message.includes('validation'));
          return true;
        },
      );
    });
  });

  describe('asset resolution', () => {
    const testAssets = {
      images: { photo: '/resolved/photo.png' },
      icons: { star: '/resolved/star.svg' },
    };

    it('should resolve asset references in frontmatter', () => {
      const md = HEADER + `---
layout: body
title: asset:images.photo
---

Some body text`;
      compileDocument(md, { theme: mockTheme(), assets: testAssets });
      assert.strictEqual(receivedProps.length, 1);
      assert.strictEqual(receivedProps[0].title, '/resolved/photo.png');
    });

    it('should throw when asset ref used without assets option', () => {
      const md = HEADER + `---
layout: body
title: asset:images.photo
---

Body`;
      assert.throws(
        () => compileDocument(md, makeOptions()),
        (err: any) => {
          assert.ok(err.message.includes('no assets provided'));
          return true;
        },
      );
    });

    it('should resolve asset references in nested arrays', () => {
      // Register a layout that accepts cards with image fields
      const cardLayout = {
        name: 'cards',
        description: 'Card layout',
        params: {
          title: schema.string(),
          cards: schema.array(z.object({ image: schema.string(), title: schema.string() })),
        },
        render: (props: any): Slide => {
          receivedProps.push(props);
          const slide: Slide = { content: { type: NODE_TYPE.COMPONENT, componentName: 'test', props } };
          renderedSlides.push(slide);
          return slide;
        },
      };
      layoutRegistry.register(cardLayout);

      const md = HEADER + `---
layout: cards
title: My Cards
cards:
  - image: "asset:images.photo"
    title: Card A
  - image: "asset:icons.star"
    title: Card B
---`;
      compileDocument(md, { theme: mockTheme(), assets: testAssets });
      assert.strictEqual(receivedProps.length, 1);
      assert.strictEqual(receivedProps[0].cards[0].image, '/resolved/photo.png');
      assert.strictEqual(receivedProps[0].cards[1].image, '/resolved/star.svg');
    });
  });

  describe('slide naming', () => {
    it('should build name from string frontmatter values', () => {
      const raw = {
        index: 0,
        frontmatter: { layout: 'body', eyebrow: 'RECAP' },
        body: '',
        slots: {},
        };
      const name = buildSlideName(raw as any);
      assert.ok(name.includes('layout: body'));
      assert.ok(name.includes('eyebrow: RECAP'));
    });

    it('should use explicit name from frontmatter', () => {
      const raw = {
        index: 0,
        frontmatter: { layout: 'body', name: 'Day AI Story', eyebrow: 'STORY' },
        body: '',
        slots: {},
        };
      const name = buildSlideName(raw as any);
      assert.strictEqual(name, 'Day AI Story');
    });

    it('should truncate long values at 50 chars', () => {
      const longValue = 'A'.repeat(60);
      const raw = {
        index: 0,
        frontmatter: { layout: 'body', description: longValue },
        body: '',
        slots: {},
        };
      const name = buildSlideName(raw as any);
      assert.ok(name.includes('A'.repeat(50) + '...'));
      assert.ok(!name.includes('A'.repeat(51)));
    });

    it('should show array fields as [N items]', () => {
      const raw = {
        index: 0,
        frontmatter: { layout: 'cards', items: ['a', 'b', 'c'] },
        body: '',
        slots: {},
        };
      const name = buildSlideName(raw as any);
      assert.ok(name.includes('items: [3 items]'));
    });

    it('should include title from frontmatter in name', () => {
      const raw = {
        index: 0,
        frontmatter: { layout: 'body', title: 'FM Title' },
        body: '',
        slots: {},
        };
      const name = buildSlideName(raw as any);
      assert.ok(name.includes('title: FM Title'));
    });
  });
});
