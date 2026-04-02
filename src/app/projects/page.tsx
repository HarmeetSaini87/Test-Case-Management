"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, ShieldCheck, Settings, LogOut, FolderOpen, Plus, Trash2, Edit2, X, ChevronRight, Users, Layers, Calendar } from "lucide-react";
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

const emptyProject = { name: "", key: "", description: "", modules: [] as any[] };

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

  const fetchProjects = () => fetch("/api/projects").then(r => r.json()).then(d => { if (d.success) setProjects(d.projects); });

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

  const openEdit = (p: any) => { setEditProject(p); setForm({ name: p.name, key: p.key, description: p.description, modules: p.modules || [] }); setShowForm(true); };

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
          <NavItem icon={<FolderOpen size={20} />} label="Projects" active href="/projects" />
          <NavItem icon={<ShieldCheck size={20} />} label="Test Repository" href="/testcases" />
          <NavItem icon={<Layers size={20} />} label="Test Suites" href="/suites" />
          <NavItem icon={<Calendar size={20} />} label="Sprints" href="/sprints" />
        </nav>
        <div className="p-4 mt-auto flex flex-col gap-2">
          {userRole === 'admin' && <NavItem icon={<Settings size={20} />} label="Admin Ops" href="/admin" />}
          <NavItem icon={<LogOut size={20} />} label="Logout" onClick={async () => { await fetch('/api/auth/login', { method: 'DELETE' }); window.location.href = '/login'; }} />
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="h-20 glass-panel border-b border-white/10 flex items-center justify-between px-8 z-10 sticky top-0">
          <h1 className="text-2xl font-semibold">Projects</h1>
          {userRole === 'admin' && (
            <button onClick={() => { setEditProject(null); setForm(emptyProject); setShowForm(true); }} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 flex items-center gap-2 font-medium hover:opacity-90 transition shadow-lg">
              <Plus size={18} /> New Project
            </button>
          )}
        </header>

        <div className="p-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {projects.length === 0 ? (
            <div className="col-span-3 text-center mt-24">
              <FolderOpen size={64} className="mx-auto text-white/20 mb-4" />
              <h2 className="text-2xl font-bold mb-2">No Projects Yet</h2>
              <p className="text-white/50 mb-6">Create a project to start organizing your test repository.</p>
              {userRole === 'admin' && (
                <button onClick={() => setShowForm(true)} className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 font-semibold">
                  Create First Project
                </button>
              )}
            </div>
          ) : projects.map((p) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-2xl p-6 border border-white/10 hover:border-blue-500/30 transition group">
              <div className="flex justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/30 to-purple-500/30 flex items-center justify-center font-bold text-blue-400 text-lg border border-blue-500/20">
                    {p.key}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{p.name}</h3>
                    <p className="text-xs text-white/40">{p.modules?.length || 0} modules</p>
                  </div>
                </div>
                {userRole === 'admin' && (
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => openEdit(p)} className="p-2 text-blue-400/50 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(p.id)} className="p-2 text-red-400/50 hover:text-red-400 hover:bg-red-500/10 rounded-lg"><Trash2 size={16} /></button>
                  </div>
                )}
              </div>
              <p className="text-sm text-white/50 mb-4 line-clamp-2 min-h-[2.5rem]">{p.description || "No description."}</p>
              <div className="flex gap-2 mt-auto">
                <Link href={`/testcases?project=${p.key}`} className="flex-1 text-center px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium hover:bg-blue-500/20 transition">
                  Test Cases
                </Link>
                <Link href={`/testcases?project=${p.key}`} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/60 text-sm hover:bg-white/10 transition flex items-center gap-1">
                  <ChevronRight size={16} />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      {/* Project Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-[#0d0d1a] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="p-6 border-b border-white/10 flex justify-between items-center sticky top-0 bg-[#0d0d1a] z-10">
                <h2 className="text-xl font-bold">{editProject ? "Edit Project" : "Create New Project"}</h2>
                <button onClick={() => { setShowForm(false); setEditProject(null); }} className="p-2 hover:bg-white/10 rounded-lg"><X size={20} /></button>
              </div>

              <div className="p-6 flex flex-col gap-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-white/50 mb-1">Project Name *</label>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition text-sm" placeholder="e.g. Billing System" />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-white/50 mb-1">Project Key * (auto-prefixes IDs)</label>
                    <input value={form.key} onChange={e => setForm(f => ({ ...f, key: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") }))} maxLength={6} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition text-sm font-mono" placeholder="e.g. BSS" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-white/50 mb-1">Description</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition text-sm" />
                </div>

                {/* Module Builder */}
                <div>
                  <h3 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2"><Layers size={16} /> Module Hierarchy</h3>
                  <div className="flex gap-2 mb-3">
                    <input value={newModule} onChange={e => setNewModule(e.target.value)} onKeyDown={e => e.key === 'Enter' && addModule()} className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition" placeholder="Add Module (e.g. Payment Gateway)" />
                    <button onClick={addModule} className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition text-sm"><Plus size={16} /></button>
                  </div>
                  <div className="flex flex-col gap-3 max-h-64 overflow-y-auto pr-1">
                    {form.modules.map((mod, mIdx) => (
                      <div key={mIdx} className="glass-panel rounded-xl p-3 border border-white/10">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium text-sm text-white">{mod.name}</span>
                          <button onClick={() => setForm(f => ({ ...f, modules: f.modules.filter((_, i) => i !== mIdx) }))} className="text-red-400/50 hover:text-red-400 p-1"><Trash2 size={14} /></button>
                        </div>
                        <div className="ml-3 flex flex-col gap-2">
                          {(mod.subModules || []).map((sm: any, sIdx: number) => (
                            <div key={sIdx} className="ml-2 border-l border-white/10 pl-3">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs text-white/70">{sm.name}</span>
                                <button onClick={() => {
                                  setForm(f => {
                                    const mods = [...f.modules];
                                    mods[mIdx] = { ...mods[mIdx], subModules: mods[mIdx].subModules.filter((_: any, i: number) => i !== sIdx) };
                                    return { ...f, modules: mods };
                                  });
                                }} className="text-red-400/40 hover:text-red-400 p-0.5"><X size={12} /></button>
                              </div>
                              {(sm.entities || []).map((ent: string, eIdx: number) => (
                                <span key={eIdx} className="inline-block mr-1 mb-1 px-2 py-0.5 bg-purple-500/10 text-purple-400 text-[10px] rounded-full border border-purple-500/20">{ent}</span>
                              ))}
                              <div className="flex gap-1 mt-1">
                                <input value={newEntity[`e_${mIdx}_${sIdx}`] || ""} onChange={e => setNewEntity(en => ({ ...en, [`e_${mIdx}_${sIdx}`]: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addEntity(mIdx, sIdx)} className="flex-1 bg-black/20 border border-white/10 rounded px-2 py-0.5 text-white text-[11px] focus:outline-none focus:border-purple-500 transition" placeholder="Add Entity..." />
                                <button onClick={() => addEntity(mIdx, sIdx)} className="px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded text-[11px]"><Plus size={11} /></button>
                              </div>
                            </div>
                          ))}
                          <div className="flex gap-1 mt-1 ml-2">
                            <input value={newSubModule[`sm_${mIdx}`] || ""} onChange={e => setNewSubModule(s => ({ ...s, [`sm_${mIdx}`]: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addSubModule(mIdx)} className="flex-1 bg-black/20 border border-white/10 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-blue-500 transition" placeholder="+ Add Sub Module..." />
                            <button onClick={() => addSubModule(mIdx)} className="px-2 bg-blue-500/10 text-blue-400 rounded text-xs"><Plus size={12} /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => { setShowForm(false); setEditProject(null); }} className="flex-1 py-2.5 rounded-xl glass-panel border border-white/10 text-white/60 hover:bg-white/10 transition font-medium">Cancel</button>
                  <button onClick={handleSubmit} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 font-semibold hover:opacity-90 transition shadow-lg">
                    {saving ? "Saving..." : editProject ? "Update Project" : "Create Project"}
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
