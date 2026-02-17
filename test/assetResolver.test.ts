// Asset Resolver Tests
// Unit tests for resolveAssetReferences() — the function that converts
// `asset:dot.path` strings into resolved file paths from a nested object.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveAssetReferences, ASSET_PREFIX } from '../src/markdown/assetResolver.js';

const mockAssets = {
  illustrations: {
    server: '/abs/path/illustrations/server.png',
    cloud: '/abs/path/illustrations/cloud.png',
  },
  clients: {
    delphi: '/abs/path/clients/delphi.png',
  },
  brand: {
    logos: {
      wordmark: '/abs/path/brand/logos/wordmark.png',
    },
  },
};

describe('Asset Resolver', () => {
  describe('resolution', () => {
    it('should resolve a simple asset reference', () => {
      const result = resolveAssetReferences('asset:illustrations.server', mockAssets, 0);
      assert.strictEqual(result, '/abs/path/illustrations/server.png');
    });

    it('should resolve a deeply nested asset reference', () => {
      const result = resolveAssetReferences('asset:brand.logos.wordmark', mockAssets, 0);
      assert.strictEqual(result, '/abs/path/brand/logos/wordmark.png');
    });

    it('should leave non-asset strings untouched', () => {
      assert.strictEqual(resolveAssetReferences('hello world', mockAssets, 0), 'hello world');
      assert.strictEqual(resolveAssetReferences('', mockAssets, 0), '');
      assert.strictEqual(resolveAssetReferences('/literal/path.png', mockAssets, 0), '/literal/path.png');
    });

    it('should leave non-string values untouched', () => {
      assert.strictEqual(resolveAssetReferences(42, mockAssets, 0), 42);
      assert.strictEqual(resolveAssetReferences(true, mockAssets, 0), true);
      assert.strictEqual(resolveAssetReferences(null, mockAssets, 0), null);
      assert.strictEqual(resolveAssetReferences(undefined, mockAssets, 0), undefined);
    });
  });

  describe('recursion', () => {
    it('should resolve asset references inside arrays', () => {
      const input = [{ image: 'asset:illustrations.server', title: 'Card' }];
      const result = resolveAssetReferences(input, mockAssets, 0) as any[];
      assert.strictEqual(result[0].image, '/abs/path/illustrations/server.png');
      assert.strictEqual(result[0].title, 'Card');
    });

    it('should resolve asset references inside nested objects', () => {
      const input = { nested: { image: 'asset:clients.delphi' }, plain: 'text' };
      const result = resolveAssetReferences(input, mockAssets, 0) as Record<string, any>;
      assert.strictEqual(result.nested.image, '/abs/path/clients/delphi.png');
      assert.strictEqual(result.plain, 'text');
    });

    it('should resolve multiple asset references in a mixed structure', () => {
      const input = {
        image: 'asset:illustrations.server',
        cards: [
          { image: 'asset:illustrations.cloud', title: 'A' },
          { image: 'asset:clients.delphi', title: 'B' },
        ],
        plain: 'no-resolve',
        count: 3,
      };
      const result = resolveAssetReferences(input, mockAssets, 0) as Record<string, any>;
      assert.strictEqual(result.image, '/abs/path/illustrations/server.png');
      assert.strictEqual(result.cards[0].image, '/abs/path/illustrations/cloud.png');
      assert.strictEqual(result.cards[1].image, '/abs/path/clients/delphi.png');
      assert.strictEqual(result.plain, 'no-resolve');
      assert.strictEqual(result.count, 3);
    });
  });

  describe('errors', () => {
    it('should throw when assets not provided', () => {
      assert.throws(
        () => resolveAssetReferences('asset:illustrations.server', undefined, 0),
        (err: any) => {
          assert.ok(err.message.includes('no assets provided'));
          assert.ok(err.message.includes('Slide 1'));
          return true;
        },
      );
    });

    it('should throw on invalid path with available keys', () => {
      assert.throws(
        () => resolveAssetReferences('asset:illustrations.nonexistent', mockAssets, 2),
        (err: any) => {
          assert.ok(err.message.includes('Slide 3'));
          assert.ok(err.message.includes('could not be resolved'));
          assert.ok(err.message.includes('server'));
          assert.ok(err.message.includes('cloud'));
          return true;
        },
      );
    });

    it('should throw on invalid root key with available keys', () => {
      assert.throws(
        () => resolveAssetReferences('asset:nonexistent.path', mockAssets, 0),
        (err: any) => {
          assert.ok(err.message.includes('could not be resolved'));
          assert.ok(err.message.includes('illustrations'));
          assert.ok(err.message.includes('clients'));
          return true;
        },
      );
    });

    it('should throw when path resolves to an object with suggestions', () => {
      assert.throws(
        () => resolveAssetReferences('asset:illustrations', mockAssets, 0),
        (err: any) => {
          assert.ok(err.message.includes('resolved to an object'));
          assert.ok(err.message.includes('asset:illustrations.server'));
          return true;
        },
      );
    });

    it('should include correct slide index in error messages', () => {
      assert.throws(
        () => resolveAssetReferences('asset:bad', undefined, 4),
        (err: any) => {
          assert.ok(err.message.includes('Slide 5'));
          return true;
        },
      );
    });

    it('should throw on bare asset: prefix with no path', () => {
      assert.throws(
        () => resolveAssetReferences('asset:', mockAssets, 0),
        (err: any) => {
          assert.ok(err.message.includes('could not be resolved'));
          assert.ok(err.message.includes('illustrations'));
          return true;
        },
      );
    });

    it('should throw on trailing dot in path', () => {
      assert.throws(
        () => resolveAssetReferences('asset:illustrations.', mockAssets, 0),
        (err: any) => {
          assert.ok(err.message.includes('could not be resolved'));
          assert.ok(err.message.includes('server'));
          return true;
        },
      );
    });

    it('should throw when path resolves to a non-string primitive', () => {
      const assetsWithNumber = { count: 42 };
      assert.throws(
        () => resolveAssetReferences('asset:count', assetsWithNumber, 0),
        (err: any) => {
          assert.ok(err.message.includes('resolved to number'));
          return true;
        },
      );
    });

    it('should throw when traversing through a string intermediate', () => {
      assert.throws(
        () => resolveAssetReferences('asset:illustrations.server.deep', mockAssets, 0),
        (err: any) => {
          assert.ok(err.message.includes('is not an object'));
          return true;
        },
      );
    });
  });

  describe('embedded assets', () => {
    it('should resolve asset references embedded in a larger string', () => {
      const input = 'Look at ![](asset:illustrations.server) for details';
      const result = resolveAssetReferences(input, mockAssets, 0);
      assert.strictEqual(result, 'Look at ![](/abs/path/illustrations/server.png) for details');
    });

    it('should resolve multiple embedded asset references in one string', () => {
      const input = '![](asset:illustrations.server) and ![](asset:clients.delphi)';
      const result = resolveAssetReferences(input, mockAssets, 0);
      assert.strictEqual(result, '![](/abs/path/illustrations/server.png) and ![](/abs/path/clients/delphi.png)');
    });

    it('should resolve embedded assets in markdown image syntax', () => {
      const input = '![alt text](asset:brand.logos.wordmark)';
      const result = resolveAssetReferences(input, mockAssets, 0);
      assert.strictEqual(result, '![alt text](/abs/path/brand/logos/wordmark.png)');
    });

    it('should resolve embedded assets in directive YAML bodies', () => {
      const input = 'image: asset:illustrations.cloud\ntitle: Hello';
      const result = resolveAssetReferences(input, mockAssets, 0);
      assert.strictEqual(result, 'image: /abs/path/illustrations/cloud.png\ntitle: Hello');
    });

    it('should not touch strings that merely contain "asset" without the prefix pattern', () => {
      const input = 'This is an asset management system';
      const result = resolveAssetReferences(input, mockAssets, 0);
      assert.strictEqual(result, 'This is an asset management system');
    });

    it('should throw for invalid embedded asset reference', () => {
      const input = 'See ![](asset:nonexistent.path) here';
      assert.throws(
        () => resolveAssetReferences(input, mockAssets, 0),
        (err: any) => {
          assert.ok(err.message.includes('could not be resolved'));
          return true;
        },
      );
    });
  });

  describe('ASSET_PREFIX', () => {
    it('should export the prefix constant', () => {
      assert.strictEqual(ASSET_PREFIX, 'asset:');
    });
  });
});
