const MAX_ASSET_BYTES = 24 * 1024 * 1024;
const MAX_TEMPLATE_BYTES = 1_900_000;
const MAX_ACCOUNT_ASSET_BYTES = 900 * 1024 * 1024;
const MAX_TEMPLATE_ASSETS = 80;
const SESSION_SECONDS = 8 * 60 * 60;
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif", "image/svg+xml"]);
const encoder = new TextEncoder();

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const origins = (env.FRONTEND_ORIGINS || "").split(",").map((value) => value.trim()).filter(Boolean);
    if (request.method === "OPTIONS") return cors(new Response(null, { status: 204 }), origin, origins);
    if (origin && !origins.includes(origin)) return new Response("Origin is not allowed.", { status: 403 });
    try {
      return cors(await route(request, env), origin, origins);
    } catch (error) {
      const message = String(error?.message || "Request failed.");
      const status = error?.status || (message.includes("published_template_limit") ? 409 : 500);
      const publicMessage = message.includes("published_template_limit")
        ? "The published template limit of 100 has been reached."
        : message.includes("asset_storage_budget")
          ? "Shared image storage is nearing the free KV allowance. Remove unused assets before uploading more."
          : status >= 500 ? "The shared template service had an internal error. Retry in a moment." : message;
      return cors(json({ error: publicMessage }, status), origin, origins);
    }
  },
};

function cors(response, origin, origins) {
  const headers = new Headers(response.headers);
  if (origin && origins.includes(origin)) headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Authorization,Content-Type");
  headers.set("Access-Control-Max-Age", "86400");
  headers.append("Vary", "Origin");
  return new Response(response.body, { status: response.status, headers });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
}

function fail(message, status = 400) {
  const error = new Error(message); error.status = status; throw error;
}

async function route(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, "") || "/";
  if (path === "/api/admin/login" && request.method === "POST") return login(request, env);
  if (path === "/api/templates" && request.method === "GET") return publicTemplates(env);
  const publicTemplate = path.match(/^\/api\/templates\/([\w-]+)$/);
  if (publicTemplate && request.method === "GET") return getTemplate(env, publicTemplate[1], await isAdmin(request, env));
  const assetPath = path.match(/^\/api\/assets\/([\w-]+)$/);
  if (assetPath && request.method === "GET") return getAsset(env, assetPath[1], await isAdmin(request, env));
  if (path === "/api/admin/session" && request.method === "GET") return json({ authenticated: await isAdmin(request, env) });
  if (path === "/api/admin/session" && request.method === "DELETE") return json({ signedOut: true });

  if (!(await isAdmin(request, env))) fail("Administrator sign-in is required.", 401);
  if (path === "/api/admin/templates" && request.method === "GET") return adminTemplates(env);
  if (path === "/api/admin/assets" && request.method === "POST") return uploadAsset(request, env);
  if (path === "/api/admin/assets/cleanup" && request.method === "POST") return cleanupUnlinkedAssets(env);
  if (path === "/api/admin/templates" && request.method === "POST") return createTemplate(request, env);
  const templatePath = path.match(/^\/api\/admin\/templates\/([\w-]+)$/);
  if (templatePath && request.method === "PATCH") return updateTemplate(request, env, templatePath[1]);
  if (templatePath && request.method === "DELETE") return deleteTemplate(env, templatePath[1]);
  const adminAssetPath = path.match(/^\/api\/admin\/assets\/([\w-]+)$/);
  if (adminAssetPath && request.method === "DELETE") return deleteAsset(env, adminAssetPath[1]);
  return json({ error: "Not found." }, 404);
}

async function login(request, env) {
  const body = await readJson(request);
  if (!env.ADMIN_EMAIL || !env.ADMIN_KEY_HASH || !env.SESSION_SECRET) fail("Administrator authentication is not configured.", 503);
  if (String(body.email || "").trim().toLowerCase() !== String(env.ADMIN_EMAIL || "").trim().toLowerCase()) fail("Invalid administrator credentials.", 401);
  const password = String(body.password || "");
  if (!/^[a-f\d]{64}$/i.test(password)) fail("Invalid administrator credentials.", 401);
  const givenHash = hex(await crypto.subtle.digest("SHA-256", encoder.encode(password)));
  if (!constantTimeEqual(givenHash, env.ADMIN_KEY_HASH.toLowerCase())) fail("Invalid administrator credentials.", 401);
  const payload = base64url(encoder.encode(JSON.stringify({ sub: env.ADMIN_EMAIL, exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS })));
  const signature = await hmac(payload, env.SESSION_SECRET);
  return json({ token: `${payload}.${signature}`, expiresIn: SESSION_SECONDS });
}

async function isAdmin(request, env) {
  if (!env.SESSION_SECRET) return false;
  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return false;
  if (!constantTimeEqual(signature, await hmac(payload, env.SESSION_SECRET))) return false;
  try {
    const data = JSON.parse(new TextDecoder().decode(unbase64url(payload)));
    return data.sub?.toLowerCase() === String(env.ADMIN_EMAIL || "").toLowerCase() && data.exp > Date.now() / 1000;
  } catch { return false; }
}

async function hmac(value, secret) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value))));
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

function hex(bytes) {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function base64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function unbase64url(value) {
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function readJson(request) {
  const length = Number(request.headers.get("Content-Length") || 0);
  if (length > MAX_TEMPLATE_BYTES) fail("Template data exceeds the 1.9 MB limit.", 413);
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength > MAX_TEMPLATE_BYTES) fail("Template data exceeds the 1.9 MB limit.", 413);
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { fail("Request body must be valid JSON."); }
}

async function publicTemplates(env) {
  const { results } = await env.DB.prepare("SELECT id,title,description,category,featured,published,preview_asset_id,created_at,updated_at FROM templates WHERE published=1 ORDER BY featured DESC, updated_at DESC").all();
  return json(results.map(publicRow));
}

async function adminTemplates(env) {
  const { results } = await env.DB.prepare("SELECT id,title,description,category,featured,published,preview_asset_id,created_at,updated_at FROM templates ORDER BY updated_at DESC").all();
  return json(results.map(publicRow));
}

function publicRow(row) {
  return { id: row.id, name: row.title, title: row.title, description: row.description, category: row.category, featured: Boolean(row.featured), published: Boolean(row.published), preview_asset_id: row.preview_asset_id, preview_path: row.preview_asset_id, created_at: row.created_at, updated_at: row.updated_at };
}

async function getTemplate(env, id, admin) {
  const row = await env.DB.prepare("SELECT * FROM templates WHERE id=? AND (published=1 OR ?=1)").bind(id, Number(admin)).first();
  if (!row) fail("Template not found.", 404);
  return json({ ...publicRow(row), project: JSON.parse(row.project_json) });
}

async function getAsset(env, id, admin) {
  const row = await env.DB.prepare("SELECT a.kv_key,a.mime_type,a.byte_size,a.state, EXISTS(SELECT 1 FROM template_assets ta JOIN templates t ON t.id=ta.template_id WHERE ta.asset_id=a.id AND t.published=1) AS public FROM assets a WHERE a.id=?").bind(id).first();
  if (!row || row.state !== "active" || (!row.public && !admin)) fail("Asset not found.", 404);
  const value = await env.ASSETS.get(row.kv_key, { type: "arrayBuffer", cacheTtl: 30 });
  if (!value) fail("Template asset is unavailable. Retry later if it was just uploaded.", 503);
  return new Response(value, { headers: { "Content-Type": row.mime_type, "Content-Length": String(row.byte_size), "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox" } });
}

async function uploadAsset(request, env) {
  const mime = (request.headers.get("Content-Type") || "").split(";")[0].trim().toLowerCase();
  if (!IMAGE_TYPES.has(mime)) fail("Only PNG, JPEG, WebP, GIF, AVIF, and SVG image assets are accepted.");
  const declared = Number(request.headers.get("Content-Length") || 0);
  if (declared > MAX_ASSET_BYTES) fail("This asset is over 24 MiB. KV supports values up to 25 MiB; split the poster into smaller images.", 413);
  const bytes = await request.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > MAX_ASSET_BYTES) fail("Asset must be between 1 byte and 24 MiB. KV values have a 25 MiB maximum.", 413);
  const current = await env.DB.prepare("SELECT COALESCE(SUM(byte_size),0) AS total FROM assets").first();
  if (current.total + bytes.byteLength > MAX_ACCOUNT_ASSET_BYTES) fail("Shared image storage is nearing the 1 GiB free KV allowance. Remove unused assets or reduce the number of shared graphics.", 413);
  const id = crypto.randomUUID();
  const kvKey = crypto.randomUUID();
  try {
    await env.DB.prepare("INSERT INTO assets(id,kv_key,mime_type,byte_size,state,created_at) VALUES(?,?,?,?,'uploading',?)").bind(id, kvKey, mime, bytes.byteLength, new Date().toISOString()).run();
  } catch (error) {
    if (String(error?.message).includes("asset_storage_budget")) fail("Shared image storage is nearing the free KV allowance. Remove unused assets before uploading more.", 413);
    throw error;
  }
  try {
    await env.ASSETS.put(kvKey, bytes, { metadata: { contentType: mime } });
    await env.DB.prepare("UPDATE assets SET state='active' WHERE id=?").bind(id).run();
    return json({ id, byteSize: bytes.byteLength }, 201);
  } catch {
    await env.DB.prepare("DELETE FROM assets WHERE id=?").bind(id).run().catch(() => {});
    await env.ASSETS.delete(kvKey).catch(() => {});
    fail("Cloudflare KV could not store this image. Its free-tier size or daily write allowance may have been reached; retry later or use a smaller file.", 507);
  }
}

function getAssetIds(project, previewId) {
  const ids = new Set([previewId]);
  const visit = (value) => {
    if (typeof value === "string") {
      const match = /^asset:\/\/([\w-]+)$/.exec(value);
      if (match) ids.add(match[1]);
    } else if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === "object") Object.values(value).forEach(visit);
  };
  visit(project);
  return [...ids];
}

function validRecord(body) {
  const title = String(body.name ?? body.title ?? "").trim();
  const category = String(body.category ?? "").trim();
  const description = String(body.description ?? "");
  const previewId = String(body.preview_asset_id ?? body.preview_path ?? "");
  if (!title || title.length > 100 || !category || category.length > 60 || description.length > 500) fail("Template name, category, or description exceeds the allowed length.");
  if (!body.project || typeof body.project !== "object" || Array.isArray(body.project)) fail("Editable template project data is required.");
  if (!/^[\w-]+$/.test(previewId)) fail("A valid uploaded preview asset is required.");
  const serialized = JSON.stringify(body.project);
  if (encoder.encode(serialized).byteLength > MAX_TEMPLATE_BYTES) fail("Template project data exceeds 1.9 MB. Reduce poster metadata and retry.", 413);
  const assets = getAssetIds(body.project, previewId);
  if (assets.length > MAX_TEMPLATE_ASSETS) fail(`A template can use at most ${MAX_TEMPLATE_ASSETS} unique image assets.`, 413);
  return { title, category, description, previewId, project: serialized, assets };
}

async function linkStatements(env, templateId, assetIds) {
  const unique = [...new Set(assetIds)];
  const rows = unique.length ? await env.DB.prepare(`SELECT id,state FROM assets WHERE id IN (${unique.map(() => "?").join(",")})`).bind(...unique).all() : { results: [] };
  if (rows.results.length !== unique.length || rows.results.some((row) => row.state !== "active")) fail("One or more uploaded template assets are missing or unavailable. Retry the upload.", 409);
  return [env.DB.prepare("DELETE FROM template_assets WHERE template_id=?").bind(templateId), ...unique.map((assetId) => env.DB.prepare("INSERT INTO template_assets(template_id,asset_id) VALUES(?,?)").bind(templateId, assetId))];
}

async function createTemplate(request, env) {
  const body = await readJson(request);
  const record = validRecord(body);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const fields = env.DB.prepare("INSERT INTO templates(id,title,description,category,featured,published,project_json,preview_asset_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)")
    .bind(id, record.title, record.description, record.category, Number(Boolean(body.featured)), Number(Boolean(body.published)), record.project, record.previewId, now, now);
  const links = record.assets.map((assetId) => env.DB.prepare("INSERT INTO template_assets(template_id,asset_id) VALUES(?,?)").bind(id, assetId));
  await env.DB.batch([fields, ...links]);
  return json({ id }, 201);
}

async function updateTemplate(request, env, id) {
  const body = await readJson(request);
  const old = await env.DB.prepare("SELECT * FROM templates WHERE id=?").bind(id).first();
  if (!old) fail("Template not found.", 404);
  const record = body.project ? validRecord({ ...old, ...body }) : null;
  const title = String(body.name ?? body.title ?? old.title).trim();
  const category = String(body.category ?? old.category).trim();
  const description = String(body.description ?? old.description);
  if (!title || title.length > 100 || !category || category.length > 60 || description.length > 500) fail("Template name, category, or description exceeds the allowed length.");
  const published = body.published === undefined ? old.published : Number(Boolean(body.published));
  const featured = body.featured === undefined ? old.featured : Number(Boolean(body.featured));
  const project = record?.project ?? old.project_json;
  const previewId = record?.previewId ?? old.preview_asset_id;
  const assets = record?.assets ?? (await env.DB.prepare("SELECT asset_id FROM template_assets WHERE template_id=?").bind(id).all()).results.map((row) => row.asset_id);
  const update = env.DB.prepare("UPDATE templates SET title=?,description=?,category=?,featured=?,published=?,project_json=?,preview_asset_id=?,updated_at=? WHERE id=?")
    .bind(title, description, category, featured, published, project, previewId, new Date().toISOString(), id);
  const results = await env.DB.batch([update, ...await linkStatements(env, id, assets)]);
  if (results[0]?.success !== true) fail("The template update could not be confirmed. Retry in a moment.", 500);
  if (results[0].meta?.changes !== 1) fail("The template was not updated. Refresh and try again.", 409);
  return json({ updated: true });
}

async function deleteTemplate(env, id) {
  await env.DB.prepare("DELETE FROM templates WHERE id=?").bind(id).run();
  await cleanupUnlinkedAssets(env);
  return json({ deleted: true });
}

async function deleteAsset(env, id) {
  const row = await env.DB.prepare("SELECT id,kv_key FROM assets WHERE id=?").bind(id).first();
  if (!row) return json({ deleted: true });
  const marked = await env.DB.prepare("UPDATE assets SET state='deleting' WHERE id=? AND state='active' AND NOT EXISTS (SELECT 1 FROM template_assets WHERE asset_id=?)").bind(id, id).run();
  if (!marked.meta?.changes) fail("This asset is still used by a template or is being removed.", 409);
  await env.ASSETS.delete(row.kv_key);
  await env.DB.prepare("DELETE FROM assets WHERE id=?").bind(id).run();
  return json({ deleted: true });
}

async function cleanupUnlinkedAssets(env) {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { results } = await env.DB.prepare("SELECT a.id,a.kv_key FROM assets a LEFT JOIN template_assets ta ON ta.asset_id=a.id WHERE ta.asset_id IS NULL AND (a.state='deleting' OR (a.state='uploading' AND a.created_at<?) OR (a.state='active' AND a.created_at<?)) LIMIT 100").bind(cutoff, cutoff).all();
  for (const row of results) {
    const marked = await env.DB.prepare("UPDATE assets SET state='deleting' WHERE id=? AND NOT EXISTS (SELECT 1 FROM template_assets WHERE asset_id=?)").bind(row.id, row.id).run();
    if (!marked.meta?.changes) continue;
    await env.ASSETS.delete(row.kv_key);
    await env.DB.prepare("DELETE FROM assets WHERE id=?").bind(row.id).run();
  }
  return json({ cleaned: results.length });
}

export { getAssetIds, validRecord, constantTimeEqual };
