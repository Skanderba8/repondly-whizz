"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { RecordDialog } from "@/components/ui/record-dialog";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScreenshotUpload } from "@/components/ui/screenshot-upload";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { getSupabaseClient } from "@/lib/supabase/client";
import { reviewMutationSchema } from "../../../shared/review-mutation-schema";
import { dateLabel, localDate } from "./domain";
import { EvidenceViewer } from "./evidence-viewer";
import { useTracker } from "./tracker-provider";

const reviewSchema = z.object({
  id: z.uuid(), owner_id: z.uuid(), store_id: z.uuid(), work_date: z.string(),
  note: z.string(), screenshot_path: z.string(), review_version: z.number().int().nonnegative(),
});
type Review = z.infer<typeof reviewSchema>;

export function ReviewDialog({ id, action, onClose }: { id: string; action: "edit" | "delete"; onClose: () => void }) {
  const { context, invalidate } = useTracker();
  const [review, setReview] = useState<Review | null>(null);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [fileError, setFileError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [message, setMessage] = useState("");
  const [canReload, setCanReload] = useState(false);
  const [complete, setComplete] = useState(false);
  const operation = useRef("");
  const inFlight = useRef(false);
  const feedback = useRef<HTMLDivElement>(null);
  const doneButton = useRef<HTMLButtonElement>(null);
  const locked = busy || uncertain || preparing;
  const store = context?.stores.find((row) => row.id === storeId);
  const ownerName = context?.people.find((row) => row.user_id === review?.owner_id)?.display_name;

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const result = await getSupabaseClient().from("bonus_entries")
          .select("id,owner_id,store_id,work_date,note,screenshot_path,review_version")
          .eq("id", id).eq("kind", "review").maybeSingle();
        if (result.error) throw new Error("Review management could not load. Ask the owner to apply migration 006, or retry.");
        if (!result.data) throw new Error("This review is no longer available or you do not have access.");
        const data = reviewSchema.parse(result.data);
        if (active) { setReview(data); setStoreId(data.store_id); setDate(data.work_date); setNote(data.note); setMessage(""); }
      } catch (error) {
        if (active) { setMessage(error instanceof Error ? error.message : "This review could not be loaded."); setCanReload(true); }
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [id, reload]);
  useEffect(() => { if (message) feedback.current?.focus(); }, [message]);
  useEffect(() => { if (complete) doneButton.current?.focus(); }, [complete]);

  function reloadReview() {
    operation.current = ""; setFile(null); setFileError(""); setReview(null);
    setMessage(""); setCanReload(false); setLoading(true); setReload((value) => value + 1);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!review || inFlight.current || preparing || fileError) return;
    if (!operation.current) operation.current = crypto.randomUUID();
    const identity = { operation_id: operation.current, id, version: review.review_version };
    const parsed = reviewMutationSchema.safeParse(action === "delete"
      ? { ...identity, action } : { ...identity, action, store_id: storeId, work_date: date, note });
    if (!parsed.success) { setMessage(parsed.error.issues[0]?.message ?? "Check the fields."); return; }
    inFlight.current = true; setBusy(true); setMessage(""); setCanReload(false);
    try {
      const body = new FormData();
      body.set("record", JSON.stringify(parsed.data));
      if (action === "edit" && file) body.set("screenshot", file);
      const result = await getSupabaseClient().functions.invoke("manage-review", { body });
      if (result.error?.context instanceof Response) {
        const response = result.error.context;
        const raw: unknown = await response.json().catch(() => null);
        const detail = z.object({ error: z.string().optional(), code: z.string().optional() }).safeParse(raw);
        const code = detail.success ? detail.data.code : undefined;
        const text = detail.success ? detail.data.error : undefined;
        if (response.status === 404 && code !== "missing") {
          setMessage("The owner needs to deploy the manage-review Supabase function before reviews can be changed.");
          return;
        }
        const unknownOutcome = response.status >= 500 && code !== "setup";
        if (unknownOutcome || code === "reference") setUncertain(true);
        setCanReload(code === "stale");
        setMessage(text || (response.status === 401 ? "Sign in again to change this review." : "The change was not confirmed. Keep these details and retry this same change."));
        if (!text && response.status >= 500) setUncertain(true);
        return;
      }
      const confirmation = z.object({ id: z.uuid(), operation_id: z.uuid(), action: z.enum(["edit", "delete"]), complete: z.literal(true) }).safeParse(result.data);
      if (result.error || !confirmation.success || confirmation.data.id !== id
        || confirmation.data.operation_id !== operation.current || confirmation.data.action !== action) throw new Error();
      setUncertain(false); invalidate();
      if (action === "delete") onClose();
      else setComplete(true);
    } catch {
      setUncertain(true);
      setMessage("The change was not confirmed. Retry this same change to check or finish it. Your details are kept here.");
    } finally { inFlight.current = false; setBusy(false); }
  }

  return <RecordDialog title={action === "edit" ? "Edit review" : "Delete review?"} description={action === "edit" ? "Update the review details or replace its screenshot." : "This permanently removes the review and its screenshot, and subtracts $2 from the applicable tracking totals. This cannot be undone."} locked={locked} onClose={onClose}>
      {complete ? <div className="mt-6 space-y-5"><p role="status" className="text-sm text-success-foreground">{action === "delete" ? "Review and screenshot deleted." : "Review updated. Screenshot cleanup completed."}</p><Button ref={doneButton} onClick={onClose}>Done</Button></div> : <form onSubmit={submit} aria-busy={busy || loading} className="mt-6 space-y-5">
        {loading ? <p role="status" className="text-sm text-muted-foreground">Loading review...</p> : null}
        {message ? <div ref={feedback} tabIndex={-1} role="alert" className="rounded-md border border-destructive p-3 text-sm">{message}{canReload && !uncertain ? <Button type="button" variant="link" className="mt-2" onClick={reloadReview}>Reload review</Button> : null}</div> : null}
        {review ? <>
          {action === "delete" ? <p className="text-sm">{context?.stores.find((row) => row.id === review.store_id)?.name} · {dateLabel(review.work_date)}{ownerName ? ` · ${ownerName}` : ""}</p> : <fieldset disabled={locked} className="min-w-0"><FieldGroup>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field><FieldLabel htmlFor="edit-review-store">Store</FieldLabel><Select id="edit-review-store" value={storeId} onValueChange={setStoreId} options={(context?.stores ?? []).map((row) => ({ value: row.id, label: row.name }))} /></Field>
              <Field><FieldLabel htmlFor="edit-review-date">Work date</FieldLabel><DatePicker id="edit-review-date" label="Work date" required value={date} today={localDate(store?.timezone ?? "America/New_York")} onValueChange={setDate} /></Field>
            </div>
            <Field><FieldLabel htmlFor="edit-review-note">Note <span className="font-normal text-muted-foreground">(optional)</span></FieldLabel><Textarea id="edit-review-note" rows={1} className="h-11 min-h-11" maxLength={4000} value={note} onChange={(event) => setNote(event.target.value)} /></Field>
            <div><p className="text-sm font-medium">Current screenshot</p><EvidenceViewer path={review.screenshot_path} /></div>
            <Field><FieldLabel htmlFor="edit-review-screenshot">Replace screenshot <span className="font-normal text-muted-foreground">(optional)</span></FieldLabel><ScreenshotUpload id="edit-review-screenshot" file={file} limit={context?.screenshot_max_bytes} disabled={busy || uncertain} error={fileError} onChange={setFile} onError={setFileError} onProcessing={setPreparing} /><p className="text-xs text-muted-foreground">Leave this empty to keep the current screenshot. Removing a new selection keeps the saved image.</p></Field>
          </FieldGroup></fieldset>}
        </> : null}
        {uncertain ? <p className="text-xs text-muted-foreground">Keep this window open and retry the same change. Details are locked until it is confirmed.</p> : null}
        <div className="flex flex-wrap items-center justify-end gap-3 border-t pt-5"><Button type="button" variant="outline" disabled={locked} onClick={onClose}>Cancel</Button><Button type="submit" variant={action === "delete" ? "destructive" : "default"} disabled={!review || loading || busy || preparing || !!fileError || canReload}>{busy ? (action === "delete" ? "Deleting review and screenshot..." : "Saving changes...") : uncertain ? "Retry same change" : action === "delete" ? "Delete review" : "Save changes"}</Button></div>
      </form>}
  </RecordDialog>;
}
