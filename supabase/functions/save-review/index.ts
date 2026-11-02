import { createClient } from "@supabase/supabase-js";
import { reviewSubmissionSchema } from "../../../shared/bonus-schema.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};

function reply(status: number, body: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

function imageType(bytes: Uint8Array): string | null {
  // Verify image signatures and container endings; never accept SVG or trust file extensions.
  if (bytes.length < 24) return null;
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)
    && new TextDecoder().decode(bytes.slice(12, 16)) === "IHDR"
    && new TextDecoder().decode(bytes.slice(-8, -4)) === "IEND") return "image/png";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 && bytes.at(-2) === 255 && bytes.at(-1) === 217) return "image/jpeg";
  if (new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF"
    && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP"
    && new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(4, true) + 8 === bytes.length) return "image/webp";
  return null;
}

async function readForm(request: Request, maxBytes: number) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Invalid form");
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > maxBytes + 32768) { await reader.cancel(); throw new RangeError("Upload too large"); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return new Response(bytes, { headers: { "Content-Type": request.headers.get("Content-Type") ?? "" } }).formData();
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  if (request.method !== "POST") return reply(405, { error: "Method not allowed." });
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const publicKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !publicKey || !serviceKey) return reply(503, { error: "Review uploads need owner setup." });
    const authorization = request.headers.get("Authorization") ?? "";
    if (!authorization.startsWith("Bearer ")) return reply(401, { error: "Sign in again." });
    const userClient = createClient(url, publicKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data: identity, error: identityError } = await userClient.auth.getUser(authorization.slice(7));
    if (identityError || !identity.user) return reply(401, { error: "Sign in again." });
    const { data: member, error: memberError } = await userClient.from("workspace_members").select("user_id").eq("user_id", identity.user.id).maybeSingle();
    if (memberError || !member) return reply(403, { error: "Workspace access is required." });
    const { data: settings, error: settingsError } = await userClient.from("tracker_settings").select("screenshot_max_bytes").eq("id", true).single();
    if (settingsError || !settings?.screenshot_max_bytes) return reply(422, { error: "The owner needs to configure the screenshot size limit." });
    const form = await readForm(request, settings.screenshot_max_bytes);
    const rawRecord = form.get("record");
    if (typeof rawRecord !== "string") return reply(400, { error: "Review details are missing." });
    let decoded: unknown;
    try { decoded = JSON.parse(rawRecord); } catch { return reply(400, { error: "Review details are invalid." }); }
    const parsed = reviewSubmissionSchema.safeParse(decoded);
    if (!parsed.success) return reply(400, { error: parsed.error.issues[0]?.message ?? "Check the review fields." });
    const file = form.get("screenshot");
    if (!(file instanceof File) || file.size < 1 || file.size > settings.screenshot_max_bytes) return reply(413, { error: "Choose one screenshot within the configured size limit." });
    const bytes = new Uint8Array(await file.arrayBuffer());
    const mime = imageType(bytes);
    if (!mime || mime !== file.type) return reply(400, { error: "Use a valid PNG, JPEG, or WebP screenshot." });
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const hash = Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
    const record = parsed.data;
    const owner = identity.user.id;
    // Both context and store existence are checked with caller permissions before privileged writes.
    const [profile, store] = await Promise.all([
      userClient.from("tracker_people").select("user_id").eq("user_id", owner).maybeSingle(),
      userClient.from("tracker_stores").select("id").eq("id", record.store_id).maybeSingle(),
    ]);
    if (profile.error || !profile.data || store.error || !store.data) return reply(400, { error: "Ask the owner to finish your name and store setup." });
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: existing, error: existingError } = await admin.from("bonus_entries").select("id,owner_id,kind,store_id,work_date,note,screenshot_hash").eq("id", record.id).maybeSingle();
    if (existingError) return reply(503, { error: "Save could not be confirmed. Retry the same entry." });
    if (existing) {
      if (existing.owner_id === owner && existing.kind === "review" && existing.store_id === record.store_id
        && existing.work_date === record.work_date && existing.note === record.note && existing.screenshot_hash === hash) return reply(200, { id: record.id });
      return reply(409, { error: "Save reference already used. Contact the owner before retrying." });
    }
    const path = `${owner}/${record.id}`;
    const uploaded = await admin.storage.from("review-evidence").upload(path, bytes, { contentType: mime, upsert: false, cacheControl: "0" });
    if (uploaded.error) {
      // A previous interrupted attempt may have uploaded this exact file. Verify before resuming.
      const prior = await admin.storage.from("review-evidence").download(path);
      if (prior.error || !prior.data) return reply(503, { error: "Upload could not be confirmed. Retry the same entry." });
      const priorHash = await crypto.subtle.digest("SHA-256", await prior.data.arrayBuffer());
      const priorHex = Array.from(new Uint8Array(priorHash), (value) => value.toString(16).padStart(2, "0")).join("");
      if (priorHex !== hash) return reply(409, { error: "Screenshot reference already used. Contact the owner." });
    }
    const inserted = await admin.from("bonus_entries").insert({ ...record, owner_id: owner, kind: "review", screenshot_path: path, screenshot_hash: hash });
    if (inserted.error) return reply(503, { error: "Save could not be confirmed. Retry the same entry." });
    return reply(200, { id: record.id });
  } catch (error: unknown) {
    if (error instanceof RangeError) return reply(413, { error: "The screenshot exceeds the configured size limit." });
    return reply(503, { error: "Save could not be confirmed. Retry the same entry." });
  }
});
