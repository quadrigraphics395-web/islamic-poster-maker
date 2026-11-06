import test from "node:test";
import assert from "node:assert/strict";
import { deletePersonalFont, listPersonalFonts, MAX_FONT_FILE_BYTES, preparePersonalFont, readSfntNames, savePersonalFont } from "./personalFonts.js";

function makeFont(family = "Test Family") {
  const encoded = new Uint8Array([...family].flatMap((character) => [0, character.charCodeAt(0)]));
  const nameLength = 18 + encoded.length;
  const buffer = new ArrayBuffer(28 + nameLength);
  const view = new DataView(buffer);
  view.setUint32(0, 0x00010000);
  view.setUint16(4, 1);
  view.setUint32(12, 0x6e616d65);
  view.setUint32(20, 28);
  view.setUint32(24, nameLength);
  view.setUint16(28, 0);
  view.setUint16(30, 1);
  view.setUint16(32, 18);
  view.setUint16(34, 3);
  view.setUint16(36, 1);
  view.setUint16(38, 0x0409);
  view.setUint16(40, 1);
  view.setUint16(42, encoded.length);
  view.setUint16(44, 0);
  new Uint8Array(buffer, 46).set(encoded);
  return buffer;
}

test("reads OpenType family names from the name table", () => {
  assert.deepEqual(readSfntNames(makeFont()), { family: "Test Family", style: "Regular", fullName: "" });
});

test("rejects invalid font signatures", () => {
  assert.throws(() => readSfntNames(new ArrayBuffer(20)), /not a supported/);
});

test("personal font import rejects unsupported and oversized files", async () => {
  await assert.rejects(preparePersonalFont({ name: "font.woff", size: 1 }), /\.ttf or \.otf/);
  await assert.rejects(preparePersonalFont({ name: "huge.ttf", size: MAX_FONT_FILE_BYTES + 1 }), /smaller than 20 MB/);
});

test("personal font IDs are stable for duplicate file contents", async () => {
  const buffer = makeFont();
  const createFile = (name) => ({ name, size: buffer.byteLength, arrayBuffer: async () => buffer });
  const first = await preparePersonalFont(createFile("a.ttf"));
  const duplicate = await preparePersonalFont(createFile("copy.otf"));
  assert.equal(first.id, duplicate.id);
  assert.equal(first.family, "Test Family");
});

test("personal fonts save, restore from local storage, and delete", async () => {
  const previous = globalThis.indexedDB;
  const records = new Map();
  globalThis.indexedDB = {
    open() {
      const request = {};
      queueMicrotask(() => {
        const database = {
          createObjectStore() {},
          close() {},
          transaction() {
            const transaction = {};
            const requestFor = (operation) => {
              const storeRequest = {};
              setTimeout(() => {
                try {
                  storeRequest.result = operation();
                  storeRequest.onsuccess?.();
                  transaction.oncomplete?.();
                } catch (error) {
                  transaction.error = error;
                  transaction.onerror?.();
                }
              }, 0);
              return storeRequest;
            };
            transaction.objectStore = () => ({
              getAll: () => requestFor(() => [...records.values()]),
              put: (font) => requestFor(() => { records.set(font.id, font); return font.id; }),
              delete: (id) => requestFor(() => records.delete(id)),
            });
            return transaction;
          },
        };
        request.result = database;
        request.onupgradeneeded?.();
        request.onsuccess?.();
      });
      return request;
    },
  };
  try {
    const font = { id: "font-1", family: "Local Font", blob: new Blob(["font"]), label: "Local Font Regular" };
    await savePersonalFont(font);
    assert.deepEqual(await listPersonalFonts(), [font]);
    await deletePersonalFont(font.id);
    assert.deepEqual(await listPersonalFonts(), []);
  } finally {
    if (previous === undefined) delete globalThis.indexedDB;
    else globalThis.indexedDB = previous;
  }
});
