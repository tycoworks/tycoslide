// Canvas Tests
// Test that Canvas is a pure data collector for drawing operations

import * as assert from 'node:assert';
import { describe, it } from 'node:test';
import { Canvas, CANVAS_OBJECT_TYPE, type TextFragment, type TextOptions, type ShapeOptions, type ImageOptions, type SlideNumberOptions } from '../src/core/canvas.js';
import { SHAPE, LAYER, HALIGN, VALIGN } from '../src/core/types.js';

describe('Canvas', () => {
  describe('constructor', () => {
    it('creates empty canvas', () => {
      const canvas = new Canvas();
      assert.strictEqual(canvas.getObjects().length, 0, 'should have no objects');
    });

    it('initializes with SLIDE layer', () => {
      const canvas = new Canvas();
      assert.strictEqual(canvas.currentLayer, LAYER.SLIDE, 'should default to SLIDE layer');
    });
  });

  describe('addText()', () => {
    it('stores text object with fragments and options', () => {
      const canvas = new Canvas();
      const fragments: TextFragment[] = [
        { text: 'Hello', options: { color: 'FF0000' } },
        { text: 'World', options: { fontFace: 'Arial', fontSize: 12 } },
      ];
      const options: TextOptions = {
        x: 1,
        y: 2,
        w: 5,
        h: 1,
        fontSize: 14,
        color: '000000',
      };

      canvas.addText(fragments, options);

      const objects = canvas.getObjects();
      assert.strictEqual(objects.length, 1, 'should have one object');

      const textObj = objects[0];
      assert.strictEqual(textObj.type, CANVAS_OBJECT_TYPE.TEXT, 'should be text type');
      if (textObj.type === CANVAS_OBJECT_TYPE.TEXT) {
        assert.strictEqual(textObj.content.length, 2, 'should have two fragments');
        assert.strictEqual(textObj.content[0].text, 'Hello', 'first fragment text');
        assert.strictEqual(textObj.content[0].options?.color, 'FF0000', 'first fragment color');
        assert.strictEqual(textObj.content[1].text, 'World', 'second fragment text');
        assert.strictEqual(textObj.content[1].options?.fontFace, 'Arial', 'second fragment font');
        assert.strictEqual(textObj.options.x, 1, 'x position');
        assert.strictEqual(textObj.options.y, 2, 'y position');
        assert.strictEqual(textObj.options.w, 5, 'width');
        assert.strictEqual(textObj.options.h, 1, 'height');
        assert.strictEqual(textObj.options.fontSize, 14, 'font size');
        assert.strictEqual(textObj.layer, LAYER.SLIDE, 'should use current layer');
      }
    });

    it('respects current layer', () => {
      const canvas = new Canvas();
      canvas.currentLayer = LAYER.MASTER;
      const fragments: TextFragment[] = [{ text: 'Master text' }];
      const options: TextOptions = { x: 0, y: 0, w: 1, h: 1 };

      canvas.addText(fragments, options);

      const objects = canvas.getObjects();
      assert.strictEqual(objects[0].layer, LAYER.MASTER, 'should use MASTER layer');
    });
  });

  describe('addShape()', () => {
    it('stores shape with type and options', () => {
      const canvas = new Canvas();
      const options: ShapeOptions = {
        x: 1,
        y: 2,
        w: 3,
        h: 4,
        line: { color: 'FF0000', width: 2 },
        fill: { color: '0000FF', transparency: 50 },
      };

      canvas.addShape(SHAPE.RECT, options);

      const objects = canvas.getObjects();
      assert.strictEqual(objects.length, 1, 'should have one object');

      const shapeObj = objects[0];
      assert.strictEqual(shapeObj.type, CANVAS_OBJECT_TYPE.SHAPE, 'should be shape type');
      if (shapeObj.type === CANVAS_OBJECT_TYPE.SHAPE) {
        assert.strictEqual(shapeObj.shapeType, SHAPE.RECT, 'shape type');
        assert.strictEqual(shapeObj.options.x, 1, 'x position');
        assert.strictEqual(shapeObj.options.y, 2, 'y position');
        assert.strictEqual(shapeObj.options.w, 3, 'width');
        assert.strictEqual(shapeObj.options.h, 4, 'height');
        assert.strictEqual(shapeObj.options.line?.color, 'FF0000', 'line color');
        assert.strictEqual(shapeObj.options.line?.width, 2, 'line width');
        assert.strictEqual(shapeObj.options.fill?.color, '0000FF', 'fill color');
        assert.strictEqual(shapeObj.options.fill?.transparency, 50, 'fill transparency');
        assert.strictEqual(shapeObj.layer, LAYER.SLIDE, 'should use current layer');
      }
    });

    it('stores rounded rectangle with rectRadius', () => {
      const canvas = new Canvas();
      const options: ShapeOptions = {
        x: 0,
        y: 0,
        w: 2,
        h: 2,
        rectRadius: 0.1,
      };

      canvas.addShape(SHAPE.ROUND_RECT, options);

      const objects = canvas.getObjects();
      const shapeObj = objects[0];
      if (shapeObj.type === CANVAS_OBJECT_TYPE.SHAPE) {
        assert.strictEqual(shapeObj.shapeType, SHAPE.ROUND_RECT, 'should be rounded rect');
        assert.strictEqual(shapeObj.options.rectRadius, 0.1, 'should have radius');
      }
    });

    it('stores line shape', () => {
      const canvas = new Canvas();
      const options: ShapeOptions = {
        x: 1,
        y: 1,
        w: 5,
        h: 0,
        line: { color: '000000', width: 1 },
      };

      canvas.addShape(SHAPE.LINE, options);

      const objects = canvas.getObjects();
      const shapeObj = objects[0];
      if (shapeObj.type === CANVAS_OBJECT_TYPE.SHAPE) {
        assert.strictEqual(shapeObj.shapeType, SHAPE.LINE, 'should be line shape');
      }
    });
  });

  describe('addImage()', () => {
    it('stores image with path and dimensions', () => {
      const canvas = new Canvas();
      const options: ImageOptions = {
        path: '/path/to/image.png',
        x: 1,
        y: 2,
        w: 3,
        h: 4,
      };

      canvas.addImage(options);

      const objects = canvas.getObjects();
      assert.strictEqual(objects.length, 1, 'should have one object');

      const imageObj = objects[0];
      assert.strictEqual(imageObj.type, CANVAS_OBJECT_TYPE.IMAGE, 'should be image type');
      if (imageObj.type === CANVAS_OBJECT_TYPE.IMAGE) {
        assert.strictEqual(imageObj.options.path, '/path/to/image.png', 'image path');
        assert.strictEqual(imageObj.options.x, 1, 'x position');
        assert.strictEqual(imageObj.options.y, 2, 'y position');
        assert.strictEqual(imageObj.options.w, 3, 'width');
        assert.strictEqual(imageObj.options.h, 4, 'height');
        assert.strictEqual(imageObj.layer, LAYER.SLIDE, 'should use current layer');
      }
    });
  });

  describe('addSlideNumber()', () => {
    it('stores slide number placeholder with options', () => {
      const canvas = new Canvas();
      const options: SlideNumberOptions = {
        x: 0.5,
        y: 7,
        w: 1,
        h: 0.3,
        fontFace: 'Arial',
        fontSize: 10,
        color: '666666',
        align: HALIGN.CENTER,
        valign: VALIGN.MIDDLE,
      };

      canvas.addSlideNumber(options);

      const objects = canvas.getObjects();
      assert.strictEqual(objects.length, 1, 'should have one object');

      const slideNumObj = objects[0];
      assert.strictEqual(slideNumObj.type, CANVAS_OBJECT_TYPE.SLIDE_NUMBER, 'should be slide number type');
      if (slideNumObj.type === CANVAS_OBJECT_TYPE.SLIDE_NUMBER) {
        assert.strictEqual(slideNumObj.options.x, 0.5, 'x position');
        assert.strictEqual(slideNumObj.options.y, 7, 'y position');
        assert.strictEqual(slideNumObj.options.fontFace, 'Arial', 'font face');
        assert.strictEqual(slideNumObj.options.fontSize, 10, 'font size');
        assert.strictEqual(slideNumObj.options.color, '666666', 'color');
        assert.strictEqual(slideNumObj.options.align, HALIGN.CENTER, 'horizontal alignment');
        assert.strictEqual(slideNumObj.options.valign, VALIGN.MIDDLE, 'vertical alignment');
        assert.strictEqual(slideNumObj.layer, LAYER.SLIDE, 'should use current layer');
      }
    });
  });

  describe('getObjects()', () => {
    it('returns all added objects in order', () => {
      const canvas = new Canvas();

      // Add various objects
      canvas.addShape(SHAPE.RECT, { x: 0, y: 0, w: 1, h: 1 });
      canvas.addText([{ text: 'Test' }], { x: 1, y: 1, w: 2, h: 1 });
      canvas.addImage({ path: '/img.png', x: 2, y: 2, w: 1, h: 1 });
      canvas.addSlideNumber({ x: 0, y: 7, w: 1, h: 0.3 });

      const objects = canvas.getObjects();
      assert.strictEqual(objects.length, 4, 'should have four objects');
      assert.strictEqual(objects[0].type, CANVAS_OBJECT_TYPE.SHAPE, 'first should be shape');
      assert.strictEqual(objects[1].type, CANVAS_OBJECT_TYPE.TEXT, 'second should be text');
      assert.strictEqual(objects[2].type, CANVAS_OBJECT_TYPE.IMAGE, 'third should be image');
      assert.strictEqual(objects[3].type, CANVAS_OBJECT_TYPE.SLIDE_NUMBER, 'fourth should be slide number');
    });

    it('filters by layer', () => {
      const canvas = new Canvas();

      // Add slide layer objects
      canvas.currentLayer = LAYER.SLIDE;
      canvas.addShape(SHAPE.RECT, { x: 0, y: 0, w: 1, h: 1 });
      canvas.addText([{ text: 'Slide text' }], { x: 1, y: 1, w: 2, h: 1 });

      // Add master layer objects
      canvas.currentLayer = LAYER.MASTER;
      canvas.addShape(SHAPE.LINE, { x: 0, y: 0, w: 10, h: 0 });
      canvas.addSlideNumber({ x: 0, y: 7, w: 1, h: 0.3 });

      const allObjects = canvas.getObjects();
      const slideObjects = canvas.getObjects(LAYER.SLIDE);
      const masterObjects = canvas.getObjects(LAYER.MASTER);

      assert.strictEqual(allObjects.length, 4, 'should have four total objects');
      assert.strictEqual(slideObjects.length, 2, 'should have two slide objects');
      assert.strictEqual(masterObjects.length, 2, 'should have two master objects');

      assert.strictEqual(slideObjects[0].type, CANVAS_OBJECT_TYPE.SHAPE, 'slide: first is shape');
      assert.strictEqual(slideObjects[1].type, CANVAS_OBJECT_TYPE.TEXT, 'slide: second is text');
      assert.strictEqual(masterObjects[0].type, CANVAS_OBJECT_TYPE.SHAPE, 'master: first is shape');
      assert.strictEqual(masterObjects[1].type, CANVAS_OBJECT_TYPE.SLIDE_NUMBER, 'master: second is slide number');
    });

    it('returns empty array when no objects match layer', () => {
      const canvas = new Canvas();
      canvas.currentLayer = LAYER.SLIDE;
      canvas.addShape(SHAPE.RECT, { x: 0, y: 0, w: 1, h: 1 });

      const masterObjects = canvas.getObjects(LAYER.MASTER);
      assert.strictEqual(masterObjects.length, 0, 'should have no master objects');
    });
  });

  describe('pure data collector', () => {
    it('has no side effects', () => {
      const canvas = new Canvas();
      const fragments: TextFragment[] = [{ text: 'Test' }];
      const textOptions: TextOptions = { x: 1, y: 1, w: 2, h: 1 };
      const shapeOptions: ShapeOptions = { x: 0, y: 0, w: 1, h: 1 };

      // Adding objects should only store data
      canvas.addText(fragments, textOptions);
      canvas.addShape(SHAPE.RECT, shapeOptions);

      // Original inputs should be unchanged
      assert.strictEqual(fragments[0].text, 'Test', 'fragments not mutated');
      assert.strictEqual(textOptions.x, 1, 'text options not mutated');
      assert.strictEqual(shapeOptions.x, 0, 'shape options not mutated');

      // Multiple getObjects calls return same data
      const objects1 = canvas.getObjects();
      const objects2 = canvas.getObjects();
      assert.strictEqual(objects1.length, objects2.length, 'consistent results');
      assert.strictEqual(objects1[0].type, objects2[0].type, 'consistent object types');
    });

    it('stores objects independently', () => {
      const canvas = new Canvas();

      canvas.addText([{ text: 'First' }], { x: 1, y: 1, w: 2, h: 1 });
      canvas.addText([{ text: 'Second' }], { x: 2, y: 2, w: 2, h: 1 });

      const objects = canvas.getObjects();
      assert.strictEqual(objects.length, 2, 'should have two objects');

      if (objects[0].type === CANVAS_OBJECT_TYPE.TEXT && objects[1].type === CANVAS_OBJECT_TYPE.TEXT) {
        assert.strictEqual(objects[0].content[0].text, 'First', 'first object unchanged');
        assert.strictEqual(objects[1].content[0].text, 'Second', 'second object unchanged');
      }
    });
  });
});
