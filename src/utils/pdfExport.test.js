import test from "node:test";
import assert from "node:assert/strict";
import { createSinglePageJpegPdf, getPdfPagePoints } from "./pdfExport.js";

test("PDF is a genuine one-page PDF with a JPEG image and correct page box", () => {
  const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]);
  const pdf = createSinglePageJpegPdf({ jpegBytes: jpeg, pixelWidth: 2480, pixelHeight: 3508, pageWidthPoints: 595.44, pageHeightPoints: 841.68 });
  const text = new TextDecoder().decode(pdf);
  assert.ok(text.startsWith("%PDF-1.4"));
  assert.match(text, /\/Count 1/);
  assert.match(text, /\/MediaBox \[0 0 595\.44 841\.68\]/);
  assert.match(text, /\/Filter \/DCTDecode/);
  assert.match(text, /startxref\n\d+\n%%EOF/);
  assert.equal((text.match(/\/Type \/Page\b/g) ?? []).length, 1);
});

test("A4 canvas dimensions produce an A4-sized PDF page", () => {
  const points = getPdfPagePoints(794, 1123);
  assert.ok(Math.abs(points.width - 595.5) < 1);
  assert.ok(Math.abs(points.height - 842.25) < 1);
});

test("PDF builder rejects non-JPEG payloads", () => {
  assert.throws(() => createSinglePageJpegPdf({ jpegBytes: new Uint8Array([1, 2]), pixelWidth: 1, pixelHeight: 1, pageWidthPoints: 72, pageHeightPoints: 72 }), /valid JPEG/);
});
