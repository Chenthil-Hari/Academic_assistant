"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  actualTheme: "dark" | "light";
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  setTheme: () => {},
  actualTheme: "dark",
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [actualTheme, setActualTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("academic_ai_theme") as Theme | null;
    if (saved) {
      setTheme(saved);
    } else {
      setTheme("dark");
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    localStorage.setItem("academic_ai_theme", theme);
    const root = document.documentElement;

    if (theme === "system") {
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setActualTheme(systemDark ? "dark" : "light");
      if (systemDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    } else {
      setActualTheme(theme);
      if (theme === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }
  }, [theme, mounted]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, actualTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
