"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FileText, CheckCircle, Clock, AlertCircle, TrendingUp, ShieldCheck
} from "lucide-react";
import Link from "next/link";
import Sidebar from "./components/Sidebar";
import TopNav from "./components/TopNav";
import { useProject } from "./components/ProjectContext";

function StatCard({ title, value, sub, icon, colorClass }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="stat-card group"
      style={{ cursor: "default" }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <p style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--text-secondary)" }}>{title}</p>
        <div style={{
          width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
          transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)"
        }} className={`${colorClass} group-hover:scale-110 shadow-lg`}>
          {icon}
        </div>
      </div>
      <p style={{ fontSize: 34, fontWeight: 900, color: "var(--text-primary)", lineHeight: 1, marginBottom: 8, letterSpacing: "-0.02em" }}>{value}</p>
      {sub && <p style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>{sub}</p>}
    </motion.div>
  );
}

export default function DashboardPage() {
  const { activeProject } = useProject();
  const [testCases, setTestCases] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [sprints, setSprints] = useState<any[]>([]);
  const [executions, setExecutions] = useState<any[]>([]);
  const [suites, setSuites] = useState<any[]>([]);
  const [username, setUsername] = useState("there");

  useEffect(() => {
    fetch(`/api/testcases${activeProject ? `?project=${activeProject}` : ""}`).then(r => r.json()).then(d => { if (d.success) setTestCases(d.testCases); });
    fetch("/api/projects").then(r => r.json()).then(d => { if (d.success) setProjects(d.projects); });
    fetch(`/api/sprints${activeProject ? `?project=${activeProject}` : ""}`).then(r => r.json()).then(d => { if (d.success) setSprints(d.sprints); });
    fetch(`/api/executions${activeProject ? `?project=${activeProject}` : ""}`).then(r => r.json()).then(d => { if (d.success) setExecutions(d.executions); });
    fetch(`/api/suites${activeProject ? `?project=${activeProject}` : ""}`).then(r => r.json()).then(d => { if (d.success) setSuites(d.suites); });
    fetch("/api/auth/users?me=true").then(r => r.json()).then(d => {
      if (d.success) setUsername(d.user?.username || "there");
    });
  }, [activeProject]);

  const totalTCs = testCases.length;
  const activeTCs = testCases.filter(t => t.status === "Active").length;
  const draftTCs = testCases.filter(t => t.status === "Draft").length;
  const highPriority = testCases.filter(t => t.priority === "Highest" || t.priority === "High").length;
  const activeSprint = sprints.find(s => s.status === "Active");

  // Only show executions for suites that currently exist
  const activeSuitesIds = new Set(suites.map(s => s.id));
  const validExecutions = executions.filter(e => activeSuitesIds.has(e.suiteId));

  const byModule: any = {};
  testCases.forEach(tc => { const k = tc.module || "Unassigned"; byModule[k] = (byModule[k] || 0) + 1; });
  const moduleStats = Object.entries(byModule).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5);

  const sprintKeys = [...new Set(executions.map(e => e.sprint))].slice(0, 5);

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg-base)", overflow: "hidden" }}>
      <Sidebar />

      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", minWidth: 0 }}>
        <TopNav />
        {/* Header */}
        <header className="page-header border-b border-[var(--border-base)]">
          <div>
            <h1 className="page-title text-xl tracking-tight">System Dashboard</h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-cyan)] mt-0.5 opacity-80">
              {activeSprint ? `Active Phase: ${activeSprint.name}` : "Portal Overview"}
            </p>
          </div>
        </header>

        <div style={{ padding: "32px", display: "flex", flexDirection: "column", gap: 32, maxWidth: 1600, width: "100%", margin: "0 auto", paddingBottom: 64 }}>

          {/* Welcome Banner */}
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} style={{
            borderRadius: 20, padding: "32px 40px", position: "relative", overflow: "hidden",
            background: "linear-gradient(135deg, rgba(6,182,212,0.1), rgba(124,58,237,0.1))",
            border: "1px solid var(--border-strong)",
            boxShadow: "0 10px 40px -10px rgba(0,0,0,0.3)"
          }}>
            <div style={{ position: "absolute", right: 40, top: "50%", transform: "translateY(-50%)", opacity: 0.08 }}>
              <ShieldCheck size={160} color="var(--accent-cyan)" />
            </div>
            <div style={{ position: "relative", zIndex: 1 }}>
              <p style={{ color: "var(--accent-cyan)", fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", marginBottom: 8, textTransform: "uppercase" }}>System Overview</p>
              <h2 style={{ fontSize: 26, fontWeight: 900, marginBottom: 8, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                Welcome back, <span className="text-gradient" style={{ textTransform: "capitalize" }}>{username}</span> 👋
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: 14, fontWeight: 500, maxWidth: 600 }}>
                Currently managing <strong className="text-[var(--text-primary)]">{totalTCs}</strong> test cases across <strong className="text-[var(--text-primary)]">{activeProject ? `1 project (${activeProject})` : `${projects.length} accessible project${projects.length !== 1 ? 's' : ''}`}</strong>.
              </p>
            </div>
          </motion.div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            <StatCard title="Total Test Cases" value={totalTCs} sub={`${projects.length} projects`} icon={<FileText size={18} />} colorClass="badge-cyan" />
            <StatCard title="Active / Approved" value={activeTCs} sub="Validated" icon={<CheckCircle size={18} />} colorClass="badge-green" />
            <StatCard title="In Draft" value={draftTCs} sub="Pending review" icon={<Clock size={18} />} colorClass="badge-yellow" />
            <StatCard title="High Priority" value={highPriority} sub="Needs attention" icon={<AlertCircle size={18} />} colorClass="badge-red" />
          </div>

          {/* Tables row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

            {/* Sprint Performance */}
            <div className="glass-card" style={{ overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-base)", display: "flex", alignItems: "center", gap: 10 }}>
                <TrendingUp size={16} color="var(--accent-cyan)" />
                <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>Sprint Performance</span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Sprint</th>
                      <th>Pass Rate</th>
                      <th style={{ textAlign: "right" }}>Pass / Fail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sprintKeys.length === 0 ? (
                      <tr><td colSpan={3} style={{ textAlign: "center", color: "var(--text-muted)", padding: 32 }}>No execution data yet</td></tr>
                    ) : sprintKeys.map(s => {
                      const sprintEx = executions.filter(e => e.sprint === s);
                      const totalSteps = sprintEx.reduce((acc, curr) => acc + curr.results.length, 0);
                      const passSteps = sprintEx.reduce((acc, curr) => acc + curr.results.filter((r: any) => r.status === "Pass").length, 0);
                      const failSteps = sprintEx.reduce((acc, curr) => acc + curr.results.filter((r: any) => r.status === "Fail").length, 0);
                      const per = totalSteps > 0 ? Math.round((passSteps / totalSteps) * 100) : 0;
                      return (
                        <tr key={s || "unplanned"}>
                          <td style={{ fontWeight: 600, fontSize: 13 }}>{s || "Unplanned"}</td>
                          <td>
                            <span className={`badge ${per > 80 ? "badge-green" : per > 50 ? "badge-yellow" : "badge-red"}`}>
                              {per}% Pass
                            </span>
                          </td>
                          <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                            <span style={{ color: "var(--accent-green)" }}>{passSteps}</span>
                            <span style={{ color: "var(--text-muted)", margin: "0 4px" }}>/</span>
                            <span style={{ color: "var(--accent-red)" }}>{failSteps}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Suite Health */}
            <div className="glass-card" style={{ overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-base)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <CheckCircle size={16} color="var(--accent-violet-light)" />
                  <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>Suite Health</span>
                </div>
                <Link href="/suites" style={{ fontSize: 11, fontWeight: 700, color: "var(--accent-cyan)", textDecoration: "none", letterSpacing: "0.05em" }}>
                  VIEW ALL →
                </Link>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Suite Name</th>
                      <th>Sprint</th>
                      <th style={{ textAlign: "right" }}>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validExecutions.length === 0 ? (
                      <tr><td colSpan={3} style={{ textAlign: "center", color: "var(--text-muted)", padding: 32 }}>No active suite results</td></tr>
                    ) : validExecutions.slice(0, 5).map(e => {
                      const total = e.results.length;
                      const pass = e.results.filter((r: any) => r.status === "Pass").length;
                      const per = total > 0 ? Math.round((pass / total) * 100) : 0;
                      return (
                        <tr key={e.id}>
                          <td style={{ fontWeight: 600, fontSize: 13, maxWidth: 180 }}>
                            <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.suiteName}</span>
                          </td>
                          <td>
                            <span className="badge badge-cyan" style={{ fontSize: 9 }}>{e.sprint}</span>
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 800, fontSize: 13,
                            color: per > 80 ? "var(--accent-green)" : per > 50 ? "var(--accent-yellow)" : "var(--accent-red)"
                          }}>
                            {per}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Bottom row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

            {/* Coverage by Module */}
            <div className="glass-card" style={{ padding: "20px" }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 18 }}>Coverage by Module</h3>
              {moduleStats.length === 0
                ? <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No data yet.</p>
                : moduleStats.map(([mod, cnt]: any) => (
                  <div key={mod} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                    <p style={{ fontSize: 12, color: "var(--text-secondary)", width: 120, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mod}</p>
                    <div style={{ flex: 1, height: 5, background: "var(--border-base)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", borderRadius: 3,
                        background: "linear-gradient(90deg, var(--accent-cyan), var(--accent-violet))",
                        width: `${totalTCs > 0 ? (cnt / totalTCs) * 100 : 0}%`,
                        transition: "width 0.6s"
                      }} />
                    </div>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", width: 24, textAlign: "right", flexShrink: 0 }}>{cnt}</span>
                  </div>
                ))
              }
            </div>

            {/* Sprint Cycles */}
            <div className="glass-card" style={{ overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-base)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>Sprint Cycles</span>
                <Link href="/sprints" style={{ fontSize: 11, fontWeight: 700, color: "var(--accent-cyan)", textDecoration: "none" }}>Manage →</Link>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Sprint Name</th>
                    <th>Project</th>
                    <th style={{ textAlign: "right" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sprints.length === 0 ? (
                    <tr><td colSpan={3} style={{ textAlign: "center", color: "var(--text-muted)", padding: 32 }}>No sprints yet</td></tr>
                  ) : sprints.slice(0, 5).map((s: any) => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</td>
                      <td style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.project || "—"}</td>
                      <td style={{ textAlign: "right" }}>
                        <span className={`badge ${s.status === "Active" ? "badge-green" : s.status === "Planned" ? "badge-yellow" : "badge-gray"}`}>
                          {s.status === "Active" && <span className="glow-dot green" style={{ width: 5, height: 5, marginRight: 3 }} />}
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
