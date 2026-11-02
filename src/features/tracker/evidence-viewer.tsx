"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog } from "radix-ui";
import { Button } from "@/components/ui/button";
import { getSupabaseClient } from "@/lib/supabase/client";

export function EvidenceViewer({ path }: { path: string }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(false);
  const [revision, setRevision] = useState(0);
  const request = useRef(0);
  useEffect(() => {
    const id = ++request.current;
    if (!open) { setUrl(""); setZoom(false); return; }
    setError(""); setUrl("");
    void (async () => {
      try {
        const result = await getSupabaseClient().storage.from("review-evidence").createSignedUrl(path, 60);
        if (result.error) throw result.error;
        if (request.current === id) setUrl(result.data.signedUrl);
      } catch { if (request.current === id) setError("Screenshot access is unavailable. Try again."); }
    })();
    return () => { ++request.current; };
  }, [open, path, revision]);
  return <Dialog.Root open={open} onOpenChange={setOpen}><Dialog.Trigger asChild><Button variant="link">Screenshot</Button></Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="sheet-overlay" /><Dialog.Content aria-describedby={undefined} className="fixed inset-3 z-50 flex flex-col rounded-lg border bg-card p-4 sm:inset-8">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><Dialog.Title className="section-title">Review screenshot</Dialog.Title><div className="flex gap-2"><Button variant="outline" onClick={() => setZoom((value) => !value)}>{zoom ? "Fit" : "Zoom"}</Button><Dialog.Close asChild><Button variant="outline">Close</Button></Dialog.Close></div></div>
    {error ? <div role="alert"><p>{error}</p><Button variant="outline" onClick={() => setRevision((value) => value + 1)}>Retry</Button></div> : url ? <div className="min-h-0 flex-1 overflow-auto"><img src={url} alt="Attached customer review screenshot" className={zoom ? "max-w-none" : "mx-auto h-full max-w-full object-contain"} onError={() => setError("Screenshot access expired or failed. Retry to renew access.")} /></div> : <p role="status">Loading screenshot...</p>}
  </Dialog.Content></Dialog.Portal></Dialog.Root>;
}
