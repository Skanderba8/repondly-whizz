import { z } from "zod";

const identity = z.object({
  operation_id: z.uuid(), id: z.uuid(), version: z.number().int().nonnegative(),
});
export const reviewMutationSchema = z.discriminatedUnion("action", [
  identity.extend({ action: z.literal("delete") }).strict(),
  identity.extend({ action: z.literal("edit"),
    store_id: z.uuid("Choose a store."),
    work_date: z.iso.date("Choose the work date."),
    note: z.string().max(4000, "Keep the note under 4,000 characters."),
  }).strict(),
]);
