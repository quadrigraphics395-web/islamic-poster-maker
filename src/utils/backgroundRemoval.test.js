import assert from "node:assert/strict";
import test from "node:test";
import {
  combineColorSelections,
  createColorSelection,
  paintAlpha,
  removeSelectedPixels,
} from "./backgroundRemoval.js";

function makeImage(width, height, colorForPixel) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const [red, green, blue, alpha = 255] = colorForPixel(x, y);
      data.set([red, green, blue, alpha], offset);
    }
  }
  return data;
}

test("contiguous selection preserves disconnected pixels of the same color", async () => {
  const data = makeImage(5, 5, (x, y) => (
    (x === 0 || x === 4 || y === 0 || y === 4 || (x === 2 && y === 2))
      ? [255, 255, 255]
      : [20, 80, 40]
  ));
  const mask = await createColorSelection({ data, width: 5, height: 5, x: 0, y: 0, tolerance: 0 });

  assert.equal(mask[0], 1);
  assert.equal(mask[12], 0);
  assert.equal(mask.reduce((sum, value) => sum + value, 0), 16);
});

test("similar mode selects disconnected matching colors while contiguous mode does not", async () => {
  const data = makeImage(5, 5, (x, y) => (
    x === 0 || y === 0 || x === 4 || y === 4 || (x === 2 && y === 2)
      ? [255, 255, 255]
      : [20, 80, 40]
  ));
  const contiguous = await createColorSelection({ data, width: 5, height: 5, x: 0, y: 0, tolerance: 0 });
  const similar = await createColorSelection({ data, width: 5, height: 5, x: 0, y: 0, tolerance: 0, mode: "similar" });

  assert.equal(contiguous[12], 0);
  assert.equal(similar[12], 1);
  assert.equal(similar.reduce((sum, value) => sum + value, 0), 17);
});

test("tolerance includes nearby colors and ignores transparent pixels", async () => {
  const data = makeImage(3, 1, (x) => (
    x === 0 ? [240, 240, 240] : x === 1 ? [225, 225, 225] : [240, 240, 240, 0]
  ));
  const strict = await createColorSelection({ data, width: 3, height: 1, x: 0, y: 0, tolerance: 0 });
  const tolerant = await createColorSelection({ data, width: 3, height: 1, x: 0, y: 0, tolerance: 20 });

  assert.deepEqual([...strict], [1, 0, 0]);
  assert.deepEqual([...tolerant], [1, 1, 0]);
});

test("shift-style selections combine regions and deleting a mask sets alpha to zero", async () => {
  const data = makeImage(3, 1, (x) => x === 1 ? [20, 30, 40] : [240, 240, 240]);
  const mask = await combineColorSelections(data, 3, 1, [
    { x: 0, y: 0, mode: "contiguous" },
    { x: 1, y: 0, mode: "contiguous" },
  ], 0);

  assert.deepEqual([...mask], [1, 1, 0]);
  assert.equal(removeSelectedPixels(data, mask), true);
  assert.deepEqual([data[3], data[7], data[11]], [0, 0, 255]);
  assert.equal(removeSelectedPixels(data, mask), false);
});

test("erase and restore brush update alpha without changing source colors", () => {
  const original = makeImage(5, 5, () => [30, 60, 90]);
  const working = new Uint8ClampedArray(original);

  assert.equal(paintAlpha(working, original, 5, 5, 2, 2, 1.5, 1, false), true);
  assert.equal(working[(2 * 5 + 2) * 4 + 3], 0);
  assert.deepEqual([...working.slice((2 * 5 + 2) * 4, (2 * 5 + 2) * 4 + 3)], [30, 60, 90]);
  assert.equal(paintAlpha(working, original, 5, 5, 2, 2, 1.5, 1, true), true);
  assert.equal(working[(2 * 5 + 2) * 4 + 3], 255);
});

test("large connected selections yield to the browser while completing the mask", async () => {
  const width = 1024;
  const height = 1024;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < data.length; index += 4) {
    data[index] = 255;
    data[index + 1] = 255;
    data[index + 2] = 255;
    data[index + 3] = 255;
  }
  const before = Date.now();
  const mask = await createColorSelection({ data, width, height, x: 512, y: 512, tolerance: 0 });

  assert.equal(mask.length, width * height);
  assert.equal(mask.reduce((sum, value) => sum + value, 0), width * height);
  assert.ok(Date.now() - before < 5000);
});
