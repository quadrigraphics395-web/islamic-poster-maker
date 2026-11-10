import test from "node:test";
import assert from "node:assert/strict";
import { restoreProjectFileHandle, storeProjectFileHandle } from "./projectFileHandleStore.js";

function createIndexedDb() {
  const records = new Map();
  let storeExists = false;
  return {
    open() {
      const request = {};
      queueMicrotask(() => {
        const storeNames = new Set(storeExists ? ["handles"] : []);
        request.result = {
          objectStoreNames: { contains: (name) => storeNames.has(name) },
          createObjectStore(name) { storeNames.add(name); storeExists = true; },
          transaction() {
            const transaction = { oncomplete: null, onerror: null, onabort: null };
            const objectStore = {
              put(record) { records.set(record.id, record); queueMicrotask(() => transaction.oncomplete?.()); },
              get(id) {
                const getRequest = {};
                queueMicrotask(() => { getRequest.result = records.get(id); getRequest.onsuccess?.(); });
                return getRequest;
              },
            };
            transaction.objectStore = () => objectStore;
            return transaction;
          },
          close() {},
        };
        request.onupgradeneeded?.();
        request.onsuccess?.();
      });
      return request;
    },
  };
}

test("file handle storage restores the selected handle from its separate IndexedDB store", async () => {
  const indexedDB = createIndexedDb();
  const handle = { name: "poster.qpm" };
  await storeProjectFileHandle(handle, indexedDB);
  assert.equal(await restoreProjectFileHandle(indexedDB), handle);
});

test("file handle storage reports browsers without IndexedDB", async () => {
  await assert.rejects(storeProjectFileHandle({ name: "poster.qpm" }, null), /IndexedDB is unavailable/);
});
