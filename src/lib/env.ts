import { z } from "zod";

const publicEnvironmentSchema = z.object({
  url: z.url().refine((value) => new URL(value).protocol === "https:", {
    message: "Supabase must use HTTPS.",
  }),
  publishableKey: z.string().regex(/^sb_publishable_[A-Za-z0-9_-]+$/),
});

export function parsePublicEnvironment(input: { url?: string; publishableKey?: string }) {
  const result = publicEnvironmentSchema.safeParse(input);
  if (!result.success) {
    throw new Error("Set a valid Supabase HTTPS URL and publishable key in the public environment configuration.");
  }
  return result.data;
}

export function getPublicEnvironment() {
  return parsePublicEnvironment({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}
