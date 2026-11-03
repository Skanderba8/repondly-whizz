import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getPublicEnvironment } from "@/lib/env";
import { reviewSubmissionSchema, doordashSubmissionSchema } from "../../shared/bonus-schema";
import { draftKey, readDraft, writeDraft, type Kind } from "./drafts";

const messageSchema = z.object({
  type: z.enum(["save", "status"]), owner: z.uuid(), kind: z.enum(["review", "doordash"]),
  token: z.string().min(1).optional(),
});
const active = new Map<string, Promise<void>>();

class RejectedSave extends Error {}

async function save(owner: string, kind: Kind, token: string) {
  const draft = await readDraft(owner, kind);
  if (!draft || !["saving", "uncertain"].includes(draft.status)) throw new Error("No pending entry.");
  const { url, publishableKey } = getPublicEnvironment();
  const client = createClient(url, publishableKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  try {
    const identity = await client.auth.getUser(token);
    if (identity.error || identity.data.user?.id !== owner) throw new RejectedSave("Sign in again, then retry this same entry.");
    const common = { id: draft.id, store_id: draft.storeId, work_date: draft.date };
    if (kind === "review") {
      const record = reviewSubmissionSchema.parse({ ...common, note: draft.note });
      if (!draft.file) throw new Error("The screenshot is missing. Contact the owner before creating another entry.");
      const body = new FormData();
      body.set("record", JSON.stringify(record));
      body.set("screenshot", draft.file, draft.fileName);
      const result = await client.functions.invoke("save-review", { body });
      if (result.error?.context instanceof Response && [400, 401, 403, 404, 413, 415, 422, 429].includes(result.error.context.status)) {
        const detail: unknown = await result.error.context.json().catch(() => null);
        const rejected = z.object({ error: z.string().max(1000) }).safeParse(detail);
        throw new RejectedSave(result.error.context.status === 404 ? "Review uploads need owner setup. Deploy the existing save-review function, then retry." : rejected.success ? rejected.data.error : "The upload was rejected. Check the screenshot and fields, then retry.");
      }
      const response = z.object({ id: z.uuid() }).safeParse(result.data);
      if (result.error || !response.success || response.data.id !== draft.id) throw new Error("We could not confirm this upload. Retry the same entry. If it still fails, ask the owner to check upload setup and access.");
    } else {
      const record = doordashSubmissionSchema.parse({ ...common, subscription_number: draft.subscription, dd_proof_added: draft.proof });
      if (!record.dd_proof_added) throw new Error("DD proof must be checked.");
      const result = await client.rpc("save_doordash", { p_id: record.id, p_store_id: record.store_id, p_work_date: record.work_date, p_subscription: record.subscription_number, p_proof: record.dd_proof_added });
      if (result.error || result.data !== draft.id) throw new Error("We could not confirm this save. Retry the same entry. Do not create another copy.");
    }
    await writeDraft({ ...draft, id: crypto.randomUUID(), note: "", subscription: "", proof: false, file: null, fileName: "", status: "saved", unconfirmed: false, message: kind === "review" ? "Review saved." : "DoorDash subscription saved." });
    void chrome.runtime.sendMessage({ type: "saved", owner }).catch(() => {});
  } catch (error) {
    const uncertain = !(error instanceof RejectedSave) || draft.unconfirmed;
    await writeDraft({ ...draft, status: uncertain ? "uncertain" : "draft", unconfirmed: uncertain, message: error instanceof Error ? error.message : "Save not confirmed. Retry the same entry." });
  }
}

chrome.runtime.onMessage.addListener((raw, sender, reply) => {
  if (sender.id !== chrome.runtime.id || sender.url !== `chrome-extension://${chrome.runtime.id}/popup.html`) return;
  const parsed = messageSchema.safeParse(raw);
  if (!parsed.success) return;
  const message = parsed.data;
  const key = draftKey(message.owner, message.kind);
  if (message.type === "status") { reply({ active: active.has(key) }); return; }
  if (!message.token) return;
  let request = active.get(key);
  if (!request) {
    request = save(message.owner, message.kind, message.token);
    active.set(key, request);
    void request.finally(() => active.delete(key)).catch(() => {});
  }
  void request.then(() => reply({ finished: true }), () => reply({ finished: false }));
  return true;
});
