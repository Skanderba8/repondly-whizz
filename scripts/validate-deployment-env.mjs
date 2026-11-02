import { parsePublicEnvironment } from "../src/lib/env.ts";

try {
  parsePublicEnvironment({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
} catch {
  console.error(
    "Cloudflare build stopped: set NEXT_PUBLIC_SUPABASE_URL to the Supabase HTTPS URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to its sb_publishable_ key in the production build environment, then retry the deployment.",
  );
  process.exitCode = 1;
}
