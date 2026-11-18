import test from "node:test";
import assert from "node:assert/strict";
import { exportCustomVectorsSvg } from "./vectorSvgExport.js";
import { parseProjectFile, serializeProjectFile } from "./projectFileManager.js";

test("SVG export retains editable path geometry, cubic handles, and vector styling", () => {
  const svg = exportCustomVectorsSvg([{
    id: "vector-1",
    type: "shape",
    shape: "custom",
    x: 45,
    y: 60,
    width: 30,
    height: 20,
    color: "#123456",
    strokeColor: "#abcdef",
    strokeWidth: 2,
    strokeEnabled: true,
    opacity: 75,
    paths: [{ closed: false, nodes: [
      { x: 0, y: 10, type: "smooth", out: { x: 4, y: 8 } },
      { x: 10, y: 20, type: "smooth", in: { x: -4, y: 2 } },
    ] }],
  }], { width: 1200, height: 1800 });

  assert.match(svg, /<svg[^>]+width="1200" height="1800"/);
  assert.match(svg, /<path data-object-id="vector-1"/);
  assert.match(svg, / C 4 18 6 22 10 20/);
  assert.match(svg, /fill="#123456"/);
  assert.match(svg, /stroke="#abcdef"/);
  assert.match(svg, /opacity="0\.75"/);
});

test("SVG export skips non-vector objects and safely escapes identifiers", () => {
  const svg = exportCustomVectorsSvg([
    { id: "text-1", type: "text", text: "not flattened" },
    { id: 'v&"1', type: "shape", shape: "custom", paths: [{ closed: true, nodes: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: 100 }] }] },
  ]);
  assert.equal((svg.match(/<path /g) ?? []).length, 1);
  assert.match(svg, /data-object-id="v&amp;&quot;1"/);
  assert.match(svg, / Z/);
});

test("project file save and reopen preserves editable path nodes and handles", () => {
  const project = { objects: [{
    id: "vector-roundtrip",
    type: "shape",
    shape: "custom",
    paths: [{ closed: false, nodes: [
      { x: 10, y: 20, type: "smooth", in: { x: -2, y: 0 }, out: { x: 2, y: 5 } },
      { x: 90, y: 80, type: "corner", in: { x: 0, y: 0 }, out: { x: 0, y: 0 } },
    ] }],
  }] };
  const reopened = parseProjectFile(serializeProjectFile(project));
  assert.deepEqual(reopened.objects[0].paths, project.objects[0].paths);
});
