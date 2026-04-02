"use client";
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, ShieldCheck, Settings, LogOut, FolderOpen, Layers, Calendar, Upload, CheckCircle, AlertCircle, FileSpreadsheet, X, ChevronDown } from "lucide-react";
import Link from "next/link";

function NavItem({ icon, label, active = false, href = "#", onClick }: any) {
  if (onClick) return (
    <button onClick={onClick} className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left text-white/60 hover:bg-white/5 hover:text-red-400 transition-all">
      {icon}<span className="font-medium">{label}</span>
    </button>
  );
  return (
    <Link href={href} className={`flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left transition-all ${active ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-400 border border-blue-500/30' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}>
      {icon}<span className="font-medium">{label}</span>
    </Link>
  );
}

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
    setSelectedFile(file);
    setResult(null);
    setError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleImport = async () => {
    if (!selectedFile) return setError("Please select a file.");
    if (!projectKey) return setError("Please select a project to import into.");

    setImporting(true);
    setError(null);
    setResult(null);

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

  return (
    <div className="flex h-screen bg-[#050511] text-[#ededed] font-sans">
      <aside className="w-64 glass-panel border-r border-white/10 hidden md:flex flex-col">
        <div className="h-20 flex items-center px-8 border-b border-white/10">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Panamax Logo" className="h-8 w-auto rounded-lg" />
            <span className="text-xl font-bold tracking-wider text-gradient">PANAMAX</span>
          </div>
        </div>
        <nav className="flex-1 py-8 px-4 flex flex-col gap-2">
          <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" href="/" />
          <NavItem icon={<FolderOpen size={20} />} label="Projects" href="/projects" />
          <NavItem icon={<ShieldCheck size={20} />} label="Test Repository" href="/testcases" />
          <NavItem icon={<Layers size={20} />} label="Test Suites" href="/suites" />
          <NavItem icon={<Calendar size={20} />} label="Sprints" href="/sprints" />
          <NavItem icon={<Upload size={20} />} label="Import" active href="/import" />
        </nav>
        <div className="p-4 mt-auto flex flex-col gap-2">
          {userRole === 'admin' && <NavItem icon={<Settings size={20} />} label="Admin Ops" href="/admin" />}
          <NavItem icon={<LogOut size={20} />} label="Logout" onClick={async () => { await fetch('/api/auth/login', { method: 'DELETE' }); window.location.href = '/login'; }} />
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <header className="h-20 glass-panel border-b border-white/10 flex items-center justify-between px-8 z-10 sticky top-0">
          <h1 className="text-2xl font-semibold">Import Test Cases</h1>
        </header>

        <div className="p-8 max-w-3xl mx-auto flex flex-col gap-8">
          {/* Format Info */}
          <div className="glass-panel rounded-2xl p-6 border border-blue-500/20 bg-blue-500/5">
            <h3 className="font-semibold text-blue-400 mb-3 flex items-center gap-2">
              <FileSpreadsheet size={18} /> Supported Excel Formats
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              {[
                { name: "TestCases-RA Format", cols: "Entity Key, Test Case Summary, Priority, Folder Path, Preconditions, Steps...", tag: "RA" },
                { name: "Regression List Format", cols: "Test Id, Component, Test Case Name, Precondition, Test Steps, Expected Results, Priority...", tag: "Regression" },
                { name: "Sprint Format", cols: "Test Id, Component, Test Objective, Preconditions, Test Steps, Expected Results, Automation Type, Test Intent...", tag: "Sprint" },
              ].map(f => (
                <div key={f.tag} className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">{f.tag}</span>
                    <span className="font-medium text-white/80 text-xs">{f.name}</span>
                  </div>
                  <p className="text-white/40 text-[11px] leading-relaxed">{f.cols}</p>
                </div>
              ))}
            </div>
            <p className="text-white/40 text-xs mt-3">
              ✅ Multi-row steps are auto-detected per test case. &nbsp;✅ Component column is parsed as Module / Sub-Module. &nbsp;✅ Original Test IDs are preserved in the imported record.
            </p>
          </div>

          {/* Step 1: Project Selection */}
          <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
            <div className="bg-white/5 px-6 py-3 border-b border-white/10 text-sm font-semibold text-white/70">
              Step 1: Select Target Project
            </div>
            <div className="p-6">
              <select
                value={projectKey}
                onChange={e => setProjectKey(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 transition appearance-none"
              >
                <option value="">— Choose a project to import into —</option>
                {projects.map((p: any) => (
                  <option key={p.id} value={p.key}>{p.name} ({p.key})</option>
                ))}
              </select>
              {projects.length === 0 && (
                <p className="text-yellow-400/70 text-xs mt-2">
                  ⚠️ No projects found. <Link href="/projects" className="underline text-blue-400">Create a project first</Link> before importing.
                </p>
              )}
            </div>
          </div>

          {/* Step 2: File Upload */}
          <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
            <div className="bg-white/5 px-6 py-3 border-b border-white/10 text-sm font-semibold text-white/70">
              Step 2: Upload Excel File (.xlsx / .xls)
            </div>
            <div className="p-6">
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${dragOver ? 'border-blue-500 bg-blue-500/10' : 'border-white/20 hover:border-blue-500/50 hover:bg-white/5'}`}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
                />
                {selectedFile ? (
                  <div className="flex flex-col items-center gap-3">
                    <FileSpreadsheet size={48} className="text-green-400" />
                    <div>
                      <p className="font-semibold text-white">{selectedFile.name}</p>
                      <p className="text-white/40 text-sm">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); setSelectedFile(null); setResult(null); }}
                      className="flex items-center gap-1 text-red-400/70 hover:text-red-400 text-xs transition"
                    >
                      <X size={14} /> Remove file
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-white/40">
                    <Upload size={48} />
                    <div>
                      <p className="font-medium text-white/70">Drag & drop your Excel file here</p>
                      <p className="text-sm mt-1">or click to browse</p>
                    </div>
                    <p className="text-xs text-white/30">Supports all 3 sample formats — auto-detected</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              <AlertCircle size={18} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}

          {/* Import Button */}
          <button
            onClick={handleImport}
            disabled={importing || !selectedFile || !projectKey}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 font-semibold text-white text-lg hover:opacity-90 transition shadow-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {importing ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload size={22} /> Import Test Cases
              </>
            )}
          </button>

          {/* Success Result */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel rounded-2xl border border-green-500/30 overflow-hidden"
              >
                <div className="bg-green-500/10 px-6 py-4 border-b border-green-500/20 flex items-center gap-3">
                  <CheckCircle size={22} className="text-green-400" />
                  <div>
                    <h3 className="font-bold text-green-400">Import Successful!</h3>
                    <p className="text-sm text-white/60">{result.imported} test case{result.imported !== 1 ? "s" : ""} imported into project <span className="text-blue-400 font-mono">{projectKey}</span></p>
                  </div>
                  <Link href="/testcases" className="ml-auto px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 text-sm font-medium hover:bg-blue-500/30 transition">
                    View Test Cases →
                  </Link>
                </div>

                {/* Summary Table */}
                <div className="p-6 max-h-96 overflow-y-auto">
                  <div className="grid grid-cols-[auto_1fr_auto] gap-x-4 gap-y-1 text-xs">
                    <span className="text-white/30 font-semibold uppercase">ID</span>
                    <span className="text-white/30 font-semibold uppercase">Title</span>
                    <span className="text-white/30 font-semibold uppercase">Sheet</span>
                    {result.summary.map((tc: any) => (
                      <React.Fragment key={tc.id}>
                        <span className="font-mono text-blue-400">{tc.id}</span>
                        <span className="text-white/70 truncate" title={tc.title}>{tc.title}</span>
                        <span className="text-white/30">{tc.sheet}</span>
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {result.skipped?.length > 0 && (
                  <div className="px-6 pb-4">
                    <p className="text-yellow-400 text-xs">⚠️ {result.skipped.length} sheet(s) skipped: {result.skipped.map((s: any) => `${s.sheet} (${s.reason})`).join(", ")}</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
