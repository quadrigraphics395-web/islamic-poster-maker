import test from "node:test";
import assert from "node:assert/strict";
import { importSvgDocument } from "./svgImport.js";
import { restoreObjectSnapshot, serializeObjectSnapshot } from "./objectHistory.js";

let nextId = 0;
const parse = (markup, dimensions = { width: 1080, height: 1080 }) => importSvgDocument(markup, { ...dimensions, createId: () => `import-${++nextId}` });
const shapes = (result) => result.objects.flatMap((object) => object.type === "group" ? object.children : [object]);

test("unconverted SVG text remains native, editable text with typography", () => {
  const result = parse('<svg viewBox="0 0 200 100"><text x="100" y="50" text-anchor="middle" font-family="Noto Nastaliq Urdu" font-size="24" fill="#174" stroke="#321" stroke-width="2" letter-spacing="1.5" word-spacing="3" direction="rtl">خوبصورت پوسٹر</text></svg>');
  const [text] = shapes(result);
  assert.equal(text.type, "text");
  assert.equal(text.text, "خوبصورت پوسٹر");
  assert.equal(text.fontFamily, "Noto Nastaliq Urdu");
  assert.equal(text.direction, "rtl");
  assert.equal(text.align, "center");
  assert.equal(text.color, "#174");
  assert.equal(text.strokeEnabled, true);
  assert.equal(text.strokeColor, "#321");
  assert.ok(Math.abs(text.letterSpacing - 1.5 * text.fontSize / 24) < 1e-10);
  assert.ok(Math.abs(text.wordSpacing - 3 * text.fontSize / 24) < 1e-10);
});

test("nested text and tspan content keeps its original reading order", () => {
  const [text] = shapes(parse('<svg viewBox="0 0 100 100"><text x="10" y="20">First <tspan>second</tspan> third</text></svg>'));
  assert.equal(text.text, "First second third");
});

test("physical SVG units are converted to CSS pixel proportions", () => {
  const [text] = shapes(parse('<svg width="25.4mm" height="25.4mm"><text x="5" y="15" font-size="12pt">Text</text></svg>', { width: 254, height: 254 }));
  assert.ok(Math.abs(text.fontSize - 30.48) < 1e-9);
});

test("Arabic and mixed RTL text retain their content and direction", () => {
  const [text] = shapes(parse('<svg viewBox="0 0 100 100"><text x="5" y="30">سلام World</text></svg>'));
  assert.equal(text.type, "text");
  assert.equal(text.text, "سلام World");
  assert.equal(text.direction, "rtl");
});

test("converted lettering path remains an editable vector and never becomes text", () => {
  const [path] = shapes(parse('<svg viewBox="0 0 100 100"><path d="M10 10 L80 10 L80 80 Z" fill="#aabbcc"/></svg>'));
  assert.equal(path.type, "shape");
  assert.equal(path.shape, "custom");
  assert.equal(path.svgPathData, "M10 10 L80 10 L80 80 Z");
  assert.equal(path.color, "#aabbcc");
  assert.equal(path.type === "text", false);
});

test("basic SVG rectangles, circles, ellipses, lines, polylines and polygons become vector paths", () => {
  const result = parse('<svg viewBox="0 0 100 100"><rect x="2" y="3" width="10" height="12"/><circle cx="30" cy="30" r="8"/><ellipse cx="55" cy="25" rx="8" ry="4"/><line x1="1" y1="1" x2="9" y2="9"/><polyline points="1,2 4,5 7,8"/><polygon points="10,10 20,10 15,20"/></svg>');
  assert.equal(shapes(result).length, 6);
  assert.ok(shapes(result).every((object) => object.type === "shape" && object.shape === "custom"));
});

test("elements preserve order and grouped designs can be ungrouped as separate objects", () => {
  const [group] = parse('<svg viewBox="0 0 100 100"><g><rect x="0" y="0" width="10" height="10"/><text x="20" y="20">A</text><path d="M30 30 L40 40"/></g></svg>').objects;
  assert.equal(group.type, "group");
  assert.deepEqual(group.children.map((object) => object.type), ["shape", "text", "shape"]);
  assert.ok(group.children.every((object) => object.x >= 0 && object.x <= 100 && object.y >= 0 && object.y <= 100));
});

test("viewBox offsets, dimensions and common transforms are reflected in editable geometry", () => {
  const result = parse('<svg width="200" height="100" viewBox="10 20 200 100"><g transform="translate(10 5)"><rect x="20" y="30" width="40" height="20"/></g></svg>', { width: 800, height: 600 });
  const [shape] = shapes(result);
  assert.deepEqual(result.viewBox, [10, 20, 200, 100]);
  assert.ok(shape.x > 0 && shape.x < 100 && shape.y > 0 && shape.y < 100);
  assert.deepEqual(shape.svgTransform, [1, 0, 0, 1, 0, -15]);
  assert.ok(shape.width > 0 && shape.height > 0);
});

test("relative path commands retain their original path data and obtain usable bounds", () => {
  const [shape] = shapes(parse('<svg viewBox="0 0 100 100"><path d="M20 30 l40 0 v50 z"/></svg>'));
  assert.equal(shape.svgPathData, "M20 30 l40 0 v50 z");
  assert.ok(shape.width > 0 && shape.height > 0);
  assert.deepEqual(shape.svgViewBox, [20, 30, 40, 50]);
});

test("fill, stroke, opacity and stroke geometry properties are retained", () => {
  const [shape] = shapes(parse('<svg viewBox="0 0 100 100"><path d="M10 10 L90 90" fill="none" stroke="#123456" stroke-width="4" stroke-opacity="0.4" stroke-linecap="round" opacity="0.5"/></svg>'));
  assert.equal(shape.fillEnabled, false);
  assert.equal(shape.strokeEnabled, true);
  assert.equal(shape.strokeColor, "#123456");
  assert.equal(shape.strokeWidth, 4);
  assert.equal(shape.strokeOpacity, 0.4);
  assert.equal(shape.strokeLineCap, "round");
  assert.equal(shape.opacity, 50);
});

test("XML declarations, script content and external image URLs are safely rejected or removed", () => {
  assert.throws(() => parse('<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///secret">]><svg/>'), /declarations/);
  const result = parse('<svg viewBox="0 0 10 10"><script>alert(1)</script><image href="https://example.com/x.png" x="0" y="0" width="10" height="10"/><rect x="1" y="1" width="2" height="2"/></svg>');
  assert.equal(shapes(result).length, 1);
  assert.ok(result.warnings.some((warning) => warning.includes("unsafe")));
  assert.ok(result.warnings.some((warning) => warning.includes("external URL")));
  const eventAttributeResult = parse('<svg viewBox="0 0 10 10"><rect onload="alert(1)" width="4" height="4"/></svg>');
  assert.equal(shapes(eventAttributeResult).length, 1);
  assert.equal(JSON.stringify(eventAttributeResult).includes("onload"), false);
});

test("unsupported effects are reported while editable objects are retained", () => {
  const result = parse('<svg viewBox="0 0 100 100"><defs><linearGradient id="g"/></defs><rect x="2" y="2" width="50" height="50" fill="url(#g)"/><foreignObject/></svg>');
  assert.equal(shapes(result).length, 1);
  assert.ok(result.warnings.some((warning) => warning.includes("gradients")));
  assert.ok(result.warnings.some((warning) => warning.includes("foreignobject")));
});

test("imported group and child data survive project JSON and undo snapshots", () => {
  const imported = parse('<svg viewBox="0 0 100 100"><rect x="1" y="1" width="20" height="20"/><path d="M50 50 L80 80"/></svg>').objects;
  const project = JSON.parse(JSON.stringify({ version: 2, objects: imported }));
  assert.deepEqual(project.objects, imported);
  assert.equal(typeof project.objects[0].svgSource, "string");
  assert.deepEqual(restoreObjectSnapshot(serializeObjectSnapshot(imported)), imported);
});

test("unsupported or malformed SVG content fails without returning partial replacement data", () => {
  assert.throws(() => parse('<html><p>not svg</p></html>'), /valid SVG/);
  assert.throws(() => parse('<svg><path d="M1 1"></svg>'), /malformed|incomplete/);
  assert.throws(() => parse('<svg><filter/></svg>'), /No supported editable objects/);
});
