export function parseChromeWebStoreUrl(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  const url = new URL(value.trim());
  if (url.protocol !== "https:" || url.hostname !== "chromewebstore.google.com" || url.port || url.username || url.password || !/^\/detail\/(?:[^/]+\/)?[a-p]{32}\/?$/.test(url.pathname)) {
    throw new Error("Set NEXT_PUBLIC_CHROME_EXTENSION_URL to the extension's Chrome Web Store detail URL.");
  }
  return `${url.origin}${url.pathname}`;
}

export function getChromeWebStoreUrl() {
  return parseChromeWebStoreUrl(process.env.NEXT_PUBLIC_CHROME_EXTENSION_URL);
}
