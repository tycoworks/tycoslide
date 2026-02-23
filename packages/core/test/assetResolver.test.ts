// Asset Resolution Tests
// Integration tests: image component with asset refs → expand → ImageNode with resolved path.
// Tests the actual behavior users care about, not the resolver implementation.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { componentRegistry, type ExpansionContext } from '../src/core/rendering/registry.js';
import { image } from '../src/components/primitives.js';
import { NODE_TYPE, type ImageNode } from '../src/core/model/nodes.js';
import { mockTheme } from './mocks.js';

const testAssets = {
  illustrations: {
    server: '/abs/path/illustrations/server.png',
    cloud: '/abs/path/illustrations/cloud.png',
  },
  brand: {
    logos: {
      wordmark: '/abs/path/brand/logos/wordmark.png',
    },
  },
};

function makeContext(overrides?: Partial<ExpansionContext>): ExpansionContext {
  return { theme: mockTheme(), slideIndex: 0, assets: testAssets, ...overrides };
}

describe('Image Asset Resolution', () => {
  describe('expansion', () => {
    it('should resolve asset ref to file path during image expansion', async () => {
      const node = image('asset.illustrations.server');
      const result = await componentRegistry.expandTree(node, makeContext()) as ImageNode;
      assert.strictEqual(result.type, NODE_TYPE.IMAGE);
      assert.strictEqual(result.src, '/abs/path/illustrations/server.png');
    });

    it('should resolve deeply nested asset paths', async () => {
      const node = image('asset.brand.logos.wordmark');
      const result = await componentRegistry.expandTree(node, makeContext()) as ImageNode;
      assert.strictEqual(result.src, '/abs/path/brand/logos/wordmark.png');
    });

    it('should pass through non-asset paths unchanged', async () => {
      const node = image('/direct/path/to/image.png');
      const result = await componentRegistry.expandTree(node, makeContext()) as ImageNode;
      assert.strictEqual(result.src, '/direct/path/to/image.png');
    });

    it('should preserve alt text through asset resolution', async () => {
      const node = image('asset.illustrations.cloud', { alt: 'Cloud diagram' });
      const result = await componentRegistry.expandTree(node, makeContext()) as ImageNode;
      assert.strictEqual(result.src, '/abs/path/illustrations/cloud.png');
      assert.strictEqual(result.alt, 'Cloud diagram');
    });
  });

  describe('errors', () => {
    it('should throw when asset ref used without assets in context', async () => {
      const node = image('asset.illustrations.server');
      await assert.rejects(
        () => componentRegistry.expandTree(node, makeContext({ assets: undefined })),
        (err: any) => {
          assert.ok(err.message.includes('no assets provided'));
          assert.ok(err.message.includes('Slide 1'));
          return true;
        },
      );
    });

    it('should throw on invalid asset path with available keys', async () => {
      const node = image('asset.illustrations.nonexistent');
      await assert.rejects(
        () => componentRegistry.expandTree(node, makeContext({ slideIndex: 2 })),
        (err: any) => {
          assert.ok(err.message.includes('Slide 3'));
          assert.ok(err.message.includes('could not be resolved'));
          assert.ok(err.message.includes('server'));
          assert.ok(err.message.includes('cloud'));
          return true;
        },
      );
    });

    it('should throw when path resolves to an object with suggestions', async () => {
      const node = image('asset.illustrations');
      await assert.rejects(
        () => componentRegistry.expandTree(node, makeContext()),
        (err: any) => {
          assert.ok(err.message.includes('resolved to an object'));
          assert.ok(err.message.includes('asset.illustrations.server'));
          return true;
        },
      );
    });
  });
});
