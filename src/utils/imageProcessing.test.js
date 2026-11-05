import assert from "node:assert/strict";
import test from "node:test";
import { getWorkingImageDimensions } from "./imageProcessing.js";

test("keeps source dimensions when they fit the working budget", () => {
  assert.deepEqual(getWorkingImageDimensions(1800, 1200, 3_000_000), { width: 1800, height: 1200 });
});

test("scales large images into the budget while keeping their aspect ratio", () => {
  const result = getWorkingImageDimensions(12000, 8000, 2_000_000);
  assert.ok(result.width * result.height <= 2_000_000);
  assert.ok(Math.abs(result.width / result.height - 1.5) < 0.001);
});

test("rejects invalid dimensions and budgets", () => {
  assert.throws(() => getWorkingImageDimensions(0, 100, 1000), RangeError);
  assert.throws(() => getWorkingImageDimensions(100, 100, 0), RangeError);
});
