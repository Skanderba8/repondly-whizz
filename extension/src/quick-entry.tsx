import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { z } from "zod";
import { Popover } from "radix-ui";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { ScreenshotUpload } from "@/components/ui/screenshot-upload";
import { WorkspacePanel } from "@/components/workspace-panel";
import type { WorkspaceAccount } from "@/features/access/access";
import { localDate, type TrackerContext } from "@/features/tracker/domain";
import { getSupabaseClient } from "@/lib/supabase/client";
import { reviewSubmissionSchema, doordashSubmissionSchema } from "../../shared/bonus-schema";
import { screenshotMaxBytes, screenshotMimeTypes } from "../../shared/screenshot-policy";
import { newDraft, readDraft, writeDraft, type Draft, type Kind } from "./drafts";

export function QuickEntry({ kind, account, context, defaultStore, onSaved }: {
  kind: Kind; account: WorkspaceAccount; context: TrackerContext; defaultStore: string; onSaved: () => void;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const current = useRef<Draft | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const busy = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState("");
  const [storageError, setStorageError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [reload, setReload] = useState(0);
  const alert = useRef<HTMLDivElement>(null);
  const savedCallback = useRef(onSaved);
  useEffect(() => { savedCallback.current = onSaved; }, [onSaved]);
  const configured = context.screenshot_max_bytes;
  const limit = configured ? Math.min(configured, screenshotMaxBytes) : null;
  const locked = draft?.status === "saving" || draft?.status === "uncertain";
  const file = useMemo(() => draft?.file ? new File([draft.file], draft.fileName, { type: draft.file.type }) : null, [draft?.file, draft?.fileName]);
  const store = context.stores.find((row) => row.id === draft?.storeId);
  const today = localDate(store?.timezone ?? "America/New_York");

  useEffect(() => {
    let active = true;
    void readDraft(account.userId, kind).then(async (stored) => {
      const value = stored ?? newDraft(account.userId, kind, defaultStore, localDate(context.stores.find((row) => row.id === defaultStore)?.timezone ?? "America/New_York"));
      if (!stored) await writeDraft(value);
      if (active) { current.current = value; setDraft(value); setStorageError(""); }
    }).catch(() => { if (active) setStorageError("Draft storage could not be opened. Retry before entering details."); });
    return () => { active = false; };
  }, [account.userId, kind, defaultStore, context.stores, reload]);

  useEffect(() => { if (error || Object.values(errors).some(Boolean)) alert.current?.focus(); }, [error, errors]);

  useEffect(() => {
    if (draft?.status !== "saving") return;
    let active = true;
    let polling = false;
    async function refresh() {
      if (polling) return;
      polling = true;
      try {
        const response = z.object({ active: z.boolean() }).parse(await chrome.runtime.sendMessage({ type: "status", owner: account.userId, kind }));
        let stored = await readDraft(account.userId, kind);
        if (stored?.status === "saving" && !response.active) {
          stored = { ...stored, status: "uncertain", unconfirmed: true, message: "Save was interrupted or not confirmed. Retry this same entry to check or complete it." };
          await writeDraft(stored);
        }
        if (active && stored) { current.current = stored; setDraft(stored); if (stored.status === "saved") savedCallback.current(); }
      } catch { if (active) setStorageError("Unable to read save status. Reopen the popup before creating another entry."); }
      finally { polling = false; }
    }
    const timer = window.setInterval(() => void refresh(), 1000);
    return () => { active = false; clearInterval(timer); };
  }, [draft?.status, account.userId, kind]);

  function change(patch: Partial<Draft>) {
    const previous = current.current;
    if (!previous || busy.current || ["saving", "uncertain"].includes(previous.status)) return;
    const next = { ...previous, ...patch, status: "draft" as const, message: "" };
    current.current = next; setDraft(next); setError("");
    queue.current = queue.current.catch(() => {}).then(() => writeDraft(next));
    void queue.current.then(() => setStorageError(""), () => setStorageError("Your draft could not be stored. Keep the popup open and retry saving."));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = current.current;
    if (!value || busy.current || preparing || value.status === "saving" || (kind === "doordash" && !value.proof)) return;
    setError(""); setErrors({});
    const common = { id: value.id, store_id: value.storeId, work_date: value.date };
    const parsed = kind === "review" ? reviewSubmissionSchema.safeParse({ ...common, note: value.note }) : doordashSubmissionSchema.safeParse({ ...common, subscription_number: value.subscription, dd_proof_added: value.proof });
    if (!parsed.success) { setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]))); return; }
    if (!context.stores.some((row) => row.id === value.storeId)) { setErrors({ store_id: "Choose an available store." }); return; }
    if (kind === "review" && (!value.file || !limit || !value.file.size || value.file.size > limit || !screenshotMimeTypes.includes(value.file.type))) { setErrors({ screenshot: "Choose a screenshot within your workspace's configured limit." }); return; }
    busy.current = true; setSubmitting(true);
    let dispatched = false;
    try {
      await queue.current.catch(() => {});
      const session = await getSupabaseClient().auth.getSession();
      if (session.error || session.data.session?.user.id !== account.userId) throw new Error("Sign in again before saving. Your draft is kept.");
      const pending: Draft = { ...value, status: "saving", message: "" };
      await writeDraft(pending);
      current.current = pending; setDraft(pending); setStorageError("");
      dispatched = true;
      await chrome.runtime.sendMessage({ type: "save", owner: account.userId, kind, token: session.data.session.access_token });
      const stored = await readDraft(account.userId, kind);
      if (stored) { current.current = stored; setDraft(stored); if (stored.status === "saved") savedCallback.current(); }
    } catch {
      if (dispatched) {
        // Leave the stored identity and payload intact. Polling reconciles worker state.
        setError("Save status is not confirmed. Keep this entry and retry when available.");
      } else setError("Unable to start saving. Check your connection and draft storage, then retry. Your details are kept.");
    } finally { busy.current = false; setSubmitting(false); }
  }

  if (!draft) return <div role={storageError ? "alert" : "status"} className="py-4 text-sm text-muted-foreground">{storageError || "Restoring your draft..."}{storageError ? <Button variant="ghost" onClick={() => setReload((value) => value + 1)}>Retry</Button> : null}</div>;
  return <WorkspacePanel id="quick-entry-title" title={kind === "review" ? "Add review" : "Add DoorDash"}>
    <form onSubmit={submit} aria-busy={submitting || draft.status === "saving"} className="popup-entry-form">
      {error || Object.values(errors).some(Boolean) ? <div ref={alert} role="alert" tabIndex={-1} className="rounded-md bg-error-background p-3 text-sm text-error-foreground"><p>{error || "Check the highlighted fields."}</p>{Object.entries(errors).filter(([, message]) => message).map(([field, message]) => <a key={field} href={`#quick-${field}`} className="mt-1 block underline">{message}</a>)}</div> : null}
      <fieldset disabled={!!locked || preparing || submitting} className="min-w-0">
        <FieldGroup className="gap-2">
          <div className="grid grid-cols-2 items-start gap-3">
            <Field data-invalid={!!errors.store_id}><FieldLabel htmlFor="quick-store_id">Store</FieldLabel><Select id="quick-store_id" value={draft.storeId} onValueChange={(storeId) => change({ storeId, date: localDate(context.stores.find((row) => row.id === storeId)?.timezone ?? "America/New_York") })} options={context.stores.map((row) => ({ value: row.id, label: row.name }))} placeholder="Choose store" aria-invalid={!!errors.store_id} aria-describedby="quick-store-error" /><FieldError id="quick-store-error">{errors.store_id}</FieldError></Field>
            <Field data-invalid={!!errors.work_date}><FieldLabel htmlFor="quick-work_date">Work date</FieldLabel><DatePicker id="quick-work_date" label="Work date" today={today} required value={draft.date} onValueChange={(date) => change({ date })} aria-invalid={!!errors.work_date} aria-describedby="quick-date-error" /><FieldError id="quick-date-error">{errors.work_date}</FieldError></Field>
          </div>
          {kind === "review" ? <>
            <Field data-invalid={!!errors.screenshot}><FieldLabel htmlFor="quick-screenshot">Screenshot</FieldLabel><ScreenshotUpload id="quick-screenshot" compact density="popup" file={file} limit={limit} disabled={!!locked || submitting} error={errors.screenshot} onChange={(next) => change({ file: next, fileName: next?.name ?? "" })} onProcessing={setPreparing} onError={(message) => setErrors((previous) => ({ ...previous, screenshot: message }))} /></Field>
            <Popover.Root><Popover.Trigger asChild><Button type="button" variant="ghost" size="sm" className="w-fit text-muted-foreground">{draft.note ? "Edit note" : "Add a note (optional)"}</Button></Popover.Trigger><Popover.Portal><Popover.Content side="top" align="start" sideOffset={8} collisionPadding={12} className="z-50 w-80 max-w-[calc(100vw-24px)] rounded-lg border bg-popover p-3 text-popover-foreground shadow-popover"><Field data-invalid={!!errors.note}><FieldLabel htmlFor="quick-note">Note (optional)</FieldLabel><Textarea id="quick-note" rows={3} className="max-h-24 resize-none" value={draft.note} maxLength={4000} onChange={(event) => change({ note: event.target.value })} placeholder="Anything to add?" aria-invalid={!!errors.note} aria-describedby="quick-note-error" /><FieldError id="quick-note-error">{errors.note}</FieldError></Field><Popover.Close asChild><Button type="button" size="sm" variant="ghost" className="mt-2">Done</Button></Popover.Close></Popover.Content></Popover.Portal></Popover.Root>
          </> : <>
            <Field data-invalid={!!errors.subscription_number}><FieldLabel htmlFor="quick-subscription_number">Subscription number</FieldLabel><Input id="quick-subscription_number" autoComplete="off" value={draft.subscription} maxLength={120} onChange={(event) => change({ subscription: event.target.value })} placeholder="Enter subscription number" aria-invalid={!!errors.subscription_number} aria-describedby="quick-subscription-error" /><FieldError id="quick-subscription-error">{errors.subscription_number}</FieldError></Field>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm"><input type="checkbox" required className="size-5 accent-link" checked={draft.proof} onChange={(event) => change({ proof: event.target.checked })} />DD proof added</label>
          </>}
        </FieldGroup>
      </fieldset>
      {storageError ? <p role="alert" className="text-sm text-destructive">{storageError}</p> : null}
      {draft.status === "draft" && draft.message ? <p role="alert" className="rounded-md bg-error-background p-3 text-sm text-error-foreground">{draft.message}</p> : null}
      {draft.status === "uncertain" ? <p role="alert" className="rounded-md bg-warning-background p-3 text-sm text-warning-foreground">{draft.message} Details stay locked until confirmed.</p> : null}
      {draft.status === "saved" ? <p role="status" className="flex items-center gap-2 text-sm text-success-foreground"><Check aria-hidden="true" className="size-4" />{draft.message}</p> : null}
      <div className="flex flex-col gap-2 border-t pt-3">
        <Button type="submit" variant={kind === "doordash" ? "delivery" : "default"} className="min-h-11 w-full" disabled={submitting || draft.status === "saving" || preparing || (kind === "review" && !limit) || (kind === "doordash" && !draft.proof)}>{submitting || draft.status === "saving" || preparing ? <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" /> : null}{preparing ? "Preparing screenshot..." : draft.status === "saving" || submitting ? kind === "review" ? "Uploading and saving..." : "Saving..." : draft.status === "uncertain" ? "Retry same entry" : kind === "review" ? "Save review" : "Save DoorDash"}</Button>
      </div>
    </form>
  </WorkspacePanel>;
}
