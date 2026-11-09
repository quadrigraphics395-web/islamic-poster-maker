// The Cloudflare Worker authorizes admin requests using its signed session token.
// Client-side state never grants admin permission by itself.
export function canManageTemplates() {
  return false;
}
