"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, UserPlus, ShieldPlus, Trash2, KeyRound, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('tester');
  
  const [msg, setMsg] = useState('');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  
  const [configs, setConfigs] = useState<any>({ testCategories: [], testingTypes: [], testIntents: [] });
  const [newItemName, setNewItemName] = useState('');
  const [activeConfigTab, setActiveConfigTab] = useState('testCategories');
  
  const router = useRouter();

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/auth/users');
      const data = await res.json();
      if (!res.ok) {
        // Not admin
        router.push('/');
        return;
      }
      if (data.success) {
        setUsers(data.users);
      }
    } catch {}
  };

  const fetchConfigs = async () => {
    const res = await fetch('/api/admin/configs');
    const data = await res.json();
    if (data.success) setConfigs(data.configs);
  };

  useEffect(() => {
    fetchUsers();
    fetchConfigs();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('Creating...');
    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, role })
      });
      const data = await res.json();
      if (data.success) {
        setMsg('User created successfully. A reset link has been dispatched to ' + (email || 'their email.'));
        setUsername('');
        setEmail('');
        setPassword('');
        fetchUsers();
        setTimeout(() => setMsg(''), 5000);
      } else {
        setMsg('Error: ' + data.error);
      }
    } catch (err: any) {
      setMsg('Error creating user');
    }
  };

  const handleUpdatePassword = async (targetUsername: string) => {
    const newPass = prompt(`Enter new password for ${targetUsername}:`);
    if (!newPass) return;
    try {
      const res = await fetch('/api/auth/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: targetUsername, password: newPass })
      });
      const data = await res.json();
      if (data.success) {
        alert('Password updated successfully');
        fetchUsers();
      } else {
        alert('Failed: ' + data.error);
      }
    } catch (err) {
      alert('Error updating password');
    }
  };

  const handleDelete = async (targetUsername: string) => {
    if (!confirm(`Are you absolutely sure you want to delete user ${targetUsername}?`)) return;
    try {
      const res = await fetch('/api/auth/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: targetUsername })
      });
      const data = await res.json();
      if (data.success) {
        fetchUsers();
      } else {
        alert('Failed to delete: ' + data.error);
      }
    } catch (err) {
      alert('Error deleting');
    }
  };

  const togglePassword = (u: string) => {
    setShowPasswords(prev => ({ ...prev, [u]: !prev[u] }));
  };

  const handleCreateConfig = async () => {
    if (!newItemName) return;
    const res = await fetch('/api/admin/configs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: activeConfigTab, name: newItemName })
    });
    if ((await res.json()).success) {
      setNewItemName('');
      fetchConfigs();
    }
  };

  const handleToggleConfig = async (id: string, currentStatus: boolean, name: string) => {
    const res = await fetch('/api/admin/configs', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: activeConfigTab, id, name, enabled: !currentStatus })
    });
    if ((await res.json()).success) fetchConfigs();
  };

  const handleDeleteConfig = async (id: string) => {
    if (!confirm('Are you sure? Historical test cases using this value will still show it, but it will be hidden from new selections.')) return;
    const res = await fetch(`/api/admin/configs?type=${activeConfigTab}&id=${id}`, { method: 'DELETE' });
    if ((await res.json()).success) fetchConfigs();
  };

  return (
    <div className="flex min-h-screen bg-[#050511] text-[#ededed] font-sans">
      <aside className="w-64 glass-panel border-r border-white/10 hidden md:flex flex-col">
        <div className="p-6 border-b border-white/10 flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-white/10 rounded-full transition text-blue-400">
            <ArrowLeft size={20} />
          </Link>
          <h2 className="text-xl font-bold tracking-tight">Admin Ops</h2>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 text-gradient">Identity & Access Management</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel p-6 rounded-2xl border border-white/10 md:col-span-1 h-fit">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><UserPlus size={18}/> Provision New Access</h3>
              {msg && <p className="bg-blue-500/20 text-blue-400 p-3 rounded-lg text-sm mb-4">{msg}</p>}
              <form onSubmit={handleCreate} className="flex flex-col gap-4">
                <input required type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-black/60 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500" />
                <input type="email" placeholder="Registration Email ID" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-black/60 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500" />
                <input required type="password" placeholder="Initial Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-black/60 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500" />
                <select value={role} onChange={e => setRole(e.target.value)} className="w-full bg-black/60 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500">
                  <option value="tester">Tester (Execute & Create Tests)</option>
                  <option value="admin">Global Admin (Full OS Control)</option>
                </select>
                <div className="flex justify-end mt-2">
                  <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-purple-600 font-semibold py-3 rounded-xl hover:opacity-90 transition shadow-lg">Provision Workspace</button>
                </div>
              </form>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel p-6 rounded-2xl border border-white/10 md:col-span-2">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><ShieldPlus size={18}/> Authorized Personnel ({users.length})</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-white/50 text-sm">
                      <th className="py-3 px-4 font-medium">Identity</th>
                      <th className="py-3 px-4 font-medium">Role</th>
                      <th className="py-3 px-4 font-medium">Security Credential</th>
                      <th className="py-3 px-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.username} className="border-b border-white/5 hover:bg-white/5 transition">
                        <td className="py-4 px-4">
                          <div className="font-medium text-white/90">{u.username}</div>
                          <div className="text-xs text-white/40">{u.email || 'No email registered'}</div>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`text-xs px-2 py-1 rounded-md ${u.role === 'admin' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'}`}>
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono bg-black/50 px-2 py-1 rounded text-xs text-white/70">
                              {showPasswords[u.username] ? u.passwordHash : '••••••••'}
                            </span>
                            <button onClick={() => togglePassword(u.username)} className="text-white/40 hover:text-white transition">
                              {showPasswords[u.username] ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => handleUpdatePassword(u.username)} title="Reset Password" className="p-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg transition">
                              <KeyRound size={16} />
                            </button>
                            {u.username !== 'admin' && (
                              <button onClick={() => handleDelete(u.username)} title="Revoke User" className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition">
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>

          <div className="mt-12">
            <h2 className="text-3xl font-bold mb-8 text-gradient">Master Data Configuration</h2>
            <div className="glass-panel p-8 rounded-2xl border border-white/10">
              <div className="flex gap-4 mb-8 border-b border-white/10">
                {['testCategories', 'testingTypes', 'testIntents'].map(t => (
                  <button
                    key={t}
                    onClick={() => setActiveConfigTab(t)}
                    className={`pb-4 px-4 font-semibold transition-all ${activeConfigTab === t ? 'text-blue-400 border-b-2 border-blue-400' : 'text-white/40 hover:text-white'}`}
                  >
                    {t.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div>
                  <h4 className="text-sm font-bold text-white/50 uppercase tracking-widest mb-4">Add New Option</h4>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={`New ${activeConfigTab.replace('test', '').slice(0, -1)}...`}
                      value={newItemName}
                      onChange={e => setNewItemName(e.target.value)}
                      className="flex-1 bg-black/60 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500"
                    />
                    <button
                      onClick={handleCreateConfig}
                      className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-xl font-bold transition shadow-lg"
                    >
                      Add
                    </button>
                  </div>
                  <p className="text-xs text-white/30 mt-3">Adding a value makes it available in the Test Repository dropdowns.</p>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white/50 uppercase tracking-widest mb-4">Existing Values</h4>
                  <div className="flex flex-col gap-2">
                    {configs[activeConfigTab]?.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 group">
                        <span className={`font-medium ${item.enabled ? 'text-white' : 'text-white/30 italic'}`}>
                          {item.name} {!item.enabled && '(Disabled)'}
                        </span>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                          <button
                            onClick={() => handleToggleConfig(item.id, item.enabled, item.name)}
                            className={`text-xs px-2 py-1 rounded border ${item.enabled ? 'text-yellow-400 border-yellow-400/30' : 'text-green-400 border-green-400/30'}`}
                          >
                            {item.enabled ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            onClick={() => handleDeleteConfig(item.id)}
                            className="p-1.5 bg-red-500/10 text-red-500 rounded border border-red-500/20"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {configs[activeConfigTab]?.length === 0 && <p className="text-white/20 italic">No values defined.</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
