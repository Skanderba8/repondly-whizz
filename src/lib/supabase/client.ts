"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getPublicEnvironment } from "@/lib/env";

let browserClient: SupabaseClient | undefined;

// Call from browser event handlers or effects, never during static rendering.
export function getSupabaseClient() {
  if (typeof window === "undefined") {
    throw new Error("The Supabase browser client is only available in the browser.");
  }
  if (!browserClient) {
    const { url, publishableKey } = getPublicEnvironment();
    browserClient = createClient(url, publishableKey);
  }
  return browserClient;
}
