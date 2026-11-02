import { z } from "zod";

export const reviewSubmissionSchema = z.object({
  id: z.uuid(),
  store_id: z.uuid("Choose a store."),
  work_date: z.iso.date("Choose the work date."),
  note: z.string().max(4000, "Keep the note under 4,000 characters."),
});

export const doordashSubmissionSchema = reviewSubmissionSchema.omit({ note: true }).extend({
  subscription_number: z.string().trim().min(1, "Enter the subscription number.").max(120, "Keep the subscription number under 120 characters."),
  dd_proof_added: z.boolean(),
});
