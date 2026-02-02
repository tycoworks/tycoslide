// Image unit tests — validates dimension loading, aspect ratio, DPI capping, and alignment
// Uses programmatically-created PNG test fixtures to avoid external file dependencies

import { describe, test, before, after } from 'node:test';
import * as assert from 'node:assert';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { Image } from '../src/components/image.js';
import { DIRECTION, ALIGN, type Theme, Bounds } from '../src/core/types.js';

// ============================================
// MOCK HELPERS
// ============================================

function mockTheme(minDisplayDPI = 96): Theme {
  return { spacing: { minDisplayDPI } } as any;
}

function approx(actual: number, expected: number, msg: string, tolerance = 0.01): void {
  assert.ok(Math.abs(actual - expected) < tolerance, `${msg}: expected ~${expected}, got ${actual}`);
}

/** Creates a minimal valid PNG file with specified dimensions */
function createPng(path: string, width: number, height: number): void {
  // Minimal PNG: signature + IHDR chunk (no image data needed for image-size)
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(25);
  ihdr.writeUInt32BE(13, 0);          // chunk length
  ihdr.write('IHDR', 4);              // chunk type
  ihdr.writeUInt32BE(width, 8);       // width
  ihdr.writeUInt32BE(height, 12);     // height
  ihdr.writeUInt8(8, 16);             // bit depth
  ihdr.writeUInt8(2, 17);             // color type (RGB)
  ihdr.writeUInt8(0, 18);             // compression
  ihdr.writeUInt8(0, 19);             // filter
  ihdr.writeUInt8(0, 20);             // interlace
  // CRC (image-size doesn't validate it, so zeros are fine)
  ihdr.writeUInt32BE(0, 21);
  writeFileSync(path, Buffer.concat([signature, ihdr]));
}

/** Creates a simple mock canvas that captures addImage calls */
function mockCanvas(): { calls: any[]; canvas: any } {
  const calls: any[] = [];
  return {
    calls,
    canvas: { addImage: (opts: any) => calls.push(opts) },
  };
}

// ============================================
// FIXTURES SETUP/TEARDOWN
// ============================================

const FIXTURES_DIR = '/Users/chris.anderson/Development/tycoslide/test/fixtures';

before(() => {
  mkdirSync(FIXTURES_DIR, { recursive: true });
  createPng(`${FIXTURES_DIR}/test-400x300.png`, 400, 300);
  createPng(`${FIXTURES_DIR}/test-960x720.png`, 960, 720);
  createPng(`${FIXTURES_DIR}/test-192x144.png`, 192, 144);
  createPng(`${FIXTURES_DIR}/test-400x200.png`, 400, 200);
  createPng(`${FIXTURES_DIR}/test-200x400.png`, 200, 400);
});

after(() => {
  rmSync(FIXTURES_DIR, { recursive: true, force: true });
});

// ============================================
// TESTS
// ============================================

describe('Image', () => {

  // ------------------------------------------
  // 1. Constructor throws on unreadable file
  // ------------------------------------------
  test('constructor throws on unreadable file', () => {
    assert.throws(
      () => new Image(mockTheme(), '/nonexistent/file.png'),
      (err: Error) => {
        // image-size throws ENOENT for missing files
        assert.ok(err.message.includes('ENOENT') || err.message.includes('Cannot determine dimensions'),
          `Expected file error, got: ${err.message}`);
        return true;
      },
    );
  });

  // ------------------------------------------
  // 2. Constructor stores pixel dimensions and aspect ratio
  // ------------------------------------------
  test('constructor stores pixel dimensions and aspect ratio', () => {
    const img = new Image(mockTheme(), `${FIXTURES_DIR}/test-400x300.png`);
    assert.strictEqual(img.pixelWidth, 400);
    assert.strictEqual(img.pixelHeight, 300);
    approx(img.aspectRatio, 400 / 300, 'aspect ratio');
  });

  // ------------------------------------------
  // 3. getHeight returns natural height when under DPI cap
  // ------------------------------------------
  test('getHeight returns natural height for large image', () => {
    const img = new Image(mockTheme(96), `${FIXTURES_DIR}/test-960x720.png`);
    // 960×720 (AR=1.333) at width 4 → natural=3, DPI cap=720/96=7.5 → returns 3
    approx(img.getHeight(4), 3, 'intrinsic height is natural for large image');
  });

  // ------------------------------------------
  // 4. getHeight caps at DPI limit for small image
  // ------------------------------------------
  test('getHeight caps at DPI limit for small image', () => {
    const img = new Image(mockTheme(96), `${FIXTURES_DIR}/test-192x144.png`);
    // 192×144 (AR=1.333) at width 4 → natural=3, DPI cap=144/96=1.5 → returns 1.5
    approx(img.getHeight(4), 1.5, 'intrinsic height caps at DPI limit');
  });

  // ------------------------------------------
  // 5. getHeight returns natural height when DPI not limiting
  // ------------------------------------------
  test('getHeight returns natural height when DPI not limiting', () => {
    const img = new Image(mockTheme(96), `${FIXTURES_DIR}/test-400x300.png`);
    // 400×300 at width 4 → natural=3, DPI cap=300/96=3.125 → returns 3 (natural wins)
    approx(img.getHeight(4), 3, 'intrinsic height is natural when under DPI cap');
  });

  // ------------------------------------------
  // 7. getWidth returns height × aspectRatio
  // ------------------------------------------
  test('getWidth returns height × aspectRatio', () => {
    const img = new Image(mockTheme(), `${FIXTURES_DIR}/test-400x300.png`);
    // 400×300 (AR=1.333), height=3 → width≈4
    const minWidth = img.getWidth(3);
    approx(minWidth, 4, 'min width from height');
  });

  // ------------------------------------------
  // 8. prepare: landscape image in square box fits to width
  // ------------------------------------------
  test('prepare: landscape image in square box fits to width', () => {
    const img = new Image(mockTheme(), `${FIXTURES_DIR}/test-400x200.png`);
    const { calls, canvas } = mockCanvas();
    const drawer = img.prepare(new Bounds(0, 0, 4, 4));
    drawer(canvas);

    assert.strictEqual(calls.length, 1);
    approx(calls[0].w, 4, 'image width fits to bounds width');
    approx(calls[0].h, 2, 'image height preserves aspect ratio');
    approx(calls[0].x, 0, 'x position');
    approx(calls[0].y, 1, 'y position centered vertically (offset=1)');
  });

  // ------------------------------------------
  // 9. prepare: portrait image in square box fits to height
  // ------------------------------------------
  test('prepare: portrait image in square box fits to height', () => {
    const img = new Image(mockTheme(), `${FIXTURES_DIR}/test-200x400.png`);
    const { calls, canvas } = mockCanvas();
    const drawer = img.prepare(new Bounds(0, 0, 4, 4));
    drawer(canvas);

    assert.strictEqual(calls.length, 1);
    approx(calls[0].h, 4, 'image height fits to bounds height');
    approx(calls[0].w, 2, 'image width preserves aspect ratio');
    approx(calls[0].x, 1, 'x position centered horizontally (offset=1)');
    approx(calls[0].y, 0, 'y position');
  });

  // ------------------------------------------
  // 10. prepare: default alignment centers both axes
  // ------------------------------------------
  test('prepare: default alignment centers both axes', () => {
    const img = new Image(mockTheme(), `${FIXTURES_DIR}/test-400x200.png`);
    const { calls, canvas } = mockCanvas();
    const drawer = img.prepare(new Bounds(0, 0, 4, 4));
    drawer(canvas);

    approx(calls[0].x, 0, 'x centered (no horizontal offset for landscape)');
    approx(calls[0].y, 1, 'y centered with offset');
  });

  // ------------------------------------------
  // 11. prepare: ROW + ALIGN.START aligns image to top
  // ------------------------------------------
  test('prepare: ROW + ALIGN.START aligns image to top', () => {
    const img = new Image(mockTheme(), `${FIXTURES_DIR}/test-400x200.png`);
    const { calls, canvas } = mockCanvas();
    const drawer = img.prepare(new Bounds(0, 0, 4, 4), {
      direction: DIRECTION.ROW,
      align: ALIGN.START,
    });
    drawer(canvas);

    approx(calls[0].y, 0, 'verticalOffset=0 (aligned to top)');
  });

  // ------------------------------------------
  // 12. prepare: ROW + ALIGN.END aligns image to bottom
  // ------------------------------------------
  test('prepare: ROW + ALIGN.END aligns image to bottom', () => {
    const img = new Image(mockTheme(), `${FIXTURES_DIR}/test-400x200.png`);
    const { calls, canvas } = mockCanvas();
    const drawer = img.prepare(new Bounds(0, 0, 4, 4), {
      direction: DIRECTION.ROW,
      align: ALIGN.END,
    });
    drawer(canvas);

    // imgH=2, bounds.h=4 → offset = 4 - 2 = 2
    approx(calls[0].y, 2, 'verticalOffset=2 (aligned to bottom)');
  });

  // ------------------------------------------
  // 13. prepare: COLUMN + ALIGN.START aligns image to left
  // ------------------------------------------
  test('prepare: COLUMN + ALIGN.START aligns image to left', () => {
    const img = new Image(mockTheme(), `${FIXTURES_DIR}/test-200x400.png`);
    const { calls, canvas } = mockCanvas();
    const drawer = img.prepare(new Bounds(0, 0, 4, 4), {
      direction: DIRECTION.COLUMN,
      align: ALIGN.START,
    });
    drawer(canvas);

    approx(calls[0].x, 0, 'horizontalOffset=0 (aligned to left)');
  });

  // ------------------------------------------
  // 14. prepare: COLUMN + ALIGN.END aligns image to right
  // ------------------------------------------
  test('prepare: COLUMN + ALIGN.END aligns image to right', () => {
    const img = new Image(mockTheme(), `${FIXTURES_DIR}/test-200x400.png`);
    const { calls, canvas } = mockCanvas();
    const drawer = img.prepare(new Bounds(0, 0, 4, 4), {
      direction: DIRECTION.COLUMN,
      align: ALIGN.END,
    });
    drawer(canvas);

    // imgW=2, bounds.w=4 → offset = 4 - 2 = 2
    approx(calls[0].x, 2, 'horizontalOffset=2 (aligned to right)');
  });

});
