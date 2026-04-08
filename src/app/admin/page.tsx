"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { UserPlus, ShieldPlus, Trash2, KeyRound, Eye, EyeOff, Plus, X, AlertCircle, CheckCircle, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import Sidebar from "../components/Sidebar";

export default function AdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("tester");
  const [msg, setMsg] = useState("");
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [configs, setConfigs] = useState<any>({ testCategories: [], testingTypes: [], testIntents: [] });
  const [newItemName, setNewItemName] = useState("");
  const [activeConfigTab, setActiveConfigTab] = useState("testCategories");
  const router = useRouter();

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/auth/users");
      const data = await res.json();
      if (!res.ok) { router.push("/"); return; }
      if (data.success) setUsers(data.users);
    } catch {}
  };

  const fetchConfigs = async () => {
    const res = await fetch("/api/admin/configs");
    const data = await res.json();
    if (data.success) setConfigs(data.configs);
  };

  useEffect(() => { fetchUsers(); fetchConfigs(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg("Creating...");
    try {
      const res = await fetch("/api/auth/users", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password, role })
      });
      const data = await res.json();
      if (data.success) {
        setMsg("User created successfully. Dispatch to: " + (email || "their email."));
        setUsername(""); setEmail(""); setPassword("");
        fetchUsers(); setTimeout(() => setMsg(""), 5000);
      } else { setMsg("Error: " + data.error); }
    } catch { setMsg("Error creating user"); }
  };

  const handleUpdatePassword = async (targetUsername: string) => {
    const newPass = prompt(`Enter new password for ${targetUsername}:`);
    if (!newPass) return;
    try {
      const res = await fetch("/api/auth/users", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: targetUsername, password: newPass })
      });
      const data = await res.json();
      if (data.success) { alert("Password updated successfully"); fetchUsers(); }
      else alert("Failed: " + data.error);
    } catch { alert("Error updating password"); }
  };

  const handleDelete = async (targetUsername: string) => {
    if (!confirm(`Are you absolutely sure you want to delete user ${targetUsername}?`)) return;
    try {
      const res = await fetch("/api/auth/users", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: targetUsername })
      });
      const data = await res.json();
      if (data.success) fetchUsers(); else alert("Failed to delete: " + data.error);
    } catch { alert("Error deleting"); }
  };

  const handleCreateConfig = async () => {
    if (!newItemName) return;
    const res = await fetch("/api/admin/configs", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: activeConfigTab, name: newItemName })
    });
    if ((await res.json()).success) { setNewItemName(""); fetchConfigs(); }
  };

  const handleToggleConfig = async (id: string, currentStatus: boolean, name: string) => {
    const res = await fetch("/api/admin/configs", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: activeConfigTab, id, name, enabled: !currentStatus })
    });
    if ((await res.json()).success) fetchConfigs();
  };

  const handleDeleteConfig = async (id: string) => {
    if (!confirm("Are you sure? Historical test cases using this value will still show it, but it will be hidden from new selections.")) return;
    const res = await fetch(`/api/admin/configs?type=${activeConfigTab}&id=${id}`, { method: "DELETE" });
    if ((await res.json()).success) fetchConfigs();
  };

  const CONFIG_TABS = ["testCategories", "testingTypes", "testIntents"];
  const tabLabel = (t: string) => t.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase());

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg-base)", overflow: "hidden" }}>
      <Sidebar />

      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", minWidth: 0 }}>
        <header className="page-header">
          <div>
            <h1 className="page-title">Admin Operations</h1>
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>Identity, access & master data management</p>
          </div>
        </header>

        <div style={{ padding: "28px", display: "flex", flexDirection: "column", gap: 32, maxWidth: 1250, width: "100%", margin: "0 auto", paddingBottom: 60 }}>

          {/* ── IAM Section ── */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[15px] font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[var(--accent-cyan)]/10 flex items-center justify-center">
                  <ShieldPlus size={18} className="text-[var(--accent-cyan)]" />
                </div>
                Identity & Access Management
              </h2>
              {msg && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                  className={`px-4 py-2 rounded-xl text-xs font-medium backdrop-blur-md flex items-center gap-2 border ${msg.startsWith("Error") ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"}`}>
                  {msg.startsWith("Error") ? <AlertCircle size={14} /> : <CheckCircle size={14} />} {msg}
                </motion.div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 24 }}>
              {/* Create User Form */}
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} 
                className="bg-[var(--bg-overlay)] border border-[var(--border-base)] rounded-2xl overflow-hidden shadow-xl"
              >
                <div className="p-5 border-b border-[var(--border-base)] bg-[var(--bg-surface)] flex items-center gap-2.5">
                  <UserPlus size={16} className="text-[var(--accent-cyan)]" />
                  <span className="text-sm font-bold text-[var(--text-primary)]">Provision New Access</span>
                </div>
                <div className="p-6">
                  <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div>
                      <label className="form-label text-[10px] font-bold uppercase tracking-widest mb-2 block">Username *</label>
                      <input required type="text" value={username} onChange={e => setUsername(e.target.value)} 
                        className="form-input" placeholder="e.g. john.doe" />
                    </div>
                    <div>
                      <label className="form-label text-[10px] font-bold uppercase tracking-widest mb-2 block">Registration Email</label>
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} 
                        className="form-input" placeholder="user@company.com" />
                    </div>
                    <div>
                      <label className="form-label text-[10px] font-bold uppercase tracking-widest mb-2 block">Initial Password *</label>
                      <input required type="password" value={password} onChange={e => setPassword(e.target.value)} 
                        className="form-input" placeholder="••••••••" />
                    </div>
                    <div>
                      <label className="form-label text-[10px] font-bold uppercase tracking-widest mb-2 block">Organization Role</label>
                      <select value={role} onChange={e => setRole(e.target.value)} className="form-select font-medium text-[var(--text-primary)]">
                        <option value="tester" style={{ background: 'var(--bg-overlay)' }}>Tester (Standard Access)</option>
                        <option value="admin" style={{ background: 'var(--bg-overlay)' }}>Administrator (Full Access)</option>
                      </select>
                    </div>
                    <button type="submit" className="btn-primary w-full py-3 mt-2 shadow-lg shadow-cyan-500/10">
                      Provision Access
                    </button>
                  </form>
                </div>
              </motion.div>

              {/* Users Table */}
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} 
                className="bg-[var(--bg-overlay)] border border-[var(--border-base)] rounded-2xl overflow-hidden shadow-xl"
              >
                <div className="p-5 border-b border-[var(--border-base)] bg-[var(--bg-surface)] flex justify-between items-center">
                  <div className="flex items-center gap-2.5">
                    <ShieldPlus size={16} className="text-[var(--accent-violet)]" />
                    <span className="text-sm font-bold text-[var(--text-primary)]">Authorized Personnel</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-base)] text-[10px] font-bold text-[var(--text-muted)]">
                    {users.length} ACTIVE USERS
                  </span>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="px-6 py-4">Identity</th>
                        <th style={{ width: 140 }}>Role</th>
                        <th>Security Token</th>
                        <th style={{ width: 100, textAlign: "right" }} className="pr-6">Operations</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u, idx) => (
                        <motion.tr key={u.username} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}>
                          <td className="px-6">
                            <div className="flex flex-col">
                              <span className="font-bold text-[var(--text-primary)] text-sm">{u.username}</span>
                              <span className="text-[11px] text-[var(--text-muted)] tracking-tight">{u.email || "No secondary mail"}</span>
                            </div>
                          </td>
                          <td>
                            <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1.5 border ${u.role === "admin" ? "bg-violet-500/10 text-violet-400 border-violet-500/20" : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"}`}>
                              <span className={`w-1 h-1 rounded-full ${u.role === "admin" ? "bg-violet-400" : "bg-cyan-400"}`} />
                              {u.role.toUpperCase()}
                            </div>
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-base)] font-mono text-[10px] text-[var(--text-secondary)] tracking-wider">
                                {showPasswords[u.username] ? u.passwordHash : "••••••••••••"}
                              </div>
                              <button
                                onClick={() => setShowPasswords(p => ({ ...p, [u.username]: !p[u.username] }))}
                                className="p-1.5 hover:bg-[var(--bg-surface)] rounded-lg text-[var(--text-muted)] transition-colors"
                              >
                                {showPasswords[u.username] ? <EyeOff size={14} /> : <Eye size={14} />}
                              </button>
                            </div>
                          </td>
                          <td className="pr-6">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => handleUpdatePassword(u.username)} className="p-2 hover:bg-cyan-500/10 rounded-lg text-cyan-400 transition-colors" title="Force Reset">
                                <KeyRound size={14} />
                              </button>
                              {u.username !== "admin" && (
                                <button onClick={() => handleDelete(u.username)} className="p-2 hover:bg-red-500/10 rounded-lg text-red-400 transition-colors" title="Revoke Access">
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </div>
          </section>

          {/* ── Master Data Configuration ── */}
          <section>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg bg-[var(--accent-violet)]/10 flex items-center justify-center">
                <Settings size={18} className="text-[var(--accent-violet)]" />
              </div>
              <h2 className="text-[15px] font-bold text-[var(--text-primary)] tracking-tight">Master Data Configuration</h2>
            </div>

            <div className="bg-[var(--bg-overlay)] border border-[var(--border-base)] rounded-2xl overflow-hidden shadow-xl">
              {/* Premium Tabs */}
              <div className="flex bg-[var(--bg-surface)] border-b border-[var(--border-base)] px-4">
                {CONFIG_TABS.map(t => (
                  <button key={t} onClick={() => setActiveConfigTab(t)} className={`px-6 py-4 text-xs font-bold uppercase tracking-widest relative transition-all ${activeConfigTab === t ? "text-[var(--accent-cyan)]" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}>
                    {tabLabel(t)}
                    {activeConfigTab === t && (
                      <motion.div layoutId="activeTabGlow" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent-cyan)] shadow-[0_0_10px_var(--accent-cyan)]" />
                    )}
                  </button>
                ))}
              </div>

              <div className="p-8 grid grid-cols-[340px_1fr] gap-12">
                {/* Add new */}
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3 block">Quick Registration</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={`New ${activeConfigTab.replace("test", "").slice(0, -1)}...`}
                      value={newItemName}
                      onChange={e => setNewItemName(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleCreateConfig()}
                      className="form-input"
                    />
                    <button onClick={handleCreateConfig} className="btn-primary px-4 py-2.5 h-auto">
                      <Plus size={16} />
                    </button>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] mt-5 leading-relaxed bg-[var(--bg-surface)] p-4 rounded-xl border border-[var(--border-base)]">
                    Define global options available in the Test Repository. Changes take effect immediately for all projects.
                  </p>
                </div>

                {/* Existing values */}
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-4 block">Defined Schema Options</span>
                  <div className="grid grid-cols-2 gap-3">
                    {configs[activeConfigTab]?.map((item: any) => (
                      <motion.div key={item.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="flex items-center justify-between p-4 bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-xl group hover:border-[var(--accent-cyan)]/30 transition-all shadow-sm">
                        <div className="flex flex-col">
                          <span className={`text-[13px] font-semibold tracking-tight ${item.enabled ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] italic line-through opacity-50"}`}>
                            {item.name}
                          </span>
                          {!item.enabled && <span className="text-[9px] font-bold text-red-400/60 tracking-wider">DEACTIVATED</span>}
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleToggleConfig(item.id, item.enabled, item.name)}
                            className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${item.enabled ? "bg-red-500/10 text-red-400 hover:bg-red-500/20" : "bg-green-500/10 text-green-400 hover:bg-green-500/20"}`}>
                            {item.enabled ? "Disable" : "Enable"}
                          </button>
                          <button onClick={() => handleDeleteConfig(item.id)} className="p-2 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                    {configs[activeConfigTab]?.length === 0 && (
                      <div className="col-span-2 p-10 text-center border-2 border-dashed border-[var(--border-base)] rounded-2xl">
                        <p className="text-sm text-[var(--text-muted)] italic">No specialized {tabLabel(activeConfigTab)} options defined yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
