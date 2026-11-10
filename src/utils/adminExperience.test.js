import test from "node:test";
import assert from "node:assert/strict";
import {
  ADMIN_TOKEN_STORAGE_KEY,
  advanceLogoClickSequence,
  adminSessionRemainingMs,
  publishedGalleryTemplates,
  readAdminSessionToken,
  shouldShowSaveAsTemplate,
  verifyAdminSession,
  writeAdminSessionToken,
} from "./adminExperience.js";

test("one logo click leaves the hidden admin entry hidden", () => {
  const first = advanceLogoClickSequence({ count: 0, startedAt: 0 }, 100);
  assert.deepEqual(first, { count: 1, startedAt: 100, revealed: false });
});

test("five logo clicks within three seconds reveal the login entry", () => {
  let sequence = { count: 0, startedAt: 0 };
  for (let index = 0; index < 4; index += 1) sequence = advanceLogoClickSequence(sequence, 100 + index * 400);
  assert.equal(sequence.revealed, false);
  sequence = advanceLogoClickSequence(sequence, 1700);
  assert.equal(sequence.revealed, true);
});

test("a click sequence that exceeds three seconds starts over", () => {
  const sequence = advanceLogoClickSequence({ count: 4, startedAt: 100 }, 3201);
  assert.equal(sequence.count, 1);
  assert.equal(sequence.revealed, false);
});

test("only published online templates enter the public gallery", () => {
  const result = publishedGalleryTemplates([
    { id: "published", source: "online", published: true },
    { id: "draft", source: "online", published: false },
    { id: "local", source: "saved", published: true },
    { id: "demo", source: "built-in", published: true },
  ]);
  assert.deepEqual(result.map((template) => template.id), ["published"]);
});

test("Save as Template is gated on verified admin state, never a truthy string", () => {
  assert.equal(shouldShowSaveAsTemplate(false), false);
  assert.equal(shouldShowSaveAsTemplate("true"), false);
  assert.equal(shouldShowSaveAsTemplate(true), true);
});

test("admin session state is revalidated through the backend request", async () => {
  assert.equal(await verifyAdminSession(async () => ({ authenticated: true })), true);
  assert.equal(await verifyAdminSession(async () => ({ authenticated: false })), false);
  assert.equal(await verifyAdminSession(async () => { throw new Error("offline"); }), false);
});

test("only the signed session token is kept in session storage and its expiry is readable", () => {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60 })).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const token = `${payload}.signature`;
  writeAdminSessionToken(token, storage);
  assert.equal(values.get(ADMIN_TOKEN_STORAGE_KEY), token);
  assert.equal(readAdminSessionToken(storage), token);
  assert.ok(adminSessionRemainingMs(token) > 0);
  writeAdminSessionToken(null, storage);
  assert.equal(readAdminSessionToken(storage), null);
});
