"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { PageHeading } from "@/components/page-heading";
import { WorkspacePanel } from "@/components/workspace-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uncertain, setUncertain] = useState(false);
  const requestId = useRef("");
  const busy = useRef(false);
  const errorSummary = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const limit = context?.screenshot_max_bytes;
  const selectedDate = date || (store ? localDate(store.timezone) : "");

  useEffect(() => {
    if (!file) { setPreview(""); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => { if (error || Object.keys(errors).length) errorSummary.current?.focus(); }, [error, errors]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
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
    if (kind === "review" && (!file || !limit || file.size > limit || !["image/png", "image/jpeg", "image/webp"].includes(file.type))) {
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
        if (result.error?.context instanceof Response && [400, 403, 413, 422].includes(result.error.context.status)) {
          const detail: unknown = await result.error.context.json();
          setUncertain(false);
          setError(typeof detail === "object" && detail !== null && "error" in detail && typeof detail.error === "string" ? detail.error : "The review could not be saved. Check its fields and screenshot.");
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
      if (fileInput.current) fileInput.current.value = "";
      invalidate();
      formRef.current?.querySelector<HTMLInputElement | HTMLTextAreaElement>(kind === "review" ? "textarea" : "input[name=subscription]")?.focus();
    } catch {
      setUncertain(true);
      setError("We could not confirm this save. Retry with the same details to check or complete this entry. Do not create another copy.");
    } finally { busy.current = false; setSaving(false); }
  }

  return <WorkspacePanel id={`${kind}-entry-title`} title={kind === "review" ? "Add review" : "Add DoorDash subscription"}>
    <form ref={formRef} onSubmit={save} className="px-4 pb-4 md:px-6 md:pb-6" aria-busy={saving}>
      <p className="mb-5 text-sm text-muted-foreground">Saving for {person?.display_name}. No manager approval needed.</p>
      {error || Object.keys(errors).length ? <div ref={errorSummary} tabIndex={-1} role="alert" className="mb-5 rounded-md border border-destructive p-4 text-sm"><p>{error || "Check the highlighted fields."}</p>{Object.entries(errors).map(([field, message]) => <a key={field} className="mt-2 block text-link underline" href={`#${kind}-${field}`}>{message}</a>)}</div> : null}
      <fieldset disabled={saving || uncertain} className="min-w-0">
        <FieldGroup>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field><FieldLabel htmlFor={`${kind}-store_id`}>Store</FieldLabel><Select id={`${kind}-store_id`} value={storeId} aria-invalid={!!errors.store_id} aria-describedby={errors.store_id ? `${kind}-store-error` : undefined} onChange={(event) => { setStoreId(event.target.value); setDate(""); }}><option value="" disabled>Choose a store</option>{context?.stores.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</Select><FieldError id={`${kind}-store-error`}>{errors.store_id}</FieldError></Field>
            <Field><FieldLabel htmlFor={`${kind}-work_date`}>Work date</FieldLabel><Input id={`${kind}-work_date`} type="date" value={selectedDate} aria-invalid={!!errors.work_date} aria-describedby={`${kind}-date-help`} onChange={(event) => setDate(event.target.value)} /><FieldDescription id={`${kind}-date-help`}>{errors.work_date || (store ? `Store time: ${store.timezone}. Change the date for an earlier shift.` : "Choose the store first.")}</FieldDescription></Field>
          </div>
          {kind === "review" ? <>
            <Field><FieldLabel htmlFor="review-note">Note <span className="font-normal text-muted-foreground">(optional)</span></FieldLabel><Textarea id="review-note" value={note} maxLength={4000} aria-invalid={!!errors.note} onChange={(event) => setNote(event.target.value)} placeholder="Anything you need to remember" /><FieldError>{errors.note}</FieldError></Field>
            <Field><FieldLabel htmlFor="review-screenshot">Screenshot</FieldLabel><Input ref={fileInput} id="review-screenshot" type="file" accept="image/png,image/jpeg,image/webp" aria-invalid={!!errors.screenshot} aria-describedby="review-screenshot-help" disabled={!limit} onChange={(event) => setFile(event.target.files?.[0] ?? null)} /><FieldDescription id="review-screenshot-help">{limit ? `One PNG, JPEG, or WebP, up to ${(limit / 1024 / 1024).toLocaleString()} MB. Remove unrelated customer information before uploading.` : "Screenshot uploads need an owner-configured size limit before reviews can be saved."}</FieldDescription><FieldError>{errors.screenshot}</FieldError>{preview ? <div className="flex items-center gap-4"><img src={preview} alt="Selected review screenshot" className="size-16 rounded-md border object-contain" /><span className="min-w-0 break-words text-xs text-muted-foreground">{file?.name} · Selected</span></div> : null}</Field>
          </> : <>
            <Field><FieldLabel htmlFor="doordash-subscription_number">Subscription number</FieldLabel><Input id="doordash-subscription_number" name="subscription" value={subscription} maxLength={120} autoComplete="off" aria-invalid={!!errors.subscription_number} onChange={(event) => setSubscription(event.target.value)} /><FieldError>{errors.subscription_number}</FieldError></Field>
            <label className="flex min-h-11 w-fit cursor-pointer items-center gap-3 text-sm"><input type="checkbox" checked={proof} onChange={(event) => setProof(event.target.checked)} className="size-5 accent-link" />DD proof added</label>
            <p className="text-xs text-muted-foreground">The checkbox records whether you added proof in the DoorDash workflow. No upload is required here.</p>
          </>}
        </FieldGroup>
      </fieldset>
      <div className="mt-6 flex flex-wrap items-center gap-4 border-t pt-5"><Button type="submit" disabled={saving || (kind === "review" && !limit)}>{saving ? "Saving..." : uncertain ? "Retry same entry" : kind === "review" ? "Save review" : "Save DoorDash"}</Button>{uncertain ? <span className="text-xs text-muted-foreground">Details stay locked until this save is confirmed.</span> : null}<p role="status" className="text-sm text-success-foreground">{saved}</p></div>
    </form>
  </WorkspacePanel>;
}
