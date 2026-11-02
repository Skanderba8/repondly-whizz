"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { PageHeading } from "@/components/page-heading";
import { WorkspacePanel } from "@/components/workspace-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { ScreenshotUpload } from "@/components/ui/screenshot-upload";
import { screenshotMaxBytes, screenshotMimeTypes } from "../../../shared/screenshot-policy";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { doordashSubmissionSchema, reviewSubmissionSchema } from "../../../shared/bonus-schema";
import { getSupabaseClient } from "@/lib/supabase/client";
import { localDate } from "./domain";
import { Performance } from "./performance";
import { TrackerGate } from "./tracker-gate";
import { useTracker } from "./tracker-provider";

type Kind = "review" | "doordash";

export function BonusPage({ kind }: { kind: Kind }) {
  return <><PageHeading title={kind === "review" ? "Reviews" : "DoorDash"} description={kind === "review" ? "Log Google Maps reviews you checked. $2 per review." : "Track DoorDash promo subscriptions. $5 per subscription."} /><TrackerGate><BonusForm kind={kind} /><Performance historyOnly kind={kind} /></TrackerGate></>;
}

function BonusForm({ kind }: { kind: Kind }) {
  const { account, context, invalidate } = useTracker();
  const person = context?.people.find((row) => row.user_id === account.userId);
  const [storeId, setStoreId] = useState(person?.home_store_id ?? "");
  const store = context?.stores.find((row) => row.id === storeId);
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [subscription, setSubscription] = useState("");
  const [proof, setProof] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uncertain, setUncertain] = useState(false);
  const requestId = useRef("");
  const busy = useRef(false);
  const errorSummary = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const configuredLimit = context?.screenshot_max_bytes;
  const limit = configuredLimit ? Math.min(configuredLimit, screenshotMaxBytes) : null;
  const selectedDate = date || localDate(store?.timezone ?? "America/New_York");

  useEffect(() => { if (error || Object.values(errors).some(Boolean)) errorSummary.current?.focus(); }, [error, errors]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || preparing) return;
    setSaved(""); setError(""); setErrors({});
    if (!requestId.current) requestId.current = crypto.randomUUID();
    if (!date && selectedDate) setDate(selectedDate);
    const common = { id: requestId.current, store_id: storeId, work_date: selectedDate };
    const parsed = kind === "review"
      ? reviewSubmissionSchema.safeParse({ ...common, note })
      : doordashSubmissionSchema.safeParse({ ...common, subscription_number: subscription, dd_proof_added: proof });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])));
      return;
    }
    if (kind === "review" && (!file || !limit || !file.size || file.size > limit || !screenshotMimeTypes.includes(file.type))) {
      setErrors({ screenshot: !file ? "Choose one screenshot." : !limit ? "The owner needs to configure the screenshot size limit." : "Use a PNG, JPEG, or WebP within the displayed size limit." });
      return;
    }
    busy.current = true; setSaving(true);
    try {
      const client = getSupabaseClient();
      if (kind === "review" && file) {
        const body = new FormData();
        body.set("record", JSON.stringify(parsed.data));
        body.set("screenshot", file);
        const result = await client.functions.invoke("save-review", { body });
        if (result.error?.context instanceof Response && [400, 401, 403, 413, 415, 422, 429].includes(result.error.context.status)) {
          const detail: unknown = await result.error.context.json().catch(() => null);
          setError(typeof detail === "object" && detail !== null && "error" in detail && typeof detail.error === "string" ? detail.error : "The review could not be saved. Check its fields and screenshot.");
          return;
        }
        if (result.error?.context instanceof Response && result.error.context.status === 409) {
          setUncertain(true);
          setError("This save reference conflicts with an existing upload. Contact the owner before creating another entry. Your details are kept here.");
          return;
        }
        if (result.error || result.data?.id !== requestId.current) throw new Error("Save not confirmed");
      } else {
        const result = await client.rpc("save_doordash", { p_id: requestId.current, p_store_id: storeId, p_work_date: selectedDate, p_subscription: subscription.trim(), p_proof: proof });
        if (result.error || result.data !== requestId.current) throw new Error("Save not confirmed");
      }
      const id = requestId.current;
      setSaved(`${kind === "review" ? "Review" : "DoorDash subscription"} saved. Reference ${id.slice(0, 8)}.`);
      requestId.current = ""; setUncertain(false);
      setNote(""); setSubscription(""); setProof(false); setFile(null);
      invalidate();
      formRef.current?.querySelector<HTMLInputElement | HTMLTextAreaElement>(kind === "review" ? "textarea" : "input[name=subscription]")?.focus();
    } catch {
      setUncertain(true);
      setError("We could not confirm this save. Retry with the same details to check or complete this entry. Do not create another copy.");
    } finally { busy.current = false; setSaving(false); }
  }

  return <WorkspacePanel id={`${kind}-entry-title`} title={kind === "review" ? "Add review" : "Add DoorDash subscription"}>
    <form ref={formRef} onSubmit={save} className="px-4 pb-4 md:px-6 md:pb-6" aria-busy={saving}>
      <p className="mb-5 text-sm text-muted-foreground">Saving for {person?.display_name}.</p>
      {error || Object.values(errors).some(Boolean) ? <div ref={errorSummary} tabIndex={-1} role="alert" className="mb-5 rounded-md border border-destructive p-4 text-sm"><p>{error || "Check the highlighted fields."}</p>{Object.entries(errors).filter(([, message]) => !!message).map(([field, message]) => <a key={field} className="mt-2 block text-link underline" href={`#${kind}-${field}`}>{message}</a>)}</div> : null}
      <fieldset disabled={saving || uncertain || preparing} className="min-w-0">
        <FieldGroup>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field><FieldLabel htmlFor={`${kind}-store_id`}>Store</FieldLabel><Select id={`${kind}-store_id`} value={storeId} placeholder="Choose a store" aria-invalid={!!errors.store_id} aria-describedby={errors.store_id ? `${kind}-store-error` : undefined} onValueChange={(value) => { setStoreId(value); setDate(""); }} options={(context?.stores ?? []).map((row) => ({ value: row.id, label: row.name }))} /><FieldError id={`${kind}-store-error`}>{errors.store_id}</FieldError></Field>
            <Field><FieldLabel htmlFor={`${kind}-work_date`}>Work date</FieldLabel><DatePicker id={`${kind}-work_date`} label="Work date" today={localDate(store?.timezone ?? "America/New_York")} required value={selectedDate} aria-invalid={!!errors.work_date} aria-describedby={`${kind}-date-help`} onValueChange={setDate} /><FieldDescription id={`${kind}-date-help`}>{errors.work_date || (store ? `Store time: ${store.timezone}. Change the date for an earlier shift.` : "Choose the store first.")}</FieldDescription></Field>
          </div>
          {kind === "review" ? <>
            <Field><FieldLabel htmlFor="review-screenshot">Screenshot</FieldLabel><ScreenshotUpload file={file} limit={limit} disabled={saving || uncertain} error={errors.screenshot} onChange={setFile} onProcessing={setPreparing} onError={(message) => setErrors((current) => ({ ...current, screenshot: message }))} /></Field>
            <Field><FieldLabel htmlFor="review-note">Note <span className="font-normal text-muted-foreground">(optional)</span></FieldLabel><Textarea id="review-note" rows={1} className="h-11 min-h-11 max-h-40 sm:max-w-xl" value={note} maxLength={4000} aria-invalid={!!errors.note} aria-describedby="review-note-error" onChange={(event) => setNote(event.target.value)} placeholder="Add a note if needed" /><FieldError id="review-note-error">{errors.note}</FieldError></Field>
          </> : <>
            <Field><FieldLabel htmlFor="doordash-subscription_number">Subscription number</FieldLabel><Input id="doordash-subscription_number" name="subscription" value={subscription} maxLength={120} autoComplete="off" aria-invalid={!!errors.subscription_number} onChange={(event) => setSubscription(event.target.value)} /><FieldError>{errors.subscription_number}</FieldError></Field>
            <label className="flex min-h-11 w-fit cursor-pointer items-center gap-3 text-sm"><input type="checkbox" checked={proof} onChange={(event) => setProof(event.target.checked)} className="size-5 accent-link" />DD proof added</label>
            <p className="text-xs text-muted-foreground">The checkbox records whether you added proof in the DoorDash workflow. No upload is required here.</p>
          </>}
        </FieldGroup>
      </fieldset>
      <div className="mt-6 flex flex-wrap items-center gap-4 border-t pt-5"><Button type="submit" disabled={saving || preparing || (kind === "review" && !limit)}>{preparing ? "Preparing screenshot..." : saving ? (kind === "review" ? "Uploading and saving..." : "Saving...") : uncertain ? "Retry same entry" : kind === "review" ? "Save review" : "Save DoorDash"}</Button>{uncertain ? <span className="text-xs text-muted-foreground">Details stay locked until this save is confirmed.</span> : null}<p role="status" className="text-sm text-success-foreground">{saved}</p></div>
    </form>
  </WorkspacePanel>;
}


