"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { PageHeading } from "@/components/page-heading";
import { WorkspacePanel } from "@/components/workspace-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { ScreenshotUpload } from "@/components/ui/screenshot-upload";
import { screenshotMaxBytes, screenshotMimeTypes } from "../../../shared/screenshot-policy";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { doordashSubmissionSchema, reviewSubmissionSchema } from "../../../shared/bonus-schema";
import { getSupabaseClient } from "@/lib/supabase/client";
import { localDate, money, periodRange } from "./domain";
import { TrackerGate } from "./tracker-gate";
import { useTracker } from "./tracker-provider";

type Kind = "review" | "doordash";

export function BonusPage({ kind }: { kind: Kind }) {
  return <><PageHeading title={kind === "review" ? "Reviews" : "DoorDash"} description={kind === "review" ? "Log Google Maps reviews you checked." : "Track DoorDash promo subscriptions."} action={<BonusHistoryAction kind={kind} />} /><TrackerGate><BonusForm kind={kind} /></TrackerGate></>;
}

function BonusHistoryAction({ kind }: { kind: Kind }) {
  const { account, context, loadSnapshot, version, invalidate } = useTracker();
  const person = context?.people.find((row) => row.user_id === account.userId);
  const store = context?.stores.find((row) => row.id === person?.home_store_id)
    ?? context?.stores.find((row) => row.timezone === "America/New_York") ?? context?.stores[0];
  const { start, end } = periodRange(localDate(store?.timezone ?? "America/New_York"), "month");
  const key = `${account.userId}:${kind}:${start}:${end}`;
  const attempt = `${key}:${version}`;
  const [total, setTotal] = useState<{ key: string; value: number; count: number } | null>(null);
  const [failure, setFailure] = useState("");
  useEffect(() => {
    if (!context) return;
    let active = true;
    void loadSnapshot(account.userId, start, end, 0, kind).then((snapshot) => {
      if (active) { setTotal({ key, value: (kind === "review" ? snapshot.review_cents : snapshot.doordash_cents) / 100, count: kind === "review" ? snapshot.review_count : snapshot.doordash_count }); setFailure(""); }
    }).catch(() => { if (active) setFailure(attempt); });
    return () => { active = false; };
  }, [account.userId, context, start, end, kind, key, attempt, loadSnapshot]);
  return <div className="flex flex-wrap items-center gap-3">
    <div className="text-right text-xs text-muted-foreground" role="status">{failure === attempt ? <Button variant="ghost" onClick={invalidate}>Retry monthly total</Button> : total?.key === key ? <><span className="block">This month</span><span className="mt-1 block text-sm font-semibold text-foreground tabular-nums">{total.count.toLocaleString()} {kind === "review" ? total.count === 1 ? "review" : "reviews" : total.count === 1 ? "subscription" : "subscriptions"} · {money(total.value)}</span></> : "Loading monthly total..."}</div>
    <Button size="workspace" variant={kind === "review" ? "default" : "delivery"} asChild><Link href={`/activity/#${kind === "review" ? "reviews" : "doordash"}`}>{kind === "review" ? "See all reviews" : "See all subscriptions"}</Link></Button>
  </div>;
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
    if (busy.current || preparing || (kind === "doordash" && !proof)) return;
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
      setErrors({ screenshot: !file ? "Choose one screenshot." : !limit ? "The owner needs to configure the screenshot size limit." : `Use a PNG, JPEG, or WebP up to ${limit / 1024 / 1024} MB.` });
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
        if (result.error?.context instanceof Response && result.error.context.status === 404) {
          setError("Review uploads are not set up yet. The owner needs to deploy the save-review function in Supabase. Your details have been kept; retry this same entry after setup.");
          return;
        }
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
      setSaved(`${kind === "review" ? "Review" : "DoorDash subscription"} saved.`);
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
    <form ref={formRef} onSubmit={save} className="bonus-entry-form" aria-busy={saving}>
      {error || Object.values(errors).some(Boolean) ? <div ref={errorSummary} tabIndex={-1} role="alert" className="mb-5 rounded-md border border-destructive p-4 text-sm"><p>{error || "Check the highlighted fields."}</p>{Object.entries(errors).filter(([, message]) => !!message).map(([field, message]) => <a key={field} className="mt-2 block text-link underline" href={`#${kind}-${field}`}>{message}</a>)}</div> : null}
      <fieldset disabled={saving || uncertain || preparing} className="min-w-0">
        <FieldGroup className="gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field><FieldLabel htmlFor={`${kind}-store_id`}>Store</FieldLabel><Select showAllOptions id={`${kind}-store_id`} value={storeId} placeholder="Choose a store" aria-invalid={!!errors.store_id} aria-describedby={errors.store_id ? `${kind}-store-error` : undefined} onValueChange={(value) => { setStoreId(value); setDate(""); }} options={(context?.stores ?? []).map((row) => ({ value: row.id, label: row.name }))} /><FieldError id={`${kind}-store-error`}>{errors.store_id}</FieldError></Field>
            <Field><FieldLabel htmlFor={`${kind}-work_date`}>Work date</FieldLabel><DatePicker id={`${kind}-work_date`} label="Work date" today={localDate(store?.timezone ?? "America/New_York")} required value={selectedDate} aria-invalid={!!errors.work_date} aria-describedby={errors.work_date ? `${kind}-date-help` : undefined} onValueChange={setDate} /><FieldError id={`${kind}-date-help`}>{errors.work_date}</FieldError></Field>
          </div>
          {kind === "review" ? <>
            <Field><FieldLabel htmlFor="review-screenshot">Screenshot</FieldLabel><ScreenshotUpload compact file={file} limit={limit} disabled={saving || uncertain} error={errors.screenshot} onChange={setFile} onProcessing={setPreparing} onError={(message) => setErrors((current) => ({ ...current, screenshot: message }))} /></Field>
            <Field><FieldLabel htmlFor="review-note">Note <span className="font-normal text-muted-foreground">(optional)</span></FieldLabel><Textarea id="review-note" rows={1} className="h-11 min-h-11 max-h-40 sm:max-w-xl" value={note} maxLength={4000} aria-invalid={!!errors.note} aria-describedby="review-note-error" onChange={(event) => setNote(event.target.value)} placeholder="Add a note if needed" /><FieldError id="review-note-error">{errors.note}</FieldError></Field>
          </> : <>
            <Field><FieldLabel htmlFor="doordash-subscription_number">Subscription number</FieldLabel><Input id="doordash-subscription_number" name="subscription" value={subscription} maxLength={120} autoComplete="off" aria-invalid={!!errors.subscription_number} onChange={(event) => setSubscription(event.target.value)} /><FieldError>{errors.subscription_number}</FieldError></Field>
            <label className="flex min-h-11 w-fit cursor-pointer items-center gap-3 text-sm"><input type="checkbox" required checked={proof} onChange={(event) => setProof(event.target.checked)} className="size-5 accent-link" />DD proof added</label>
          </>}
        </FieldGroup>
      </fieldset>
      <div className="mt-3 flex flex-wrap items-center gap-3 border-t pt-3"><Button type="submit" variant={kind === "doordash" ? "delivery" : "default"} disabled={saving || preparing || (kind === "review" && !limit) || (kind === "doordash" && !proof)}>{preparing ? "Preparing screenshot..." : saving ? (kind === "review" ? "Uploading and saving..." : "Saving...") : uncertain ? "Retry same entry" : kind === "review" ? "Save review" : "Save DoorDash"}</Button>{uncertain ? <span className="text-xs text-muted-foreground">Details stay locked until this save is confirmed.</span> : null}<p role="status" className="text-sm text-success-foreground">{saved}</p></div>
    </form>
  </WorkspacePanel>;
}



