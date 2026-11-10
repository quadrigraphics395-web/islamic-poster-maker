import test from "node:test";
import assert from "node:assert/strict";
import { importSvgDocument } from "./svgImport.js";
import {
  chooseProjectOpenFile,
  chooseProjectSaveHandle,
  confirmProjectReplacement,
  downloadProjectFile,
  parseProjectFile,
  readProjectFile,
  serializeProjectFile,
  suggestedProjectFileName,
  writeProjectFileHandle,
} from "./projectFileManager.js";

const editableProject = {
  version: 2,
  canvasSize: "A4 Portrait",
  sizeUnit: "in",
  objects: [
    { id: "text", type: "text", text: "اردو", direction: "rtl", fontFamily: "Noto Nastaliq Urdu" },
    { id: "curves", type: "shape", shape: "custom", svgPathData: "M0 0L10 10Z", svgSource: "<svg/>", color: "#123456" },
    { id: "image", type: "image", src: "data:image/png;base64,AA==", imageFilters: { brightness: 120 } },
    { id: "group", type: "group", children: [{ id: "child", type: "shape" }] },
  ],
  pages: [{ id: 1, name: "Page 1", objects: [] }],
};

test("QPM serialization preserves the full editable document, SVG, groups, and embedded assets", () => {
  const parsed = parseProjectFile(serializeProjectFile(editableProject));
  assert.deepEqual(parsed, editableProject);
  assert.equal(parsed.objects[0].direction, "rtl");
  assert.equal(parsed.objects[1].svgPathData, "M0 0L10 10Z");
  assert.equal(parsed.objects[2].src, "data:image/png;base64,AA==");
  assert.equal(parsed.objects[3].children[0].id, "child");
});

test("previous JSON project files remain readable", () => {
  assert.deepEqual(parseProjectFile(JSON.stringify(editableProject)), editableProject);
});

test("corrupt and incomplete project files are rejected before editor state is applied", () => {
  assert.throws(() => parseProjectFile("{"), /corrupted/);
  assert.throws(() => parseProjectFile(JSON.stringify({ format: "qadri-poster-maker-project", formatVersion: 999, project: editableProject })), /unsupported/);
  assert.throws(() => parseProjectFile(JSON.stringify({ objects: "not-an-array" })), /valid poster objects/);
  assert.throws(() => parseProjectFile(JSON.stringify({})), /valid poster objects/);
});

test("Save As opens the native picker with QPM filename and type when supported", async () => {
  let options;
  const handle = { name: "design.qpm" };
  const selected = await chooseProjectSaveHandle({ showSaveFilePicker: async (value) => { options = value; return handle; } }, "Design: Eid");
  assert.equal(selected, handle);
  assert.equal(options.suggestedName, "Design- Eid.qpm");
  assert.deepEqual(options.types[0].accept["application/json"], [".qpm"]);
  assert.equal(await chooseProjectSaveHandle({}, "Design"), null);
});

test("Normal Save writes to the previously selected file handle after permission renewal", async () => {
  const writes = [];
  let requested = 0;
  const handle = {
    queryPermission: async () => "prompt",
    requestPermission: async () => { requested += 1; return "granted"; },
    createWritable: async () => ({ write: async (value) => writes.push(value), close: async () => writes.push("closed") }),
  };
  await writeProjectFileHandle(handle, "qpm contents");
  await writeProjectFileHandle(handle, "updated contents");
  assert.equal(requested, 2);
  assert.deepEqual(writes, ["qpm contents", "closed", "updated contents", "closed"]);
});

test("file permission denial and write errors are surfaced without silently saving elsewhere", async () => {
  const denied = { queryPermission: async () => "prompt", requestPermission: async () => "denied", createWritable: async () => { throw new Error("must not write"); } };
  await assert.rejects(writeProjectFileHandle(denied, "data"), /Permission.*not granted/);
  const broken = { createWritable: async () => ({ write: async () => { throw new Error("disk full"); }, close: async () => {}, abort: async () => {} }) };
  await assert.rejects(writeProjectFileHandle(broken, "data"), /disk full/);
});

test("Open Project uses the native picker and reads a selected QPM file", async () => {
  const handle = { getFile: async () => ({ name: "poster.qpm", text: async () => serializeProjectFile(editableProject) }) };
  const opened = await chooseProjectOpenFile({ showOpenFilePicker: async (options) => { assert.equal(options.multiple, false); return [handle]; } });
  assert.equal(opened.handle, handle);
  assert.deepEqual(await readProjectFile(opened.file), editableProject);
  assert.equal(await chooseProjectOpenFile({}), null);
});

test("download fallback produces a QPM download on browsers without file pickers", () => {
  const events = [];
  const platform = {
    Blob,
    URL: { createObjectURL: (blob) => { events.push(blob.type); return "blob:test"; }, revokeObjectURL: (url) => events.push(url) },
    document: { createElement: () => ({ click: () => events.push("click") }) },
  };
  const name = downloadProjectFile("data", "Design", platform);
  assert.equal(name, "Design.qpm");
  assert.deepEqual(events, ["application/vnd.qadri.poster-project+json", "click", "blob:test"]);
});

test("unsafe path characters are removed from suggested project filenames", () => {
  assert.equal(suggestedProjectFileName("C:\\Users\\name?"), "C--Users-name-.qpm");
  assert.equal(suggestedProjectFileName("poster.qpm"), "poster.qpm");
});

test("only replacement of unsaved changes asks for confirmation", () => {
  let calls = 0;
  assert.equal(confirmProjectReplacement(false, () => { calls += 1; return false; }), true);
  assert.equal(confirmProjectReplacement(true, () => { calls += 1; return false; }), false);
  assert.equal(calls, 1);
});

test("a native SVG import remains editable after QPM serialization and reload", () => {
  const imported = importSvgDocument(`<svg viewBox="0 0 120 80" width="120" height="80"><text x="10" y="30" direction="rtl">اردو</text><path d="M20 45L60 70Z" fill="#345678"/><image x="65" y="10" width="20" height="20" href="data:image/png;base64,AA=="/></svg>`, { width: 1080, height: 1080, createId: (() => { let id = 0; return () => `svg-${++id}`; })() });
  const project = parseProjectFile(serializeProjectFile({ version: 2, objects: imported.objects, pages: [{ id: 1, name: "Page 1", objects: imported.objects }] }));
  assert.deepEqual(project.objects, imported.objects);
  assert.equal(project.objects[0].type, "group");
  assert.ok(project.objects[0].children.some((object) => object.type === "text" && object.text === "اردو"));
  assert.ok(project.objects[0].children.some((object) => object.svgPathData === "M20 45L60 70Z"));
  assert.ok(project.objects[0].children.some((object) => object.type === "image" && object.src.startsWith("data:image/png;base64,")));
});