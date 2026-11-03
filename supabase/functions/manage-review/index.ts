import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { reviewMutationSchema } from "../../../shared/review-mutation-schema.ts";
import { inspectScreenshot, screenshotDimensionsAllowed, screenshotMaxBytes } from "../../../shared/screenshot-policy.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};
function reply(status: number, error: string, code: string) {
  return new Response(JSON.stringify({ error, code }), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
async function sha256(bytes: Uint8Array) {
  const result = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(result), (value) => value.toString(16).padStart(2, "0")).join("");
}
async function readForm(request: Request) {
  if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("multipart/form-data;")) throw new TypeError();
  const max = screenshotMaxBytes + 32768;
  if (Number(request.headers.get("Content-Length")) > max) throw new RangeError();
  const reader = request.body?.getReader();
  if (!reader) throw new TypeError();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) { await reader.cancel(); throw new RangeError(); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return new Response(bytes, { headers: { "Content-Type": request.headers.get("Content-Type")! } }).formData();
}
const receiptSchema = z.object({
  id: z.uuid(), record_id: z.uuid(), actor_id: z.uuid(), owner_id: z.uuid(),
  action: z.enum(["edit", "delete"]), request_hash: z.string(),
  cleanup_paths: z.array(z.string()), completed_at: z.string().nullable(),
});

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  if (request.method !== "POST") return reply(405, "Method not allowed.", "method");
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_ANON_KEY");
    const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key || !secret) return reply(503, "Review management needs owner setup.", "setup");
    const authorization = request.headers.get("Authorization") ?? "";
    if (!authorization.startsWith("Bearer ")) return reply(401, "Sign in again before changing this review.", "auth");
    const caller = createClient(url, key, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
    const identity = await caller.auth.getUser(authorization.slice(7));
    if (identity.error || !identity.data.user) return reply(401, "Sign in again before changing this review.", "auth");
    const actor = identity.data.user.id;
    const membership = await caller.from("workspace_members").select("role").eq("user_id", actor).maybeSingle();
    if (membership.error || !membership.data) return reply(403, "Workspace access is required.", "access");
    let form: FormData;
    try { form = await readForm(request); }
    catch (error) { return error instanceof RangeError ? reply(413, "Use a screenshot up to 10 MB.", "size") : reply(400, "The upload was incomplete. Retry with the same details.", "form"); }
    if (form.getAll("record").length !== 1 || form.getAll("screenshot").length > 1
      || Array.from(form.keys()).some((name) => name !== "record" && name !== "screenshot")) return reply(400, "Send one review change and at most one screenshot.", "form");
    let raw: unknown;
    try { raw = JSON.parse(String(form.get("record"))); } catch { return reply(400, "Review details are invalid.", "fields"); }
    const parsed = reviewMutationSchema.safeParse(raw);
    if (!parsed.success) return reply(400, parsed.error.issues[0]?.message ?? "Check the review fields.", "fields");
    const record = parsed.data;
    const file = form.get("screenshot");
    if (record.action === "delete" && file !== null) return reply(400, "Deletion does not accept a new screenshot.", "fields");
    let imageBytes: Uint8Array | null = null;
    let imageHash: string | null = null;
    let imageMime: string | null = null;
    if (file !== null) {
      const settings = await caller.from("tracker_settings").select("screenshot_max_bytes").eq("id", true).single();
      const max = Math.min(settings.data?.screenshot_max_bytes ?? 0, screenshotMaxBytes);
      if (settings.error || !max) return reply(422, "The owner needs to configure screenshot storage.", "setup");
      if (!(file instanceof File) || !file.size || file.size > max) return reply(413, "Choose one screenshot within the configured size limit.", "size");
      imageBytes = new Uint8Array(await file.arrayBuffer());
      const image = inspectScreenshot(imageBytes);
      if (!image || image.mime !== file.type || !screenshotDimensionsAllowed(image)) return reply(400, "Use a valid PNG, JPEG, or WebP up to 24 megapixels and 16,384 pixels per side.", "image");
      imageMime = image.mime;
      imageHash = await sha256(imageBytes);
    }
    const requestHash = await sha256(new TextEncoder().encode(JSON.stringify({ ...record, image_hash: imageHash })));
    const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
    const prior = await admin.from("review_mutations").select("*").eq("id", record.operation_id).maybeSingle();
    if (prior.error) return reply(503, "Apply the review management migration before retrying.", "setup");
    let receipt: z.infer<typeof receiptSchema>;
    if (prior.data) {
      receipt = receiptSchema.parse(prior.data);
      if (receipt.actor_id !== actor || receipt.record_id !== record.id || receipt.request_hash !== requestHash
        || receipt.action !== record.action) return reply(409, "This change reference is already in use. Keep the same details and contact the owner.", "reference");
      if (receipt.owner_id !== actor && membership.data.role !== "manager") return reply(403, "You cannot change this review.", "access");
    } else {
      // Read under the caller's RLS before any privileged object write.
      const current = await caller.from("bonus_entries").select("id,owner_id,review_version").eq("id", record.id).eq("kind", "review").maybeSingle();
      if (current.error) return reply(503, "Review management setup is unavailable. Ask the owner to apply migration 006.", "setup");
      if (!current.data) return reply(404, "This review is no longer available or you do not have access.", "missing");
      if (current.data.owner_id !== actor && membership.data.role !== "manager") return reply(403, "You cannot change this review.", "access");
      if (current.data.review_version !== record.version) return reply(409, "This review changed. Close and reopen it to load the latest version.", "stale");
      const imagePath = imageBytes ? `${current.data.owner_id}/${record.id}/${record.operation_id}` : null;
      if (imagePath && imageBytes && imageMime) {
        const upload = await admin.storage.from("review-evidence").upload(imagePath, imageBytes, { upsert: false, contentType: imageMime, cacheControl: "0" });
        if (upload.error) {
          const existing = await admin.storage.from("review-evidence").download(imagePath);
          if (existing.error || !existing.data) return reply(503, "The replacement upload could not be confirmed. Retry this same change.", "uncertain");
          if (await sha256(new Uint8Array(await existing.data.arrayBuffer())) !== imageHash) return reply(409, "The replacement reference conflicts. Contact the owner.", "reference");
        }
      }
      const applied = await admin.rpc("apply_review_mutation", {
        p_operation: record.operation_id, p_actor: actor, p_id: record.id, p_action: record.action,
        p_version: record.version, p_request_hash: requestHash,
        p_store: record.action === "edit" ? record.store_id : null,
        p_date: record.action === "edit" ? record.work_date : null,
        p_note: record.action === "edit" ? record.note : null,
        p_image_path: imagePath, p_image_hash: imageHash,
      });
      if (applied.error) {
        // Only deterministic database rejections are safe to clean up immediately.
        if (["42501", "40001", "P0002", "22023"].includes(applied.error.code)) {
          if (imagePath) await admin.storage.from("review-evidence").remove([imagePath]);
          if (applied.error.code === "42501") return reply(403, "You cannot change this review.", "access");
          if (applied.error.code === "P0002") return reply(404, "This review is no longer available.", "missing");
          return reply(409, "This review changed. Close and reopen it to load the latest version.", "stale");
        }
        return reply(503, "The change could not be confirmed. Retry this same change.", "uncertain");
      }
      receipt = receiptSchema.parse(applied.data);
    }
    if (!receipt.completed_at) {
      // Use Storage API to delete actual objects, never SQL deletion of storage metadata.
      for (let offset = 0; offset < receipt.cleanup_paths.length; offset += 100) {
        const removed = await admin.storage.from("review-evidence").remove(receipt.cleanup_paths.slice(offset, offset + 100));
        if (removed.error) return reply(503, "The review change is saved, but screenshot cleanup is unfinished. Retry this same change to finish.", "cleanup_pending");
      }
      const completed = await admin.from("review_mutations").update({ completed_at: new Date().toISOString() }).eq("id", receipt.id).select("id").single();
      if (completed.error) return reply(503, "Screenshot cleanup confirmation is pending. Retry this same change.", "cleanup_pending");
    }
    return new Response(JSON.stringify({ id: record.id, operation_id: record.operation_id, action: record.action, complete: true }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch {
    return reply(503, "The change could not be confirmed. Keep these details and retry this same change.", "uncertain");
  }
});
