import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type" };

function references(value: unknown, path: string): boolean {
  if (typeof value === "string") return value === `storage://${path}`;
  if (Array.isArray(value)) return value.some((item) => references(item, path));
  if (value && typeof value === "object") return Object.values(value).some((item) => references(item, path));
  return false;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  const path = new URL(request.url).searchParams.get("path");
  if (!path || path.includes("..") || path.startsWith("/")) return Response.json({ error: "Invalid asset path." }, { status: 400, headers: cors });
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const client = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  let admin = false;
  if (token) {
    const { data: { user } } = await client.auth.getUser(token);
    if (user) {
      const { data } = await client.from("template_admins").select("user_id").eq("user_id", user.id).maybeSingle();
      admin = Boolean(data);
    }
  }
  let query = client.from("templates").select("project,preview_path");
  if (!admin) query = query.eq("published", true);
  const { data: templates, error } = await query;
  if (error) return Response.json({ error: "Could not verify published template asset." }, { status: 503, headers: cors });
  const isPublishedAsset = templates.some((template) => template.preview_path === path || references(template.project, path));
  if (!isPublishedAsset) return Response.json({ error: "Asset not found." }, { status: 404, headers: cors });
  const { data, error: signError } = await client.storage.from("template-assets").createSignedUrl(path, 90);
  if (signError || !data) return Response.json({ error: "Asset URL could not be created." }, { status: 404, headers: cors });
  return Response.json({ signedUrl: data.signedUrl }, { headers: cors });
});
