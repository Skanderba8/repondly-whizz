"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Appearance = "light" | "dark" | "system";
const appearanceKey = "whizz-appearance-v1";

const AppearanceContext = createContext<{ appearance: Appearance; setAppearance: (value: Appearance) => void }>({ appearance: "light", setAppearance: () => {} });

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [appearance, setPreference] = useState<Appearance>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(appearanceKey);
      if (stored === "light" || stored === "dark" || stored === "system") setPreference(stored);
    } catch { /* Use the default when storage is unavailable. */ }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    function applyAppearance() {
      document.documentElement.classList.toggle("dark", appearance === "dark" || (appearance === "system" && media.matches));
    }
    applyAppearance();
    media.addEventListener("change", applyAppearance);
    return () => media.removeEventListener("change", applyAppearance);
  }, [appearance, ready]);

  function setAppearance(value: Appearance) {
    setPreference(value);
    try { localStorage.setItem(appearanceKey, value); } catch { /* Appearance still works for this visit. */ }
  }

  return <AppearanceContext.Provider value={{ appearance, setAppearance }}>{children}</AppearanceContext.Provider>;
}

export function useAppearance() { return useContext(AppearanceContext); }
