import assert from "node:assert/strict";
import test from "node:test";
import { canvasPointToClient, clientPointToCanvas } from "./canvasCoordinates.js";

test("pointer conversion returns canvas layout coordinates at normal and expanded zoom", () => {
  const rect = { left: 180, top: 90 };
  for (const zoom of [0.5, 1, 3, 6.4]) {
    const screen = { x: rect.left + 244 * zoom, y: rect.top + 137 * zoom };
    assert.deepEqual(clientPointToCanvas(screen.x, screen.y, rect, zoom), { x: 244, y: 137 });
    assert.deepEqual(canvasPointToClient(244, 137, rect, zoom), screen);
  }
});

test("coordinate conversion handles canvas pan and rejects invalid scales", () => {
  const rect = { left: -73, top: 214 };
  assert.deepEqual(clientPointToCanvas(167, 514, rect, 2), { x: 120, y: 150 });
  assert.deepEqual(canvasPointToClient(120, 150, rect, 2), { x: 167, y: 514 });
  assert.equal(clientPointToCanvas(0, 0, rect, 0), null);
  assert.equal(canvasPointToClient(0, 0, rect, Number.NaN), null);
});
