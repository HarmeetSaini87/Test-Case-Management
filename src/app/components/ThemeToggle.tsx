"use client";
import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

interface ThemeToggleProps {
  /** "pill" = the full toggle with label (sidebar style), "icon" = small icon-only button */
  variant?: "pill" | "icon";
}

export default function ThemeToggle({ variant = "pill" }: ThemeToggleProps) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Sync with whatever the ThemeProvider set on mount
  useEffect(() => {
    const saved = localStorage.getItem("panamax-theme") as "dark" | "light" | null;
    if (saved) setTheme(saved);

    // Also listen for changes from the Sidebar toggle (same tab)
    const observer = new MutationObserver(() => {
      const current = document.documentElement.getAttribute("data-theme") as "dark" | "light";
      setTheme(current || "dark");
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("panamax-theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  if (variant === "icon") {
    return (
      <button
        onClick={toggle}
        title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 38, height: 38, borderRadius: 10,
          background: "var(--bg-surface)",
          border: "1px solid var(--border-base)",
          cursor: "pointer", color: "var(--text-secondary)",
          transition: "all 0.2s", flexShrink: 0,
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)";
          (e.currentTarget as HTMLElement).style.borderColor = "var(--border-strong)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = "var(--bg-surface)";
          (e.currentTarget as HTMLElement).style.borderColor = "var(--border-base)";
        }}
      >
        {theme === "dark"
          ? <Sun size={16} color="var(--accent-yellow)" />
          : <Moon size={16} color="var(--accent-cyan)" />
        }
      </button>
    );
  }

  // Pill variant (sidebar)
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 10, padding: "8px 12px", borderRadius: 10,
      background: "var(--bg-elevated)", border: "1px solid var(--border-base)"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--text-secondary)", fontSize: 12, fontWeight: 500 }}>
        {theme === "dark"
          ? <Moon size={14} color="var(--accent-cyan)" />
          : <Sun size={14} color="var(--accent-yellow)" />
        }
        <span>{theme === "dark" ? "Dark" : "Light"} Mode</span>
      </div>
      <button
        onClick={toggle}
        className="theme-toggle"
        title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
      >
        <div className="theme-toggle-knob" />
      </button>
    </div>
  );
}
