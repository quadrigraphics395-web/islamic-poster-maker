import test from "node:test";
import assert from "node:assert/strict";
import { createBooleanVector, flattenVectorPath, pathToSvg, simplifyPolyline } from "./vectorGeometry.js";

const rectangle = (left, top, right, bottom) => [[[
  [left, top], [right, top], [right, bottom], [left, bottom], [left, top],
]]];

test("simplifies a dense near-straight freehand trace without moving endpoints", () => {
  const points = Array.from({ length: 101 }, (_, index) => ({ x: index, y: Math.sin(index) * 0.05 }));
  const simplified = simplifyPolyline(points, 0.2);
  assert.equal(simplified.length, 2);
  assert.deepEqual(simplified[0], points[0]);
  assert.deepEqual(simplified.at(-1), points.at(-1));
});

test("preserves Bezier control nodes when simplifying collinear anchors", () => {
  const points = [
    { x: 0, y: 0 },
    { x: 5, y: 0, type: "smooth", out: { x: 0, y: 8 } },
    { x: 10, y: 0, in: { x: 0, y: 8 } },
  ];
  const simplified = simplifyPolyline(points, 0.35);
  assert.equal(simplified.length, 3);
  assert.deepEqual(simplified[1], points[1]);
});

test("creates editable weld, trim, and intersect paths", () => {
  const left = rectangle(0, 0, 10, 10);
  const right = rectangle(5, 0, 15, 10);
  const weld = createBooleanVector("union", [left, right]);
  const trim = createBooleanVector("difference", [left, right]);
  const intersect = createBooleanVector("intersection", [left, right]);
  assert.equal(weld.paths.length, 1);
  assert.equal(trim.paths.length, 1);
  assert.equal(intersect.paths.length, 1);
  assert.equal(weld.width, 15);
  assert.equal(trim.width, 5);
  assert.equal(intersect.width, 5);
  assert.match(pathToSvg(weld.paths), /^M /);
  assert.equal(weld.paths[0].nodes[0].type, "corner");
});

test("supports multi-shape intersections and rejects empty results", () => {
  const result = createBooleanVector("intersection", [
    rectangle(0, 0, 10, 10),
    rectangle(2, 2, 8, 8),
    rectangle(4, 4, 12, 12),
  ]);
  assert.equal(result.width, 4);
  assert.equal(result.height, 4);
  assert.throws(() => createBooleanVector("intersection", [rectangle(0, 0, 1, 1), rectangle(2, 2, 3, 3)]), /non-empty/);
});

test("flattens closed Bezier contours to polygon points", () => {
  const flattened = flattenVectorPath([{
    closed: true,
    nodes: [
      { x: 0, y: 0, out: { x: 0, y: 10 } },
      { x: 100, y: 0, in: { x: 0, y: 10 } },
      { x: 100, y: 100 },
    ],
  }], 8);
  assert.equal(flattened.length, 1);
  assert.equal(flattened[0].length, 10);
});

test("keeps Boolean holes as editable contours", () => {
  const result = createBooleanVector("difference", [rectangle(0, 0, 20, 20), rectangle(5, 5, 15, 15)]);
  assert.equal(result.paths.length, 2);
  assert.equal(result.paths.filter((path) => path.hole).length, 1);
  assert.equal(result.fillRule, "evenodd");
});
