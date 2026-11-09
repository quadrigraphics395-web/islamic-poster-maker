import assert from "node:assert/strict";
import test from "node:test";
import {
  createTemplateRecord,
  deleteTemplate,
  readTemplates,
  validateTemplateProject,
  writeTemplate,
} from "./templateStorage.js";
import { canManageTemplates } from "./templatePermissions.js";

function createDatabase(initial = []) {
  const values = new Map(initial.map((template) => [template.id, structuredClone(template)]));
  return {
    getAll: async () => [...values.values()].map((template) => structuredClone(template)),
    put: async (template) => values.set(template.id, structuredClone(template)),
    delete: async (id) => values.delete(id),
  };
}

const project = {
  version: 2,
  objects: [{ id: "image-1", type: "image", src: "data:image/png;base64,AA==", flipHorizontal: true }],
  pages: [{ id: 1, objects: [] }],
};

test("template records keep complete editable project data, preview, and category", () => {
  const record = createTemplateRecord("  Eid Design ", "Occasions", project, "data:image/png;base64,AA==", "template-1", 2, 42);
  assert.equal(record.name, "Eid Design");
  assert.equal(record.category, "Occasions");
  assert.deepEqual(record.project, project);
  assert.equal(record.updatedAt, 42);
});

test("template collection remains separately addressable and supports update and delete", async () => {
  const database = createDatabase();
  const record = createTemplateRecord("Dua", "Faith", project, "data:image/png;base64,AA==", "template-1");
  await writeTemplate(record, database);
  assert.deepEqual(await readTemplates(database), [record]);
  await writeTemplate({ ...record, name: "Updated Dua" }, database);
  assert.equal((await readTemplates(database))[0].name, "Updated Dua");
  await deleteTemplate(record.id, database);
  assert.deepEqual(await readTemplates(database), []);
});

test("template validation rejects temporary blob URLs without mutating saved data", () => {
  assert.throws(() => validateTemplateProject({
    objects: [{ id: "image-1", type: "image", src: "blob:temporary" }],
  }), /not stored as persistent image data/);
});

test("invalid template names and preview data are rejected", () => {
  assert.throws(() => createTemplateRecord(" ", "Other", project, "data:image/png;base64,AA=="), /template name/);
  assert.throws(() => createTemplateRecord("Design", "Other", project, "blob:preview"), /persistent preview/);
});

test("client-side mode can never grant template administration", () => {
  assert.equal(canManageTemplates(false), false);
  assert.equal(canManageTemplates(true), false);
  assert.equal(canManageTemplates("true"), false);
});
