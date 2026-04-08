"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar } from "lucide-react";
import Sidebar from "../../components/Sidebar";
import TopNav from "../../components/TopNav";
import { useProject } from "../../components/ProjectContext";

const EMPTY = { name: "", startDate: "", endDate: "", description: "", status: "Planned", project: "" };

export default function NewSprintPage() {
  const router = useRouter();
  const { activeProject } = useProject();
  const [form, setForm] = useState({ ...EMPTY, project: activeProject });
  const [projects, setProjects] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/projects").then(r => r.json()).then(d => { if (d.success) setProjects(d.projects); });
  }, []);

  const handleSubmit = async () => {
    if (!form.name.trim()) return alert("Sprint name is required");
    if (!activeProject) return alert("Please select an active project globally");
    setSaving(true);
    const res = await fetch("/api/sprints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, project: activeProject })
    });
    const data = await res.json();
    if (data.success) router.push("/sprints");
    else { alert(data.error || "Failed to create sprint"); setSaving(false); }
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg-base)", overflow: "hidden" }}>
      <Sidebar />
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        <TopNav />
        {/* Header */}
        <header className="page-header">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link href="/sprints" className="icon-btn view" style={{ width: 34, height: 34 }}>
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="page-title">New Sprint</h1>
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>Define a new sprint for a project</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Link href="/sprints" className="btn-ghost">Cancel</Link>
            <button onClick={handleSubmit} disabled={saving} className="btn-primary">
              <Calendar size={15} /> {saving ? "Creating..." : "Create Sprint"}
            </button>
          </div>
        </header>

        {/* Form */}
        <div style={{ flex: 1, overflowY: "auto", padding: "28px" }}>
          <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>

            <div className="section-card">
              <div className="section-header"><Calendar size={14} /> Sprint Details</div>
              <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>

                <div>
                  <label className="form-label">Sprint Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="form-input" placeholder="e.g. Sprint_25 or Q2-Sprint-1" />
                </div>

                {/* Hidden Project Field */}
                <div style={{ display: 'none' }}>
                  <input type="hidden" value={activeProject} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label className="form-label">Start Date</label>
                    <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                      className="form-input" style={{ colorScheme: "dark" }} />
                  </div>
                  <div>
                    <label className="form-label">End Date</label>
                    <input type="date" value={form.endDate} min={form.startDate || undefined}
                      onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                      className="form-input" style={{ colorScheme: "dark" }} />
                  </div>
                </div>

                <div>
                  <label className="form-label">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="form-select">
                    <option value="Planned">Planned</option>
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Description</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={3} className="form-textarea" style={{ resize: "none" }} placeholder="Optional sprint goals and notes..." />
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
