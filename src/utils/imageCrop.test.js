import test from "node:test";
import assert from "node:assert/strict";
import { cropRectToSource, getCroppedImageAspectRatio, moveCropRect, resizeCropRect } from "./imageCrop.js";

test("normalized crop coordinates map to source image pixels", () => {
  assert.deepEqual(cropRectToSource({ x: 0.25, y: 0.1, width: 0.5, height: 0.6 }, 800, 400), {
    x: 200, y: 40, width: 400, height: 240,
  });
});

test("crop data survives project object save/load JSON without changing original source metadata", () => {
  const image = {
    id: "image-1", type: "image", src: "data:image/png;base64,AA==", width: 30, height: 20,
    rotation: 22, flipHorizontal: true, naturalWidth: 800, naturalHeight: 600,
    crop: { x: 0.12, y: 0.18, width: 0.7, height: 0.6 },
  };
  const restored = JSON.parse(JSON.stringify([image]))[0];
  assert.deepEqual(restored, image);
});

test("crop ratio follows the selected region, regardless of the source ratio", () => {
  assert.equal(getCroppedImageAspectRatio({ x: 0.25, y: 0, width: 0.5, height: 1 }, 800, 400), 1);
});

test("crop selection can move and remains inside image bounds", () => {
  assert.deepEqual(moveCropRect({ x: 0.2, y: 0.3, width: 0.5, height: 0.4 }, 0.8, -0.8), {
    x: 0.5, y: 0, width: 0.5, height: 0.4,
  });
});

test("all eight crop handles resize and clamp the selection", () => {
  const original = { x: 0.25, y: 0.25, width: 0.5, height: 0.5 };
  for (const handle of ["top-left", "top", "top-right", "right", "bottom-right", "bottom", "bottom-left", "left"]) {
    const result = resizeCropRect(original, handle, 0.1, 0.1);
    assert.ok(result.width > 0 && result.height > 0, handle);
    assert.ok(result.x >= 0 && result.y >= 0, handle);
    assert.ok(result.x + result.width <= 1.000001 && result.y + result.height <= 1.000001, handle);
  }
});
