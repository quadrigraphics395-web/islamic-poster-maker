import test from "node:test";
import assert from "node:assert/strict";
import { restoreObjectSnapshot, serializeObjectSnapshot } from "./objectHistory.js";

test("undo and redo snapshots retain crop data and image transforms", () => {
  const before = [{ id: "image-1", type: "image", src: "data:image/png;base64,AA==", width: 36, rotation: 15, flipHorizontal: true }];
  const after = [{ ...before[0], crop: { x: 0.1, y: 0.2, width: 0.6, height: 0.5 }, naturalWidth: 800, naturalHeight: 600 }];
  const undoState = restoreObjectSnapshot(serializeObjectSnapshot(before));
  const redoState = restoreObjectSnapshot(serializeObjectSnapshot(after));
  assert.equal(undoState[0].crop, undefined);
  assert.equal(undoState[0].rotation, 15);
  assert.deepEqual(redoState[0].crop, after[0].crop);
  assert.equal(redoState[0].flipHorizontal, true);
});
