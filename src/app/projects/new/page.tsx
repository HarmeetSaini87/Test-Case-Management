"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, ChevronRight, FolderOpen, Tag } from "lucide-react";
import Sidebar from "../../components/Sidebar";

const empty = { name: "", key: "", description: "", modules: [] as any[], versions: [] as string[] };

export default function NewProjectPage() {
  const router = useRouter();
  const [form, setForm] = useState(empty);
  const [newModule, setNewModule] = useState("");
  const [newSubModule, setNewSubModule] = useState<{ [k: string]: string }>({});
  const [newEntity, setNewEntity] = useState<{ [k: string]: string }>({});
  const [saving, setSaving] = useState(false);

  const addModule = () => {
    if (!newModule.trim()) return;
    setForm(f => ({ ...f, modules: [...f.modules, { name: newModule.trim(), subModules: [] }] }));
    setNewModule("");
  };

  const removeModule = (i: number) => setForm(f => ({ ...f, modules: f.modules.filter((_, idx) => idx !== i) }));

  const addSubModule = (mi: number) => {
    const key = `${mi}`;
    const val = (newSubModule[key] || "").trim();
    if (!val) return;
    setForm(f => {
      const mods = [...f.modules];
      mods[mi] = { ...mods[mi], subModules: [...(mods[mi].subModules || []), { name: val, entities: [] }] };
      return { ...f, modules: mods };
    });
    setNewSubModule(s => ({ ...s, [key]: "" }));
  };

  const addEntity = (mi: number, si: number) => {
    const key = `${mi}-${si}`;
    const val = (newEntity[key] || "").trim();
    if (!val) return;
    setForm(f => {
      const mods = [...f.modules];
      const subs = [...(mods[mi].subModules || [])];
      subs[si] = { ...subs[si], entities: [...(subs[si].entities || []), { name: val }] };
      mods[mi] = { ...mods[mi], subModules: subs };
      return { ...f, modules: mods };
    });
    setNewEntity(s => ({ ...s, [key]: "" }));
  };

  const handleSubmit = async () => {
    if (!form.name || !form.key) return alert("Project name and key are required");
    setSaving(true);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const data = await res.json();
    if (data.success) router.push("/projects");
    else { alert(data.error); setSaving(false); }
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg-base)", overflow: "hidden" }}>
      <Sidebar />
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        {/* Header */}
        <header className="page-header">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link href="/projects" className="icon-btn view" style={{ width: 34, height: 34 }}>
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="page-title">New Project</h1>
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>Fill in the details to create a new project</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Link href="/projects" className="btn-ghost">Cancel</Link>
            <button onClick={handleSubmit} disabled={saving} className="btn-primary">
              <FolderOpen size={15} /> {saving ? "Creating..." : "Create Project"}
            </button>
          </div>
        </header>

        {/* Form */}
        <div style={{ flex: 1, overflowY: "auto", padding: "28px" }}>
          <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Basic Info */}
            <div className="section-card">
              <div className="section-header"><FolderOpen size={14} /> Basic Information</div>
              <div style={{ padding: "20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label className="form-label">Project Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="form-input" placeholder="e.g. BSS Mediation" />
                </div>
                <div>
                  <label className="form-label">Project Key *</label>
                  <input value={form.key} onChange={e => setForm(f => ({ ...f, key: e.target.value.toUpperCase() }))}
                    className="form-input" placeholder="e.g. BSSMED" maxLength={10} />
                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 5 }}>Uppercase short code, used as TC prefix</p>
                </div>
                <div>
                  <label className="form-label">Description</label>
                  <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    className="form-input" placeholder="Optional project description" />
                </div>
              </div>
            </div>

            {/* Versions */}
            <div className="section-card">
              <div className="section-header"><Tag size={14} /> Version Management</div>
              <div style={{ padding: "16px 20px" }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <input id="new-v-input" className="form-input" placeholder="Add Version (e.g. 1.0, 2.0)..." 
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        const val = e.currentTarget.value.trim();
                        if (val) {
                          setForm(f => ({ ...f, versions: [...(f as any).versions || [], val] }));
                          e.currentTarget.value = "";
                        }
                      }
                    }}
                  />
                  <button className="btn-ghost" onClick={() => {
                    const i = document.getElementById('new-v-input') as HTMLInputElement;
                    if (i.value.trim()) {
                      setForm(f => ({ ...f, versions: [...(f as any).versions || [], i.value.trim()] }));
                      i.value = "";
                    }
                  }}>
                    <Plus size={14} />
                  </button>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {((form as any).versions || []).map((v: string, idx: number) => (
                    <span key={idx} className="badge badge-violet" style={{ padding: "4px 10px", display: "flex", alignItems: "center", gap: 6 }}>
                      {v}
                      <button onClick={() => setForm(f => ({ ...f, versions: ((f as any).versions || []).filter((_: any, i: number) => i !== idx) }))}>
                        <Trash2 size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Modules */}
            <div className="section-card">
              <div className="section-header"><ChevronRight size={14} /> Modules & Hierarchy</div>
              <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                {form.modules.map((mod: any, mi: number) => (
                  <div key={mi} style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-base)", borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)" }}>{mod.name}</span>
                      <button onClick={() => removeModule(mi)} className="icon-btn delete"><Trash2 size={13} /></button>
                    </div>
                    {/* SubModules */}
                    {(mod.subModules || []).map((sub: any, si: number) => (
                      <div key={si} style={{ marginLeft: 16, marginBottom: 6, padding: "6px 10px", background: "var(--bg-surface)", borderRadius: 8, border: "1px solid var(--border-base)" }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 4 }}>↳ {sub.name}</div>
                        {(sub.entities || []).map((ent: any, ei: number) => (
                          <div key={ei} style={{ marginLeft: 16, fontSize: 11, color: "var(--text-muted)" }}>· {ent.name}</div>
                        ))}
                        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                          <input value={newEntity[`${mi}-${si}`] || ""} onChange={e => setNewEntity(s => ({ ...s, [`${mi}-${si}`]: e.target.value }))}
                            onKeyDown={e => e.key === "Enter" && addEntity(mi, si)}
                            className="form-input" style={{ fontSize: 11, padding: "4px 8px", flex: 1 }} placeholder="Add entity..." />
                          <button onClick={() => addEntity(mi, si)} className="btn-ghost" style={{ padding: "4px 8px", fontSize: 11 }}>+ Entity</button>
                        </div>
                      </div>
                    ))}
                    <div style={{ display: "flex", gap: 6, marginTop: 8, marginLeft: 16 }}>
                      <input value={newSubModule[`${mi}`] || ""} onChange={e => setNewSubModule(s => ({ ...s, [`${mi}`]: e.target.value }))}
                        onKeyDown={e => e.key === "Enter" && addSubModule(mi)}
                        className="form-input" style={{ fontSize: 12, padding: "5px 10px", flex: 1 }} placeholder="Add sub-module..." />
                      <button onClick={() => addSubModule(mi)} className="btn-ghost" style={{ padding: "5px 10px", fontSize: 11 }}>+ Sub-Module</button>
                    </div>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={newModule} onChange={e => setNewModule(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addModule()}
                    className="form-input" placeholder="Add a module (press Enter)..." />
                  <button onClick={addModule} className="btn-ghost" style={{ padding: "9px 16px", whiteSpace: "nowrap" }}>
                    <Plus size={14} /> Add Module
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
