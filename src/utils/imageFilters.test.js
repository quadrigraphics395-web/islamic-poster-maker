import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_IMAGE_FILTERS, IMAGE_FILTER_PRESETS, imageFiltersToCss, normalizeImageFilters } from "./imageFilters.js";
import { restoreObjectSnapshot, serializeObjectSnapshot } from "./objectHistory.js";

test("image filter normalization preserves supported values and fills missing defaults", () => {
  assert.deepEqual(normalizeImageFilters({ brightness: 125, hue: -20 }), {
    ...DEFAULT_IMAGE_FILTERS, brightness: 125, hue: -20,
  });
  assert.equal(normalizeImageFilters({ contrast: "bad" }).contrast, 100);
});

test("presets apply distinct filter metadata and Original resets all adjustments", () => {
  assert.deepEqual(IMAGE_FILTER_PRESETS.Original, DEFAULT_IMAGE_FILTERS);
  assert.equal(IMAGE_FILTER_PRESETS["Black & White"].grayscale, 100);
  assert.equal(IMAGE_FILTER_PRESETS.Warm.warmth, 24);
  assert.notDeepEqual(IMAGE_FILTER_PRESETS["High Contrast"], DEFAULT_IMAGE_FILTERS);
});

test("CSS filter conversion includes exposure, warmth, hue, blur and color effects", () => {
  const css = imageFiltersToCss({ exposure: 1, warmth: 10, hue: 5, blur: 2, grayscale: 30, sepia: 10 });
  assert.match(css, /brightness\(200%\)/);
  assert.match(css, /hue-rotate\(6\.2deg\)/);
  assert.match(css, /blur\(2px\)/);
  assert.match(css, /grayscale\(30%\).*sepia\(10%\)/);
});

test("filter metadata survives project-style JSON and undo snapshots", () => {
  const objects = [{ id: "image-1", type: "image", src: "data:image/png;base64,AA==", crop: { x: 0.1, y: 0.2, width: 0.6, height: 0.5 }, imageFilters: { ...IMAGE_FILTER_PRESETS.Vintage } }];
  const snapshot = serializeObjectSnapshot(objects);
  const restored = restoreObjectSnapshot(snapshot);
  assert.deepEqual(restored, objects);
  assert.deepEqual(JSON.parse(JSON.stringify(restored)), objects);
});
