// src/app/components/AdvancedFilterBar.tsx
"use client";
import React, { useState, useEffect, useRef } from "react";
import { Plus, X, ChevronDown, FilterX } from "lucide-react";
import { FilterRow, JQL_FIELD_MAP, OPERATORS_BY_TYPE, newFilterRow } from "@/types/filter";

const SUITE_FIELD_MAP: Record<string, { label: string; type: string; options?: string[] }> = {
  'name':      { label: 'Suite Name',   type: 'text' },
  'sprint':    { label: 'Sprint',       type: 'text' },
  'createdBy': { label: 'Created By',   type: 'text' },
  'createdAt': { label: 'Created Date', type: 'date' },
  'tcCount':   { label: 'TC Count',     type: 'number' },
};

export interface AdvancedFilterBarProps {
  mode: 'testcases' | 'suites';
  onChange: (rows: FilterRow[]) => void;
  initialRows?: FilterRow[];
}

function MultiSelectDropdown({ options, value, onChange }: { options: string[]; value: string[]; onChange: (v: string[]) => void }) {
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
      <button type="button" onClick={() => setOpen(o => !o)} className="flex items-center gap-1 h-8 px-3 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-overlay)] text-[var(--text-primary)] text-xs min-w-[130px] text-left">
        {value.length === 0 ? <span className="text-[var(--text-muted)]">Select…</span> : <span className="truncate max-w-[110px]">{value.join(', ')}</span>}
        <ChevronDown size={11} className="ml-auto shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 min-w-[160px] bg-[var(--bg-overlay)] border border-[var(--border-base)] rounded-xl shadow-xl overflow-hidden">
          {options.map(opt => (
            <button key={opt} type="button" onClick={() => toggle(opt)} className={`flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-[var(--bg-elevated)] transition-colors text-left ${value.includes(opt) ? 'text-[var(--accent-cyan)]' : 'text-[var(--text-primary)]'}`}>
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RowValueInput({ row, fieldMap, onUpdate }: { row: FilterRow; fieldMap: Record<string, any>; onUpdate: (patch: Partial<FilterRow>) => void }) {
  const meta = fieldMap[row.field];
  const type: string = meta?.type ?? 'text';
  const op = row.operator;
  const val = row.value;

  if (op === 'is empty' || op === 'is not empty') return null;

  if (op === 'between') {
    const inputType = type === 'date' ? 'date' : 'number';
    const rv: [string, string] = Array.isArray(val) && val.length === 2 ? val as [string, string] : ['', ''];
    return (
      <div className="flex items-center gap-1">
        <input type={inputType} value={rv[0]} onChange={e => onUpdate({ value: [e.target.value, rv[1]] })} className="h-8 px-2 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-overlay)] text-[var(--text-primary)] text-xs w-[120px]" />
        <span className="text-[var(--text-muted)] text-xs">→</span>
        <input type={inputType} value={rv[1]} onChange={e => onUpdate({ value: [rv[0], e.target.value] })} className="h-8 px-2 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-overlay)] text-[var(--text-primary)] text-xs w-[120px]" />
      </div>
    );
  }

  if (type === 'multi-enum' && (op === 'in' || op === 'not in' || op === 'is' || op === 'is not')) {
    const selected: string[] = Array.isArray(val) ? val as string[] : val ? [val as string] : [];
    return <MultiSelectDropdown options={meta?.options || []} value={selected} onChange={v => onUpdate({ value: v })} />;
  }

  if (type === 'date') return <input type="date" value={String(val || '')} onChange={e => onUpdate({ value: e.target.value })} className="h-8 px-2 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-overlay)] text-[var(--text-primary)] text-xs w-[150px]" />;
  if (type === 'number') return <input type="number" value={String(val || '')} onChange={e => onUpdate({ value: e.target.value })} className="h-8 px-2 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-overlay)] text-[var(--text-primary)] text-xs w-[100px]" />;

  return <input type="text" value={String(val || '')} onChange={e => onUpdate({ value: e.target.value })} placeholder="value" className="h-8 px-3 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-overlay)] text-[var(--text-primary)] text-xs w-[160px] placeholder:text-[var(--text-muted)]" />;
}

export default function AdvancedFilterBar({ mode, onChange, initialRows }: AdvancedFilterBarProps) {
  const [rows, setRows] = useState<FilterRow[]>(initialRows || []);
  const fieldMap = mode === 'suites' ? SUITE_FIELD_MAP : JQL_FIELD_MAP;
  const fieldOptions = Object.entries(fieldMap);

  const commit = (newRows: FilterRow[]) => { setRows(newRows); onChange(newRows); };

  const updateRow = (idx: number, patch: Partial<FilterRow>) => {
    commit(rows.map((r, i) => i === idx ? { ...r, ...patch } : r));
  };

  const removeRow = (idx: number) => commit(rows.filter((_, i) => i !== idx));
  const addRow = () => commit([...rows, newFilterRow()]);
  const clearAll = () => commit([]);

  if (rows.length === 0) {
    return (
      <button type="button" onClick={addRow} className="flex items-center gap-1.5 h-8 px-3 rounded-xl border border-dashed border-[var(--border-base)] text-[var(--text-muted)] text-xs hover:text-[var(--accent-cyan)] hover:border-[var(--accent-cyan)] transition-colors">
        <Plus size={12} /> Add Filter
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl border border-[var(--border-base)] bg-[var(--bg-surface)]">
      {rows.map((row, idx) => {
        const meta = fieldMap[row.field];
        const type: string = meta?.type ?? 'text';
        const ops = (OPERATORS_BY_TYPE as Record<string, any>)[type] || OPERATORS_BY_TYPE.text;
        const isLast = idx === rows.length - 1;
        return (
          <div key={row.id} className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={row.field}
                onChange={e => {
                  const f = e.target.value;
                  const m = fieldMap[f];
                  const t: string = m?.type ?? 'text';
                  const defaultOp = ((OPERATORS_BY_TYPE as Record<string, any>)[t] || OPERATORS_BY_TYPE.text)[0];
                  updateRow(idx, { field: f, operator: defaultOp, value: t === 'multi-enum' ? [] : '' });
                }}
                className="h-8 px-2 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-overlay)] text-[var(--text-primary)] text-xs cursor-pointer"
              >
                {fieldOptions.map(([key, f]) => <option key={key} value={key}>{(f as any).label}</option>)}
              </select>

              <select
                value={row.operator}
                onChange={e => updateRow(idx, { operator: e.target.value as any, value: type === 'multi-enum' ? [] : '' })}
                className="h-8 px-2 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-overlay)] text-[var(--text-primary)] text-xs cursor-pointer"
              >
                {ops.map((op: string) => <option key={op} value={op}>{op}</option>)}
              </select>

              <RowValueInput row={row} fieldMap={fieldMap} onUpdate={patch => updateRow(idx, patch)} />

              <button type="button" onClick={() => removeRow(idx)} className="p-1 text-[var(--text-muted)] hover:text-[var(--accent-red)] transition-colors" title="Remove filter">
                <X size={14} />
              </button>
            </div>

            {!isLast && (
              <div className="ml-2">
                <button
                  type="button"
                  onClick={() => updateRow(idx, { connector: row.connector === 'AND' ? 'OR' : 'AND' })}
                  className={`px-3 py-0.5 rounded-full text-xs font-bold border transition-colors ${row.connector === 'OR' ? 'bg-[var(--accent-orange)]/10 border-[var(--accent-orange)]/30 text-[var(--accent-orange)]' : 'bg-[var(--accent-cyan)]/10 border-[var(--accent-cyan)]/30 text-[var(--accent-cyan)]'}`}
                >
                  {row.connector}
                </button>
              </div>
            )}
          </div>
        );
      })}

      <div className="flex items-center gap-2 mt-1">
        <button type="button" onClick={addRow} className="flex items-center gap-1.5 h-7 px-3 rounded-lg border border-dashed border-[var(--border-base)] text-[var(--text-muted)] text-xs hover:text-[var(--accent-cyan)] hover:border-[var(--accent-cyan)] transition-colors">
          <Plus size={11} /> Add Filter
        </button>
        <button type="button" onClick={clearAll} className="flex items-center gap-1.5 h-7 px-3 rounded-lg text-[var(--text-muted)] text-xs hover:text-[var(--accent-red)] transition-colors">
          <FilterX size={11} /> Clear All
        </button>
      </div>
    </div>
  );
}
