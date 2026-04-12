"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Plus, Trash2, Save, FileText,
  MoveUp, MoveDown, Tag, X
} from "lucide-react";
import Sidebar from "../../../components/Sidebar";
import TopNav from "../../../components/TopNav";
import { useProject } from "../../../components/ProjectContext";

const EMPTY_TC = {
  title: "", objective: "", description: "", project: "", versionNumbers: [] as string[], module: "", subModule: "", entity: "",
  priority: "Medium", status: "Draft", testCategory: "", testingType: "",
  testIntent: "", automationType: "Not Automated", labels: [] as string[],
  preconditions: "", estimatedTime: "",
  steps: [] as { action: string; testData: string; expectedResult: string }[],
};

export default function EditTestCasePage() {
  const router = useRouter();
  const params = useParams();
  const idStr = Array.isArray(params?.id) ? params?.id[0] : params?.id;

  const { activeProject } = useProject();
  const [form, setForm] = useState({ ...EMPTY_TC, project: activeProject });
  const [projects, setProjects] = useState<any[]>([]);
  const [configs, setConfigs] = useState<any>({ testCategories: [], testingTypes: [], testIntents: [] });
  const [currentUser, setCurrentUser] = useState("admin");
  const [saving, setSaving] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects").then(r => r.json()).then(d => { if (d.success) setProjects(d.projects); });
    fetch("/api/admin/configs").then(r => r.json()).then(d => { if (d.success) setConfigs(d.configs); });
    fetch("/api/auth/users?me=true").then(r => r.json()).then(d => {
      if (d.success) setCurrentUser(d.user?.username || "admin");
    });
    
    // Fetch specifically the TC to edit
    if (idStr) {
      setLoading(true);
      fetch(`/api/testcases?testCaseId=${idStr}`).then(r => r.json()).then(d => {
        if (d.success && d.testCase) {
          setForm({ ...EMPTY_TC, ...d.testCase });
        } else {
          alert("Test Case not found!");
          router.push("/testcases");
        }
        setLoading(false);
      }).catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
    // Set project context if available
    if (activeProject) setForm(f => ({ ...f, project: activeProject }));
  }, [idStr, router, activeProject]);

  // Derive contextual dropdowns
  const selectedProject = projects.find((p: any) => p.key === form.project);
  const modules = selectedProject?.modules || [];
  const subModules = modules.find((m: any) => m.name === form.module)?.subModules || [];
  const entities = subModules.find((s: any) => s.name === form.subModule)?.entities || [];

  const addStep = () => setForm(f => ({ ...f, steps: [...f.steps, { action: "", testData: "", expectedResult: "" }] }));
  const updateStep = (idx: number, key: string, val: string) => setForm(f => {
    const steps = [...f.steps]; steps[idx] = { ...steps[idx], [key]: val }; return { ...f, steps };
  });
  const removeStep = (idx: number) => setForm(f => ({ ...f, steps: f.steps.filter((_, i) => i !== idx) }));
  const moveStep = (idx: number, dir: 'up' | 'down') => {
    const steps = [...form.steps];
    const tgt = dir === 'up' ? idx - 1 : idx + 1;
    if (tgt < 0 || tgt >= steps.length) return;
    [steps[tgt], steps[idx]] = [steps[idx], steps[tgt]];
    setForm(f => ({ ...f, steps }));
  };
  const addLabel = () => {
    if (!newLabel.trim()) return;
    setForm(f => ({ ...f, labels: [...f.labels, newLabel.trim()] }));
    setNewLabel("");
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      alert("Test Case Title is required");
      return;
    }
    if (!activeProject) {
      alert("Please select a Project from the top dropdown before saving.");
      return;
    }

    // MANDATORY FIELD VALIDATION
    if (!(form as any).versionNumbers || (form as any).versionNumbers.length === 0) { alert("At least one Applicable Version is required"); return; }
    if (!form.module) { alert("Module is required"); return; }
    if (!form.subModule) { alert("Sub-Module is required"); return; }
    if (!form.priority) { alert("Priority is required"); return; }
    if (!form.status) { alert("Status is required"); return; }
    if (!form.testCategory) { alert("Test Category is required"); return; }
    if (!form.testingType) { alert("Testing Type is required"); return; }
    if (!form.testIntent) { alert("Test Intent is required"); return; }

    // 1. Prune empty steps first
    const prunedSteps = (form.steps || []).filter((s: any) => s.action.trim() || s.expectedResult.trim());
    
    // 2. Validate at least one valid step remains
    if (prunedSteps.length === 0) {
      alert("Test steps are required to create a Test Case.");
      return;
    }

    setSaving(true);
    
    // We do PUT for edits
    const res = await fetch("/api/testcases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, steps: prunedSteps, project: activeProject, updatedBy: currentUser })
    });
    
    const data = await res.json();
    if (data.success) {
      router.push("/testcases");
    } else {
      alert(data.error || "Failed to update test case");
      setSaving(false);
    }
  };

  const inputStyle = {
    background: "var(--bg-input)", border: "1px solid var(--border-base)", borderRadius: 10,
    padding: "9px 14px", color: "var(--text-primary)", fontSize: 13, outline: "none", width: "100%",
    transition: "border-color 0.2s"
  };
  const selectStyle = { ...inputStyle, appearance: "none" as const };

  if (loading) {
     return <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-base)', color: '#fff'}}>Loading Test Case...</div>;
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg-base)", overflow: "hidden" }}>
      <Sidebar />

      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        <TopNav />
        {/* Header */}
        <header className="page-header">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link href="/testcases" className="icon-btn view" style={{ width: 34, height: 34 }}>
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="page-title">Edit Test Case</h1>
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{idStr}</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Link href="/testcases" className="btn-ghost">Cancel</Link>
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              <Save size={15} /> {saving ? "Saving..." : "Update Test Case"}
            </button>
          </div>
        </header>

        {/* Form Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
          <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Title Section */}
            <div className="section-card">
              <div className="section-header">
                <FileText size={15} /> 
                <span style={{ marginLeft: 8 }}>Test Case Foundation</span>
              </div>
              <div style={{ padding: "20px 24px" }}>
                <div style={{ marginBottom: 12 }}>
                  <label htmlFor="tc-title" className="form-label" style={{ display: "block", marginBottom: 8, fontSize: 13 }}>
                    Test Case Title <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    id="tc-title"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    className="form-input"
                    style={{ 
                      fontSize: 16, 
                      fontWeight: 600, 
                      padding: "14px 18px",
                      border: "1px solid var(--border-strong)",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
                    }}
                    placeholder="e.g. TC-01: Verify successful login with valid credentials"
                  />
                  <p style={{ fontSize: 11, color: "var(--text-disabled)", marginTop: 8, fontStyle: "italic" }}>
                    Provide a clear, high-level summary of what this test case verifies.
                  </p>
                </div>
              </div>
            </div>

            {/* Classification */}
            <div className="section-card">
              <div className="section-header">📁 Classification & Metadata</div>
              <input type="hidden" value={activeProject} />
              <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
                <div style={{ gridColumn: "span 3" }}>
                  <label className="form-label">Versions Applicable <span style={{ color: "#ef4444" }}>*</span></label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                    {((form as any).versionNumbers || []).length === 0 && (
                      <span style={{ fontSize: 12, color: "var(--text-disabled)", fontStyle: "italic" }}>No versions selected...</span>
                    )}
                    {((form as any).versionNumbers || []).map((v: string) => (
                      <span key={v} className="badge badge-violet" style={{ padding: "4px 12px", display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}>
                        {v}
                        <button onClick={() => setForm(f => ({ ...f, versionNumbers: (f as any).versionNumbers.filter((vn: string) => vn !== v) }))}>
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <select 
                    value="" 
                    onChange={e => {
                      const v = e.target.value;
                      if (!v) return;
                      const current = (form as any).versionNumbers || [];
                      if (!current.includes(v)) {
                         setForm(f => ({ ...f, versionNumbers: [...current, v] }));
                      }
                    }} 
                    style={selectStyle}>
                    <option value="">— Add Version —</option>
                    {(selectedProject?.versions || []).map((v: string) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Module <span style={{ color: "#ef4444" }}>*</span></label>
                  <select value={form.module}
                    onChange={e => setForm(f => ({ ...f, module: e.target.value, subModule: "", entity: "" }))}
                    style={selectStyle}>
                    <option value="">— Select Module —</option>
                    {modules.map((m: any) => <option key={m.name} value={m.name}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Sub-Module <span style={{ color: "#ef4444" }}>*</span></label>
                  <select value={form.subModule}
                    onChange={e => setForm(f => ({ ...f, subModule: e.target.value, entity: "" }))}
                    style={selectStyle}>
                    <option value="">— Select Sub-Module —</option>
                    {subModules.map((s: any) => <option key={s.name} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Entity</label>
                  <select value={form.entity} onChange={e => setForm(f => ({ ...f, entity: e.target.value }))} style={selectStyle}>
                    <option value="">— Select Entity —</option>
                    {entities.map((en: string) => <option key={en} value={en}>{en}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Priority <span style={{ color: "#ef4444" }}>*</span></label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} style={selectStyle}>
                    {["Highest", "High", "Medium", "Low"].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Status <span style={{ color: "#ef4444" }}>*</span></label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={selectStyle}>
                    {["Draft", "Active", "Review", "Deprecated"].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Test Category <span style={{ color: "#ef4444" }}>*</span></label>
                  <select value={form.testCategory} onChange={e => setForm(f => ({ ...f, testCategory: e.target.value }))} style={selectStyle}>
                    <option value="">— Select —</option>
                    {configs.testCategories.filter((c:any)=>c.enabled!==false).map((c: any) => <option key={c.id||c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Testing Type <span style={{ color: "#ef4444" }}>*</span></label>
                  <select value={form.testingType} onChange={e => setForm(f => ({ ...f, testingType: e.target.value }))} style={selectStyle}>
                    <option value="">— Select —</option>
                    {configs.testingTypes.filter((t:any)=>t.enabled!==false).map((t: any) => <option key={t.id||t.name} value={t.name}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Test Intent <span style={{ color: "#ef4444" }}>*</span></label>
                  <select value={form.testIntent} onChange={e => setForm(f => ({ ...f, testIntent: e.target.value }))} style={selectStyle}>
                    <option value="">— Select —</option>
                    {configs.testIntents.filter((i:any)=>i.enabled!==false).map((i: any) => <option key={i.id||i.name} value={i.name}>{i.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Automation Type</label>
                  <select value={form.automationType} onChange={e => setForm(f => ({ ...f, automationType: e.target.value }))} style={selectStyle}>
                    {["Not Automated", "Automated", "Semi-Automated"].map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Estimated Time (mins)</label>
                  <input type="number" value={form.estimatedTime}
                    onChange={e => setForm(f => ({ ...f, estimatedTime: e.target.value }))}
                    style={inputStyle} placeholder="e.g. 15" />
                </div>
              </div>
            </div>

            {/* Labels */}
            <div className="section-card">
              <div className="section-header"><Tag size={14} /> Labels</div>
              <div style={{ padding: "14px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {form.labels.map((lbl: string, i: number) => (
                    <span key={i} className="badge badge-violet" style={{ cursor: "pointer" }}
                      onClick={() => setForm(f => ({ ...f, labels: f.labels.filter((_, idx) => idx !== i) }))}>
                      {lbl} <X size={10} />
                    </span>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addLabel()}
                    style={{ ...inputStyle, flex: 1 }} placeholder="Type label and press Enter..." />
                  <button onClick={addLabel} className="btn-ghost" style={{ padding: "9px 14px" }}>
                    <Plus size={13} /> Add
                  </button>
                </div>
              </div>
            </div>

            {/* Context Section */}
            <div className="section-card">
              <div className="section-header">
                <FileText size={15} /> 
                <span style={{ marginLeft: 8 }}>📜 Context & Requirements</span>
              </div>
              <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20 }}>
                <div>
                  <label className="form-label" style={{ display: "block", marginBottom: 8 }}>Objective</label>
                  <textarea 
                    value={form.objective} 
                    onChange={e => setForm(f => ({ ...f, objective: e.target.value }))}
                    className="form-textarea"
                    rows={3} 
                    style={{ resize: "none", fontSize: 13, padding: "12px 16px", border: "1px solid var(--border-strong)" }} 
                    placeholder="Clear summary of what this test case verifies..." 
                  />
                </div>
                <div>
                  <label className="form-label" style={{ display: "block", marginBottom: 8 }}>Description</label>
                  <textarea 
                    value={form.description} 
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    className="form-textarea"
                    rows={3} 
                    style={{ resize: "none", fontSize: 13, padding: "12px 16px", border: "1px solid var(--border-strong)" }} 
                    placeholder="Additional context or edge cases..." 
                  />
                </div>
                <div>
                  <label className="form-label" style={{ display: "block", marginBottom: 8 }}>Preconditions</label>
                  <textarea 
                    value={form.preconditions} 
                    onChange={e => setForm(f => ({ ...f, preconditions: e.target.value }))}
                    className="form-textarea"
                    rows={3} 
                    style={{ resize: "none", fontSize: 13, padding: "12px 16px", border: "1px solid var(--border-strong)" }} 
                    placeholder="Prerequisites, data setups, or state required before execution..." 
                  />
                </div>
              </div>
            </div>

            {/* Steps Section */}
            <div className="section-card">
              <div className="section-header" style={{ justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <Plus size={15} /> 
                  <span style={{ marginLeft: 8 }}>🪜 Test Execution Steps</span>
                </div>
                <button onClick={addStep} className="btn-primary" style={{ padding: "6px 16px", fontSize: 12 }}>
                  <Plus size={14} /> Add Step
                </button>
              </div>
              <div style={{ padding: "24px 28px" }}>
                {form.steps.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px", color: "var(--text-disabled)", background: "var(--bg-base)", borderRadius: 12, border: "2px dashed var(--border-base)" }}>
                    No steps added yet. Click <strong>Add Step</strong> to begin.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {form.steps.map((step, idx) => (
                      <div key={idx} style={{ 
                        display: "flex", 
                        gap: 16, 
                        padding: 16, 
                        background: "var(--bg-base)", 
                        borderRadius: 12, 
                        border: "1px solid var(--border-strong)",
                        alignItems: "flex-start",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
                      }}>
                        <div style={{ minWidth: 32, height: 32, borderRadius: "50%", background: "var(--accent-primary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>
                          {idx + 1}
                        </div>
                        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                          <div>
                            <label className="form-label" style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>Action</label>
                            <textarea value={step.action} onChange={e => updateStep(idx, "action", e.target.value)}
                              className="form-textarea" rows={3} style={{ resize: "none", fontSize: 12, border: "1px solid var(--border-strong)" }} placeholder="Steps..." />
                          </div>
                          <div>
                            <label className="form-label" style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>Test Data</label>
                            <textarea value={step.testData} onChange={e => updateStep(idx, "testData", e.target.value)}
                              className="form-textarea" rows={3} style={{ resize: "none", fontSize: 12, border: "1px solid var(--border-strong)" }} placeholder="Data..." />
                          </div>
                          <div>
                            <label className="form-label" style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>Expected Result</label>
                            <textarea value={step.expectedResult} onChange={e => updateStep(idx, "expectedResult", e.target.value)}
                              className="form-textarea" rows={3} style={{ resize: "none", fontSize: 12, border: "1px solid var(--border-strong)" }} placeholder="Result..." />
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <button onClick={() => moveStep(idx, 'up')} className="icon-btn edit small"><MoveUp size={14} /></button>
                          <button onClick={() => moveStep(idx, 'down')} className="icon-btn edit small"><MoveDown size={14} /></button>
                          <button onClick={() => removeStep(idx)} className="icon-btn delete small"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Save footer */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, paddingBottom: 32 }}>
              <Link href="/testcases" className="btn-ghost">Cancel</Link>
              <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ padding: "10px 28px" }}>
                <Save size={15} /> {saving ? "Saving..." : "Update Test Case"}
              </button>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
