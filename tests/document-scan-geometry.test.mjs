import assert from 'node:assert/strict';
import test from 'node:test';
import {cropResolution, detectPage, flattenPage, fullPage, validCrop} from '../src/lib/documentScanGeometry.ts';

function image(width, height, color) {
 const data = new Uint8ClampedArray(width * height * 4);
 for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) data.set(color(x, y), (y * width + x) * 4);
 }
 return {width, height, data};
}

test('suggests all four corners of a tilted page and leaves weak edges for manual adjustment', () => {
 const corners = [{x: 0.21, y: 0.12}, {x: 0.78, y: 0.20}, {x: 0.86, y: 0.86}, {x: 0.11, y: 0.80}];
 const brightPage = image(100, 100, (x, y) => {
  const inside = corners.every((a, index) => {
   const b = corners[(index + 1) % 4];
   return (b.x - a.x) * (y / 100 - a.y) - (b.y - a.y) * (x / 100 - a.x) >= 0;
  });
  return inside ? [233, 229, 217, 255] : [32, 48, 64, 255];
 });
 const detected = detectPage(brightPage);
 assert.ok(detected);
 detected.forEach((point, i) => assert.ok(Math.hypot(point.x - corners[i].x, point.y - corners[i].y) < 0.022));
 assert.equal(detectPage(image(100, 100, () => [221, 221, 221, 255])), null);
});

test('keeps corner order and rejects crossed or nearly collapsed frames', () => {
 assert.equal(validCrop(fullPage), true);
 assert.equal(validCrop([fullPage[0], fullPage[2], fullPage[1], fullPage[3]]), false);
 assert.equal(validCrop([{x: .42, y: .43}, {x: .50, y: .43}, {x: .50, y: .50}, {x: .42, y: .50}]), false);
});

test('rectifies perspective and respects the JPEG dimension limit without upscaling', () => {
 const corners = [{x: .25, y: .25}, {x: .75, y: .25}, {x: .9, y: .75}, {x: .1, y: .75}];
 const source = image(100, 100, (x, y) => [x, y, 0, 255]);
 const target = image(41, 27, () => [0, 0, 0, 0]);
 flattenPage(source, target, corners);
 assert.deepEqual([...target.data.slice(0, 4)], [25, 25, 0, 255]);
 const last = target.data.slice(-4);
 assert.ok(last[0] >= 87 && last[0] <= 89);
 const center = (13 * 41 + 20) * 4;
 assert.deepEqual([...target.data.slice(center, center + 4)], [50, 44, 0, 255]);
 assert.ok(last[1] >= 72 && last[1] <= 75);
 assert.equal(last[3], 255);
 assert.deepEqual(cropResolution(fullPage, 3200, 2400), {width: 2400, height: 1800});
 assert.deepEqual(cropResolution(fullPage, 1200, 800), {width: 1200, height: 800});
});
