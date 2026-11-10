export const ADMIN_TOKEN_STORAGE_KEY = "qadri-poster-maker.admin-session-token";

export function advanceLogoClickSequence(sequence, now, windowMs = 3000, requiredClicks = 5) {
  const expired = !sequence?.count || now - (sequence.startedAt ?? now) > windowMs;
  const startedAt = expired ? now : sequence.startedAt;
  const count = expired ? 1 : sequence.count + 1;
  return { count: count >= requiredClicks ? 0 : count, startedAt: count >= requiredClicks ? now : startedAt, revealed: count >= requiredClicks };
}

export function publishedGalleryTemplates(templates = []) {
  return templates.filter((template) => template?.source === "online" && template.published === true);
}

export function shouldShowSaveAsTemplate(isVerifiedAdministrator) {
  return isVerifiedAdministrator === true;
}

export async function verifyAdminSession(request) {
  try { return Boolean((await request("/api/admin/session")).authenticated); }
  catch { return false; }
}

export function readAdminSessionToken(storage = globalThis.sessionStorage) {
  try { return storage?.getItem(ADMIN_TOKEN_STORAGE_KEY) ?? null; }
  catch { return null; }
}

export function writeAdminSessionToken(token, storage = globalThis.sessionStorage) {
  try {
    if (token) storage?.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
    else storage?.removeItem(ADMIN_TOKEN_STORAGE_KEY);
  } catch { /* The backend still verifies the in-memory signed token. */ }
}

export function adminSessionRemainingMs(token) {
  try {
    const payload = token.split(".")[0].replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, "=")));
    return Math.max(0, decoded.exp * 1000 - Date.now());
  } catch { return 0; }
}
