import { z } from "zod";

export const draftSchema = z.object({
  version: z.literal(1),
  owner: z.uuid(),
  kind: z.enum(["review", "doordash"]),
  id: z.uuid(),
  storeId: z.string(),
  date: z.string(),
  note: z.string().max(4000),
  subscription: z.string().max(120),
  proof: z.boolean(),
  file: z.instanceof(Blob).nullable(),
  fileName: z.string(),
  status: z.enum(["draft", "saving", "uncertain", "saved"]),
  unconfirmed: z.boolean().default(false),
  message: z.string(),
});
export type Draft = z.infer<typeof draftSchema>;
export type Kind = Draft["kind"];
export const draftKey = (owner: string, kind: Kind) => `${owner}:${kind}`;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("whizz-extension-v1", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("drafts");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Draft storage is unavailable."));
  });
}

async function transact<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction("drafts", mode);
      const request = operation(transaction.objectStore("drafts"));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = transaction.onabort = () => reject(new Error("Your draft could not be stored. Keep this popup open and retry."));
    });
  } finally { database.close(); }
}

export async function readDraft(owner: string, kind: Kind): Promise<Draft | null> {
  const value: unknown = await transact("readonly", (store) => store.get(draftKey(owner, kind)));
  if (value === undefined) return null;
  const draft = draftSchema.parse(value);
  if (draft.owner !== owner || draft.kind !== kind) throw new Error("Draft could not be restored.");
  return draft;
}

export async function writeDraft(draft: Draft) {
  await transact("readwrite", (store) => store.put(draftSchema.parse(draft), draftKey(draft.owner, draft.kind)));
}

export async function clearDrafts(owner: string) {
  for (const kind of ["review", "doordash"] as const) {
    await transact("readwrite", (store) => store.delete(draftKey(owner, kind)));
  }
}

export function newDraft(owner: string, kind: Kind, storeId: string, date: string): Draft {
  return { version: 1, owner, kind, id: crypto.randomUUID(), storeId, date, note: "", subscription: "", proof: false, file: null, fileName: "", status: "draft", unconfirmed: false, message: "" };
}
