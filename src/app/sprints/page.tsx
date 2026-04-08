"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Edit2, X, Calendar } from "lucide-react";
import Link from "next/link";
import Sidebar from "../components/Sidebar";
import TopNav from "../components/TopNav";
import { useProject } from "../components/ProjectContext";

const EMPTY = { name: "", startDate: "", endDate: "", description: "", status: "Planned", project: "" };

export default function SprintsPage() {
  const { activeProject } = useProject();
  const [sprints, setSprints] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/sprints${activeProject ? `?project=${activeProject}` : ""}`).then(r => r.json()).then(d => { if (d.success) setSprints(d.sprints); });
    fetch("/api/projects").then(r => r.json()).then(d => { if (d.success) setProjects(d.projects); });
    fetch("/api/auth/users?me=true").then(r => r.json()).then(d => { if (d.success) setUserRole(d.user?.role); });
  }, [activeProject]);

  const save = async () => {
    if (!form.name) return alert("Sprint name is required");
    setSaving(true);
    const res = await fetch("/api/sprints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editItem ? { ...form, id: editItem.id } : form)
    });
    const data = await res.json();
    if (data.success) {
      const r = await fetch("/api/sprints");
      const d = await r.json();
      if (d.success) setSprints(d.sprints);
      setShowForm(false); setEditItem(null); setForm(EMPTY);
    }
    setSaving(false);
  };

  const del = async (id: string) => {
    if (!confirm("Delete this sprint?")) return;
    await fetch("/api/sprints", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setSprints(s => s.filter(x => x.id !== id));
  };

  const statusBadge: any = {
    Planned: "badge-yellow",
    Active: "badge-green",
    Completed: "badge-gray"
  };

  const openEdit = (s: any) => {
    setEditItem(s);
    setForm({ name: s.name, startDate: s.startDate || "", endDate: s.endDate || "", description: s.description || "", status: s.status, project: s.project || "" });
    setShowForm(true);
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg-base)", overflow: "hidden" }}>
      <Sidebar />

      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", minWidth: 0 }}>
        <TopNav />
        {/* Header */}
        <header className="page-header">
          <div>
            <h1 className="page-title">Sprint Management</h1>
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
              {sprints.length} sprint{sprints.length !== 1 ? "s" : ""} defined
            </p>
          </div>
          {activeProject ? (
            <Link href="/sprints/new" target="_blank" rel="noopener noreferrer" className="btn-primary">
              <Plus size={15} /> New Sprint
            </Link>
          ) : (
            <div style={{ fontSize: 12, color: "var(--text-muted)", alignSelf: "center", fontStyle: "italic" }}>
              Select a project to create sprints
            </div>
          )}
        </header>

        {/* Table */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
          {sprints.length === 0 ? (
            <div className="empty-state">
              <Calendar size={52} />
              <h3>No Sprints Defined</h3>
              <p>{activeProject ? "Create sprints to organize test execution cycles." : "Please select a project from the sidebar top menu."}</p>
              {activeProject && (
                <Link href="/sprints/new" className="btn-primary" style={{ marginTop: 8 }}>
                  <Plus size={14} /> Create Sprint
                </Link>
              )}
            </div>
          ) : (
            <div className="section-card">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Sprint Name</th>
                    <th>Project</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Description</th>
                    <th style={{ width: 90 }}>Status</th>
                    <th style={{ width: 90, textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sprints.map((s: any, i: number) => (
                    <motion.tr
                      key={s.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {s.status === "Active" && <span className="glow-dot green" />}
                          <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)" }}>{s.name}</span>
                        </div>
                      </td>
                      <td>
                        {s.project
                          ? <span className="badge badge-cyan">{s.project}</span>
                          : <span style={{ color: "var(--text-muted)" }}>—</span>
                        }
                      </td>
                      <td style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                        {s.startDate ? new Date(s.startDate).toLocaleDateString("en-GB") : "—"}
                      </td>
                      <td style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                        {s.endDate ? new Date(s.endDate).toLocaleDateString("en-GB") : "—"}
                      </td>
                      <td style={{ maxWidth: 260 }}>
                        <span style={{ fontSize: 12, color: "var(--text-muted)", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {s.description || "—"}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${statusBadge[s.status] || "badge-gray"}`}>
                          {s.status}
                        </span>
                      </td>
                      <td>
                        <div className="actions-cell" style={{ display: "flex", justifyContent: "flex-end", gap: 4 }}>
                          <button className="icon-btn edit" onClick={() => openEdit(s)}>
                            <Edit2 size={14} />
                            <span className="tooltip">Edit Sprint</span>
                          </button>
                          <button className="icon-btn delete" onClick={() => del(s.id)}>
                            <Trash2 size={14} />
                            <span className="tooltip">Delete Sprint</span>
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ── Sprint Form Modal ── */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) { setShowForm(false); setEditItem(null); } }}
          >
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-[var(--bg-overlay)] border border-[var(--border-base)] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-5 border-b border-[var(--border-base)] bg-gradient-to-r from-[var(--accent-cyan)]/10 to-[var(--accent-violet)]/10 flex justify-between items-center">
                <h2 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Calendar size={18} className="text-[var(--accent-cyan)]" /> {editItem ? "Edit Sprint" : "Create Sprint"}
                </h2>
                <button onClick={() => { setShowForm(false); setEditItem(null); setForm({ ...EMPTY }); }} className="p-1.5 hover:bg-[var(--bg-elevated)] rounded-lg text-[var(--text-muted)] transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label className="form-label">Sprint Name *</label>
                  <input
                    value={form.name}
                    onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))}
                    className="form-input" placeholder="e.g. BSS RA Sprint 25"
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <label className="form-label">📅 Start Date *</label>
                    <input
                      type="date" value={form.startDate}
                      onChange={e => setForm((f: any) => ({ ...f, startDate: e.target.value }))}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">🏁 End Date *</label>
                    <input
                      type="date" value={form.endDate}
                      min={form.startDate || undefined}
                      onChange={e => setForm((f: any) => ({ ...f, endDate: e.target.value }))}
                      className="form-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm((f: any) => ({ ...f, status: e.target.value }))}
                    className="form-select text-[var(--text-primary)] font-medium"
                    style={{ background: 'var(--bg-surface)' }}
                  >
                    <option value="Planned" style={{ background: 'var(--bg-overlay)' }}>Planned</option>
                    <option value="Active" style={{ background: 'var(--bg-overlay)' }}>Active</option>
                    <option value="Completed" style={{ background: 'var(--bg-overlay)' }}>Completed</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Link to Project</label>
                  <select
                    value={form.project}
                    onChange={e => setForm((f: any) => ({ ...f, project: e.target.value }))}
                    className="form-select"
                  >
                    <option value="">— None —</option>
                    {projects.map((p: any) => <option key={p.id} value={p.key}>{p.name} ({p.key})</option>)}
                  </select>
                </div>

                <div>
                  <label className="form-label">Description</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))}
                    rows={3} className="form-textarea"
                    style={{ resize: "none" }}
                  />
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => { setShowForm(false); setEditItem(null); setForm({ ...EMPTY }); }} className="btn-ghost" style={{ flex: 1, justifyContent: "center", padding: "10px 0" }}>
                    Cancel
                  </button>
                  <button onClick={save} disabled={saving} className="btn-primary" style={{ flex: 1, justifyContent: "center", padding: "10px 0" }}>
                    {saving ? "Saving..." : editItem ? "Update Sprint" : "Create Sprint"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
