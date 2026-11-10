import test from "node:test";
import assert from "node:assert/strict";
import { isEditableKeyboardTarget } from "./editorKeyboard.js";

test("keyboard shortcuts ignore text editing controls before handling canvas keys", () => {
  for (const tagName of ["INPUT", "TEXTAREA", "SELECT"]) {
    assert.equal(isEditableKeyboardTarget({ tagName }), true);
  }
  assert.equal(isEditableKeyboardTarget({ tagName: "DIV", isContentEditable: true }), true);
  assert.equal(isEditableKeyboardTarget({ tagName: "DIV", isContentEditable: false }), false);
  assert.equal(isEditableKeyboardTarget(null), false);
});
