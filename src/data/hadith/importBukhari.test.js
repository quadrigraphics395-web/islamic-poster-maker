import assert from "node:assert/strict";
import test from "node:test";
import sample from "./bukhari-test-source.json" with { type: "json" };
import { importBukhariSource } from "./importBukhari.js";

test("imports ten sourced records without changing canonical strings or verifying them", () => {
  const result = importBukhariSource(sample, []);

  assert.deepEqual(result.report, {
    imported: 10,
    verified: 0,
    needsVerification: 10,
    rejected: 0,
    duplicates: 0,
  });
  assert.equal(result.accepted.length, 10);
  result.accepted.forEach((imported) => {
    const source = sample.records.find((item) => item.sourceUrl === imported.sourceUrl);
    assert.ok(source);
    assert.equal(imported.verified, false);
    assert.equal(imported.arabicText, source.arabicText);
    assert.equal(imported.originalArabicText, source.arabicText);
    assert.equal(imported.hadithNumber, source.hadithNumber);
    assert.equal(imported.reference, source.reference);
    assert.equal(imported.urduTranslation, "");
    assert.equal(imported.englishTranslation, "");
    assert.equal(imported.grade, "");
  });
});

test("rejects incomplete records instead of filling missing text", () => {
  const result = importBukhariSource({
    ...sample,
    records: [{ ...sample.records[0], arabicText: "" }],
  }, []);

  assert.equal(result.accepted.length, 0);
  assert.equal(result.report.rejected, 1);
  assert.match(result.rejected[0].reason, /arabicText/);
});

test("does not duplicate a collection, number, and source edition", () => {
  const first = importBukhariSource(sample, []);
  const second = importBukhariSource({
    ...sample,
    records: sample.records.map((record) => ({ ...record, sourceEdition: `${record.sourceEdition} (alternate label)` })),
  }, first.accepted);

  assert.equal(second.accepted.length, 0);
  assert.equal(second.report.duplicates, 10);
  assert.equal(second.report.imported, 0);
});

test("rejects a source package without provenance or licence metadata", () => {
  const result = importBukhariSource({
    sourceMetadata: { ...sample.sourceMetadata, license: "", provenance: "" },
    records: sample.records,
  }, []);

  assert.equal(result.accepted.length, 0);
  assert.equal(result.report.rejected, 1);
  assert.match(result.rejected[0].reason, /license, provenance/);
});

test("rejects malformed optional translator and edition metadata", () => {
  const result = importBukhariSource({
    ...sample,
    sourceMetadata: { ...sample.sourceMetadata, englishTranslator: { name: "Untrusted value" } },
  }, []);

  assert.equal(result.accepted.length, 0);
  assert.equal(result.report.rejected, 10);
  assert.match(result.rejected[0].reason, /englishTranslator/);
});

test("never accepts a source-provided verified flag as verification", () => {
  const result = importBukhariSource({
    ...sample,
    records: sample.records.map((record) => ({ ...record, verified: true })),
  }, []);

  assert.equal(result.report.imported, 10);
  assert.equal(result.report.verified, 0);
  assert.equal(result.accepted.every((record) => record.verified === false), true);
});
