import test from "node:test";
import assert from "node:assert/strict";
import { removeObjectsById, transformEffectOffset } from "./objectOperations.js";

test("delete removes only the selected text, image, or shape object", () => {
  for (const selected of [
    { id: "text", type: "text", text: "Keep my text data" },
    { id: "image", type: "image", src: "data:image/png;base64,source" },
    { id: "shape", type: "shape", shape: "circle", color: "#123456" },
  ]) {
    const objects = [selected, { id: "other", type: "shape", shape: "square" }];
    assert.deepEqual(removeObjectsById(objects, new Set([selected.id])), [objects[1]]);
  }
});

test("delete ignores empty selection and can be undone and redone from object snapshots", () => {
  const objects = [
    { id: "image", type: "image", src: "data:image/png;base64,source", imageInnerShadowEnabled: true, imageInnerShadowBlur: 8 },
    { id: "shape", type: "shape", shape: "circle" },
  ];
  assert.deepEqual(removeObjectsById(objects, new Set()), objects);
  const beforeDelete = JSON.stringify(objects);
  const deleted = removeObjectsById(objects, new Set(["image"]));
  const undo = JSON.parse(beforeDelete);
  const redo = removeObjectsById(undo, new Set(["image"]));
  assert.deepEqual(undo[0], objects[0]);
  assert.deepEqual(redo, deleted);
});

test("delete can target a child while preserving its parent group", () => {
  const objects = [{ id: "group", type: "group", children: [{ id: "text", type: "text" }, { id: "image", type: "image" }] }];
  assert.deepEqual(removeObjectsById(objects, new Set(["text"])), [{ id: "group", type: "group", children: [{ id: "image", type: "image" }] }]);
});

test("text and image effects round-trip with fonts, spacing, and object properties", () => {
  const projectObjects = [
    { id: "text", type: "text", fontFamily: '"Noto Naskh Arabic"', fontWeight: 700, wordSpacing: 8, letterSpacing: 1.5, lineHeight: 1.4, strokeEnabled: true, shadowEnabled: true, innerShadowEnabled: true, innerShadowBlur: 9 },
    { id: "image", type: "image", src: "data:image/png;base64,source", imageOutlineEnabled: true, imageOutlineWidth: 4, imageShadowEnabled: true, imageInnerShadowEnabled: true, imageInnerShadowOffsetY: 5 },
  ];
  const reopened = JSON.parse(JSON.stringify({ objects: projectObjects })).objects;
  assert.deepEqual(reopened, projectObjects);
});

test("image effect offsets follow rotation and flips", () => {
  const rotated = transformEffectOffset({ rotation: 90 }, 4, 0);
  assert.ok(Math.abs(rotated.x) < 1e-10);
  assert.ok(Math.abs(rotated.y - 4) < 1e-10);
  assert.deepEqual(transformEffectOffset({ flipHorizontal: true }, 4, 3), { x: -4, y: 3 });
});
