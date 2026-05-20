"use client";
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, CheckCircle, AlertCircle, FileSpreadsheet, X, ChevronDown, Plus, Download, Layers } from "lucide-react";
import Link from "next/link";
import Sidebar from "../components/Sidebar";
import * as XLSX from "xlsx";

export default function ImportPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [projectKey, setProjectKey] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/projects").then(r => r.json()).then(d => { if (d.success) setProjects(d.projects); });
    fetch("/api/auth/users?me=true").then(r => r.json()).then(d => { if (d.success) setUserRole(d.user?.role); });
  }, []);

  const handleFile = (file: File) => {
    const valid = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
    if (!valid) { setError("Only .xlsx and .xls files are supported."); return; }
    setSelectedFile(file); setResult(null); setError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleImport = async () => {
    if (!selectedFile) return setError("Please select a file.");
    if (!projectKey) return setError("Please select a project to import into.");
    setImporting(true); setError(null); setResult(null);
    const form = new FormData();
    form.append("file", selectedFile);
    form.append("projectKey", projectKey);
    try {
      const res = await fetch("/api/import", { method: "POST", body: form });
      const data = await res.json();
      if (data.success) setResult(data);
      else setError(data.error || "Import failed.");
    } catch (e: any) {
      setError("Network error: " + e.message);
    } finally {
      setImporting(false);
    }
  };

  const FORMATS = [
    { tag: "Panamax", name: "Native Platform Export", cols: "ID, Title, Module, Sub-Module, Priority, Status, Test Step, Expected Result...", isNative: true },
    { tag: "RA", name: "TestCases-RA Format", cols: "Entity Key, Test Case Summary, Priority, Folder Path, Preconditions, Steps..." },
    { tag: "Regression", name: "Regression List Format", cols: "Test Id, Component, Test Case Name, Precondition, Test Steps, Expected Results, Priority..." },
    { tag: "Sprint", name: "Sprint Format", cols: "Test Id, Component, Test Objective, Preconditions, Test Steps, Expected Results, Automation Type, Test Intent..." },
  ];

  const downloadBankaiSample = () => {
    const headers = ["ID", "Title", "Project", "Module", "Sub-Module", "Entity", "Priority", "Status", "Test Category", "Testing Type", "Test Intent", "Automation Type", "Labels", "Objective", "Description", "Preconditions", "Postconditions", "Test Step", "Expected Result", "Step Test Data", "Estimated Time", "Version", "Created By", "Created On", "Updated By", "Updated On"];
    const sampleData = [
      ["", "Sample Login Test", "PROJ", "Auth", "Login", "User", "High", "Draft", "Functional", "Regression", "Positive", "Not Automated", "login;security", "Verify user can login", "Ensure system security", "User must exist", "User is on dashboard", "Enter username", "Username field is filled", "admin", "10m", "1", "admin", new Date().toISOString().split('T')[0], "admin", new Date().toISOString().split('T')[0]],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "Enter password", "Password field is masked", "pass123", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "Click login", "Dashboard is displayed", "", "", "", "", "", "", ""],
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Test Cases");
    XLSX.writeFile(wb, "Panamax_Import_Sample.xlsx");
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg-base)", overflow: "hidden" }}>
      <Sidebar />

      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", minWidth: 0 }}>
        <header className="page-header">
          <div>
            <h1 className="page-title">Import Test Cases</h1>
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>Bulk import from Excel (.xlsx / .xls)</p>
          </div>
        </header>

        <div style={{ padding: "28px", maxWidth: 900, width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: 32, paddingBottom: 60 }}>

          {/* Supported Formats */}
          <section>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg bg-[var(--accent-cyan)]/10 flex items-center justify-center">
                <FileSpreadsheet size={18} className="text-[var(--accent-cyan)]" />
              </div>
              <h2 className="text-[15px] font-bold text-[var(--text-primary)] tracking-tight">Standardized Excel Formats</h2>
            </div>
            
            <div className="bg-[var(--bg-overlay)] border border-[var(--border-base)] rounded-2xl p-6 shadow-xl">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                {FORMATS.map(f => (
                  <div key={f.tag} className="bg-[var(--bg-surface)] border border-[var(--border-base)] p-5 rounded-2xl hover:border-[var(--accent-cyan)]/30 transition-all shadow-sm group">
                    <div className="flex items-center gap-2.5 mb-3">
                      <span className="px-2 py-0.5 rounded-lg bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] text-[10px] font-bold border border-[var(--accent-cyan)]/20 uppercase tracking-widest">{f.tag}</span>
                      <span className="text-[13px] font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-cyan)] transition-colors">{f.name}</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] leading-relaxed italic border-l-2 border-[var(--border-base)] pl-3 group-hover:border-[var(--accent-cyan)]/20 transition-all">
                      {f.cols}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex items-center justify-between p-4 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-base)]">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <p className="text-[11px] font-medium text-[var(--text-secondary)]">
                    All formats are auto-detected. Multi-row steps are preserved automatically per unique Test ID or Title.
                  </p>
                </div>
                <button 
                  onClick={downloadBankaiSample}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] rounded-lg text-[10px] font-bold border border-[var(--accent-cyan)]/20 hover:bg-[var(--accent-cyan)]/20 transition-all"
                >
                  <Download size={12} /> Download Panamax Sample
                </button>
              </div>
            </div>
          </section>

          {/* Core Import area */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 32, alignItems: "start" }}>
            
            {/* Upload Area */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} 
              className="bg-[var(--bg-overlay)] border border-[var(--border-base)] rounded-2xl overflow-hidden shadow-xl"
            >
              <div className="p-5 border-b border-[var(--border-base)] bg-[var(--bg-surface)] flex items-center gap-2.5">
                <Upload size={16} className="text-[var(--accent-cyan)]" />
                <span className="text-sm font-bold text-[var(--text-primary)]">Upload Workbook</span>
              </div>
              
              <div className="p-8">
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileRef.current?.click()}
                  className={`relative flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-3xl cursor-pointer transition-all ${dragOver ? 'border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/5 scale-[0.99]' : 'border-[var(--border-base)] hover:border-[var(--accent-cyan)]/40 hover:bg-[var(--bg-surface)]'}`}
                >
                  <input type="file" className="hidden" ref={fileRef} onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} accept=".xlsx,.xls" />
                  
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all ${selectedFile ? 'bg-green-500/10 text-green-400 rotate-0' : 'bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] rotate-0 group-hover:rotate-12'}`}>
                    {selectedFile ? <CheckCircle size={32} /> : <Upload size={32} />}
                  </div>
                  
                  <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">
                    {selectedFile ? selectedFile.name : "Select your Excel file"}
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB · Ready to process` : "Drag workbook here or click to browse"}
                  </p>
                  
                  {dragOver && (
                    <motion.div layoutId="dropzoneGlow" className="absolute inset-[-4px] rounded-[36px] border border-[var(--accent-cyan)] shadow-[0_0_20px_var(--accent-cyan)] opacity-40" />
                  )}
                </div>

                {error && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="mt-5 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
                    <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-red-100 uppercase tracking-widest mb-1">Upload Issue</h4>
                      <p className="text-xs text-red-400 leading-relaxed font-medium">{error}</p>
                    </div>
                  </motion.div>
                )}

                <div className="mt-8 flex gap-3">
                  {selectedFile && (
                    <button onClick={() => setSelectedFile(null)} className="px-5 py-3 rounded-xl border border-[var(--border-base)] text-[var(--text-secondary)] font-bold text-xs hover:bg-red-500/5 hover:text-red-400 hover:border-red-500/20 transition-all">
                      Clear Selection
                    </button>
                  )}
                  <button
                    disabled={importing || !selectedFile || !projectKey}
                    onClick={handleImport}
                    className="flex-1 py-3 bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-violet)] text-white font-bold rounded-xl shadow-lg shadow-cyan-500/20 hover:opacity-90 active:scale-[0.98] disabled:opacity-30 disabled:grayscale transition-all text-sm"
                  >
                    {importing ? "Processing Framework..." : "Import Test Cases"}
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Target Settings */}
            <div className="flex flex-col gap-6">
              <div className="bg-[var(--bg-overlay)] border border-[var(--border-base)] rounded-2xl overflow-hidden shadow-xl">
                <div className="p-5 border-b border-[var(--border-base)] bg-[var(--bg-surface)] flex items-center gap-2.5">
                  <CheckCircle size={16} className="text-[var(--accent-cyan)]" />
                  <span className="text-sm font-bold text-[var(--text-primary)]">Deployment Target</span>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Layers size={14} className="text-[var(--text-muted)]" />
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Project:</label>
                  </div>
                  <select value={projectKey} onChange={e => setProjectKey(e.target.value)}
                    className="form-select font-medium text-[var(--text-primary)] mb-4">
                    <option value="" style={{ background: 'var(--bg-overlay)' }}>— Select Destination —</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.key} style={{ background: 'var(--bg-overlay)' }}>{p.name} ({p.key})</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-[var(--text-muted)] leading-relaxed italic pr-4">
                    Assigned project will serve as the master context for all imported entities.
                  </p>
                </div>
              </div>
              
              <Link href="/testcases" className="p-5 rounded-2xl bg-[var(--bg-overlay)] border border-[var(--border-base)] hover:border-[var(--accent-cyan)]/30 group transition-all flex items-center justify-between shadow-sm">
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-[var(--text-primary)]">Test Repository</span>
                  <span className="text-[10px] text-[var(--text-muted)]">Cancel & View Data</span>
                </div>
                <ChevronDown size={14} className="text-[var(--text-muted)] group-hover:text-[var(--accent-cyan)] -rotate-90 transition-all" />
              </Link>
            </div>
          </div>

          {/* Import Results */}
          <AnimatePresence>
            {result && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="bg-[var(--bg-overlay)] border border-green-500/30 rounded-2xl overflow-hidden shadow-2xl"
              >
                <div className="p-5 border-b border-green-500/20 bg-green-500/5 flex justify-between items-center">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle size={18} className="text-green-400" />
                    <span className="text-sm font-bold text-green-100 uppercase tracking-widest">Import Cycle Completed</span>
                  </div>
                  <button onClick={() => setResult(null)} className="text-green-400 hover:text-white transition-colors">
                    <X size={18} />
                  </button>
                </div>
                <div className="p-8">
                  <div className="grid grid-cols-3 gap-6 mb-8">
                    <div className="bg-green-500/10 border border-green-500/20 p-5 rounded-2xl">
                        <div className="text-[10px] font-bold text-green-400 uppercase tracking-widest mb-1">New Test Cases</div>
                        <div className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">{result.imported || 0}</div>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/20 p-5 rounded-2xl">
                        <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Processed Items</div>
                        <div className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">{result.summary?.length || 0}</div>
                    </div>
                  </div>
                  
                  {result.summary?.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">Processing Manifest</h4>
                      <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                        {result.summary.map((tc: any, idx: number) => (
                          <div key={idx} className="p-3 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-base)] text-[11px] text-[var(--text-secondary)] font-medium flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-[var(--accent-cyan)] font-mono opacity-50">#{tc.id}</span>
                                <span className="truncate max-w-[400px]">{tc.title}</span>
                            </div>
                            <span className="text-[9px] font-bold text-[var(--text-muted)]">{tc.sheet}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border-base); border-radius: 10px; }
      `}</style>
    </div>
  );
}
