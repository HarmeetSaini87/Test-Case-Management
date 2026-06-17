"use client";
// Reusable component: pick a saved filter OR build an ad-hoc filter → preview TCs → add to suite
import React, { useState, useEffect, useCallback } from "react";
import { BookOpen, Filter, ChevronDown, Plus, CheckCircle2, Loader2, Search } from "lucide-react";
import type { FilterRow } from "@/types/filter";
import AdvancedFilterBar from "./AdvancedFilterBar";

interface SavedFilter {
  id: string;
  name: string;
  filters: FilterRow[];
  createdAt: string;
}

interface TCPreview {
  testCaseId: string;
  title: string;
  priority: string;
  status: string;
  module?: string;
}

interface SavedFilterPickerProps {
  projectId: string;
  existingTcIds?: string[];
  onAdd: (tcIds: string[]) => void;
  onCancel?: () => void;
}

export default function SavedFilterPicker({ projectId, existingTcIds = [], onAdd }: SavedFilterPickerProps) {
  const [tab, setTab] = useState<'saved' | 'adhoc'>('saved');

  // Saved filter state
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [selectedSavedId, setSelectedSavedId] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Ad-hoc filter state
  const [adhocRows, setAdhocRows] = useState<FilterRow[]>([]);

  // Preview state (shared)
  const [preview, setPreview] = useState<TCPreview[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [searchPreview, setSearchPreview] = useState('');

  useEffect(() => {
    if (!projectId) return;
    setLoadingFilters(true);
    fetch(`/api/saved-filters?project=${projectId}`)
      .then(r => r.json())
      .then(d => { if (d.success) setSavedFilters(d.filters || []); })
      .finally(() => setLoadingFilters(false));
  }, [projectId]);

  const runPreview = useCallback(async (filters: FilterRow[]) => {
    if (!projectId || filters.length === 0) { setPreview([]); setSelected([]); return; }
    setPreviewLoading(true);
    setPreviewError('');
    try {
      const res = await fetch('/api/testcases/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, filters }),
      });
      const data = await res.json();
      if (data.success) {
        setPreview(data.testCases || []);
        // Auto-select only TCs not already in the suite
        const newIds = (data.testCases || []).filter((tc: TCPreview) => !existingTcIds.includes(tc.testCaseId)).map((tc: TCPreview) => tc.testCaseId);
        setSelected(newIds);
      } else {
        setPreviewError(data.error || 'Query failed');
      }
    } catch (e: any) {
      setPreviewError(e.message);
    } finally {
      setPreviewLoading(false);
    }
  }, [projectId, existingTcIds]);

  // Run preview when saved filter changes
  useEffect(() => {
    if (tab !== 'saved') return;
    const sf = savedFilters.find(f => f.id === selectedSavedId);
    if (sf) runPreview(sf.filters);
    else { setPreview([]); setSelected([]); }
  }, [selectedSavedId, savedFilters, tab, runPreview]);

  // Run preview when ad-hoc rows change (debounced)
  useEffect(() => {
    if (tab !== 'adhoc') return;
    const t = setTimeout(() => runPreview(adhocRows), 500);
    return () => clearTimeout(t);
  }, [adhocRows, tab, runPreview]);

  const filteredPreview = preview.filter(tc =>
    !searchPreview || tc.title.toLowerCase().includes(searchPreview.toLowerCase()) || tc.testCaseId.toLowerCase().includes(searchPreview.toLowerCase())
  );

  const toggleSelect = (id: string) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const selectAllNew = () => setSelected(preview.filter(tc => !existingTcIds.includes(tc.testCaseId)).map(tc => tc.testCaseId));
  const clearSelection = () => setSelected([]);

  const priorityColor: Record<string, string> = {
    Highest: 'text-red-400 bg-red-400/10 border-red-400/30',
    High: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
    Medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
    Low: 'text-green-400 bg-green-400/10 border-green-400/30',
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-xl bg-[var(--bg-elevated)]">
        <button
          type="button"
          onClick={() => { setTab('saved'); setPreview([]); setSelected([]); }}
          className={`flex-1 h-8 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${tab === 'saved' ? 'bg-[var(--bg-overlay)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)]'}`}
        >
          <BookOpen size={12} /> Saved Filter
        </button>
        <button
          type="button"
          onClick={() => { setTab('adhoc'); setPreview([]); setSelected([]); }}
          className={`flex-1 h-8 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${tab === 'adhoc' ? 'bg-[var(--bg-overlay)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)]'}`}
        >
          <Filter size={12} /> Ad-hoc Filter
        </button>
      </div>

      {/* Saved Filter tab */}
      {tab === 'saved' && (
        <div className="flex flex-col gap-3">
          {loadingFilters ? (
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]"><Loader2 size={13} className="animate-spin" /> Loading saved filters…</div>
          ) : savedFilters.length === 0 ? (
            <div className="text-xs text-[var(--text-muted)] p-3 rounded-xl border border-dashed border-[var(--border-base)] text-center">
              No saved filters for this project.<br />
              <span className="text-[var(--accent-cyan)]">Go to Test Repository → Save a filter first.</span>
            </div>
          ) : (
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(o => !o)}
                className="w-full flex items-center justify-between h-9 px-3 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-overlay)] text-xs text-[var(--text-primary)] hover:border-[var(--accent-cyan)] transition-colors"
              >
                <span>{selectedSavedId ? savedFilters.find(f => f.id === selectedSavedId)?.name : '— Select a saved filter —'}</span>
                <ChevronDown size={13} className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {dropdownOpen && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[var(--bg-overlay)] border border-[var(--border-base)] rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                  {savedFilters.map(sf => (
                    <button
                      key={sf.id}
                      type="button"
                      onClick={() => { setSelectedSavedId(sf.id); setDropdownOpen(false); }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-xs hover:bg-[var(--bg-elevated)] transition-colors text-left ${sf.id === selectedSavedId ? 'text-[var(--accent-cyan)]' : 'text-[var(--text-primary)]'}`}
                    >
                      <span className="font-medium">{sf.name}</span>
                      <span className="text-[var(--text-muted)]">{sf.filters.length} rule{sf.filters.length !== 1 ? 's' : ''}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Ad-hoc Filter tab */}
      {tab === 'adhoc' && (
        <AdvancedFilterBar mode="testcases" onChange={setAdhocRows} />
      )}

      {/* Preview results */}
      {previewLoading && (
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] py-2"><Loader2 size={13} className="animate-spin" /> Running filter…</div>
      )}
      {previewError && (
        <div className="text-xs text-red-400 p-2 rounded-lg bg-red-400/10 border border-red-400/20">{previewError}</div>
      )}
      {!previewLoading && preview.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              {preview.length} TC{preview.length !== 1 ? 's' : ''} matched · {selected.length} selected
            </span>
            <div className="flex gap-2">
              <button type="button" onClick={selectAllNew} className="text-[10px] text-[var(--accent-cyan)] hover:underline">Select All New</button>
              <button type="button" onClick={clearSelection} className="text-[10px] text-[var(--text-muted)] hover:underline">Clear</button>
            </div>
          </div>

          {/* Search within preview */}
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchPreview}
              onChange={e => setSearchPreview(e.target.value)}
              placeholder="Search results…"
              className="w-full h-7 pl-7 pr-3 rounded-lg border border-[var(--border-base)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
          </div>

          <div className="max-h-48 overflow-y-auto flex flex-col gap-1 pr-1">
            {filteredPreview.map(tc => {
              const inSuite = existingTcIds.includes(tc.testCaseId);
              const isChecked = selected.includes(tc.testCaseId);
              return (
                <div
                  key={tc.testCaseId}
                  onClick={() => !inSuite && toggleSelect(tc.testCaseId)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs border transition-colors ${inSuite ? 'opacity-50 cursor-not-allowed border-transparent bg-[var(--bg-surface)]' : isChecked ? 'border-[var(--accent-cyan)]/40 bg-[var(--accent-cyan)]/5 cursor-pointer' : 'border-[var(--border-base)] bg-[var(--bg-surface)] cursor-pointer hover:border-[var(--border-strong)]'}`}
                >
                  {inSuite ? (
                    <CheckCircle2 size={13} className="text-[var(--accent-cyan)] shrink-0" />
                  ) : (
                    <input type="checkbox" checked={isChecked} onChange={() => toggleSelect(tc.testCaseId)} onClick={e => e.stopPropagation()} className="w-3.5 h-3.5 accent-cyan-500 shrink-0" />
                  )}
                  <span className="font-mono text-[10px] text-[var(--accent-cyan)]/80 shrink-0">{tc.testCaseId}</span>
                  <span className="truncate text-[var(--text-primary)] flex-1">{tc.title}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full border shrink-0 ${priorityColor[tc.priority] || 'text-[var(--text-muted)] border-[var(--border-base)]'}`}>{tc.priority}</span>
                  {inSuite && <span className="text-[9px] text-[var(--accent-cyan)] shrink-0">In Suite</span>}
                </div>
              );
            })}
          </div>

          <button
            type="button"
            disabled={selected.length === 0}
            onClick={() => onAdd(selected)}
            className="h-9 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: selected.length > 0 ? 'var(--accent-cyan)' : undefined, color: selected.length > 0 ? '#000' : 'var(--text-muted)', border: '1px solid var(--border-base)' }}
          >
            <Plus size={13} className="inline mr-1" />
            Add {selected.length > 0 ? `${selected.length} TC${selected.length !== 1 ? 's' : ''}` : 'Selected'} to Suite
          </button>
        </div>
      )}
      {!previewLoading && !previewError && preview.length === 0 && (selectedSavedId || adhocRows.length > 0) && (
        <div className="text-xs text-[var(--text-muted)] text-center py-3">No test cases match the filter.</div>
      )}
    </div>
  );
}
