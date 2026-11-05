import assert from "node:assert/strict";
import test from "node:test";
import {
  createProjectRecord,
  PROJECTS_STORAGE_KEY,
  readProjects,
  writeProjects,
} from "./projectStorage.js";

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

test("named projects persist and can be read back", () => {
  const storage = createStorage();
  const record = createProjectRecord("Jummah Poster", { objects: [] }, "project-1", 42);

  writeProjects([record], storage);

  assert.deepEqual(readProjects(storage), [record]);
  assert.equal(record.name, "Jummah Poster");
  assert.equal(record.updatedAt, 42);
});

test("empty storage returns an empty project list", () => {
  assert.deepEqual(readProjects(createStorage()), []);
});

test("invalid saved data reports an actionable error", () => {
  const storage = createStorage({ [PROJECTS_STORAGE_KEY]: "not json" });

  assert.throws(() => readProjects(storage), /browser data is invalid/);
});

test("storage quota errors are reported without dropping saved projects", () => {
  const storage = {
    getItem: () => null,
    setItem: () => {
      const error = new Error("quota");
      error.name = "QuotaExceededError";
      throw error;
    },
  };

  assert.throws(() => writeProjects([], storage), /Browser storage is full/);
});
