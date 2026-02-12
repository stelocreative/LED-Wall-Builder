"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { defaultTheme } from "@/lib/domain/catalog";
import { ThemeSettings } from "@/lib/domain/types";

interface ThemeContextValue {
  theme: ThemeSettings;
  loading: boolean;
  setTheme: (theme: ThemeSettings) => void;
  refreshTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: ThemeSettings): void {
  const root = document.documentElement;
  root.style.setProperty("--brand-primary", theme.primaryColor);
  root.style.setProperty("--brand-accent", theme.accentColor);
  root.style.setProperty("--bg", theme.backgroundColor);
  root.style.setProperty("--surface", theme.surfaceColor);
  root.style.setProperty("--text", theme.textColor);
  root.style.setProperty("--text-muted", theme.mutedTextColor);
  root.style.setProperty("--font-brand", theme.fontFamily);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeSettings>(defaultTheme);
  const [loading, setLoading] = useState(true);

  const setTheme = useCallback((nextTheme: ThemeSettings) => {
    setThemeState(nextTheme);
    applyTheme(nextTheme);
  }, []);

  const refreshTheme = useCallback(async () => {
    try {
      const response = await fetch("/api/theme", { cache: "no-store" });
      if (!response.ok) {
        setLoading(false);
        return;
      }

      const payload = (await response.json()) as ThemeSettings;
      setTheme(payload);
      setLoading(false);
    } catch {
      setTheme(defaultTheme);
      setLoading(false);
    }
  }, [setTheme]);

  useEffect(() => {
    void refreshTheme();
  }, [refreshTheme]);

  const value = useMemo(
    () => ({
      theme,
      loading,
      setTheme,
      refreshTheme
    }),
    [theme, loading, setTheme, refreshTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
