"use client";
import React, { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Pencil, Trash2, Plus, Save, X, Loader2, Filter, ChevronDown } from "lucide-react";
import Link from "next/link";
import Sidebar from "../components/Sidebar";
import TopNav from "../components/TopNav";
import AdvancedFilterBar from "../components/AdvancedFilterBar";
import { useProject } from "../components/ProjectContext";
import type { FilterRow } from "@/types/filter";

interface SavedFilter {
  id: string;
  name: string;
  projectId: string;
  filters: FilterRow[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

function SavedFiltersInner() {
  const { activeProject: projectId } = useProject();
  const [filters, setFilters] = useState<SavedFilter[]>([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRows, setEditRows] = useState<FilterRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/saved-filters?project=${projectId}`);
      const data = await res.json();
      if (data.success) setFilters(data.filters || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [projectId]);

  const startEdit = (sf: SavedFilter) => {
    setEditId(sf.id);
    setEditName(sf.name);
    setEditRows(sf.filters);
    setExpandedId(sf.id);
  };

  const cancelEdit = () => { setEditId(null); setEditName(''); setEditRows([]); };

  const saveEdit = async () => {
    if (!editId || !editName.trim() || !projectId) return;
    setSaving(true);
    try {
      const res = await fetch('/api/saved-filters', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editId, projectId, name: editName.trim(), filters: editRows }),
      });
      const data = await res.json();
      if (data.success) {
        setFilters(f => f.map(x => x.id === editId ? data.filter : x));
        cancelEdit();
      }
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async (id: string) => {
    if (!projectId) return;
    await fetch(`/api/saved-filters?id=${id}&project=${projectId}`, { method: 'DELETE' });
    setFilters(f => f.filter(x => x.id !== id));
    setDeleteId(null);
  };

  const fieldCount = (rows: FilterRow[]) => `${rows.length} rule${rows.length !== 1 ? 's' : ''}`;

  return (
    <div className="flex min-h-screen bg-[var(--bg-base)]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav />
        <main className="flex-1 p-6 lg:p-8">
          <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <BookOpen size={24} className="text-[var(--accent-cyan)]" /> Saved Filters
                </h1>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  Named filter sets for project <strong className="text-[var(--text-secondary)]">{projectId || '—'}</strong>. Reuse them when adding TCs to suites.
                </p>
              </div>
              <Link
                href="/testcases"
                className="flex items-center gap-1.5 h-9 px-4 rounded-xl border border-[var(--border-base)] text-xs text-[var(--text-muted)] hover:text-[var(--accent-cyan)] hover:border-[var(--accent-cyan)] transition-colors"
              >
                <Filter size={13} /> Go to Test Repository
              </Link>
            </div>

            {/* Content */}
            {!projectId ? (
              <div className="text-center text-sm text-[var(--text-muted)] py-16">Select a project to manage saved filters.</div>
            ) : loading ? (
              <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] py-16 justify-center">
                <Loader2 size={16} className="animate-spin" /> Loading…
              </div>
            ) : filters.length === 0 ? (
              <div className="text-center py-16 text-[var(--text-muted)]">
                <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No saved filters yet.</p>
                <p className="text-xs mt-1">Go to <Link href="/testcases" className="text-[var(--accent-cyan)] hover:underline">Test Repository</Link>, build a filter, and click <strong>Save Filter</strong>.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <AnimatePresence>
                  {filters.map(sf => {
                    const isEditing = editId === sf.id;
                    const isExpanded = expandedId === sf.id;
                    return (
                      <motion.div
                        key={sf.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="rounded-2xl border border-[var(--border-base)] bg-[var(--bg-surface)] overflow-hidden"
                      >
                        {/* Header row */}
                        <div className="flex items-center gap-3 px-5 py-4">
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded && !isEditing ? null : sf.id)}
                            className="flex items-center gap-2 flex-1 text-left min-w-0"
                          >
                            <ChevronDown size={14} className={`shrink-0 text-[var(--text-muted)] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            {isEditing ? (
                              <input
                                autoFocus
                                value={editName}
                                onChange={e => setEditName(e.target.value)}
                                onClick={e => e.stopPropagation()}
                                className="flex-1 h-8 px-3 rounded-lg border border-[var(--accent-cyan)]/50 bg-[var(--bg-overlay)] text-sm text-[var(--text-primary)] min-w-0"
                              />
                            ) : (
                              <span className="font-semibold text-[var(--text-primary)] truncate">{sf.name}</span>
                            )}
                          </button>
                          <span className="text-[10px] text-[var(--text-muted)] shrink-0">{fieldCount(sf.filters)}</span>
                          <span className="text-[10px] text-[var(--text-muted)] shrink-0 hidden sm:block">
                            {new Date(sf.updatedAt || sf.createdAt).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={saveEdit}
                                  disabled={saving || !editName.trim()}
                                  className="flex items-center gap-1 h-7 px-3 rounded-lg bg-[var(--accent-cyan)] text-black text-xs font-bold disabled:opacity-40 transition-colors"
                                >
                                  {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />} Save
                                </button>
                                <button type="button" onClick={cancelEdit} className="h-7 px-2 rounded-lg text-[var(--text-muted)] text-xs hover:text-red-400 transition-colors">
                                  <X size={13} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => startEdit(sf)}
                                  className="h-7 px-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent-cyan)] transition-colors"
                                  title="Edit"
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteId(sf.id)}
                                  className="h-7 px-2 rounded-lg text-[var(--text-muted)] hover:text-red-400 transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Expanded rules */}
                        {isExpanded && (
                          <div className="px-5 pb-5 border-t border-[var(--border-base)]">
                            <div className="pt-4">
                              {isEditing ? (
                                <AdvancedFilterBar
                                  mode="testcases"
                                  onChange={setEditRows}
                                  initialRows={editRows}
                                />
                              ) : (
                                <div className="flex flex-col gap-1.5">
                                  {sf.filters.map((row, idx) => (
                                    <div key={row.id} className="flex flex-col gap-1">
                                      <div className="flex items-center gap-2 text-xs">
                                        <span className="font-medium text-[var(--text-secondary)] bg-[var(--bg-elevated)] px-2 py-0.5 rounded">{row.field}</span>
                                        <span className="text-[var(--text-muted)]">{row.operator}</span>
                                        <span className="text-[var(--text-primary)]">{Array.isArray(row.value) ? (row.value as string[]).join(' → ') : String(row.value)}</span>
                                      </div>
                                      {idx < sf.filters.length - 1 && (
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full w-fit ml-1 ${row.connector === 'OR' ? 'text-orange-400 bg-orange-400/10' : 'text-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10'}`}>
                                          {row.connector}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Delete confirmation */}
      <AnimatePresence>
        {deleteId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-[var(--bg-overlay)] border border-[var(--border-base)] rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <h3 className="font-bold text-[var(--text-primary)] mb-2">Delete saved filter?</h3>
              <p className="text-sm text-[var(--text-muted)] mb-5">
                <strong className="text-[var(--text-secondary)]">{filters.find(f => f.id === deleteId)?.name}</strong> will be permanently removed.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 h-9 rounded-xl border border-[var(--border-base)] text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] transition-colors">Cancel</button>
                <button onClick={() => confirmDelete(deleteId!)} className="flex-1 h-9 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SavedFiltersPage() {
  return <Suspense><SavedFiltersInner /></Suspense>;
}
