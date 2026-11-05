import assert from "node:assert/strict";
import test from "node:test";
import { imageMaskSvg, normalizeTransparencyMask, transparencyCss, transparencyOpacityAt } from "./transparency.js";

test("builds editable linear and radial alpha gradients", () => {
  const mask = { type: "linear", direction: "top-bottom", stops: [{ offset: 0, opacity: 0 }, { offset: 100, opacity: 100 }] };
  assert.match(transparencyCss(mask), /^linear-gradient\(to bottom,/);
  assert.equal(transparencyOpacityAt(mask, 50, 0), 0);
  assert.equal(transparencyOpacityAt(mask, 50, 100), 100);
  assert.match(transparencyCss({ ...mask, type: "radial", centerX: 35, centerY: 65, radius: 80 }), /^radial-gradient\(ellipse 80% 80% at 35% 65%,/);
});

test("supports multiple opacity stops and hard transitions", () => {
  const mask = normalizeTransparencyMask({
    type: "linear",
    direction: "right-left",
    hard: true,
    stops: [{ id: "c", offset: 100, opacity: 100 }, { id: "a", offset: 0, opacity: 0 }, { id: "b", offset: 50, opacity: 30 }],
  });
  assert.deepEqual(mask.stops.map((stop) => stop.offset), [0, 50, 100]);
  assert.equal(transparencyOpacityAt(mask, 75, 50), 0);
  assert.equal(transparencyOpacityAt(mask, 25, 50), 30);
  assert.match(transparencyCss(mask), /49\.9%/);
});

test("evaluates radial stops and diagonal directions", () => {
  const mask = {
    type: "radial",
    centerX: 50,
    centerY: 50,
    radius: 50,
    stops: [{ offset: 0, opacity: 100 }, { offset: 100, opacity: 0 }],
  };
  assert.equal(transparencyOpacityAt(mask, 50, 50), 100);
  assert.equal(transparencyOpacityAt(mask, 100, 50), 0);
  assert.match(transparencyCss({ ...mask, type: "linear", direction: "top-right-bottom-left" }), /^linear-gradient\(to bottom left,/);
});

test("serializes vector alpha masks without modifying the source image", () => {
  const url = imageMaskSvg({
    paths: [{ closed: true, nodes: [{ x: 10, y: 10 }, { x: 90, y: 10 }, { x: 50, y: 90 }] }],
  });
  assert.match(url, /^url\("data:image\/svg\+xml,/);
  assert.match(decodeURIComponent(url), /fill-rule%3Devenodd|fill-rule="evenodd"/);
  assert.match(imageMaskSvg({
    inverted: true,
    paths: [{ closed: true, nodes: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: 100 }] }],
  }), /data:image\/svg\+xml/);
});
