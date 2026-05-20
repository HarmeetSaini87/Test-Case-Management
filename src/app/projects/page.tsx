"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Edit2, X, Layers, FolderOpen, Tag } from "lucide-react";
import Link from "next/link";
import Sidebar from "../components/Sidebar";

const emptyProject = { name: "", key: "", description: "", modules: [] as any[], versions: [] as string[] };

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editProject, setEditProject] = useState<any | null>(null);
  const [form, setForm] = useState(emptyProject);
  const [newModule, setNewModule] = useState("");
  const [newSubModule, setNewSubModule] = useState<{ [k: string]: string }>({});
  const [newEntity, setNewEntity] = useState<{ [k: string]: string }>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProjects();
    fetch("/api/auth/users?me=true").then(r => r.json()).then(d => { if (d.success) setUserRole(d.user?.role); });
  }, []);

  const fetchProjects = () =>
    fetch("/api/projects").then(r => r.json()).then(d => { if (d.success) setProjects(d.projects); });

  const handleSubmit = async () => {
    if (!form.name || !form.key) return alert("Project name and key are required");
    setSaving(true);
    const method = editProject ? "PUT" : "POST";
    const body = editProject ? { ...editProject, ...form } : form;
    const res = await fetch("/api/projects", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (data.success) { fetchProjects(); setShowForm(false); setEditProject(null); setForm(emptyProject); }
    else alert(data.error);
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this project? All its test cases will remain but be unlinked.")) return;
    await fetch("/api/projects", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    fetchProjects();
  };

  const openEdit = (p: any) => {
    setEditProject(p);
    setForm({ name: p.name, key: p.key, description: p.description, modules: p.modules || [], versions: p.versions || [] });
    setShowForm(true);
  };

  const addModule = () => {
    if (!newModule.trim()) return;
    setForm(f => ({ ...f, modules: [...f.modules, { name: newModule.trim(), subModules: [] }] }));
    setNewModule("");
  };

  const addSubModule = (mIdx: number) => {
    const key = `sm_${mIdx}`;
    if (!newSubModule[key]?.trim()) return;
    setForm(f => {
      const mods = [...f.modules];
      mods[mIdx] = { ...mods[mIdx], subModules: [...(mods[mIdx].subModules || []), { name: newSubModule[key].trim(), entities: [] }] };
      return { ...f, modules: mods };
    });
    setNewSubModule(s => ({ ...s, [key]: "" }));
  };

  const addEntity = (mIdx: number, sIdx: number) => {
    const key = `e_${mIdx}_${sIdx}`;
    if (!newEntity[key]?.trim()) return;
    setForm(f => {
      const mods = [...f.modules];
      const subs = [...(mods[mIdx].subModules || [])];
      subs[sIdx] = { ...subs[sIdx], entities: [...(subs[sIdx].entities || []), newEntity[key].trim()] };
      mods[mIdx] = { ...mods[mIdx], subModules: subs };
      return { ...f, modules: mods };
    });
    setNewEntity(e => ({ ...e, [key]: "" }));
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg-base)", overflow: "hidden" }}>
      <Sidebar />

      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", minWidth: 0 }}>
        {/* Header */}
        <header className="page-header">
          <div>
            <h1 className="page-title">Projects</h1>
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{projects.length} project{projects.length !== 1 ? "s" : ""} total</p>
          </div>
          {userRole === "admin" && (
            <Link href="/projects/new" className="btn-primary">
              <Plus size={15} /> New Project
            </Link>
          )}
        </header>

        {/* Table */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
          {projects.length === 0 ? (
            <div className="empty-state">
              <FolderOpen size={52} />
              <h3>No Projects Yet</h3>
              <p>Create a project to start organizing your test repository.</p>
              {userRole === "admin" && (
                <Link href="/projects/new" className="btn-primary" style={{ marginTop: 8 }}>
                  <Plus size={14} /> Create First Project
                </Link>
              )}
            </div>
          ) : (
            <div className="section-card">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 80 }}>Key</th>
                    <th>Project Name</th>
                    <th>Description</th>
                    <th style={{ width: 100 }}>Modules</th>
                    <th style={{ width: 100, textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p, i) => (
                    <motion.tr
                      key={p.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      style={{ cursor: "default" }}
                    >
                      <td>
                        <span style={{
                          display: "inline-block", padding: "3px 10px",
                          background: "var(--accent-cyan)", color: "white", borderRadius: 6,
                          fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em",
                          boxShadow: "0 2px 8px rgba(6,182,212,0.3)"
                        }}>
                          {p.key}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{p.name}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", maxWidth: 380, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {p.description || "—"}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-violet">
                          <Layers size={10} /> {p.modules?.length || 0}
                        </span>
                      </td>
                      <td>
                        <div className="actions-cell" style={{ display: "flex", justifyContent: "flex-end", gap: 4 }}>
                          {userRole === "admin" && (
                            <>
                              <button className="icon-btn edit" onClick={() => openEdit(p)} title="">
                                <Edit2 size={14} />
                                <span className="tooltip">Edit Project</span>
                              </button>
                              <button className="icon-btn delete" onClick={() => handleDelete(p.id)} title="">
                                <Trash2 size={14} />
                                <span className="tooltip">Delete Project</span>
                              </button>
                            </>
                          )}
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

      {/* ── Project Form Modal ── */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) { setShowForm(false); setEditProject(null); } }}
          >
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-[var(--bg-overlay)] border border-[var(--border-base)] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-[var(--border-base)] bg-gradient-to-r from-[var(--accent-cyan)]/10 to-[var(--accent-violet)]/10 flex justify-between items-center">
                <h2 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <FolderOpen size={18} className="text-[var(--accent-cyan)]" /> {editProject ? "Edit Project" : "Create New Project"}
                </h2>
                <button onClick={() => { setShowForm(false); setEditProject(null); }} className="p-1.5 hover:bg-[var(--bg-elevated)] rounded-lg text-[var(--text-muted)] transition-colors">
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div>
                      <label className="form-label">Project Name *</label>
                      <input
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        className="form-input" placeholder="e.g. Billing System"
                      />
                    </div>
                    <div>
                      <label className="form-label">Project Key * (auto-prefixes IDs)</label>
                      <input
                        value={form.key}
                        onChange={e => setForm(f => ({ ...f, key: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") }))}
                        maxLength={6} className="form-input" placeholder="e.g. BSS"
                        style={{ fontFamily: "var(--font-mono)" }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="form-label">Description</label>
                    <textarea
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      rows={2} className="form-textarea"
                    />
                  </div>

                  {/* Versions Section */}
                  <div>
                    <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                      <Tag size={14} color="var(--accent-violet)" /> Version Management
                    </h3>
                    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                      <input
                        id="new-version-input"
                        className="form-input" placeholder="Add Version (e.g. 1.0, 2.1)"
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            const val = (e.currentTarget as HTMLInputElement).value.trim();
                            if (val) {
                              setForm(f => ({ ...f, versions: [...(f as any).versions || [], val] }));
                              e.currentTarget.value = "";
                            }
                          }
                        }}
                      />
                      <button className="btn-ghost" onClick={() => {
                        const input = document.getElementById('new-version-input') as HTMLInputElement;
                        const val = input.value.trim();
                        if (val) {
                          setForm(f => ({ ...f, versions: [...(f as any).versions || [], val] }));
                          input.value = "";
                        }
                      }}>
                        <Plus size={15} />
                      </button>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {((form as any).versions || []).map((v: string, vIdx: number) => (
                        <div key={vIdx} className="badge badge-violet flex items-center gap-2 pr-1">
                          {v}
                          <button onClick={() => setForm(f => ({ ...f, versions: ((f as any).versions || []).filter((_: any, i: number) => i !== vIdx) }))}
                            className="hover:text-white transition-colors"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Module Builder */}
                  <div>
                    <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                      <Layers size={14} color="var(--accent-cyan)" /> Module Hierarchy
                    </h3>
                    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                      <input
                        value={newModule}
                        onChange={e => setNewModule(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && addModule()}
                        className="form-input" placeholder="Add Module (e.g. Payment Gateway)"
                      />
                      <button onClick={addModule} className="btn-ghost" style={{ flexShrink: 0, padding: "0 14px" }}>
                        <Plus size={15} />
                      </button>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 280, overflowY: "auto" }}>
                      {form.modules.map((mod, mIdx) => (
                        <div key={mIdx} style={{
                          background: "var(--bg-elevated)", borderRadius: 10, padding: 12,
                          border: "1px solid var(--border-base)"
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)" }}>{mod.name}</span>
                            <button
                              onClick={() => setForm(f => ({ ...f, modules: f.modules.filter((_, i) => i !== mIdx) }))}
                              className="icon-btn delete" style={{ width: 24, height: 24 }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                          <div style={{ paddingLeft: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                            {(mod.subModules || []).map((sm: any, sIdx: number) => (
                              <div key={sIdx} style={{ borderLeft: "2px solid var(--border-base)", paddingLeft: 10 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{sm.name}</span>
                                  <button
                                    onClick={() => setForm(f => {
                                      const mods = [...f.modules];
                                      mods[mIdx] = { ...mods[mIdx], subModules: mods[mIdx].subModules.filter((_: any, i: number) => i !== sIdx) };
                                      return { ...f, modules: mods };
                                    })}
                                    className="icon-btn delete" style={{ width: 20, height: 20 }}
                                  >
                                    <X size={10} />
                                  </button>
                                </div>
                                {(sm.entities || []).map((ent: string, eIdx: number) => (
                                  <span key={eIdx} className="badge badge-violet" style={{ marginRight: 4, marginBottom: 4 }}>{ent}</span>
                                ))}
                                <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                                  <input
                                    value={newEntity[`e_${mIdx}_${sIdx}`] || ""}
                                    onChange={e => setNewEntity(en => ({ ...en, [`e_${mIdx}_${sIdx}`]: e.target.value }))}
                                    onKeyDown={e => e.key === "Enter" && addEntity(mIdx, sIdx)}
                                    className="form-input" style={{ fontSize: 11, padding: "4px 8px" }} placeholder="Add Entity..."
                                  />
                                  <button onClick={() => addEntity(mIdx, sIdx)} className="btn-ghost" style={{ padding: "0 8px", fontSize: 11 }}>
                                    <Plus size={11} />
                                  </button>
                                </div>
                              </div>
                            ))}
                            <div style={{ display: "flex", gap: 6 }}>
                              <input
                                value={newSubModule[`sm_${mIdx}`] || ""}
                                onChange={e => setNewSubModule(s => ({ ...s, [`sm_${mIdx}`]: e.target.value }))}
                                onKeyDown={e => e.key === "Enter" && addSubModule(mIdx)}
                                className="form-input" style={{ fontSize: 12, padding: "6px 10px" }} placeholder="+ Add Sub Module..."
                              />
                              <button onClick={() => addSubModule(mIdx)} className="btn-ghost" style={{ padding: "0 10px" }}>
                                <Plus size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
                    <button onClick={() => { setShowForm(false); setEditProject(null); }} className="btn-ghost" style={{ flex: 1, justifyContent: "center", padding: "10px 0" }}>
                      Cancel
                    </button>
                    <button onClick={handleSubmit} disabled={saving} className="btn-primary" style={{ flex: 1, justifyContent: "center", padding: "10px 0" }}>
                      {saving ? "Saving..." : editProject ? "Update Project" : "Create Project"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
