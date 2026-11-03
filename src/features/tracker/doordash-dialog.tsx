"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { RecordDialog } from "@/components/ui/record-dialog";
import { Select } from "@/components/ui/select";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { getSupabaseClient } from "@/lib/supabase/client";
import { doordashSubmissionSchema } from "../../../shared/bonus-schema";
import { dateLabel, localDate } from "./domain";
import { useTracker } from "./tracker-provider";

const entrySchema = z.object({
  id: z.uuid(), owner_id: z.uuid(), store_id: z.uuid(), work_date: z.string(),
  subscription_number: z.string(), dd_proof_added: z.boolean(), doordash_version: z.number().int().nonnegative(),
});
type Entry = z.infer<typeof entrySchema>;

export function DoorDashDialog({ id, action, onClose }: { id: string; action: "edit" | "delete"; onClose: () => void }) {
  const { context, invalidate } = useTracker();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState("");
  const [date, setDate] = useState("");
  const [subscription, setSubscription] = useState("");
  const [proof, setProof] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [message, setMessage] = useState("");
  const [canReload, setCanReload] = useState(false);
  const [complete, setComplete] = useState(false);
  const operation = useRef("");
  const inFlight = useRef(false);
  const feedback = useRef<HTMLDivElement>(null);
  const doneButton = useRef<HTMLButtonElement>(null);
  const store = context?.stores.find((row) => row.id === storeId);
  const locked = busy || uncertain;

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const result = await getSupabaseClient().from("bonus_entries")
          .select("id,owner_id,store_id,work_date,subscription_number,dd_proof_added,doordash_version")
          .eq("id", id).eq("kind", "doordash").maybeSingle();
        if (result.error) throw new Error("DoorDash management could not load. Apply migration 007, or retry.");
        if (!result.data) throw new Error("This entry is no longer available or you do not have access.");
        const data = entrySchema.parse(result.data);
        if (active) { setEntry(data); setStoreId(data.store_id); setDate(data.work_date); setSubscription(data.subscription_number); setProof(data.dd_proof_added); setMessage(""); }
      } catch (error) {
        if (active) { setMessage(error instanceof Error ? error.message : "This entry could not be loaded."); setCanReload(true); }
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [id, reload]);
  useEffect(() => { if (message) feedback.current?.focus(); }, [message]);
  useEffect(() => { if (complete) doneButton.current?.focus(); }, [complete]);

  function reloadEntry() {
    operation.current = ""; setEntry(null); setMessage(""); setCanReload(false);
    setLoading(true); setReload((value) => value + 1);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!entry || inFlight.current) return;
    const parsed = doordashSubmissionSchema.safeParse({ id, store_id: storeId, work_date: date, subscription_number: subscription, dd_proof_added: proof });
    if (action === "edit" && !parsed.success) { setMessage(parsed.error.issues[0]?.message ?? "Check the fields."); return; }
    if (!operation.current) operation.current = crypto.randomUUID();
    inFlight.current = true; setBusy(true); setMessage(""); setCanReload(false);
    try {
      const result = await getSupabaseClient().rpc("manage_doordash", {
        p_operation: operation.current, p_id: id, p_action: action, p_version: entry.doordash_version,
        p_store: action === "edit" && parsed.success ? parsed.data.store_id : null,
        p_date: action === "edit" && parsed.success ? parsed.data.work_date : null,
        p_subscription: action === "edit" && parsed.success ? parsed.data.subscription_number : null,
        p_proof: action === "edit" && parsed.success ? parsed.data.dd_proof_added : null,
      });
      if (result.error) {
        const code = result.error.code;
        if (code === "PGRST202") { setMessage("The owner needs to apply migration 007 before DoorDash entries can be changed."); return; }
        if (code === "42501") { setMessage("You do not have permission to change this entry. Sign in again if your access changed."); return; }
        if (code === "P0002") { setMessage("This DoorDash entry is no longer available."); return; }
        if (code === "40001") { setMessage("This entry changed. Reload it before continuing."); setCanReload(true); return; }
        if (["22023", "23514", "23503"].includes(code)) { setMessage("Check the store, date, and subscription details, then try again."); return; }
        if (code === "23505") { setUncertain(true); setMessage("This change reference conflicts. Keep this window open and contact the owner."); return; }
        throw new Error();
      }
      const confirmation = z.object({ id: z.uuid(), operation_id: z.uuid(), action: z.enum(["edit", "delete"]), complete: z.literal(true) }).safeParse(result.data);
      if (!confirmation.success || confirmation.data.id !== id || confirmation.data.operation_id !== operation.current || confirmation.data.action !== action) throw new Error();
      setUncertain(false); setComplete(true); invalidate();
    } catch {
      setUncertain(true); setMessage("The change was not confirmed. Retry this same change to check or finish it. Your details are kept here.");
    } finally { inFlight.current = false; setBusy(false); }
  }

  return <RecordDialog title={action === "edit" ? "Edit DoorDash entry" : "Delete DoorDash entry?"} description={action === "edit" ? "Update the subscription details below." : "This permanently deletes the entry and removes $5 from the applicable tracking totals. This cannot be undone."} locked={locked} onClose={onClose}>
    {complete ? <div className="mt-6 space-y-5"><p role="status" className="text-sm text-success-foreground">{action === "delete" ? "DoorDash entry deleted." : "DoorDash entry updated."}</p><Button ref={doneButton} onClick={onClose}>Done</Button></div> : <form onSubmit={submit} aria-busy={busy || loading} className="mt-5 space-y-5">
      {loading ? <p role="status" className="text-sm text-muted-foreground">Loading entry...</p> : null}
      {message ? <div ref={feedback} tabIndex={-1} role="alert" className="rounded-md border border-destructive p-3 text-sm">{message}{canReload && !uncertain ? <Button type="button" variant="link" onClick={reloadEntry}>Reload entry</Button> : null}</div> : null}
      {entry ? action === "delete" ? <p className="break-words text-sm">{entry.subscription_number} · {context?.stores.find((row) => row.id === entry.store_id)?.name} · {dateLabel(entry.work_date)}</p> : <fieldset disabled={locked} className="min-w-0"><FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2"><Field><FieldLabel htmlFor="edit-dd-store">Store</FieldLabel><Select id="edit-dd-store" value={storeId} onValueChange={setStoreId} options={(context?.stores ?? []).map((row) => ({ value: row.id, label: row.name }))} /></Field><Field><FieldLabel htmlFor="edit-dd-date">Work date</FieldLabel><DatePicker id="edit-dd-date" label="Work date" required value={date} today={localDate(store?.timezone ?? "America/New_York")} onValueChange={setDate} /></Field></div>
        <Field><FieldLabel htmlFor="edit-dd-subscription">Subscription number</FieldLabel><Input id="edit-dd-subscription" required value={subscription} maxLength={120} autoComplete="off" onChange={(event) => setSubscription(event.target.value)} /></Field>
        <label className="flex min-h-11 w-fit cursor-pointer items-center gap-3 text-sm"><input type="checkbox" checked={proof} onChange={(event) => setProof(event.target.checked)} className="size-5 accent-link" />DD proof added</label>
      </FieldGroup></fieldset> : null}
      {uncertain ? <p className="text-xs text-muted-foreground">Keep this window open and retry the same change. Details stay locked until confirmed.</p> : null}
      <div className="flex flex-wrap justify-end gap-3 border-t pt-4"><Button type="button" variant="outline" disabled={locked} onClick={onClose}>Cancel</Button><Button type="submit" variant={action === "delete" ? "destructive" : "default"} disabled={!entry || loading || busy || canReload}>{busy ? "Saving..." : uncertain ? "Retry same change" : action === "delete" ? "Delete entry" : "Save changes"}</Button></div>
    </form>}
  </RecordDialog>;
}
