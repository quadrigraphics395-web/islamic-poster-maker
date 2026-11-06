import test from "node:test";
import assert from "node:assert/strict";

test("word, letter, and line spacing serialize independently with a text object", () => {
  const source = {
    id: "text-1",
    type: "text",
    text: "Arabic Hindi English design",
    fontFamily: '"Noto Naskh Arabic"',
    wordSpacing: 12,
    letterSpacing: 2.5,
    lineHeight: 1.4,
  };
  const restored = JSON.parse(JSON.stringify(source));
  assert.equal(restored.wordSpacing, 12);
  assert.equal(restored.letterSpacing, 2.5);
  assert.equal(restored.lineHeight, 1.4);
  assert.equal(restored.fontFamily, source.fontFamily);
  const letterOnly = { ...restored, letterSpacing: 6 };
  assert.equal(letterOnly.wordSpacing, 12);
  assert.equal(letterOnly.lineHeight, 1.4);
});
