"use client";
import { useEffect } from "react";

/**
 * ThemeProvider — mounts once at the root layout level.
 * Reads saved theme from localStorage and applies it to <html data-theme="...">
 * immediately so there's no flash of wrong theme.
 */
export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const saved = localStorage.getItem("panamax-theme") || "dark";
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  return <>{children}</>;
}
