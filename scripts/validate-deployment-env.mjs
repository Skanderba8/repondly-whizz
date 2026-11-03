import { parsePublicEnvironment } from "../src/lib/env.ts";
import { parseChromeWebStoreUrl } from "../src/lib/chrome-extension.ts";

try {
  parsePublicEnvironment({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  parseChromeWebStoreUrl(process.env.NEXT_PUBLIC_CHROME_EXTENSION_URL);
} catch {
  console.error(
    "Cloudflare build stopped: check the Supabase HTTPS URL and sb_publishable_ key. If NEXT_PUBLIC_CHROME_EXTENSION_URL is set, use the approved chromewebstore.google.com/detail listing URL. Then retry deployment.",
  );
  process.exitCode = 1;
}
