import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const api = (process.env.TEMPLATE_API_URL || "http://127.0.0.1:8787").replace(/\/$/, "");
const frontendOrigin = "http://localhost:5173";
const email = process.env.TEMPLATE_TEST_ADMIN_EMAIL || "local-admin@example.test";
const key = process.env.TEMPLATE_TEST_ADMIN_KEY;
if (!key) throw new Error("Set TEMPLATE_TEST_ADMIN_KEY to the temporary local admin key before running this smoke test.");

let token = null;
const templateIds = [];
const assetIds = [];
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j2ioAAAAASUVORK5CYII=", "base64");

async function call(path, { method = "GET", body, auth = true, headers = {} } = {}) {
  const response = await fetch(`${api}${path}`, {
    method,
    headers: {
      Origin: frontendOrigin,
      ...(body === undefined || body instanceof ArrayBuffer || Buffer.isBuffer(body) ? {} : { "Content-Type": "application/json" }),
      ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body === undefined ? {} : { body: body instanceof ArrayBuffer || Buffer.isBuffer(body) ? body : JSON.stringify(body) }),
  });
  const contentType = response.headers.get("Content-Type") || "";
  const data = contentType.includes("application/json") ? await response.json() : Buffer.from(await response.arrayBuffer());
  return { response, data };
}

function passed(name) {
  console.log(`PASS ${name}`);
}

async function uploadAsset() {
  const { response, data } = await call("/api/admin/assets", { method: "POST", body: png, headers: { "Content-Type": "image/png" } });
  assert.equal(response.status, 201, JSON.stringify(data));
  assetIds.push(data.id);
  return data.id;
}

async function createTemplate(assetId, { published = false, name = "Local API smoke template" } = {}) {
  const body = {
    name,
    description: "Local-only integration test",
    category: "Test",
    featured: false,
    published,
    project: { canvasSize: "Square 1080x1080", backgroundImage: `asset://${assetId}`, objects: [] },
    preview_asset_id: assetId,
  };
  const { response, data } = await call("/api/admin/templates", { method: "POST", body });
  if (response.ok) templateIds.push(data.id);
  return { response, data };
}

async function cleanup() {
  for (const id of templateIds.splice(0)) await call(`/api/admin/templates/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
  for (const id of assetIds.splice(0)) await call(`/api/admin/assets/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
  await call("/api/admin/assets/cleanup", { method: "POST" }).catch(() => {});
}

try {
  const publicList = await call("/api/templates", { auth: false });
  assert.equal(publicList.response.status, 200);
  assert.equal(publicList.response.headers.get("Access-Control-Allow-Origin"), frontendOrigin);
  passed("Vite-origin CORS and public API connectivity");

  const options = await fetch(`${api}/api/admin/assets`, {
    method: "OPTIONS",
    headers: { Origin: frontendOrigin, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "authorization,content-type" },
  });
  assert.equal(options.status, 204);
  assert.equal(options.headers.get("Access-Control-Allow-Origin"), frontendOrigin);
  passed("browser preflight for binary upload");

  const denied = await call("/api/admin/templates", { auth: false });
  assert.equal(denied.response.status, 401);
  const badLogin = await call("/api/admin/login", { method: "POST", auth: false, body: { email, password: "incorrect" } });
  assert.equal(badLogin.response.status, 401);
  const login = await call("/api/admin/login", { method: "POST", auth: false, body: { email, password: key } });
  assert.equal(login.response.status, 200, JSON.stringify(login.data));
  token = login.data.token;
  const session = await call("/api/admin/session");
  assert.deepEqual(session.data, { authenticated: true });
  passed("admin authorization, invalid credentials, login, and session validation");

  const assetA = await uploadAsset();
  const draft = await createTemplate(assetA);
  assert.equal(draft.response.status, 201, JSON.stringify(draft.data));
  const hiddenDetail = await call(`/api/templates/${draft.data.id}`, { auth: false });
  assert.equal(hiddenDetail.response.status, 404);
  const privateAsset = await call(`/api/assets/${assetA}`, { auth: false });
  assert.equal(privateAsset.response.status, 404);
  const adminDetail = await call(`/api/templates/${draft.data.id}`);
  assert.equal(adminDetail.response.status, 200);
  assert.equal(adminDetail.data.project.backgroundImage, `asset://${assetA}`);
  const privateImage = await call(`/api/assets/${assetA}`);
  assert.equal(privateImage.response.status, 200);
  assert.deepEqual(privateImage.data, png);
  passed("draft visibility, private asset retrieval, and byte-preserving upload");

  const publish = await call(`/api/admin/templates/${draft.data.id}`, { method: "PATCH", body: { published: true } });
  assert.equal(publish.response.status, 200, JSON.stringify(publish.data));
  const publicDetail = await call(`/api/templates/${draft.data.id}`, { auth: false });
  assert.equal(publicDetail.response.status, 200);
  const publicImage = await call(`/api/assets/${assetA}`, { auth: false });
  assert.deepEqual(publicImage.data, png);
  const linkedDelete = await call(`/api/admin/assets/${assetA}`, { method: "DELETE" });
  assert.equal(linkedDelete.response.status, 409);
  passed("publish, public cross-device template/asset access, and linked-asset protection");

  const assetB = await uploadAsset();
  const replace = await call(`/api/admin/templates/${draft.data.id}`, {
    method: "PATCH",
    body: { name: "Edited local template", project: { backgroundImage: `asset://${assetB}`, objects: [] }, preview_asset_id: assetB },
  });
  assert.equal(replace.response.status, 200, JSON.stringify(replace.data));
  const edited = await call(`/api/templates/${draft.data.id}`, { auth: false });
  assert.equal(edited.data.name, "Edited local template");
  assert.equal(edited.data.project.backgroundImage, `asset://${assetB}`);
  const releasedAsset = await call(`/api/admin/assets/${assetA}`, { method: "DELETE" });
  assert.equal(releasedAsset.response.status, 200);
  assetIds.splice(assetIds.indexOf(assetA), 1);
  passed("template editing/replacement updates references and releases the old image safely");

  const drafts = [];
  for (let index = 0; index < 100; index += 1) {
    const item = await createTemplate(assetB, { name: `Concurrent limit draft ${index}` });
    assert.equal(item.response.status, 201, JSON.stringify(item.data));
    drafts.push(item.data.id);
  }
  const publishResults = await Promise.all(drafts.map((id) => call(`/api/admin/templates/${id}`, { method: "PATCH", body: { published: true } })));
  const published = publishResults.filter((item) => item.response.status === 200).length + 1;
  const rejected = publishResults.filter((item) => item.response.status === 409).length;
  assert.equal(published, 100);
  assert.equal(rejected, 1);
  const beyondLimitDraft = await createTemplate(assetB, { name: "Over-limit draft" });
  assert.equal(beyondLimitDraft.response.status, 201);
  const overLimitPublish = await call(`/api/admin/templates/${beyondLimitDraft.data.id}`, { method: "PATCH", body: { published: true } });
  assert.equal(overLimitPublish.response.status, 409);
  const overLimitInsert = await createTemplate(assetB, { published: true, name: "Over-limit published insert" });
  assert.equal(overLimitInsert.response.status, 409);
  const listed = await call("/api/templates", { auth: false });
  assert.equal(listed.data.length, 100);
  passed("concurrent publish race and insert/update enforcement at exactly 100 published templates");

  const orphan = await uploadAsset();
  const wrangler = resolve("node_modules/wrangler/bin/wrangler.js");
  const workerDirectory = fileURLToPath(new URL("../cloudflare/worker/", import.meta.url));
  const sql = `UPDATE assets SET created_at='2000-01-01T00:00:00.000Z' WHERE id='${orphan}'`;
  const ageResult = spawnSync(process.execPath, [wrangler, "d1", "execute", "qadri-poster-templates", "--local", "--command", sql], {
    cwd: workerDirectory,
    encoding: "utf8",
    env: { ...process.env, XDG_CONFIG_HOME: join(tmpdir(), "qadri-wrangler-config"), WRANGLER_LOG_PATH: join(tmpdir(), "qadri-wrangler.log") },
  });
  assert.equal(ageResult.status, 0, `${ageResult.stderr}\n${ageResult.stdout}`);
  const cleanupResult = await call("/api/admin/assets/cleanup", { method: "POST" });
  assert.equal(cleanupResult.response.status, 200);
  assert.equal(cleanupResult.data.cleaned, 1);
  assetIds.splice(assetIds.indexOf(orphan), 1);
  const cleanedAsset = await call(`/api/assets/${orphan}`, { auth: false });
  assert.equal(cleanedAsset.response.status, 404);
  passed("unused image cleanup removes expired orphan bytes and database references");

  const beforeDelete = await call("/api/admin/templates");
  assert.equal(beforeDelete.data.length, 102);
  const firstTemplateId = templateIds[0];
  const deleted = await call(`/api/admin/templates/${firstTemplateId}`, { method: "DELETE" });
  assert.equal(deleted.response.status, 200);
  templateIds.splice(0, 1);
  const stillShared = await call(`/api/admin/assets/${assetB}`, { method: "DELETE" });
  assert.equal(stillShared.response.status, 409);
  passed("template deletion and shared-reference retention");
} finally {
  await cleanup();
}
