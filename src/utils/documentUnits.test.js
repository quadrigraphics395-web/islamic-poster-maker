import test from "node:test";
import assert from "node:assert/strict";
import {
  CSS_PIXELS_PER_FOOT,
  CSS_PIXELS_PER_INCH,
  createRulerTicks,
  formatUnitValue,
  fromCssPixels,
  getJpegQuality,
  getPrintExportDimensions,
  getExportBackgroundMode,
  readProjectDocumentMeta,
  toCssPixels,
} from "./documentUnits.js";

test("unit conversions use the exact CSS pixel factors", () => {
  assert.equal(toCssPixels(1, "in"), 96);
  assert.equal(toCssPixels(1, "ft"), CSS_PIXELS_PER_FOOT);
  assert.equal(toCssPixels(25.4, "mm"), 96);
  assert.equal(toCssPixels(2.54, "cm"), 96);
  assert.equal(CSS_PIXELS_PER_INCH * 12, CSS_PIXELS_PER_FOOT);
  assert.equal(formatUnitValue(794, "px"), "794");
  assert.equal(formatUnitValue(794, "in"), "8.2708");
  assert.equal(formatUnitValue(210 / 25.4 * 96, "mm"), "210");
  assert.equal(formatUnitValue(297 / 25.4 * 96, "mm"), "297");
  assert.equal(toCssPixels(1, "unknown"), null);
});

test("measurement display precision round-trips dimensions without accumulating conversion drift", () => {
  const originalCssPixels = 1234.56789;
  for (const unit of ["mm", "cm", "in", "ft"]) {
    const displayed = formatUnitValue(originalCssPixels, unit);
    const convertedBack = toCssPixels(displayed, unit);
    assert.ok(Math.abs(convertedBack - originalCssPixels) < 0.02, `${unit} conversion drifted by ${convertedBack - originalCssPixels}px`);
    assert.equal(formatUnitValue(originalCssPixels, unit), displayed);
  }
  assert.ok(Math.abs(fromCssPixels(toCssPixels("210", "mm"), "mm") - 210) < 1e-12);
});

test("page ruler ticks use the selected measurement unit and include both page edges", () => {
  const ticks = createRulerTicks((210 / 25.4) * 96, "mm");
  assert.equal(ticks[0].label, "0");
  assert.equal(ticks.at(-1).label, "210");
  assert.equal(ticks.at(-1).position, 100);
  assert.ok(ticks.length <= 12);
  assert.equal(createRulerTicks(0, "cm").length, 0);
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
  assert.deepEqual(readProjectDocumentMeta({ documentMeta: { sizeUnit: "mm", printDpi: 300 } }), { sizeUnit: "mm", printDpi: 300 });
  assert.deepEqual(readProjectDocumentMeta({ documentMeta: { sizeUnit: "cm", printDpi: 300 } }), { sizeUnit: "cm", printDpi: 300 });
  assert.deepEqual(readProjectDocumentMeta({}), { sizeUnit: "px", printDpi: 300 });
  assert.deepEqual(readProjectDocumentMeta({ documentMeta: { sizeUnit: "yards", printDpi: 72 } }), { sizeUnit: "px", printDpi: 300 });
});
