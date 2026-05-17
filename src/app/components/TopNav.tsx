"use client";
import React from "react";
import { useProject } from "./ProjectContext";
import { Layers, ChevronDown } from "lucide-react";
import { usePathname } from "next/navigation";

export default function TopNav() {
  const { activeProject, setActiveProject, projects } = useProject();
  const pathname = usePathname();

  // Project selector is only visible on these pages
  const visiblePages = ["/testcases", "/suites", "/sprints", "/projects"];
  const isProjectVisible = visiblePages.some(page => pathname.startsWith(page));

  const handleProjectChange = (newProject: string) => {
    if (pathname.includes("/requirements")) {
      window.location.href = `/projects/${newProject}/requirements`;
    } else if (pathname.includes("/rtm")) {
      window.location.href = `/projects/${newProject}/rtm`;
    } else {
      setActiveProject(newProject);
    }
  };

  return (
    <header style={{
      height: 56, width: "100%", background: "var(--bg-elevated)", borderBottom: "1px solid var(--border-base)",
      display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "0 24px", zIndex: 10, flexShrink: 0
    }}>
      {isProjectVisible ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Layers size={16} color="var(--text-muted)" />
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Project:</span>
          <select
            value={activeProject}
            onChange={e => handleProjectChange(e.target.value)}
            style={{
              background: "var(--bg-base)", border: "1.5px solid var(--border-strong)",
              color: "var(--text-primary)", padding: "6px 12px", borderRadius: 8,
              fontSize: 12, fontWeight: 600, outline: "none", minWidth: 160, cursor: "pointer", appearance: "none"
            }}
          >
            <option value="" disabled hidden>Select Project</option>
            {projects.map(p => (
              <option key={p.key} value={p.key}>{p.name}</option>
            ))}
          </select>
          {/* Custom arrow for appearance: none */}
          <div style={{ marginLeft: -30, pointerEvents: "none", display: "flex", alignItems: "center" }}>
             <Layers size={12} color="var(--text-muted)" />
          </div>
        </div>
      ) : null}
    </header>
  );
}
