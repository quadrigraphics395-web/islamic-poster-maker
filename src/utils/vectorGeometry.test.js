import test from "node:test";
import assert from "node:assert/strict";
import { applyBooleanGeometry, breakApartVector, convertPrimitiveToCurves, createBlendVectors, createBooleanVector, createCompoundVector, createVectorFromGeometry, deformVectorPaths, flattenVectorPath, offsetPolygonGeometry, pathToSvg, simplifyPolyline, splitGeometryByLine } from "./vectorGeometry.js";
import { exportCustomVectorsSvg } from "./vectorSvgExport.js";
import { parseProjectFile, serializeProjectFile } from "./projectFileManager.js";

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

test("Combine keeps selected closed contours as one editable nonzero compound path", () => {
  const combined = createCompoundVector([
    rectangle(0, 0, 10, 10),
    rectangle(5, 0, 15, 10),
  ], { color: "#123456", opacity: 70, strokeWidth: 2 });
  assert.equal(combined.shape, "custom");
  assert.equal(combined.paths.length, 2);
  assert.equal(combined.fillRule, "nonzero");
  assert.equal(combined.color, "#123456");
  assert.equal(combined.opacity, 70);
  assert.equal(combined.strokeWidth, 2);
  assert.match(pathToSvg(combined.paths), /M .* Z M /);
});

test("Break Apart returns disconnected editable components and keeps holes attached", () => {
  const geometry = [
    [rectangle(0, 0, 20, 20)[0][0], rectangle(5, 5, 15, 15)[0][0].slice().reverse()],
    rectangle(30, 0, 40, 10)[0],
  ];
  const parts = breakApartVector(geometry, { color: "#456789", opacity: 55, fillRule: "nonzero" });
  assert.equal(parts.length, 2);
  assert.equal(parts[0].paths.length, 2);
  assert.equal(parts[1].paths.length, 1);
  assert.equal(parts[0].paths[0].hole, false);
  assert.equal(parts[0].paths[1].hole, true);
  assert.equal(parts[0].color, "#456789");
  assert.equal(parts[0].opacity, 55);
  assert.throws(() => breakApartVector([rectangle(0, 0, 10, 10)]), /no separate components/);
});

test("closed geometry operations reject empty/open-path geometry without changing sources", () => {
  const openPathGeometry = [];
  assert.throws(() => applyBooleanGeometry("union", [rectangle(0, 0, 10, 10), openPathGeometry]), /closed vector shapes/);
  assert.throws(() => createCompoundVector([rectangle(0, 0, 10, 10), openPathGeometry]), /closed vector shapes/);
});

test("compound vectors survive QPM round trip and export as editable multi-contour SVG", () => {
  const compound = createCompoundVector([
    rectangle(0, 0, 20, 20),
    rectangle(10, 10, 30, 30),
  ], { canvasWidth: 100, canvasHeight: 100, fillRule: "nonzero" });
  compound.id = "compound-roundtrip";
  const reopened = parseProjectFile(serializeProjectFile({ objects: [compound] }));
  assert.deepEqual(reopened.objects[0].paths, compound.paths);
  assert.equal(reopened.objects[0].fillRule, "nonzero");
  const svg = exportCustomVectorsSvg(reopened.objects, { width: 100, height: 100 });
  assert.match(svg, /fill-rule="nonzero"/);
  assert.match(svg, /<path data-object-id="compound-roundtrip"[^>]+d="[^"]*M[^M]+M/);
});

test("rectangle, ellipse, and regular polygon convert to editable curve nodes", () => {
  const rectangleCurves = convertPrimitiveToCurves({ id: "rect", shape: "rectangle", x: 50, y: 50, width: 30, height: 20 });
  const ellipseCurves = convertPrimitiveToCurves({ id: "ellipse", shape: "ellipse", x: 50, y: 50, width: 30, height: 20 });
  const polygonCurves = convertPrimitiveToCurves({ id: "polygon", shape: "polygon", sides: 5, x: 50, y: 50, width: 30, height: 30 });
  assert.equal(rectangleCurves.paths[0].nodes.length, 4);
  assert.equal(ellipseCurves.paths[0].nodes.length, 4);
  assert.ok(ellipseCurves.paths[0].nodes.every((node) => node.in.x || node.in.y || node.out.x || node.out.y));
  assert.equal(polygonCurves.paths[0].nodes.length, 5);
  assert.equal(polygonCurves.convertedFrom, "polygon");
  assert.throws(() => convertPrimitiveToCurves({ shape: "star" }), /supports rectangle/);
  const reopened = parseProjectFile(serializeProjectFile({ objects: [rectangleCurves, ellipseCurves, polygonCurves] }));
  assert.deepEqual(reopened.objects.map((object) => object.paths), [rectangleCurves.paths, ellipseCurves.paths, polygonCurves.paths]);
});

test("contour offsets make editable outward and inward geometry and reject collapsed offsets", () => {
  const square = rectangle(0, 0, 100, 100);
  const outside = offsetPolygonGeometry(square, 10);
  const inside = offsetPolygonGeometry(square, -10);
  const area = (ring) => Math.abs(ring.slice(0, -1).reduce((sum, point, index) => {
    const next = ring[index + 1];
    return sum + point[0] * next[1] - next[0] * point[1];
  }, 0) / 2);
  assert.ok(Math.abs(area(outside[0][0]) - 14400) < 1e-6);
  assert.ok(Math.abs(area(inside[0][0]) - 6400) < 1e-6);
  assert.throws(() => offsetPolygonGeometry(square, -60), /collapses|reverses/);
  const band = createVectorFromGeometry(applyBooleanGeometry("difference", [outside, square]));
  assert.equal(band.type, "shape");
  assert.ok(band.paths.some((path) => path.hole));
});

test("knife split returns two editable pieces and rejects a non-crossing cut", () => {
  const source = rectangle(0, 0, 100, 100);
  const [left, right] = splitGeometryByLine(source, [50, -5], [50, 105], 100, 100);
  assert.equal(left.length, 1);
  assert.equal(right.length, 1);
  const leftPath = createVectorFromGeometry(left);
  const rightPath = createVectorFromGeometry(right);
  assert.equal(leftPath.paths[0].closed, true);
  assert.equal(rightPath.paths[0].closed, true);
  assert.throws(() => splitGeometryByLine(source, [150, 0], [150, 100], 100, 100), /must cross/);
});

test("blend interpolates matched paths and envelope deformation moves editable nodes and handles", () => {
  const from = { x: 20, y: 50, width: 30, height: 30, paths: [{ closed: true, nodes: [
    { x: 0, y: 0, in: { x: 0, y: 0 }, out: { x: 0, y: 0 } },
    { x: 100, y: 0, in: { x: 0, y: 0 }, out: { x: 0, y: 0 } },
    { x: 50, y: 100, in: { x: -8, y: 2 }, out: { x: 8, y: -2 } },
  ] }], color: "#000000", strokeColor: "#ff0000", rotation: 350, fillOpacity: 60, strokeOpacity: 20 };
  const to = { ...from, x: 80, color: "#ffffff", strokeColor: "#0000ff", rotation: 10, fillOpacity: 100, strokeOpacity: 80, paths: [{ ...from.paths[0], nodes: from.paths[0].nodes.map((node) => ({ ...node, y: node.y + 10 })) }] };
  const blends = createBlendVectors(from, to, 2);
  assert.equal(blends.length, 2);
  assert.equal(blends[0].x, 40);
  assert.equal(blends[1].x, 60);
  assert.equal(blends[0].color, "#555555");
  assert.equal(blends[0].strokeColor, "#aa0055");
  assert.equal(blends[0].rotation, 356.6666666666667);
  assert.ok(Math.abs(blends[0].fillOpacity - 73.3333333333) < 1e-8);
  assert.throws(() => createBlendVectors(from, { ...to, paths: [{ closed: true, nodes: [] }] }, 2), /matching node counts/);
  const deformed = deformVectorPaths(from.paths, [{ x: 0, y: 0 }, { x: 110, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }]);
  assert.equal(deformed[0].nodes[1].x, 110);
  assert.notDeepEqual(deformed[0].nodes[2].out, from.paths[0].nodes[2].out);
});
