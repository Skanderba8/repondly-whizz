"use client";

import { createContext, useContext, useEffect, useSyncExternalStore } from "react";

export type Appearance = "light" | "dark" | "system";
const appearanceKey = "whizz-appearance-v1";
const appearanceEvent = "whizz-appearance-change";
let temporaryPreference: Appearance | null = null;
const AppearanceContext = createContext<{ appearance: Appearance; setAppearance: (value: Appearance) => void }>({ appearance: "light", setAppearance: () => {} });

function readAppearance(): Appearance {
  if (temporaryPreference) return temporaryPreference;
  try {
    const stored = localStorage.getItem(appearanceKey);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch { /* Use the default when storage is unavailable. */ }
  return "light";
}
function subscribeAppearance(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(appearanceEvent, callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener(appearanceEvent, callback); };
}
function serverAppearance(): null { return null; }

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const preference = useSyncExternalStore<Appearance | null>(subscribeAppearance, readAppearance, serverAppearance);
  const appearance = preference ?? "light";
  useEffect(() => {
    if (preference === null) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    function applyAppearance() {
      document.documentElement.classList.toggle("dark", appearance === "dark" || (appearance === "system" && media.matches));
    }
    applyAppearance();
    media.addEventListener("change", applyAppearance);
    return () => media.removeEventListener("change", applyAppearance);
  }, [appearance, preference]);
  function setAppearance(value: Appearance) {
    try { localStorage.setItem(appearanceKey, value); temporaryPreference = null; }
    catch { temporaryPreference = value; }
    window.dispatchEvent(new Event(appearanceEvent));
  }
  return <AppearanceContext.Provider value={{ appearance, setAppearance }}>{children}</AppearanceContext.Provider>;
}
export function useAppearance() { return useContext(AppearanceContext); }
