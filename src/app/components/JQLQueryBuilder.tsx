// src/app/components/JQLQueryBuilder.tsx
"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Plus, X, ChevronDown, Save, Trash2, Search, CheckSquare, Square, Loader2 } from "lucide-react";
import { FilterRow, SavedQuery, JQL_FIELD_MAP, OPERATORS_BY_TYPE, newFilterRow } from "@/types/filter";

// ─── JQL converter ───────────────────────────────────────────────────────────

function quoteVal(v: string, type: string): string {
  if (type === 'number') return v;
  return `"${v.replace(/"/g, '\\"')}"`;
}

export function filtersToJQL(rows: FilterRow[]): string {
  if (rows.length === 0) return '';
  const exprs: string[] = rows.map(row => {
    const meta = JQL_FIELD_MAP[row.field];
    const type = meta?.type ?? 'text';
    const op = row.operator;
    const val = row.value;

    if (op === 'is empty')     return `${row.field} is EMPTY`;
    if (op === 'is not empty') return `${row.field} is not EMPTY`;
    if ((op === 'in' || op === 'not in' || op === 'includes any' || op === 'includes all' || op === 'excludes') && Array.isArray(val)) {
      const list = (val as string[]).map(v => quoteVal(v, type)).join(', ');
      return `${row.field} ${op} (${list})`;
    }
    if (op === 'between' && Array.isArray(val) && val.length === 2) {
      const [f, t] = val as [string, string];
      return `${row.field} between ${quoteVal(f, type)} and ${quoteVal(t, type)}`;
    }
    return `${row.field} ${op} ${quoteVal(String(val ?? ''), type)}`;
  });

  // Build string respecting AND/OR; wrap consecutive OR groups in parens
  let result = exprs[0];
  for (let i = 1; i < exprs.length; i++) {
    const prevConn = rows[i - 1].connector;
    const prevPrevConn = i > 1 ? rows[i - 2].connector : 'AND';
    if (prevConn === 'OR') {
      if (prevPrevConn === 'AND' && i + 1 < exprs.length && rows[i].connector === 'AND') {
        result += ` OR ${exprs[i]}`;
      } else {
        result += ` OR ${exprs[i]}`;
      }
    } else {
      result += ` AND ${exprs[i]}`;
    }
  }
  return result;
}

export function jqlToFilters(jql: string): FilterRow[] | null {
  try {
    if (!jql.trim()) return [];
    const tokens: { expr: string; connector: 'AND' | 'OR' }[] = [];
    let depth = 0, inQuote = false, quoteChar = '', buf = '';
    let pendingConnector: 'AND' | 'OR' = 'AND';

    const pushToken = (expr: string, conn: 'AND' | 'OR') => {
      const trimmed = expr.trim().replace(/^\(+|\)+$/g, '').trim();
      if (trimmed) tokens.push({ expr: trimmed, connector: conn });
    };

    const src = jql.trim() + ' ';
    let i = 0;
    while (i < src.length) {
      const ch = src[i];
      if (!inQuote && (ch === '"' || ch === "'")) { inQuote = true; quoteChar = ch; buf += ch; i++; continue; }
      if (inQuote && ch === quoteChar && src[i - 1] !== '\\') { inQuote = false; buf += ch; i++; continue; }
      if (!inQuote && ch === '(') { depth++; buf += ch; i++; continue; }
      if (!inQuote && ch === ')') { depth--; buf += ch; i++; continue; }
      if (!inQuote && depth === 0) {
        const rest = src.slice(i);
        const andM = rest.match(/^AND\s+/i);
        const orM  = rest.match(/^OR\s+/i);
        if (andM) { pushToken(buf, pendingConnector); buf = ''; pendingConnector = 'AND'; i += andM[0].length; continue; }
        if (orM)  { pushToken(buf, pendingConnector); buf = ''; pendingConnector = 'OR';  i += orM[0].length; continue; }
      }
      buf += ch; i++;
    }
    if (buf.trim()) pushToken(buf, pendingConnector);

    const rows: FilterRow[] = [];
    for (let t = 0; t < tokens.length; t++) {
      const row = parseExpr(tokens[t].expr);
      if (!row) return null;
      row.connector = t < tokens.length - 1 ? tokens[t].connector : 'AND';
      rows.push(row);
    }
    return rows.length > 0 ? rows : null;
  } catch { return null; }
}

function unquote(s: string): string {
  return s.trim().replace(/^["']|["']$/g, '');
}

function parseExpr(expr: string): FilterRow | null {
  const e = expr.trim();
  // between
  const betM = e.match(/^(\S+)\s+between\s+(.+?)\s+and\s+(.+)$/i);
  if (betM) return { ...newFilterRow(), field: betM[1], operator: 'between', value: [unquote(betM[2]), unquote(betM[3])] };
  // is EMPTY / is not EMPTY
  const emM = e.match(/^(\S+)\s+(is not EMPTY|is EMPTY)$/i);
  if (emM) return { ...newFilterRow(), field: emM[1], operator: emM[2].toLowerCase() as 'is empty' | 'is not empty', value: '' };
  // in/not in/includes any/includes all/excludes (list)
  const listM = e.match(/^(\S+)\s+(not in|includes any|includes all|excludes|in)\s+\(([^)]*)\)$/i);
  if (listM) {
    const vals = listM[3].split(',').map(v => unquote(v));
    return { ...newFilterRow(), field: listM[1], operator: listM[2].toLowerCase() as any, value: vals };
  }
  // simple: field op "value"
  const simM = e.match(/^(\S+)\s+(is not|is|not contains|starts with|contains|=|!=|>=|<=|>|<|before|after)\s+(.+)$/i);
  if (simM) return { ...newFilterRow(), field: simM[1], operator: simM[2].toLowerCase() as any, value: unquote(simM[3]) };
  return null;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MultiSelect({ options, value, onChange }: { options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v]);
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)} className="flex items-center gap-1 h-8 px-3 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-overlay)] text-[var(--text-primary)] text-xs min-w-[140px] text-left">
        {value.length === 0 ? <span className="text-[var(--text-muted)]">Select…</span> : <span className="truncate max-w-[120px]">{value.join(', ')}</span>}
        <ChevronDown size={12} className="ml-auto shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 min-w-[180px] bg-[var(--bg-overlay)] border border-[var(--border-base)] rounded-xl shadow-xl overflow-hidden">
          {options.map(opt => (
            <button key={opt} type="button" onClick={() => toggle(opt)} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors">
              {value.includes(opt) ? <CheckSquare size={12} className="text-[var(--accent-cyan)]" /> : <Square size={12} className="text-[var(--text-muted)]" />}
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TagInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState('');
  const add = () => { const t = input.trim(); if (t && !value.includes(t)) onChange([...value, t]); setInput(''); };
  return (
    <div className="flex flex-wrap gap-1 items-center min-h-8 px-2 py-1 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-overlay)] min-w-[180px]">
      {value.map(v => (
        <span key={v} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] text-xs">
          {v}<button type="button" onClick={() => onChange(value.filter(x => x !== v))}><X size={10} /></button>
        </span>
      ))}
      <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } }} onBlur={add} placeholder="type + Enter" className="bg-transparent outline-none text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] w-24" />
    </div>
  );
}

function RangeInput({ value, onChange, type }: { value: [string, string]; onChange: (v: [string, string]) => void; type: 'date' | 'number' }) {
  return (
    <div className="flex items-center gap-1">
      <input type={type} value={value[0]} onChange={e => onChange([e.target.value, value[1]])} className="h-8 px-2 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-overlay)] text-[var(--text-primary)] text-xs w-[130px]" />
      <span className="text-[var(--text-muted)] text-xs">→</span>
      <input type={type} value={value[1]} onChange={e => onChange([value[0], e.target.value])} className="h-8 px-2 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-overlay)] text-[var(--text-primary)] text-xs w-[130px]" />
    </div>
  );
}

// ─── Value input dispatcher ───────────────────────────────────────────────────

function ValueInput({ row, onUpdate }: { row: FilterRow; onUpdate: (patch: Partial<FilterRow>) => void }) {
  const meta = JQL_FIELD_MAP[row.field];
  const type = meta?.type ?? 'text';
  const op = row.operator;
  const val = row.value;

  if (op === 'is empty' || op === 'is not empty') return null;

  if (op === 'between') {
    const rangeType = type === 'date' ? 'date' : 'number';
    const rv: [string, string] = Array.isArray(val) && val.length === 2 ? val as [string, string] : ['', ''];
    return <RangeInput type={rangeType} value={rv} onChange={v => onUpdate({ value: v })} />;
  }

  if (type === 'multi-enum' && (op === 'in' || op === 'not in' || op === 'is' || op === 'is not')) {
    const selected = Array.isArray(val) ? val as string[] : val ? [val as string] : [];
    return <MultiSelect options={meta?.options || []} value={selected} onChange={v => onUpdate({ value: v })} />;
  }

  if (type === 'tags') {
    const tagVal = Array.isArray(val) ? val as string[] : [];
    return <TagInput value={tagVal} onChange={v => onUpdate({ value: v })} />;
  }

  if (type === 'date') return <input type="date" value={String(val || '')} onChange={e => onUpdate({ value: e.target.value })} className="h-8 px-2 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-overlay)] text-[var(--text-primary)] text-xs w-[160px]" />;
  if (type === 'number') return <input type="number" value={String(val || '')} onChange={e => onUpdate({ value: e.target.value })} className="h-8 px-2 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-overlay)] text-[var(--text-primary)] text-xs w-[100px]" />;

  return <input type="text" value={String(val || '')} onChange={e => onUpdate({ value: e.target.value })} placeholder="value" className="h-8 px-3 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-overlay)] text-[var(--text-primary)] text-xs w-[180px] placeholder:text-[var(--text-muted)]" />;
}

// ─── Main component ───────────────────────────────────────────────────────────

export interface JQLQueryBuilderProps {
  projectId: string;
  existingSuiteIds?: string[];
  onAddToSuite: (tcIds: string[]) => void;
  onCancel: () => void;
}

export default function JQLQueryBuilder({ projectId, existingSuiteIds = [], onAddToSuite, onCancel }: JQLQueryBuilderProps) {
  const [rows, setRows] = useState<FilterRow[]>([newFilterRow()]);
  const [jqlText, setJqlText] = useState('');
  const [jqlError, setJqlError] = useState('');
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewTCs, setPreviewTCs] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewPage, setPreviewPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [showSavePopover, setShowSavePopover] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [showSavedDropdown, setShowSavedDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedDropdownRef = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 10;

  useEffect(() => {
    const h = (e: MouseEvent) => { if (savedDropdownRef.current && !savedDropdownRef.current.contains(e.target as Node)) setShowSavedDropdown(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/saved-queries?project=${projectId}`)
      .then(r => r.json())
      .then(d => { if (d.success) setSavedQueries(d.queries); })
      .catch(() => {});
  }, [projectId]);

  const runPreview = useCallback((currentRows: FilterRow[]) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!projectId) return;
      setPreviewLoading(true);
      try {
        const res = await fetch('/api/testcases/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, filters: currentRows }),
        });
        const data = await res.json();
        if (data.success) { setPreviewCount(data.count); setPreviewTCs(data.testCases); setPreviewPage(0); }
      } catch { setPreviewCount(null); }
      finally { setPreviewLoading(false); }
    }, 500);
  }, [projectId]);

  const syncRowsFromJql = useCallback((text: string) => {
    if (!text.trim()) { setRows([newFilterRow()]); setJqlError(''); return; }
    const parsed = jqlToFilters(text);
    if (parsed) { setRows(parsed); setJqlError(''); runPreview(parsed); }
    else setJqlError('Invalid JQL — check syntax');
  }, [runPreview]);

  // rows → JQL sync (rows are source of truth when user edits rows)
  const updateRows = useCallback((newRows: FilterRow[]) => {
    setRows(newRows);
    const jql = filtersToJQL(newRows);
    setJqlText(jql);
    setJqlError('');
    runPreview(newRows);
  }, [runPreview]);

  const updateRow = (idx: number, patch: Partial<FilterRow>) => {
    const newRows = rows.map((r, i) => i === idx ? { ...r, ...patch } : r);
    updateRows(newRows);
  };

  const removeRow = (idx: number) => updateRows(rows.filter((_, i) => i !== idx));
  const addRow = () => updateRows([...rows, newFilterRow()]);
  const toggleConnector = (idx: number) => updateRow(idx, { connector: rows[idx].connector === 'AND' ? 'OR' : 'AND' });

  const handleJqlChange = (text: string) => {
    setJqlText(text);
    syncRowsFromJql(text);
  };

  const handleSaveQuery = async () => {
    if (!saveName.trim() || !jqlText.trim()) return;
    try {
      const res = await fetch('/api/saved-queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: saveName.trim(), projectId, jql: jqlText }),
      });
      const data = await res.json();
      if (data.success) { setSavedQueries(prev => [...prev, data.query]); setSaveName(''); setShowSavePopover(false); }
    } catch {}
  };

  const handleDeleteSavedQuery = async (id: string) => {
    try {
      await fetch(`/api/saved-queries?id=${id}&project=${projectId}`, { method: 'DELETE' });
      setSavedQueries(prev => prev.filter(q => q.id !== id));
    } catch {}
  };

  const loadSavedQuery = (q: SavedQuery) => {
    setJqlText(q.jql);
    const parsed = jqlToFilters(q.jql);
    if (parsed) { setRows(parsed); setJqlError(''); runPreview(parsed); }
    setShowSavedDropdown(false);
  };

  const pagedTCs = previewTCs.slice(previewPage * PAGE_SIZE, (previewPage + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(previewTCs.length / PAGE_SIZE);
  const newTCs = previewTCs.filter(tc => !existingSuiteIds.includes(tc.testCaseId));

  const toggleSelect = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAllNew = () => setSelectedIds(new Set(newTCs.map(tc => tc.testCaseId)));

  const fieldOptions = Object.entries(JQL_FIELD_MAP);

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div ref={savedDropdownRef} className="relative">
          <button type="button" onClick={() => setShowSavedDropdown(o => !o)} className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-xs hover:text-[var(--text-primary)] transition-colors">
            <Search size={12} /> Saved Queries <ChevronDown size={11} />
          </button>
          {showSavedDropdown && (
            <div className="absolute z-50 top-full left-0 mt-1 w-72 bg-[var(--bg-overlay)] border border-[var(--border-base)] rounded-xl shadow-xl overflow-hidden">
              {savedQueries.length === 0
                ? <p className="px-4 py-3 text-xs text-[var(--text-muted)]">No saved queries yet</p>
                : savedQueries.map(q => (
                  <div key={q.id} className="flex items-center gap-2 px-3 py-2 hover:bg-[var(--bg-elevated)] group">
                    <button type="button" onClick={() => loadSavedQuery(q)} className="flex-1 text-left text-xs text-[var(--text-primary)] truncate">{q.name}</button>
                    <button type="button" onClick={() => handleDeleteSavedQuery(q.id)} className="opacity-0 group-hover:opacity-100 text-[var(--accent-red)] transition-opacity p-1"><Trash2 size={11} /></button>
                  </div>
                ))
              }
            </div>
          )}
        </div>

        <div className="relative">
          <button type="button" onClick={() => setShowSavePopover(o => !o)} className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-xs hover:text-[var(--accent-cyan)] transition-colors">
            <Save size={12} /> Save Query
          </button>
          {showSavePopover && (
            <div className="absolute z-50 top-full left-0 mt-1 w-64 bg-[var(--bg-overlay)] border border-[var(--border-base)] rounded-xl shadow-xl p-3 flex flex-col gap-2">
              <input autoFocus value={saveName} onChange={e => setSaveName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveQuery()} placeholder="Query name…" className="h-8 px-3 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-primary)] text-xs placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent-cyan)]" />
              <button type="button" onClick={handleSaveQuery} disabled={!saveName.trim()} className="h-8 rounded-lg bg-[var(--accent-cyan)] text-[var(--bg-base)] text-xs font-semibold disabled:opacity-40 transition-opacity">Save</button>
            </div>
          )}
        </div>
      </div>

      {/* Visual Rows */}
      <div className="flex flex-col gap-2">
        {rows.map((row, idx) => {
          const meta = JQL_FIELD_MAP[row.field];
          const type = meta?.type ?? 'text';
          const ops = OPERATORS_BY_TYPE[type] || OPERATORS_BY_TYPE.text;
          const isLast = idx === rows.length - 1;
          return (
            <div key={row.id} className="flex flex-col gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={row.field}
                  onChange={e => {
                    const f = e.target.value;
                    const m = JQL_FIELD_MAP[f];
                    const t = m?.type ?? 'text';
                    const defaultOp = (OPERATORS_BY_TYPE[t] || OPERATORS_BY_TYPE.text)[0];
                    updateRow(idx, { field: f, operator: defaultOp, value: t === 'multi-enum' ? [] : '' });
                  }}
                  className="h-8 px-2 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-overlay)] text-[var(--text-primary)] text-xs cursor-pointer"
                >
                  {fieldOptions.map(([key, f]) => <option key={key} value={key}>{f.label}</option>)}
                </select>

                <select
                  value={row.operator}
                  onChange={e => updateRow(idx, { operator: e.target.value as any, value: type === 'multi-enum' || type === 'tags' ? [] : '' })}
                  className="h-8 px-2 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-overlay)] text-[var(--text-primary)] text-xs cursor-pointer"
                >
                  {ops.map(op => <option key={op} value={op}>{op}</option>)}
                </select>

                <ValueInput row={row} onUpdate={patch => updateRow(idx, patch)} />

                {rows.length > 1 && (
                  <button type="button" onClick={() => removeRow(idx)} className="p-1 text-[var(--text-muted)] hover:text-[var(--accent-red)] transition-colors"><X size={14} /></button>
                )}
              </div>

              {!isLast && (
                <div className="ml-2">
                  <button
                    type="button"
                    onClick={() => toggleConnector(idx)}
                    className={`px-3 py-0.5 rounded-full text-xs font-bold border transition-colors ${row.connector === 'OR' ? 'bg-[var(--accent-orange)]/10 border-[var(--accent-orange)]/30 text-[var(--accent-orange)]' : 'bg-[var(--accent-cyan)]/10 border-[var(--accent-cyan)]/30 text-[var(--accent-cyan)]'}`}
                  >
                    {row.connector}
                  </button>
                </div>
              )}
            </div>
          );
        })}

        <button type="button" onClick={addRow} className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-dashed border-[var(--border-base)] text-[var(--text-muted)] text-xs hover:text-[var(--accent-cyan)] hover:border-[var(--accent-cyan)] transition-colors w-fit mt-1">
          <Plus size={12} /> Add Condition
        </button>
      </div>

      {/* JQL Text */}
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">JQL</p>
        <textarea
          value={jqlText}
          onChange={e => handleJqlChange(e.target.value)}
          rows={3}
          spellCheck={false}
          className={`w-full px-3 py-2 rounded-xl border text-xs font-mono text-[var(--text-primary)] bg-[var(--bg-elevated)] resize-none outline-none transition-colors ${jqlError ? 'border-[var(--accent-red)]' : 'border-[var(--border-strong)] focus:border-[var(--accent-cyan)]'}`}
          placeholder='e.g. priority in (High, Highest) AND status = "Active"'
        />
        {jqlError && <p className="text-xs text-[var(--accent-red)] mt-0.5">{jqlError}</p>}
      </div>

      {/* Preview */}
      <div className="rounded-xl border border-[var(--border-base)] overflow-hidden">
        <button type="button" onClick={() => setShowPreview(o => !o)} className="flex items-center gap-2 w-full px-4 py-3 bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] transition-colors">
          {previewLoading ? <Loader2 size={14} className="animate-spin text-[var(--accent-cyan)]" /> : <Search size={14} className="text-[var(--accent-cyan)]" />}
          <span className="text-xs font-semibold text-[var(--text-primary)]">
            {previewLoading ? 'Querying…' : previewCount === null ? 'Preview results' : `${previewCount} test case${previewCount !== 1 ? 's' : ''} match`}
          </span>
          <ChevronDown size={12} className={`ml-auto text-[var(--text-muted)] transition-transform ${showPreview ? 'rotate-180' : ''}`} />
        </button>

        {showPreview && (
          <div className="border-t border-[var(--border-base)]">
            {previewTCs.length === 0 ? (
              <p className="px-4 py-6 text-xs text-[var(--text-muted)] text-center">No test cases match this query</p>
            ) : (
              <>
                {newTCs.length > 0 && (
                  <div className="flex items-center gap-3 px-4 py-2 bg-[var(--bg-elevated)] border-b border-[var(--border-base)]">
                    <button type="button" onClick={selectAllNew} className="text-xs text-[var(--accent-cyan)] hover:underline">Select all new ({newTCs.length})</button>
                    <button type="button" onClick={() => setSelectedIds(new Set())} className="text-xs text-[var(--text-muted)] hover:underline">Clear</button>
                  </div>
                )}
                <div className="divide-y divide-[var(--border-base)]">
                  {pagedTCs.map(tc => {
                    const inSuite = existingSuiteIds.includes(tc.testCaseId);
                    const checked = selectedIds.has(tc.testCaseId);
                    return (
                      <div key={tc.testCaseId} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--bg-elevated)] transition-colors">
                        {inSuite ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/20 shrink-0">In Suite</span>
                        ) : (
                          <button type="button" onClick={() => toggleSelect(tc.testCaseId)} className="shrink-0">
                            {checked ? <CheckSquare size={14} className="text-[var(--accent-cyan)]" /> : <Square size={14} className="text-[var(--text-muted)]" />}
                          </button>
                        )}
                        <span className="text-xs font-mono text-[var(--accent-cyan)] w-28 shrink-0">{tc.testCaseId}</span>
                        <span className="text-xs text-[var(--text-primary)] flex-1 truncate">{tc.title}</span>
                        <span className="text-[10px] text-[var(--text-muted)] shrink-0">{tc.priority}</span>
                        <span className="text-[10px] text-[var(--text-muted)] shrink-0">{tc.status}</span>
                      </div>
                    );
                  })}
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--border-base)] bg-[var(--bg-surface)]">
                    <button type="button" disabled={previewPage === 0} onClick={() => setPreviewPage(p => p - 1)} className="text-xs text-[var(--text-secondary)] disabled:opacity-40">← Prev</button>
                    <span className="text-xs text-[var(--text-muted)]">{previewPage + 1} / {totalPages}</span>
                    <button type="button" disabled={previewPage === totalPages - 1} onClick={() => setPreviewPage(p => p + 1)} className="text-xs text-[var(--text-secondary)] disabled:opacity-40">Next →</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 justify-end pt-2 border-t border-[var(--border-base)]">
        <button type="button" onClick={onCancel} className="h-9 px-4 rounded-xl border border-[var(--border-strong)] text-[var(--text-secondary)] text-sm hover:text-[var(--text-primary)] transition-colors">Cancel</button>
        <button type="button" onClick={() => onAddToSuite(Array.from(selectedIds))} disabled={selectedIds.size === 0} className="h-9 px-5 rounded-xl bg-[var(--accent-cyan)] text-[var(--bg-base)] text-sm font-semibold disabled:opacity-40 transition-opacity">
          Add Selected ({selectedIds.size})
        </button>
      </div>
    </div>
  );
}
