import { readAdminSessionToken, verifyAdminSession, writeAdminSessionToken } from "./adminExperience.js";

const apiUrl = import.meta.env?.VITE_TEMPLATE_API_URL?.replace(/\/$/, "");
let adminToken = null;

function currentAdminToken() {
  if (!adminToken) adminToken = readAdminSessionToken();
  return adminToken;
}
function updateAdminToken(token) {
  adminToken = token;
  writeAdminSessionToken(token);
}

export const onlineTemplatesConfigured = Boolean(apiUrl);

function requireConfig() {
  if (!onlineTemplatesConfigured) throw new Error("Online templates are not configured. Set VITE_TEMPLATE_API_URL to the Cloudflare Worker API URL.");
}

async function request(path, { method = "GET", body, token = currentAdminToken(), headers = {} } = {}) {
  requireConfig();
  let response;
  try {
    const binaryBody = body instanceof ArrayBuffer || body instanceof Blob;
    response = await fetch(`${apiUrl}${path}`, {
      method,
      headers: { ...(body === undefined || binaryBody ? {} : { "Content-Type": "application/json" }), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
      ...(body === undefined ? {} : { body: binaryBody ? body : JSON.stringify(body) }),
    });
  } catch {
    throw new Error("The shared template service could not be reached. Check your connection and try again.");
  }
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail.error || `Shared template request failed (${response.status}).`);
  }
  if (response.status === 204) return null;
  return response.headers.get("Content-Type")?.includes("application/json") ? response.json() : response;
}

async function assetDataUrl(id, admin = false) {
  const response = await request(`/api/assets/${encodeURIComponent(id)}`, { token: admin ? currentAdminToken() : null });
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("A shared template image could not be decoded."));
    reader.readAsDataURL(blob);
  });
}

async function uploadSource(source, onProgress) {
  if (typeof source !== "string") return source;
  if (source.startsWith("asset://")) return source;
  if (!source.startsWith("data:image/") && !source.startsWith("blob:")) return source;
  let blob;
  try {
    const response = await fetch(source);
    if (!response.ok) throw new Error();
    blob = await response.blob();
  } catch {
    throw new Error("An image asset could not be read from this browser. Reimport the original image and retry.");
  }
  if (!blob.type.startsWith("image/")) throw new Error("Only image assets can be shared in online templates.");
  const uploaded = await request("/api/admin/assets", { method: "POST", body: await blob.arrayBuffer(), headers: { "Content-Type": blob.type } });
  onProgress?.(100);
  return `asset://${uploaded.id}`;
}

async function transformProject(value, mapper, { uploading = false, inFonts = false, admin = false } = {}) {
  if (Array.isArray(value)) return Promise.all(value.map((item) => transformProject(item, mapper, { uploading, inFonts, admin })));
  if (!value || typeof value !== "object") {
    if (typeof value === "string" && value.startsWith("asset://") && !uploading) return assetDataUrl(value.slice(8), admin);
    if (typeof value === "string" && (value.startsWith("data:image/") || value.startsWith("blob:")) && uploading) return mapper(value);
    if (typeof value === "string" && value.startsWith("asset://") && uploading) return value;
    return value;
  }
  const result = {};
  for (const [key, entry] of Object.entries(value)) {
    if (inFonts && ["src", "data", "blob", "file", "fileData", "fontData"].includes(key)) continue;
    result[key] = await transformProject(entry, mapper, { uploading, inFonts: inFonts || key === "customFonts", admin });
  }
  return result;
}

async function loadRows(rows, admin) {
  return Promise.all(rows.map(async (row) => {
    const previewId = row.preview_asset_id || row.preview_path;
    return {
      id: row.id, name: row.name || row.title, description: row.description, category: row.category,
      featured: row.featured, published: row.published,
      preview: admin ? await assetDataUrl(previewId, true) : `${apiUrl}/api/assets/${encodeURIComponent(previewId)}`,
      preview_path: previewId,
      source: "online", order: 0, createdAt: Date.parse(row.created_at), updatedAt: Date.parse(row.updated_at),
    };
  }));
}

export async function adminSignIn(email, password) {
  const result = await request("/api/admin/login", { method: "POST", body: { email, password }, token: null });
  updateAdminToken(result.token);
  try {
    const state = await request("/api/admin/session");
    if (!state.authenticated) throw new Error("Administrator session could not be verified.");
  } catch (error) {
    updateAdminToken(null);
    throw error;
  }
}

export async function adminSignOut() {
  const token = currentAdminToken();
  updateAdminToken(null);
  if (onlineTemplatesConfigured && token) await request("/api/admin/session", { method: "DELETE", token }).catch(() => {});
}

export async function checkAdminSession() {
  if (!currentAdminToken()) return false;
  const authenticated = await verifyAdminSession(request);
  if (!authenticated) updateAdminToken(null);
  return authenticated;
}

export async function listOnlineTemplates(admin = false) {
  if (!onlineTemplatesConfigured) return [];
  const rows = await request(admin ? "/api/admin/templates" : "/api/templates", { token: admin ? currentAdminToken() : null });
  return loadRows(rows, admin);
}

export async function getOnlineTemplate(id) {
  const detail = await request(`/api/templates/${encodeURIComponent(id)}`);
  return transformProject(detail.project, null, { admin: Boolean(currentAdminToken()) });
}

export async function saveOnlineTemplate(template, existingId = null, onProgress = null) {
  if (!currentAdminToken()) throw new Error("Sign in as an administrator to manage shared templates.");
  const uploaded = [];
  const mapper = async (source) => {
    const result = await uploadSource(source, onProgress);
    if (result !== source && result.startsWith("asset://")) uploaded.push(result.slice(8));
    return result;
  };
  try {
    const project = await transformProject(template.project, mapper, { uploading: true });
    const preview = await uploadSource(template.preview, onProgress);
    if (preview.startsWith("asset://") && preview !== template.preview) uploaded.push(preview.slice(8));
    const body = { name: template.name, description: template.description || "", category: template.category, featured: Boolean(template.featured), published: Boolean(template.published), project, preview_asset_id: preview.startsWith("asset://") ? preview.slice(8) : template.preview_path };
    if (!body.preview_asset_id) throw new Error("A valid preview image is required to save this template.");
    return await request(existingId ? `/api/admin/templates/${encodeURIComponent(existingId)}` : "/api/admin/templates", { method: existingId ? "PATCH" : "POST", body });
  } catch (error) {
    await Promise.allSettled(uploaded.map((id) => request(`/api/admin/assets/${encodeURIComponent(id)}`, { method: "DELETE" })));
    throw error;
  }
}

export async function deleteOnlineTemplate(template) {
  await request(`/api/admin/templates/${encodeURIComponent(template.id)}`, { method: "DELETE" });
}

export async function cleanupOnlineAssets() {
  throw new Error("Global asset cleanup is disabled because it can delete unrelated orphaned assets.");
}

export async function updateOnlineTemplate(template, values) {
  await request(`/api/admin/templates/${encodeURIComponent(template.id)}`, { method: "PATCH", body: {
    name: values.name, description: values.description ?? template.description ?? "", category: values.category,
    featured: values.featured ?? template.featured, published: values.published ?? template.published,
  } });
}
