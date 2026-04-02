"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, ShieldCheck, Settings, LogOut, FolderOpen, Layers, Calendar, Plus, Trash2, Edit2, X, ChevronRight } from "lucide-react";
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

const EMPTY = { name: "", startDate: "", endDate: "", description: "", status: "Planned", project: "" };

export default function SprintsPage() {
  const [sprints, setSprints] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/sprints").then(r => r.json()).then(d => { if (d.success) setSprints(d.sprints); });
    fetch("/api/projects").then(r => r.json()).then(d => { if (d.success) setProjects(d.projects); });
    fetch("/api/auth/users?me=true").then(r => r.json()).then(d => { if (d.success) setUserRole(d.user?.role); });
  }, []);

  const save = async () => {
    if (!form.name) return alert("Sprint name is required");
    setSaving(true);
    const res = await fetch("/api/sprints", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editItem ? { ...form, id: editItem.id } : form) });
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

  const statusColor: any = { Planned: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30", Active: "bg-green-500/10 text-green-400 border-green-500/30", Completed: "bg-gray-500/10 text-gray-400 border-gray-500/30" };

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
          <NavItem icon={<Calendar size={20} />} label="Sprints" active href="/sprints" />
        </nav>
        <div className="p-4 mt-auto flex flex-col gap-2">
          {userRole === 'admin' && <NavItem icon={<Settings size={20} />} label="Admin Ops" href="/admin" />}
          <NavItem icon={<LogOut size={20} />} label="Logout" onClick={async () => { await fetch('/api/auth/login', { method: 'DELETE' }); window.location.href = '/login'; }} />
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="h-20 glass-panel border-b border-white/10 flex items-center justify-between px-8 z-10 sticky top-0">
          <h1 className="text-2xl font-semibold">Sprint Management</h1>
          <button onClick={() => { setEditItem(null); setForm({ ...EMPTY }); setShowForm(true); }}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 flex items-center gap-2 font-medium hover:opacity-90 transition shadow-lg">
            <Plus size={18} /> New Sprint
          </button>
        </header>

        <div className="p-8 flex flex-col gap-4">
          {sprints.length === 0 ? (
            <div className="text-center mt-24">
              <Calendar size={64} className="mx-auto text-white/20 mb-4" />
              <h2 className="text-2xl font-bold mb-2">No Sprints Defined</h2>
              <p className="text-white/40 mb-6">Create sprints to organize test execution cycles.</p>
              <button onClick={() => setShowForm(true)} className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 font-semibold">Create Sprint</button>
            </div>
          ) : sprints.map((s: any) => (
            <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="glass-panel rounded-2xl p-6 border border-white/10 hover:border-white/20 transition group flex items-start justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-bold text-lg text-white">{s.name}</h3>
                  <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${statusColor[s.status]}`}>{s.status}</span>
                  {s.project && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">{s.project}</span>}
                </div>
                {s.description && <p className="text-sm text-white/50 mb-3">{s.description}</p>}
                <div className="flex gap-6 text-sm text-white/40">
                  {s.startDate && <span>📅 Start: <span className="text-white/70">{new Date(s.startDate).toLocaleDateString()}</span></span>}
                  {s.endDate && <span>🏁 End: <span className="text-white/70">{new Date(s.endDate).toLocaleDateString()}</span></span>}
                </div>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                <button onClick={() => { setEditItem(s); setForm({ name: s.name, startDate: s.startDate || "", endDate: s.endDate || "", description: s.description || "", status: s.status, project: s.project || "" }); setShowForm(true); }}
                  className="p-2 text-blue-400/50 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg" title="Edit"><Edit2 size={16} /></button>
                <button onClick={() => del(s.id)} className="p-2 text-red-400/50 hover:text-red-400 hover:bg-red-500/10 rounded-lg"><Trash2 size={16} /></button>
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-[#0d0d1a] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl">
              <div className="p-6 border-b border-white/10 flex justify-between items-center">
                <h2 className="text-xl font-bold">{editItem ? "Edit Sprint" : "Create Sprint"}</h2>
                <button onClick={() => { setShowForm(false); setEditItem(null); setForm({ ...EMPTY }); }} className="p-2 hover:bg-white/10 rounded-lg"><X size={20} /></button>
              </div>
              <div className="p-6 flex flex-col gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-white/50 mb-1">Sprint Name *</label>
                  <input value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition" placeholder="e.g. BSS RA Sprint 25" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-white/50 mb-2">📅 Start Date *</label>
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={e => setForm((f: any) => ({ ...f, startDate: e.target.value }))}
                      className="w-full bg-[#0a0a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition cursor-pointer"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-white/50 mb-2">🏁 End Date *</label>
                    <input
                      type="date"
                      value={form.endDate}
                      min={form.startDate || undefined}
                      onChange={e => setForm((f: any) => ({ ...f, endDate: e.target.value }))}
                      className="w-full bg-[#0a0a1a] border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition cursor-pointer"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-white/50 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm((f: any) => ({ ...f, status: e.target.value }))} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition appearance-none">
                    <option value="Planned">Planned</option>
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-white/50 mb-1">Link to Project</label>
                  <select value={form.project} onChange={e => setForm((f: any) => ({ ...f, project: e.target.value }))} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition appearance-none">
                    <option value="">— None —</option>
                    {projects.map((p: any) => <option key={p.id} value={p.key}>{p.name} ({p.key})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-white/50 mb-1">Description</label>
                  <textarea value={form.description} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} rows={3} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition resize-none" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => { setShowForm(false); setEditItem(null); setForm({ ...EMPTY }); }} className="flex-1 py-2.5 rounded-xl glass-panel border border-white/10 text-white/60 hover:bg-white/10 transition font-medium">Cancel</button>
                  <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 font-semibold hover:opacity-90 transition shadow-lg">{saving ? "Saving..." : editItem ? "Update Sprint" : "Create Sprint"}</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
