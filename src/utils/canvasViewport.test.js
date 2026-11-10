import test from "node:test";
import assert from "node:assert/strict";
import { fitCanvasToViewport, mobilePropertiesWidth } from "./canvasViewport.js";

test("A4 portrait keeps its physical aspect ratio when fitted to a narrow mobile workspace", () => {
  const fitted = fitCanvasToViewport(794, 1123, 220, 320);
  assert.ok(Math.abs(fitted.width / fitted.height - 794 / 1123) < 1e-12);
  assert.ok(fitted.width <= 220);
  assert.ok(fitted.height <= 320);
});

test("A4 landscape keeps its aspect ratio and fits both workspace dimensions", () => {
  const fitted = fitCanvasToViewport(1123, 794, 300, 180);
  assert.ok(Math.abs(fitted.width / fitted.height - 1123 / 794) < 1e-12);
  assert.ok(fitted.width <= 300);
  assert.ok(fitted.height <= 180);
});

test("custom pixel, inch, and feet document dimensions use the same uniform fit", () => {
  const pixels = fitCanvasToViewport(1600, 900, 320, 400);
  const inches = fitCanvasToViewport(8.5 * 96, 11 * 96, 320, 400);
  const feet = fitCanvasToViewport(2 * 12 * 96, 3 * 12 * 96, 320, 400);
  for (const fitted of [pixels, inches, feet]) {
    assert.ok(fitted.width <= 320);
    assert.ok(fitted.height <= 400);
  }
  assert.ok(Math.abs(pixels.width / pixels.height - 16 / 9) < 1e-12);
  assert.ok(Math.abs(inches.width / inches.height - 8.5 / 11) < 1e-12);
  assert.ok(Math.abs(feet.width / feet.height - 2 / 3) < 1e-12);
});

test("zoom scales width and height uniformly without changing document ratio", () => {
  const fit = fitCanvasToViewport(794, 1123, 220, 320);
  const zoomed = fitCanvasToViewport(794, 1123, 220, 320, 1.7);
  assert.ok(Math.abs(zoomed.width / zoomed.height - 794 / 1123) < 1e-12);
  assert.ok(Math.abs(zoomed.width / fit.width - 1.7) < 1e-12);
  assert.ok(Math.abs(zoomed.height / fit.height - 1.7) < 1e-12);
});

test("mobile properties column stays near one quarter of 360, 390, and 430 pixel viewports", () => {
  assert.ok(Math.abs(mobilePropertiesWidth(360) - 86.4) < 1e-9);
  assert.ok(Math.abs(mobilePropertiesWidth(390) - 93.6) < 1e-9);
  assert.ok(Math.abs(mobilePropertiesWidth(430) - 103.2) < 1e-9);
  assert.equal(mobilePropertiesWidth(240), 80);
  assert.equal(mobilePropertiesWidth(600), 108);
});

test("invalid or zero viewport values return an empty fit", () => {
  assert.deepEqual(fitCanvasToViewport(794, 1123, 0, 300), { width: 0, height: 0, scale: 0 });
  assert.deepEqual(fitCanvasToViewport(794, 1123, 200, 300, 0), { width: 0, height: 0, scale: 0 });
});
