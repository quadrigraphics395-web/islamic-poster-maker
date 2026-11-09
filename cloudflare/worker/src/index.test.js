import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import worker, { constantTimeEqual, getAssetIds, validRecord } from "./index.js";

const migrationPath = fileURLToPath(new URL("../migrations/0001_shared_templates.sql", import.meta.url));
const wranglerConfigPath = fileURLToPath(new URL("../wrangler.jsonc", import.meta.url));

test("asset reference scan returns unique stable IDs", () => {
  const ids = getAssetIds({ background: "asset://bg", objects: [{ src: "asset://img" }, { children: [{ src: "asset://img" }] }] }, "preview");
  assert.deepEqual(new Set(ids), new Set(["preview", "bg", "img"]));
});

test("template record validation rejects missing preview and oversized fields", () => {
  assert.throws(() => validRecord({ name: "Test", category: "Dua", project: {} }), /valid uploaded preview/);
  assert.throws(() => validRecord({ name: "x".repeat(101), category: "Dua", project: {}, preview_asset_id: "preview" }), /allowed length/);
  assert.throws(() => validRecord({ name: "Test", category: "Dua", project: { text: "x".repeat(1_900_001) }, preview_asset_id: "preview" }), /exceeds 1.9 MB/);
  const tooManyAssets = Object.fromEntries(Array.from({ length: 80 }, (_, index) => [`image${index}`, `asset://image-${index}`]));
  assert.throws(() => validRecord({ name: "Test", category: "Dua", project: tooManyAssets, preview_asset_id: "preview" }), /at most 80/);
  assert.equal(validRecord({ name: " Test ", category: " Dua ", project: { objects: [] }, preview_asset_id: "preview" }).title, "Test");
});

test("digest comparison checks equal lengths and contents", () => {
  assert.equal(constantTimeEqual("a1b2", "a1b2"), true);
  assert.equal(constantTimeEqual("a1b2", "a1b3"), false);
  assert.equal(constantTimeEqual("a1b2", "a1b"), false);
});

test("D1 migration enforces 100 published records and permits drafts", () => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(readFileSync(migrationPath, "utf8"));
  const insert = db.prepare("INSERT INTO templates(id,title,category,project_json,preview_asset_id,created_at,updated_at,published) VALUES(?,?,?,'{}',?,?,?,?)");
  for (let index = 0; index < 100; index += 1) insert.run(`t${index}`, `Template ${index}`, "Dua", `a${index}`, "now", "now", 1);
  assert.throws(() => insert.run("t100", "Over cap", "Dua", "a100", "now", "now", 1), /published_template_limit/);
  insert.run("draft", "Draft", "Dua", "draft-asset", "now", "now", 0);
  assert.throws(() => db.prepare("UPDATE templates SET published=1 WHERE id='draft'").run(), /published_template_limit/);
  db.close();
});

test("D1 migration caps total reserved asset bytes below the free KV allocation", () => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(readFileSync(migrationPath, "utf8"));
  const insert = db.prepare("INSERT INTO assets(id,kv_key,mime_type,byte_size,state,created_at) VALUES(?,?,'image/png',?,'active','now')");
  const itemBytes = 24 * 1024 * 1024;
  for (let index = 0; index < 37; index += 1) insert.run(`asset${index}`, `kv${index}`, itemBytes);
  assert.throws(() => insert.run("asset-over", "kv-over", 13 * 1024 * 1024), /asset_storage_budget/);
  db.close();
});

test("public templates endpoint needs no admin session and returns published records only", async () => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(readFileSync(migrationPath, "utf8"));
  const insert = db.prepare("INSERT INTO templates(id,title,description,category,featured,published,project_json,preview_asset_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)");
  insert.run("published-public-test", "Published", "", "Test", 0, 1, "{}", "published-preview", "now", "now");
  insert.run("draft-public-test", "Draft", "", "Test", 0, 0, "{}", "draft-preview", "now", "now");
  const env = {
    FRONTEND_ORIGINS: "",
    DB: {
      prepare(sql) {
        return { all: async () => ({ results: db.prepare(sql).all() }) };
      },
    },
  };

  const response = await worker.fetch(new Request("https://api.example/api/templates"), env);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), [{
    id: "published-public-test",
    name: "Published",
    title: "Published",
    description: "",
    category: "Test",
    featured: false,
    published: true,
    preview_asset_id: "published-preview",
    preview_path: "published-preview",
    created_at: "now",
    updated_at: "now",
  }]);
  db.close();
});

test("admin PATCH persists published=true and exposes the row through admin and public APIs", async () => {
  const { db, env, headers, templateId } = await createAdminTemplateEnv({ published: 0 });
  try {
    const response = await patchPublished(env, headers, templateId, true);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { updated: true });
    assert.equal(db.prepare("SELECT published FROM templates WHERE id=?").get(templateId).published, 1);

    const admin = await worker.fetch(new Request("https://api.example/api/admin/templates", { headers }), env);
    assert.equal(admin.status, 200);
    assert.equal((await admin.json()).find((row) => row.id === templateId).published, true);

    const publicResponse = await worker.fetch(new Request("https://api.example/api/templates"), env);
    assert.equal(publicResponse.status, 200);
    assert.deepEqual((await publicResponse.json()).map((row) => row.id), [templateId]);
  } finally {
    db.close();
  }
});

test("admin PATCH persists published=false and removes the row from the public API", async () => {
  const { db, env, headers, templateId } = await createAdminTemplateEnv({ published: 1 });
  try {
    const response = await patchPublished(env, headers, templateId, false);
    assert.equal(response.status, 200);
    assert.equal(db.prepare("SELECT published FROM templates WHERE id=?").get(templateId).published, 0);

    const admin = await worker.fetch(new Request("https://api.example/api/admin/templates", { headers }), env);
    assert.equal((await admin.json()).find((row) => row.id === templateId).published, false);
    const publicResponse = await worker.fetch(new Request("https://api.example/api/templates"), env);
    assert.deepEqual(await publicResponse.json(), []);
  } finally {
    db.close();
  }
});

test("admin PATCH does not report success when the D1 update affects zero rows", async () => {
  const { db, env, headers, templateId } = await createAdminTemplateEnv({ published: 0, batchMode: "zeroChanges" });
  try {
    const response = await patchPublished(env, headers, templateId, true);
    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), { error: "The template was not updated. Refresh and try again." });
    assert.equal(db.prepare("SELECT published FROM templates WHERE id=?").get(templateId).published, 0);
  } finally {
    db.close();
  }
});

test("admin PATCH does not report success when the D1 result has no meta object", async () => {
  const { db, env, headers, templateId } = await createAdminTemplateEnv({ published: 0, batchMode: "missingMeta" });
  try {
    const response = await patchPublished(env, headers, templateId, true);
    assert.notEqual(response.status, 200);
    assert.notDeepEqual(await response.json(), { updated: true });
    assert.equal(db.prepare("SELECT published FROM templates WHERE id=?").get(templateId).published, 0);
  } finally {
    db.close();
  }
});

test("admin PATCH does not report success when D1 result meta has no changes count", async () => {
  const { db, env, headers, templateId } = await createAdminTemplateEnv({ published: 0, batchMode: "missingChanges" });
  try {
    const response = await patchPublished(env, headers, templateId, true);
    assert.notEqual(response.status, 200);
    assert.notDeepEqual(await response.json(), { updated: true });
    assert.equal(db.prepare("SELECT published FROM templates WHERE id=?").get(templateId).published, 0);
  } finally {
    db.close();
  }
});

test("admin PATCH does not report success when D1 batch returns an empty result array", async () => {
  const { db, env, headers, templateId } = await createAdminTemplateEnv({ published: 0, batchMode: "emptyResults" });
  try {
    const response = await patchPublished(env, headers, templateId, true);
    assert.notEqual(response.status, 200);
    assert.notDeepEqual(await response.json(), { updated: true });
    assert.equal(db.prepare("SELECT published FROM templates WHERE id=?").get(templateId).published, 0);
  } finally {
    db.close();
  }
});

test("admin PATCH returns an error when the D1 batch reports failure", async () => {
  const { db, env, headers, templateId } = await createAdminTemplateEnv({ published: 0, batchMode: "failure" });
  try {
    const response = await patchPublished(env, headers, templateId, true);
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: "The shared template service had an internal error. Retry in a moment." });
    assert.equal(db.prepare("SELECT published FROM templates WHERE id=?").get(templateId).published, 0);
  } finally {
    db.close();
  }
});

test("admin PATCH rejects a D1 result whose success flag is false", async () => {
  const { db, env, headers, templateId } = await createAdminTemplateEnv({ published: 0, batchMode: "unsuccessfulResult" });
  try {
    const response = await patchPublished(env, headers, templateId, true);
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: "The shared template service had an internal error. Retry in a moment." });
    assert.equal(db.prepare("SELECT published FROM templates WHERE id=?").get(templateId).published, 0);
  } finally {
    db.close();
  }
});

test("admin PATCH replaces linked assets when project and preview assets change", async () => {
  const { db, env, headers, templateId } = await createAdminTemplateEnv({ published: 0 });
  try {
    const insertAsset = db.prepare("INSERT INTO assets(id,kv_key,mime_type,byte_size,state,created_at) VALUES(?,?,'image/png',1,'active','now')");
    insertAsset.run("old-asset", "old-kv");
    insertAsset.run("new-asset", "new-kv");
    db.prepare("INSERT INTO template_assets(template_id,asset_id) VALUES(?,?)").run(templateId, "old-asset");

    const response = await worker.fetch(new Request(`https://api.example/api/admin/templates/${templateId}`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ project: { backgroundImage: "asset://new-asset", objects: [] }, preview_asset_id: "new-asset" }),
    }), env);

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { updated: true });
    assert.deepEqual(db.prepare("SELECT asset_id FROM template_assets WHERE template_id=? ORDER BY asset_id").all(templateId).map((row) => row.asset_id), ["new-asset"]);
    const updated = db.prepare("SELECT project_json,preview_asset_id FROM templates WHERE id=?").get(templateId);
    assert.equal(updated.preview_asset_id, "new-asset");
    assert.deepEqual(JSON.parse(updated.project_json), { backgroundImage: "asset://new-asset", objects: [] });
  } finally {
    db.close();
  }
});

test("published limit remains a conflict when an admin PATCH attempts to publish", async () => {
  const { db, env, headers, templateId } = await createAdminTemplateEnv({ published: 0 });
  try {
    const insert = db.prepare("INSERT INTO templates(id,title,description,category,featured,published,project_json,preview_asset_id,created_at,updated_at) VALUES(?,?,?,'Dua',0,1,'{}','preview','now','now')");
    for (let index = 0; index < 100; index += 1) insert.run(`already-published-${index}`, `Published ${index}`, "");
    const response = await patchPublished(env, headers, templateId, true);
    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), { error: "The published template limit of 100 has been reached." });
    assert.equal(db.prepare("SELECT published FROM templates WHERE id=?").get(templateId).published, 0);
  } finally {
    db.close();
  }
});

test("Worker login grants short-lived signed admin session and rejects bad credentials", async () => {
  const testKey = "11".repeat(32);
  const env = { ADMIN_EMAIL: "admin@example.com", ADMIN_KEY_HASH: await sha256(testKey), SESSION_SECRET: "test-session-secret", FRONTEND_ORIGINS: "https://poster.example" };
  const login = await worker.fetch(new Request("https://api.example/api/admin/login", { method: "POST", headers: { Origin: "https://poster.example", "Content-Type": "application/json" }, body: JSON.stringify({ email: "admin@example.com", password: testKey }) }), env);
  assert.equal(login.status, 200);
  assert.equal(login.headers.get("Access-Control-Allow-Origin"), "https://poster.example");
  const { token } = await login.json();
  const session = await worker.fetch(new Request("https://api.example/api/admin/session", { headers: { Authorization: `Bearer ${token}`, Origin: "https://poster.example" } }), env);
  assert.deepEqual(await session.json(), { authenticated: true });
  const denied = await worker.fetch(new Request("https://api.example/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "admin@example.com", password: "wrong" }) }), env);
  assert.equal(denied.status, 401);
});

test("production CORS allows both Vercel domains and rejects every other exact origin", async () => {
  const origins = ["https://qadri-poster-maker.vercel.app", "https://islamic-poster-maker.vercel.app"];
  const env = { FRONTEND_ORIGINS: origins.join(",") };

  for (const origin of origins) {
    const response = await worker.fetch(new Request("https://api.example/api/admin/session", { headers: { Origin: origin } }), env);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Access-Control-Allow-Origin"), origin);
  }

  for (const origin of ["https://evil.example", "https://qadri-poster-maker.vercel.app.evil.example", "null"]) {
    const response = await worker.fetch(new Request("https://api.example/api/admin/session", { headers: { Origin: origin } }), env);
    assert.equal(response.status, 403);
    assert.equal(response.headers.get("Access-Control-Allow-Origin"), null);
  }

  const config = readFileSync(wranglerConfigPath, "utf8");
  assert.match(config, /"FRONTEND_ORIGINS": "https:\/\/islamic-poster-maker\.vercel\.app,http:\/\/localhost:5173"/);
  assert.match(config, /"FRONTEND_ORIGINS": "https:\/\/qadri-poster-maker\.vercel\.app,https:\/\/islamic-poster-maker\.vercel\.app"/);
  assert.doesNotMatch(config, /"FRONTEND_ORIGINS"\s*:\s*"\*"/);
});

test("Worker does not expose administrator endpoints to public users", async () => {
  const env = { ADMIN_EMAIL: "admin@example.com", SESSION_SECRET: "configured", FRONTEND_ORIGINS: "" };
  const response = await worker.fetch(new Request("https://api.example/api/admin/templates"), env);
  assert.equal(response.status, 401);
  const deniedPatch = await worker.fetch(new Request("https://api.example/api/admin/templates/private-template", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ published: true }),
  }), env);
  assert.equal(deniedPatch.status, 401);
});

async function createAdminTemplateEnv({ published, batchMode } = {}) {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(readFileSync(migrationPath, "utf8"));
  const templateId = "publish-persistence-test";
  db.prepare("INSERT INTO templates(id,title,description,category,featured,published,project_json,preview_asset_id,created_at,updated_at) VALUES(?,?,?,'Dua',0,?,'{}','preview','now','now')")
    .run(templateId, "Publish persistence test", "", published);

  function prepare(sql, values = []) {
    return {
      sql,
      values,
      bind(...nextValues) { return prepare(sql, nextValues); },
      async first() { return db.prepare(sql).get(...values) ?? null; },
      async all() { return { results: db.prepare(sql).all(...values) }; },
    };
  }

  const env = {
    ADMIN_EMAIL: "admin@example.test",
    ADMIN_KEY_HASH: await sha256("22".repeat(32)),
    SESSION_SECRET: "unit-test-session-secret",
    FRONTEND_ORIGINS: "",
    DB: {
      prepare,
      async batch(statements) {
        if (batchMode === "failure") throw new Error("Unit test D1 batch failure.");
        if (batchMode === "unsuccessfulResult") return [{ success: false, meta: { changes: 0 } }];
        if (batchMode === "missingMeta") return [{ success: true }];
        if (batchMode === "missingChanges") return [{ success: true, meta: {} }];
        if (batchMode === "emptyResults") return [];
        return statements.map((statement, index) => {
          if (batchMode === "zeroChanges" && index === 0) return { success: true, meta: { changes: 0 } };
          const result = db.prepare(statement.sql).run(...statement.values);
          return { success: true, meta: { changes: Number(result.changes) } };
        });
      },
    },
  };

  const login = await worker.fetch(new Request("https://api.example/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: env.ADMIN_EMAIL, password: "22".repeat(32) }),
  }), env);
  assert.equal(login.status, 200);
  const { token } = await login.json();
  return { db, env, templateId, headers: { Authorization: `Bearer ${token}` } };
}

async function patchPublished(env, headers, templateId, published) {
  return worker.fetch(new Request(`https://api.example/api/admin/templates/${templateId}`, {
    method: "PATCH",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ published }),
  }), env);
}

async function sha256(value) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
