import test from "node:test";
import assert from "node:assert/strict";
import {
  CSS_PIXELS_PER_FOOT,
  CSS_PIXELS_PER_INCH,
  formatUnitValue,
  getJpegQuality,
  getPrintExportDimensions,
  getExportBackgroundMode,
  readProjectDocumentMeta,
  toCssPixels,
} from "./documentUnits.js";

test("unit conversions use the exact CSS pixel factors", () => {
  assert.equal(toCssPixels(1, "in"), 96);
  assert.equal(toCssPixels(1, "ft"), CSS_PIXELS_PER_FOOT);
  assert.equal(CSS_PIXELS_PER_INCH * 12, CSS_PIXELS_PER_FOOT);
  assert.equal(formatUnitValue(794, "px"), "794");
  assert.equal(formatUnitValue(794, "in"), "8.27");
  assert.equal(toCssPixels(1, "unknown"), null);
});

test("A4 CSS dimensions map to print dimensions at 300 DPI", () => {
  const result = getPrintExportDimensions(794, 1123, 300);
  assert.equal(result.width, 2481);
  assert.equal(result.height, 3509);
  assert.equal(result.wasLimited, false);
});

test("large print exports are bounded without changing their physical aspect ratio", () => {
  const result = getPrintExportDimensions(20_000, 10_000, 300, 1_000_000);
  assert.ok(result.width * result.height <= 1_000_000);
  assert.ok(Math.abs(result.width / result.height - 2) < 0.002);
  assert.equal(result.wasLimited, true);
});

test("very wide or tall documents stay below a safe browser canvas side limit", () => {
  const result = getPrintExportDimensions(50_000, 10, 300);
  assert.ok(result.width <= 16_384);
  assert.ok(result.height <= 16_384);
  assert.ok(result.width * result.height <= 18_000_000);
  assert.ok(Math.abs(result.width / result.height - 5_000) < 500);
  assert.equal(result.wasLimited, true);
});

test("JPG quality labels map to actual encoder values", () => {
  assert.equal(getJpegQuality("low"), 0.6);
  assert.equal(getJpegQuality("normal"), 0.8);
  assert.equal(getJpegQuality("high"), 0.95);
  assert.equal(getJpegQuality("unexpected"), 0.8);
});

test("transparent backgrounds stay transparent for PNG and become white for opaque formats", () => {
  assert.equal(getExportBackgroundMode("png", "transparent"), "transparent");
  assert.equal(getExportBackgroundMode("jpg", "transparent"), "white");
  assert.equal(getExportBackgroundMode("pdf", "transparent"), "white");
});

test("document unit metadata round-trips and old projects default safely", () => {
  const saved = JSON.parse(JSON.stringify({ documentMeta: { sizeUnit: "ft", printDpi: 600 } }));
  assert.deepEqual(readProjectDocumentMeta(saved), { sizeUnit: "ft", printDpi: 600 });
  assert.deepEqual(readProjectDocumentMeta({}), { sizeUnit: "px", printDpi: 300 });
  assert.deepEqual(readProjectDocumentMeta({ documentMeta: { sizeUnit: "mm", printDpi: 72 } }), { sizeUnit: "px", printDpi: 300 });
});
