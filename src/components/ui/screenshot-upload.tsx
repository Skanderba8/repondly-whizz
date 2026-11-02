"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpToLine, Check, LoaderCircle } from "lucide-react";
import { Button } from "./button";
import { inspectScreenshot, screenshotDimensionsAllowed, screenshotMaxBytes, screenshotMimeTypes } from "../../../shared/screenshot-policy";

type Props = {
  file: File | null;
  limit: number | null | undefined;
  disabled: boolean;
  error?: string;
  onChange: (file: File | null) => void;
  onError: (message: string) => void;
  onProcessing: (processing: boolean) => void;
};

export function ScreenshotUpload({ file, limit, disabled, error, onChange, onError, onProcessing }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const generation = useRef(0);
  const dragDepth = useRef(0);
  const preview = useRef<HTMLImageElement>(null);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const maxBytes = Math.min(limit ?? 0, screenshotMaxBytes);
  const unavailable = disabled || !maxBytes || processing;

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (preview.current) preview.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => () => { generation.current++; }, []);

  async function selectFiles(files: File[]) {
    if (unavailable) return;
    if (files.length !== 1) { onError("Choose one screenshot at a time."); return; }
    const selected = files[0];
    if (!selected.size || selected.size > maxBytes) { onError(`Choose a nonempty screenshot up to ${maxBytes / 1024 / 1024} MB.`); return; }
    if (!screenshotMimeTypes.includes(selected.type)) { onError("Use a PNG, JPEG, or WebP screenshot."); return; }
    const version = ++generation.current;
    setProcessing(true); onProcessing(true); onError("");
    let bitmap: ImageBitmap | undefined;
    try {
      const info = inspectScreenshot(new Uint8Array(await selected.arrayBuffer()));
      if (!info || info.mime !== selected.type) throw new Error("This image is invalid. Export a fresh PNG, JPEG, or WebP screenshot.");
      if (!screenshotDimensionsAllowed(info)) throw new Error("Use an image up to 24 megapixels and 16,384 pixels per side. Crop to the review if needed.");
      bitmap = await createImageBitmap(selected);
      if (!bitmap.width || !bitmap.height) throw new Error("This image could not be opened. Export a fresh screenshot.");
      // Keep original pixels. Lossless PNG encoding is used only when it saves bytes.
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width; canvas.height = bitmap.height;
      const drawing = canvas.getContext("2d");
      let prepared = selected;
      if (drawing) {
        drawing.drawImage(bitmap, 0, 0);
        const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
        if (png && png.size > 0 && png.size < selected.size) prepared = new File([png], "review-screenshot.png", { type: "image/png" });
        canvas.width = 0; canvas.height = 0;
      }
      if (version === generation.current) onChange(prepared);
    } catch (reason) {
      if (version === generation.current) onError(reason instanceof Error ? reason.message : "This image could not be opened. Choose another screenshot.");
    } finally {
      bitmap?.close();
      if (version === generation.current) { setProcessing(false); onProcessing(false); }
    }
  }

  return <div className="space-y-3">
    <input ref={input} className="hidden" type="file" accept="image/png,image/jpeg,image/webp" disabled={unavailable} aria-label="Choose review screenshot" onChange={(event) => { const files = Array.from(event.target.files ?? []); event.target.value = ""; if (files.length) void selectFiles(files); }} />
    <button id="review-screenshot" type="button" disabled={unavailable} aria-label={file ? "Replace review screenshot" : "Upload review screenshot"} aria-busy={processing} aria-invalid={!!error} aria-describedby="review-screenshot-help review-screenshot-error" onClick={() => input.current?.click()}
      onDragEnter={(event) => { event.preventDefault(); if (!unavailable) { dragDepth.current++; setDragging(true); } }}
      onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = unavailable ? "none" : "copy"; }}
      onDragLeave={(event) => { event.preventDefault(); dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setDragging(false); }}
      onDrop={(event) => { event.preventDefault(); dragDepth.current = 0; setDragging(false); if (!unavailable) void selectFiles(Array.from(event.dataTransfer.files)); }}
      className={[
        "group relative flex min-h-72 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors duration-150 sm:min-h-88 sm:py-10 motion-reduce:transition-none",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed",
        dragging ? "border-link bg-accent text-accent-foreground" : error ? "border-destructive bg-card text-foreground enabled:hover:bg-muted" : "border-input bg-muted/40 text-foreground enabled:hover:border-link enabled:hover:bg-accent/50",
      ].join(" ")}>
      <span className={`pointer-events-none flex w-full flex-col items-center gap-5 ${dragging ? "invisible" : ""}`}>
        {file ? <>
          <img ref={preview} alt="Selected review screenshot" className="h-44 max-w-full rounded-md object-contain sm:h-52" />
          <span className="flex items-center gap-2 text-sm font-medium"><Check className="size-4 text-link" aria-hidden="true" />Screenshot selected</span>
          <span className="text-sm text-muted-foreground">Click or drop another image to replace</span>
        </> : <>
          {processing ? <LoaderCircle className="size-12 animate-spin text-link motion-reduce:animate-none" aria-hidden="true" /> : <ArrowUpToLine strokeWidth={1.5} className="size-12 text-muted-foreground transition-colors duration-150 group-hover:text-link group-focus-visible:text-link motion-reduce:transition-none" aria-hidden="true" />}
          <span className="space-y-2">
            <span className="block text-base font-semibold sm:text-lg">{processing ? "Preparing your screenshot" : "Drop your screenshot here"}</span>
            <span className="block text-sm text-muted-foreground">{processing ? "Keeping it clear and reducing file size" : <>or <span className="font-medium text-link underline decoration-link/40 underline-offset-4 group-hover:decoration-link">browse files</span> on your computer</>}</span>
          </span>
          <span className="text-xs text-muted-foreground">PNG, JPG or WebP{maxBytes ? ` · Up to ${maxBytes / 1024 / 1024} MB` : ""}</span>
        </>}
      </span>
      {dragging ? <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-5 px-6" aria-hidden="true"><ArrowUpToLine strokeWidth={1.5} className="size-14 text-link" /><span className="text-lg font-semibold">Drop to {file ? "replace" : "add"} screenshot</span><span className="text-sm">Release your file here</span></span> : null}
      {processing && file ? <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4 bg-card/95 text-sm font-medium"><LoaderCircle className="size-8 animate-spin text-link motion-reduce:animate-none" aria-hidden="true" />Preparing replacement...</span> : null}
    </button>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <p id="review-screenshot-help" className="max-w-xl text-xs leading-relaxed text-muted-foreground">{maxBytes ? "Upload one screenshot of the review. Crop out unrelated customer details. Maximum 24 megapixels." : "Uploads will be available once screenshot storage is configured."}</p>
      {file ? <Button type="button" variant="ghost" disabled={unavailable} className="shrink-0" onClick={() => { onChange(null); onError(""); }}>Remove screenshot</Button> : null}
    </div>
    {file ? <p className="break-words text-xs text-muted-foreground">{file.name} · {(file.size / 1024 / 1024).toLocaleString(undefined, { maximumFractionDigits: 2 })} MB · Uploads when you save</p> : null}
    <p id="review-screenshot-error" className={error ? "text-sm text-destructive" : "sr-only"}>{error}</p>
    <span className="sr-only" role="status">{dragging ? "Drop your screenshot now" : processing ? "Preparing screenshot" : file ? "Screenshot selected. It uploads when you save the review." : "No screenshot selected"}</span>
  </div>;
}
