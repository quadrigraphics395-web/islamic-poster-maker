import test from "node:test";
import assert from "node:assert/strict";
import { interpolateHexColor, normalizeHexColor, QADRI_COLOR_PALETTE } from "./colorPalette.js";

test("palette provides named core colors and useful tones", () => {
  for (const name of ["White", "Black", "Red", "Green", "Blue", "Yellow", "Orange", "Purple", "Pink", "Cyan", "Grey"]) {
    assert.ok(QADRI_COLOR_PALETTE.some((color) => color.name === name), `${name} swatch exists`);
  }
  assert.ok(QADRI_COLOR_PALETTE.length >= 30);
});

test("normalizes three and six digit hexadecimal colors", () => {
  assert.equal(normalizeHexColor("#ABC"), "#aabbcc");
  assert.equal(normalizeHexColor("112233"), "#112233");
  assert.equal(normalizeHexColor("not-a-color"), null);
});

test("interpolates blend colors in RGB and clamps the mix amount", () => {
  assert.equal(interpolateHexColor("#000000", "#ffffff", 0.5), "#808080");
  assert.equal(interpolateHexColor("#ff0000", "#0000ff", 0.25), "#bf0040");
  assert.equal(interpolateHexColor("#123456", "#ffffff", 2), "#ffffff");
});
