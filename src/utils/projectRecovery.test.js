import test from "node:test";
import assert from "node:assert/strict";
import { PROJECT_RECOVERY_KEY, readProjectRecovery, writeProjectRecovery } from "./projectRecovery.js";
import { PROJECTS_STORAGE_KEY } from "./projectStorage.js";

function makeStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    values,
  };
}

test("automatic recovery writes a separate editable project copy and handle association", () => {
  const storage = makeStorage({ [PROJECTS_STORAGE_KEY]: "existing saved projects" });
  const project = { objects: [{ type: "text", text: "اردو", direction: "rtl" }] };
  assert.deepEqual(writeProjectRecovery(project, { storage, fileHandleKey: "current", now: 123 }), { saved: true });
  assert.deepEqual(readProjectRecovery(storage), { version: 1, updatedAt: 123, fileHandleKey: "current", project });
  assert.equal(storage.getItem(PROJECTS_STORAGE_KEY), "existing saved projects");
  assert.ok(storage.getItem(PROJECT_RECOVERY_KEY));
});

test("corrupt recovery is reported while saved projects remain untouched", () => {
  const storage = makeStorage({ [PROJECT_RECOVERY_KEY]: "{", [PROJECTS_STORAGE_KEY]: "keep" });
  assert.throws(() => readProjectRecovery(storage), /corrupted/);
  assert.deepEqual(writeProjectRecovery({ objects: [] }, { storage }), { saved: true });
  assert.equal(storage.getItem(PROJECTS_STORAGE_KEY), "keep");
});

test("recovery quota and storage failures are shown instead of being reported as saved", () => {
  const storage = { setItem() { const error = new Error("quota"); error.name = "QuotaExceededError"; throw error; } };
  assert.deepEqual(writeProjectRecovery({ objects: [] }, { storage }), { saved: false, error: "Automatic local recovery is full. Save this poster to a project file." });
});
