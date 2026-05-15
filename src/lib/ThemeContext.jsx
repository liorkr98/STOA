import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";

// Theme is one of: "light" | "dark" | "auto"
// "auto" resolves to "dark" between 19:00 and 07:00 local time, "light" otherwise.

const ThemeContext = createContext({
  theme: "light",
  resolvedTheme: "light",
  setTheme: () => {},
});

const STORAGE_KEY = "stoa.theme";

function resolveAuto() {
  const hour = new Date().getHours();
  return hour >= 19 || hour < 7 ? "dark" : "light";
}

function applyToDocument(resolved) {
  const root = document.documentElement;
  if (resolved === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  // Sync the iOS/Android theme-color meta so the address bar matches.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", resolved === "dark" ? "#0C1829" : "#1E3A8A");
}

export function ThemeProvider({ children }) {
  // Read initial choice synchronously so we never paint the wrong theme.
  const [theme, setThemeState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "light" || stored === "dark" || stored === "auto") return stored;
    } catch {}
    return "light";
  });

  const resolvedTheme = theme === "auto" ? resolveAuto() : theme;

  // Apply on every change.
  useEffect(() => {
    applyToDocument(resolvedTheme);
  }, [resolvedTheme]);

  // When in auto mode, re-check at the next hour so we flip at 07:00/19:00.
  useEffect(() => {
    if (theme !== "auto") return;
    const now = new Date();
    const next = new Date(now);
    next.setMinutes(0, 0, 0);
    next.setHours(now.getHours() + 1);
    const ms = next.getTime() - now.getTime();
    const t = setTimeout(() => applyToDocument(resolveAuto()), ms);
    return () => clearTimeout(t);
  }, [theme, resolvedTheme]);

  // On mount, also hydrate from the user's saved preference in Base44 if it
  // differs from localStorage (covers cross-device usage).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await base44.auth.me();
        if (cancelled || !me) return;
        const pref = me.theme_preference;
        if ((pref === "light" || pref === "dark" || pref === "auto") && pref !== theme) {
          setThemeState(pref);
          try { localStorage.setItem(STORAGE_KEY, pref); } catch {}
        }
      } catch {
        // Not authenticated — ignore.
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setTheme = useCallback(async (next) => {
    if (next !== "light" && next !== "dark" && next !== "auto") return;
    setThemeState(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch {}
    // Persist to the user's profile (cross-device). Best-effort; failing here
    // shouldn't undo the visual change.
    try { await base44.entities.User.updateMyUserData({ theme_preference: next }); } catch {}
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
