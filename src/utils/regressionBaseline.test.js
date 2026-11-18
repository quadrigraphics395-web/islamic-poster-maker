import assert from "node:assert/strict";
import test from "node:test";
import {
  parseProjectFile,
  serializeProjectFile,
} from "./projectFileManager.js";
import { readProjectRecovery, writeProjectRecovery } from "./projectRecovery.js";
import {
  createProjectRecord,
  readProjects,
  writeProjects,
} from "./projectStorage.js";
import {
  restoreObjectSnapshot,
  serializeObjectSnapshot,
} from "./objectHistory.js";
import { removeObjectsById } from "./objectOperations.js";
import { importSvgDocument } from "./svgImport.js";

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
}

const sampleDocument = () => ({
  version: 2,
  canvasSize: "A4 Portrait",
  documentMeta: { sizeUnit: "mm", printDpi: 300 },
  objects: [
    { id: "urdu-title", type: "text", text: "خوبصورت اردو خطاطی", direction: "rtl", fontFamily: '"Noto Nastaliq Urdu"' },
    { id: "arabic-title", type: "text", text: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", direction: "rtl", fontFamily: '"Noto Naskh Arabic"' },
    { id: "photo", type: "image", src: "data:image/png;base64,AA==", opacity: 85 },
    { id: "ornament", type: "shape", shape: "circle", color: "#bd9654" },
  ],
  pages: [{ id: 1, name: "Page 1", objects: [] }],
});

test("poster document survives named save, QPM file round-trip, and local recovery", () => {
  const storage = createStorage();
  const document = sampleDocument();
  const record = createProjectRecord("Regression poster", document, "project-regression", 1234);

  writeProjects([record], storage);
  assert.deepEqual(readProjects(storage), [record]);

  const reopened = parseProjectFile(serializeProjectFile(readProjects(storage)[0].project));
  assert.deepEqual(reopened, document);
  assert.equal(reopened.objects[0].text, "خوبصورت اردو خطاطی");
  assert.equal(reopened.objects[1].text, "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ");
  assert.equal(reopened.objects[2].src, "data:image/png;base64,AA==");

  assert.deepEqual(writeProjectRecovery(reopened, { storage, now: 5678 }), { saved: true });
  assert.deepEqual(readProjectRecovery(storage), {
    version: 1,
    updatedAt: 5678,
    fileHandleKey: null,
    project: document,
  });
  assert.deepEqual(readProjects(storage), [record]);
});

test("object edit and delete states can be restored and replayed with the app's snapshot helpers", () => {
  const before = sampleDocument().objects;
  const historySnapshot = serializeObjectSnapshot(before);
  const edited = before.map((object) => object.id === "urdu-title"
    ? { ...object, text: "خوبصورت پوسٹر", fontSize: 42 }
    : object);

  const undone = restoreObjectSnapshot(historySnapshot);
  assert.deepEqual(undone, before);
  const redone = restoreObjectSnapshot(serializeObjectSnapshot(edited));
  assert.deepEqual(redone, edited);

  const deleted = removeObjectsById(redone, new Set(["photo"]));
  assert.equal(deleted.some((object) => object.id === "photo"), false);
  assert.deepEqual(restoreObjectSnapshot(serializeObjectSnapshot(redone)), redone);
});

test("supported SVG import remains editable after project save and reopen", () => {
  let nextId = 0;
  const imported = importSvgDocument(
    '<svg viewBox="0 0 120 80"><text x="10" y="25" direction="rtl">اردو متن</text><path d="M20 45L60 70Z" fill="#345678"/></svg>',
    { width: 1080, height: 1080, createId: () => `import-${++nextId}` },
  );
  const reopened = parseProjectFile(serializeProjectFile({
    version: 2,
    objects: imported.objects,
    pages: [{ id: 1, name: "Page 1", objects: imported.objects }],
  }));

  assert.deepEqual(reopened.objects, imported.objects);
  assert.ok(reopened.objects[0].children.some((object) => object.type === "text" && object.text === "اردو متن"));
  assert.ok(reopened.objects[0].children.some((object) => object.type === "shape" && object.svgPathData === "M20 45L60 70Z"));
});
