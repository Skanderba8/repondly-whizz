import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { parsePublicEnvironment } from "../src/lib/env";

const root = fileURLToPath(new URL("..", import.meta.url));

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, root, ""), ...process.env };
  const { url, publishableKey } = parsePublicEnvironment({
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  const origin = new URL(url).origin;
  return {
    root: fileURLToPath(new URL(".", import.meta.url)),
    base: "./",
    publicDir: false,
    plugins: [react(), {
      name: "whizz-extension-manifest",
      generateBundle() {
        this.emitFile({ type: "asset", fileName: "manifest.json", source: JSON.stringify({
          manifest_version: 3,
          name: "Whizz Repondly",
          version: "0.1.0",
          description: "Quick review and DoorDash entry for your private Whizz workspace.",
          minimum_chrome_version: "120",
          action: { default_popup: "popup.html", default_title: "Whizz Repondly", default_icon: { "32": "icon-32.png" } },
          icons: { "32": "icon-32.png", "192": "icon-192.png" },
          background: { service_worker: "background.js", type: "module" },
          host_permissions: [`${origin}/*`],
          content_security_policy: { extension_pages: `script-src 'self'; object-src 'none'; connect-src ${origin}; img-src 'self' blob:; style-src 'self' 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'` },
        }, null, 2) });
        for (const [fileName, sourceName] of [["icon-32.png", "favicon-32x32.png"], ["icon-192.png", "android-chrome-192x192.png"]]) {
          this.emitFile({ type: "asset", fileName, source: readFileSync(`${root}/public/${sourceName}`) });
        }
      },
    }],
    resolve: { alias: { "@": `${root}/src` } },
    define: {
      "process.env.NEXT_PUBLIC_SUPABASE_URL": JSON.stringify(url),
      "process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(publishableKey),
    },
    css: { postcss: root },
    build: {
      outDir: `${root}/dist/extension`,
      emptyOutDir: true,
      target: "chrome120",
      modulePreload: false,
      rollupOptions: {
        input: { popup: `${root}/extension/popup.html`, background: `${root}/extension/src/background.ts` },
        output: { entryFileNames: "[name].js", chunkFileNames: "assets/[name]-[hash].js" },
      },
    },
  };
});
