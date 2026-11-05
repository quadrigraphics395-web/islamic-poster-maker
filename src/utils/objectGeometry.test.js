import assert from "node:assert/strict";
import test from "node:test";
import { resizeObjectFromCorner } from "./objectGeometry.js";

function resize(overrides = {}) {
  return resizeObjectFromCorner({
    corner: "bottom-right",
    anchorX: 100,
    anchorY: 100,
    startPointerX: 150,
    startPointerY: 140,
    pointerX: 200,
    pointerY: 180,
    startWidth: 100,
    startHeight: 80,
    propertyWidth: 100,
    propertyHeight: 80,
    ...overrides,
  });
}

function rotatePoint(x, y, degrees) {
  const radians = (degrees * Math.PI) / 180;
  return {
    x: x * Math.cos(radians) - y * Math.sin(radians),
    y: x * Math.sin(radians) + y * Math.cos(radians),
  };
}

test("free corner resizing changes width and height independently and keeps the opposite corner anchored", () => {
  const result = resize();

  assert.equal(result.width, 200);
  assert.equal(result.height, 160);
  assert.ok(Math.abs(result.centerX - result.width / 2 - 100) < 1e-8);
  assert.equal(result.centerY - result.height / 2, 100);
});

test("each corner resize keeps its opposite corner fixed", () => {
  const corners = {
    "top-left": { x: -1, y: -1 },
    "top-right": { x: 1, y: -1 },
    "bottom-left": { x: -1, y: 1 },
    "bottom-right": { x: 1, y: 1 },
  };
  for (const [corner, signs] of Object.entries(corners)) {
    const anchorX = 240;
    const anchorY = 180;
    const startCorner = rotatePoint(signs.x * 50, signs.y * 40, 28);
    const movement = rotatePoint(signs.x * 50, signs.y * 40, 28);
    const result = resizeObjectFromCorner({
      corner,
      rotation: 28,
      anchorX,
      anchorY,
      startPointerX: anchorX + startCorner.x,
      startPointerY: anchorY + startCorner.y,
      pointerX: anchorX + startCorner.x + movement.x,
      pointerY: anchorY + startCorner.y + movement.y,
      startWidth: 100,
      startHeight: 80,
      propertyWidth: 100,
      propertyHeight: 80,
    });
    const resizedCorner = rotatePoint(signs.x * result.width / 2, signs.y * result.height / 2, 28);
    assert.ok(Math.abs(result.centerX - resizedCorner.x - anchorX) < 1e-8);
    assert.ok(Math.abs(result.centerY - resizedCorner.y - anchorY) < 1e-8);
    assert.ok(Math.abs(result.width - 200) < 1e-8);
    assert.ok(Math.abs(result.height - 160) < 1e-8);
  }
});

test("aspect-locked corner resizing applies a single scale to circles and squares", () => {
  const result = resize({ lockAspectRatio: true, pointerX: 250, pointerY: 160 });

  assert.equal(result.scaleX, result.scaleY);
  assert.equal(result.width / result.height, 100 / 80);
  assert.ok(Math.abs(result.centerX - result.width / 2 - 100) < 1e-8);
});

test("rotation keeps the fixed corner anchored while resizing", () => {
  const result = resize({
    rotation: 90,
    anchorX: 100,
    anchorY: 100,
    startPointerX: 60,
    startPointerY: 150,
    pointerX: 60,
    pointerY: 200,
  });

  assert.equal(result.width, 200);
  assert.equal(result.height, 80);
  assert.ok(Math.abs(result.centerX - 60) < 1e-8);
  assert.ok(Math.abs(result.centerY - 200) < 1e-8);
});

test("dragging through the anchor clamps to a positive minimum size", () => {
  const result = resize({ pointerX: 100, pointerY: 100 });

  assert.equal(result.width, 8);
  assert.equal(result.height, 8);
});
