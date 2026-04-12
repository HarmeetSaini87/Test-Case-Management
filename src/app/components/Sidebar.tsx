"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, FolderOpen, ShieldCheck, Layers,
  Calendar, Upload, Settings, LogOut, Zap, ChevronRight, FileText
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { useProject } from "./ProjectContext";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Interactive Dashboard", href: "/dashboard" },
  { icon: FolderOpen,      label: "Projects",              href: "/projects" },
  { icon: ShieldCheck,     label: "Test Repository", href: "/testcases" },
  { icon: Layers,          label: "Test Suites",     href: "/suites" },
  { icon: Calendar,        label: "Sprints",         href: "/sprints" },
  { icon: Upload,          label: "Import",          href: "/import" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [username, setUsername] = useState("user");
  const [expanded, setExpanded] = useState(true);
  const { activeProject, setActiveProject, projects } = useProject();

  /* ── Fetch current user ── */
  useEffect(() => {
    fetch("/api/auth/users?me=true")
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setUserRole(d.user?.role ?? null);
          setUsername(d.user?.username ?? "user");
        }
      });
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/login", { method: "DELETE" });
    window.location.href = "/login";
  };

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const W = expanded ? 220 : 64;

  return (
    <aside className="sidebar" style={{ width: W }}>
      {/* ── Logo / Brand ── */}
      <div
        className="sidebar-logo"
        style={{ padding: expanded ? "0 14px 0 18px" : "0", justifyContent: expanded ? "space-between" : "center" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, overflow: "hidden" }}>
          <div style={{
            width: 33, height: 33, borderRadius: 10, flexShrink: 0,
            background: "linear-gradient(135deg, #06b6d4, #7c3aed)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 16px rgba(6,182,212,0.4)"
          }}>
            <Zap size={17} color="white" />
          </div>
          {expanded && (
            <span style={{
              fontSize: 14, fontWeight: 800, letterSpacing: "0.09em",
              background: "linear-gradient(135deg, #06b6d4, #a78bfa)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              whiteSpace: "nowrap"
            }}>
              PANAMAX
            </span>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            background: "var(--bg-elevated)", border: "1px solid var(--border-base)",
            borderRadius: 7, width: 26, height: 26, display: "flex", alignItems: "center",
            justifyContent: "center", cursor: "pointer", color: "var(--text-muted)",
            transition: "all 0.2s", flexShrink: 0
          }}
          title={expanded ? "Collapse" : "Expand"}
        >
          <ChevronRight
            size={13}
            style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.25s" }}
          />
        </button>
      </div>

      {/* ── Section label ── */}
      {expanded && (
        <div style={{ padding: "14px 18px 4px" }}>
          <span className="sidebar-section-label">Navigation</span>
        </div>
      )}

      {/* ── Nav Items ── */}
      <nav style={{
        flex: 1, overflowY: "auto", overflowX: "hidden",
        padding: expanded ? "4px 10px" : "4px 8px",
        display: "flex", flexDirection: "column", gap: 2
      }}>
        {NAV_ITEMS.map(({ icon: Icon, label, href }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`sidebar-nav-item${active ? " active" : ""}`}
              title={!expanded ? label : undefined}
              style={{
                padding: expanded ? "10px 12px" : "10px 0",
                justifyContent: expanded ? "flex-start" : "center",
              }}
            >
              {/* Active left-bar indicator */}
              {active && (
                <span style={{
                  position: "absolute", left: 0, top: "22%", bottom: "22%",
                  width: 3, borderRadius: "0 3px 3px 0",
                  background: "linear-gradient(180deg, var(--accent-cyan), var(--accent-violet))",
                  boxShadow: "0 0 8px var(--accent-cyan)"
                }} />
              )}

              <Icon
                size={18}
                style={{
                  flexShrink: 0,
                  filter: active ? "drop-shadow(0 0 6px var(--accent-cyan))" : "none",
                  transition: "filter 0.2s"
                }}
              />

              {expanded && (
                <span style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {label}
                </span>
              )}

              {/* Collapsed tooltip */}
              {!expanded && (
                <span className="nav-tooltip" style={{
                  position: "absolute", left: "calc(100% + 12px)", top: "50%",
                  transform: "translateY(-50%)",
                  background: "var(--bg-overlay)",
                  border: "1px solid var(--border-strong)",
                  color: "var(--text-primary)",
                  fontSize: 11, fontWeight: 600,
                  padding: "4px 10px", borderRadius: 7,
                  whiteSpace: "nowrap", pointerEvents: "none",
                  opacity: 0, transition: "opacity 0.15s",
                  boxShadow: "var(--shadow-lg)", zIndex: 999
                }}>
                  {label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Bottom: Theme Toggle + Admin + Logout ── */}
      <div style={{
        borderTop: "1px solid var(--border-base)",
        padding: expanded ? "10px 10px 16px" : "10px 8px 16px",
        display: "flex", flexDirection: "column", gap: 4
      }}>

        {/* ── Theme Toggle ── */}
        {expanded
          ? <ThemeToggle variant="pill" />
          : <div style={{ display: "flex", justifyContent: "center", marginBottom: 2 }}><ThemeToggle variant="icon" /></div>
        }

        {/* ── User Avatar (expanded only) ── */}
        {expanded && username && (
          <div style={{
            display: "flex", alignItems: "center", gap: 9,
            padding: "8px 12px", borderRadius: 10, marginBottom: 2,
            background: "var(--bg-surface)", border: "1px solid var(--border-base)"
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
              background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-violet))",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 800, color: "white"
            }}>
              {username.charAt(0).toUpperCase()}
            </div>
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {username}
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em",
                color: userRole === "admin" ? "var(--accent-violet-light)" : "var(--accent-cyan)" }}>
                {userRole ?? "..."}
              </div>
            </div>
          </div>
        )}

        {/* ── Admin Ops ── */}
        {userRole === "admin" && (
          <Link
            href="/admin"
            className={`sidebar-nav-item${isActive("/admin") ? " active" : ""}`}
            title={!expanded ? "Admin Ops" : undefined}
            style={{
              padding: expanded ? "10px 12px" : "10px 0",
              justifyContent: expanded ? "flex-start" : "center",
              color: isActive("/admin") ? "var(--accent-violet-light)" : undefined,
              background: isActive("/admin") ? "rgba(124,58,237,0.1)" : undefined,
            }}
          >
            <Settings size={18} style={{ flexShrink: 0 }} />
            {expanded && <span style={{ fontSize: 13 }}>Admin Ops</span>}
            {!expanded && (
              <span className="nav-tooltip" style={{
                position: "absolute", left: "calc(100% + 12px)", top: "50%",
                transform: "translateY(-50%)", background: "var(--bg-overlay)",
                border: "1px solid var(--border-strong)", color: "var(--text-primary)",
                fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 7,
                whiteSpace: "nowrap", pointerEvents: "none", opacity: 0, transition: "opacity 0.15s",
                boxShadow: "var(--shadow-lg)", zIndex: 999
              }}>Admin Ops</span>
            )}
          </Link>
        )}

        {/* ── Logout ── */}
        <button
          onClick={handleLogout}
          className="sidebar-nav-item danger"
          title={!expanded ? "Logout" : undefined}
          style={{
            padding: expanded ? "10px 12px" : "10px 0",
            justifyContent: expanded ? "flex-start" : "center",
            width: "100%",
          }}
        >
          <LogOut size={18} style={{ flexShrink: 0 }} />
          {expanded && <span style={{ fontSize: 13 }}>Logout</span>}
          {!expanded && (
            <span className="nav-tooltip" style={{
              position: "absolute", left: "calc(100% + 12px)", top: "50%",
              transform: "translateY(-50%)", background: "var(--bg-overlay)",
              border: "1px solid var(--border-strong)", color: "var(--text-primary)",
              fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 7,
              whiteSpace: "nowrap", pointerEvents: "none", opacity: 0, transition: "opacity 0.15s",
              boxShadow: "var(--shadow-lg)", zIndex: 999
            }}>Logout</span>
          )}
        </button>
      </div>

      <style>{`
        .sidebar-nav-item:hover .nav-tooltip { opacity: 1 !important; }
      `}</style>
    </aside>
  );
}
