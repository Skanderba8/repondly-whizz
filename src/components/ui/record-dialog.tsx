"use client";

import type { ReactNode } from "react";
import { Dialog } from "radix-ui";

export function RecordDialog({ title, description, locked, onClose, children }: {
  title: string;
  description: string;
  locked: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return <Dialog.Root open onOpenChange={(open) => { if (!open && !locked) onClose(); }}><Dialog.Portal>
    <Dialog.Overlay className="sheet-overlay" />
    <Dialog.Content onEscapeKeyDown={(event) => { if (locked) event.preventDefault(); }} onPointerDownOutside={(event) => event.preventDefault()} className="fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh_-_32px)] w-[calc(100%_-_32px)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border bg-card p-4 sm:p-6">
      <Dialog.Title className="section-title">{title}</Dialog.Title>
      <Dialog.Description className="mt-2 text-sm text-muted-foreground">{description}</Dialog.Description>
      {children}
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>;
}
