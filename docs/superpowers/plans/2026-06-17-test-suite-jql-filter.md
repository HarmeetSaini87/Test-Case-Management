# Test Suite Edit + JQL Query Builder + Advanced Filters — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Edit Test Suite, a hybrid JQL Query Builder with visual rows + typed JQL, advanced multi-field filters with range/AND/OR support, and saved queries — across `/testcases` and `/suites` pages.

**Architecture:** A shared `JQLQueryBuilder` React component is embedded in both the existing `CreateSuiteModal` (testcases page) and a new `EditSuitePanel` slide-over (suites page). A new `/api/testcases/query` POST endpoint handles server-side filter execution across all 30+ TC fields including RTM. A new `/api/saved-queries` endpoint persists named queries per project.

**Tech Stack:** Next.js App Router, React 19, TypeScript, TailwindCSS, Lucide React, flat-file JSON storage (`dataHub/`). No new npm dependencies.

---

## File Map

### New Files
| File | Responsibility |
|---|---|
| `src/app/components/JQLQueryBuilder.tsx` | Shared query builder — visual rows, JQL text sync, live preview, saved query picker |
| `src/app/components/AdvancedFilterBar.tsx` | Upgraded filter bar with AND/OR rows and range operators |
| `src/app/api/testcases/query/route.ts` | POST endpoint — server-side filter engine for all TC + RTM fields |
| `src/app/api/saved-queries/route.ts` | GET/POST/DELETE for named saved queries |
| `src/types/filter.ts` | Shared TypeScript types: `FilterRow`, `SavedQuery`, `JQL_FIELD_MAP` |

### Modified Files
| File | Change |
|---|---|
| `src/app/suites/page.tsx` | Add `EditSuitePanel` inline component + wire Edit button per row + add suite-level `AdvancedFilterBar` |
| `src/app/testcases/page.tsx` | Replace hardcoded filter chain with `AdvancedFilterBar`; embed `JQLQueryBuilder` inside existing `CreateSuiteModal` |

---

## Task 1: Shared TypeScript Types

**Files:**
- Create: `src/types/filter.ts`

- [ ] **Step 1.1 — Create the types file**

```typescript
// src/types/filter.ts

export type FilterOperator =
  | '=' | '!=' | 'contains' | 'not contains' | 'starts with'
  | 'is' | 'is not' | 'in' | 'not in'
  | 'includes any' | 'includes all' | 'excludes'
  | 'before' | 'after' | 'between'
  | '>' | '>=' | '<' | '<='
  | 'is empty' | 'is not empty';

export type FilterConnector = 'AND' | 'OR';

export interface FilterRow {
  id: string;          // nanoid — used as React key only
  field: string;       // JQL field key e.g. "priority", "createdDate", "epic.key"
  operator: FilterOperator;
  value: string | string[] | [string, string]; // single | multi | [from, to] range
  connector: FilterConnector; // connector TO the next row; ignored on last row
}

export interface SavedQuery {
  id: string;
  name: string;
  projectId: string;
  jql: string;
  createdBy: string;
  createdAt: string;
}

// Maps JQL field names (used in text input & storage) to TC object property paths
export const JQL_FIELD_MAP: Record<string, { label: string; type: 'text' | 'enum' | 'multi-enum' | 'date' | 'number' | 'tags' | 'lookup'; options?: string[] }> = {
  // Identity
  'testCaseId':        { label: 'TC ID',           type: 'text' },
  'title':             { label: 'Title',            type: 'text' },
  // Classification
  'priority':          { label: 'Priority',         type: 'multi-enum', options: ['Highest', 'High', 'Medium', 'Low'] },
  'status':            { label: 'Status',           type: 'multi-enum', options: ['Draft', 'Active', 'Review', 'Deprecated'] },
  'testCategory':      { label: 'Test Category',    type: 'multi-enum', options: ['Functional', 'Regression', 'Integration', 'Smoke', 'Sanity'] },
  'testingType':       { label: 'Testing Type',     type: 'multi-enum', options: ['Manual', 'Automation', 'Performance', 'Security'] },
  'testIntent':        { label: 'Test Intent',      type: 'multi-enum', options: ['Positive', 'Negative', 'Boundary', 'Validation', 'System Behavior'] },
  'automationType':    { label: 'Automation Type',  type: 'multi-enum', options: ['Not Automated', 'Automated', 'Semi-Automated'] },
  // Structure
  'module':            { label: 'Module',           type: 'text' },
  'subModule':         { label: 'Sub-Module',       type: 'text' },
  'entity':            { label: 'Entity',           type: 'text' },
  'labels':            { label: 'Labels',           type: 'tags' },
  'versionNumbers':    { label: 'Version',          type: 'tags' },
  // People
  'assignedTester':    { label: 'Assigned Tester',  type: 'text' },
  'createdBy':         { label: 'Created By',       type: 'text' },
  'updatedBy':         { label: 'Updated By',       type: 'text' },
  // Dates
  'createdDate':       { label: 'Created Date',     type: 'date' },
  'updatedDate':       { label: 'Updated Date',     type: 'date' },
  // Metrics
  'estimatedTime':     { label: 'Est. Time (min)',  type: 'number' },
  'version':           { label: 'Version No.',      type: 'number' },
  // RTM
  'epic.key':          { label: 'Epic Key',         type: 'text' },
  'epic.name':         { label: 'Epic Name',        type: 'text' },
  'epic.status':       { label: 'Epic Status',      type: 'multi-enum', options: ['ACTIVE', 'DRAFT', 'ARCHIVED', 'DEPRECATED'] },
  'story.key':         { label: 'Story Key',        type: 'text' },
  'story.title':       { label: 'Story Title',      type: 'text' },
  'story.status':      { label: 'Story Status',     type: 'multi-enum', options: ['ACTIVE', 'DRAFT', 'ARCHIVED', 'DEPRECATED'] },
  'story.epicKey':     { label: 'Parent Epic (Story)', type: 'text' },
  'story.lastExecStatus': { label: 'Last Exec Status', type: 'multi-enum', options: ['Pass', 'Fail', 'Blocked', 'Pending'] },
};

// Operators available per field type
export const OPERATORS_BY_TYPE: Record<string, FilterOperator[]> = {
  text:       ['=', '!=', 'contains', 'not contains', 'starts with', 'is empty', 'is not empty'],
  'multi-enum': ['is', 'is not', 'in', 'not in'],
  date:       ['=', 'before', 'after', 'between'],
  number:     ['=', '!=', '>', '>=', '<', '<=', 'between'],
  tags:       ['includes any', 'includes all', 'excludes'],
  lookup:     ['=', '!=', 'is empty', 'is not empty'],
};

export function newFilterRow(): FilterRow {
  return {
    id: Math.random().toString(36).slice(2),
    field: 'priority',
    operator: 'in',
    value: [],
    connector: 'AND',
  };
}
```

- [ ] **Step 1.2 — Commit**

```bash
git add src/types/filter.ts
git commit -m "feat: add shared FilterRow, SavedQuery types and JQL_FIELD_MAP"
```

---

## Task 2: Server-Side Query Endpoint `/api/testcases/query`

**Files:**
- Create: `src/app/api/testcases/query/route.ts`

- [ ] **Step 2.1 — Create the route file**

```typescript
// src/app/api/testcases/query/route.ts
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { FilterRow } from '@/types/filter';
export const dynamic = 'force-dynamic';

function tcDir() {
  return path.join(process.cwd(), 'dataHub', 'testcases');
}

function loadAllTCs(projectId: string): any[] {
  const dir = tcDir();
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => { try { return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')); } catch { return null; } })
    .filter(tc => tc && (!projectId || tc.project === projectId));
}

function loadEpics(): Map<string, any> {
  const p = path.join(process.cwd(), 'dataHub', 'rtm', 'epics.json');
  if (!fs.existsSync(p)) return new Map();
  const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
  const epics: any[] = data.epics || data || [];
  const map = new Map<string, any>();
  epics.forEach(e => { map.set(e.id, e); map.set(e.key, e); });
  return map;
}

function loadStories(): Map<string, any> {
  const p = path.join(process.cwd(), 'dataHub', 'rtm', 'stories.json');
  if (!fs.existsSync(p)) return new Map();
  const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
  const stories: any[] = data.stories || data || [];
  const map = new Map<string, any>();
  stories.forEach(s => { map.set(s.id, s); map.set(s.key, s); });
  return map;
}

function getFieldValue(tc: any, field: string, epics: Map<string, any>, stories: Map<string, any>): any {
  if (field === 'epic.key')   return tc.epic ? (epics.get(tc.epic.id)?.key ?? tc.epic.key ?? tc.epic.id) : null;
  if (field === 'epic.name')  return tc.epic ? (epics.get(tc.epic.id)?.name ?? tc.epic.title) : null;
  if (field === 'epic.status') return tc.epic ? (epics.get(tc.epic.id)?.status ?? null) : null;
  if (field === 'story.key')  return (tc.userStories || []).map((us: any) => stories.get(us.id)?.key ?? us.key ?? us.id);
  if (field === 'story.title') return (tc.userStories || []).map((us: any) => stories.get(us.id)?.title ?? us.title);
  if (field === 'story.status') return (tc.userStories || []).map((us: any) => stories.get(us.id)?.status ?? null);
  if (field === 'story.epicKey') return (tc.userStories || []).map((us: any) => { const s = stories.get(us.id); return s ? (epics.get(s.epicId)?.key ?? null) : null; });
  if (field === 'story.lastExecStatus') return (tc.userStories || []).map((us: any) => stories.get(us.id)?.coverage?.lastExecutionStatus ?? null);
  // flat TC fields
  return tc[field] ?? null;
}

function matchRow(tc: any, row: FilterRow, epics: Map<string, any>, stories: Map<string, any>): boolean {
  const raw = getFieldValue(tc, row.field, epics, stories);
  const op = row.operator;
  const val = row.value;

  // Helpers
  const strVal = Array.isArray(val) ? '' : String(val ?? '').toLowerCase();
  const rawStr = raw === null || raw === undefined ? '' : String(raw).toLowerCase();
  const rawArr: string[] = Array.isArray(raw) ? raw.map((v: any) => String(v ?? '').toLowerCase()) : [rawStr];
  const valArr: string[] = Array.isArray(val) && !Array.isArray(val[0])
    ? (val as string[]).map(v => String(v).toLowerCase())
    : [];

  if (op === 'is empty') return raw === null || raw === undefined || raw === '' || (Array.isArray(raw) && raw.length === 0);
  if (op === 'is not empty') return raw !== null && raw !== undefined && raw !== '' && !(Array.isArray(raw) && raw.length === 0);

  if (op === '=' || op === 'is') return rawArr.some(r => r === strVal);
  if (op === '!=' || op === 'is not') return rawArr.every(r => r !== strVal);
  if (op === 'contains') return rawArr.some(r => r.includes(strVal));
  if (op === 'not contains') return rawArr.every(r => !r.includes(strVal));
  if (op === 'starts with') return rawArr.some(r => r.startsWith(strVal));
  if (op === 'in') return valArr.length > 0 && rawArr.some(r => valArr.includes(r));
  if (op === 'not in') return valArr.length === 0 || rawArr.every(r => !valArr.includes(r));
  if (op === 'includes any') return valArr.some(v => rawArr.includes(v));
  if (op === 'includes all') return valArr.every(v => rawArr.includes(v));
  if (op === 'excludes') return !valArr.some(v => rawArr.includes(v));

  // Date & number range operators
  const rawDate = raw ? new Date(raw).getTime() : NaN;
  if (op === 'before') return !isNaN(rawDate) && rawDate < new Date(String(val)).getTime();
  if (op === 'after')  return !isNaN(rawDate) && rawDate > new Date(String(val)).getTime();
  if (op === 'between' && Array.isArray(val) && val.length === 2) {
    const [from, to] = val as [string, string];
    // Try date first
    if (raw && !isNaN(rawDate)) {
      const fromT = new Date(from).getTime();
      const toT   = new Date(to).getTime();
      return rawDate >= fromT && rawDate <= toT;
    }
    // Number range
    const rawNum = parseFloat(String(raw));
    const fromN  = parseFloat(from);
    const toN    = parseFloat(to);
    return !isNaN(rawNum) && rawNum >= fromN && rawNum <= toN;
  }

  const rawNum = parseFloat(String(raw));
  const valNum = parseFloat(strVal);
  if (op === '>')  return !isNaN(rawNum) && rawNum > valNum;
  if (op === '>=') return !isNaN(rawNum) && rawNum >= valNum;
  if (op === '<')  return !isNaN(rawNum) && rawNum < valNum;
  if (op === '<=') return !isNaN(rawNum) && rawNum <= valNum;

  return false;
}

function applyFilters(tcs: any[], filters: FilterRow[], epics: Map<string, any>, stories: Map<string, any>): any[] {
  if (!filters || filters.length === 0) return tcs;
  return tcs.filter(tc => {
    // Evaluate each row; combine with AND/OR from previous row's connector
    let result = matchRow(tc, filters[0], epics, stories);
    for (let i = 1; i < filters.length; i++) {
      const prev = filters[i - 1];
      const curr = matchRow(tc, filters[i], epics, stories);
      if (prev.connector === 'OR') {
        result = result || curr;
      } else {
        result = result && curr;
      }
    }
    return result;
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId, filters }: { projectId: string; filters: FilterRow[] } = body;
    if (!projectId) return NextResponse.json({ success: false, error: 'projectId is required' }, { status: 400 });

    const tcs = loadAllTCs(projectId);
    const epics = loadEpics();
    const stories = loadStories();
    const matched = applyFilters(tcs, filters || [], epics, stories);

    return NextResponse.json({
      success: true,
      count: matched.length,
      testCases: matched.map(tc => ({
        testCaseId: tc.testCaseId,
        title: tc.title,
        priority: tc.priority,
        status: tc.status,
        module: tc.module,
        testCategory: tc.testCategory,
        assignedTester: tc.assignedTester,
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
```

- [ ] **Step 2.2 — Verify the endpoint works manually**

Start dev server if not running. Then test:
```bash
curl -X POST http://localhost:4202/api/testcases/query \
  -H "Content-Type: application/json" \
  -d '{"projectId":"BSSMED","filters":[{"id":"1","field":"priority","operator":"in","value":["High"],"connector":"AND"}]}'
```
Expected: `{ "success": true, "count": N, "testCases": [...] }`

- [ ] **Step 2.3 — Commit**

```bash
git add src/app/api/testcases/query/route.ts
git commit -m "feat: add /api/testcases/query POST endpoint with full filter engine"
```

---

## Task 3: Saved Queries API `/api/saved-queries`

**Files:**
- Create: `src/app/api/saved-queries/route.ts`

- [ ] **Step 3.1 — Create the route**

```typescript
// src/app/api/saved-queries/route.ts
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
export const dynamic = 'force-dynamic';

function filePath(projectId: string) {
  const dir = path.join(process.cwd(), 'dataHub', 'saved-queries');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${projectId}.json`);
}

function readQueries(projectId: string): any[] {
  const p = filePath(projectId);
  if (!fs.existsSync(p)) return [];
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch { return []; }
}

function writeQueries(projectId: string, queries: any[]) {
  fs.writeFileSync(filePath(projectId), JSON.stringify(queries, null, 2));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('project');
  if (!projectId) return NextResponse.json({ success: false, error: 'project is required' }, { status: 400 });
  return NextResponse.json({ success: true, queries: readQueries(projectId) });
}

export async function POST(req: Request) {
  const { name, projectId, jql, createdBy } = await req.json();
  if (!name?.trim()) return NextResponse.json({ success: false, error: 'name is required' }, { status: 400 });
  if (!projectId)     return NextResponse.json({ success: false, error: 'projectId is required' }, { status: 400 });
  if (!jql?.trim())   return NextResponse.json({ success: false, error: 'jql is required' }, { status: 400 });

  const queries = readQueries(projectId);
  const query = { id: `sq-${Date.now()}`, name: name.trim(), projectId, jql, createdBy: createdBy || 'admin', createdAt: new Date().toISOString() };
  queries.push(query);
  writeQueries(projectId, queries);
  return NextResponse.json({ success: true, query });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const projectId = searchParams.get('project');
  if (!id || !projectId) return NextResponse.json({ success: false, error: 'id and project are required' }, { status: 400 });

  const queries = readQueries(projectId).filter((q: any) => q.id !== id);
  writeQueries(projectId, queries);
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3.2 — Commit**

```bash
git add src/app/api/saved-queries/route.ts
git commit -m "feat: add /api/saved-queries CRUD endpoint"
```

---

## Task 4: JQL ↔ Visual Row Converter Utility

This utility lives inside `JQLQueryBuilder.tsx` but is complex enough to reason about independently.

**Files:**
- Create (as internal section in next task, but test logic here first)

The converter needs two pure functions:

**`filtersToJQL(rows: FilterRow[]): string`**
```
priority in (High,Highest) AND status = "Active"
AND (epic.key = "BSS-324" OR story.key = "US-121")
AND createdDate between "2026-01-01" and "2026-06-17"
```
Rules:
- OR connectors on adjacent rows are grouped with parentheses.
- Multi-value `in`/`not in`: `field in (v1,v2)`
- Single value `=`/`is`: `field = "value"`
- `between`: `field between "from" and "to"`
- `is empty`: `field is EMPTY`
- `is not empty`: `field is not EMPTY`
- String values are quoted. Numbers are not.

**`jqlToFilters(jql: string): FilterRow[] | null`**
- Returns `null` if JQL cannot be parsed (triggers red border in UI).
- Parses tokens: field, operator keyword, value(s), AND/OR connector.
- Handles: `in (...)`, `between X and Y`, quoted strings, bare words.

These are implemented inside `JQLQueryBuilder.tsx` in Task 5. No separate file needed.

---

## Task 5: `JQLQueryBuilder` Component

**Files:**
- Create: `src/app/components/JQLQueryBuilder.tsx`

- [ ] **Step 5.1 — Create the component**

```tsx
// src/app/components/JQLQueryBuilder.tsx
"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Plus, X, ChevronDown, Save, Trash2, Search, CheckSquare, Square, Loader2 } from "lucide-react";
import { FilterRow, SavedQuery, JQL_FIELD_MAP, OPERATORS_BY_TYPE, newFilterRow } from "@/types/filter";

// ─── JQL converter ──────────────────────────────────────────────────────────

function quoteVal(v: string, type: string): string {
  if (type === 'number') return v;
  return `"${v.replace(/"/g, '\\"')}"`;
}

function filtersToJQL(rows: FilterRow[]): string {
  if (rows.length === 0) return '';
  const parts: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const meta = JQL_FIELD_MAP[row.field];
    const type = meta?.type ?? 'text';
    const op = row.operator;
    const val = row.value;

    let expr = '';
    if (op === 'is empty')     expr = `${row.field} is EMPTY`;
    else if (op === 'is not empty') expr = `${row.field} is not EMPTY`;
    else if ((op === 'in' || op === 'not in') && Array.isArray(val)) {
      const list = (val as string[]).map(v => quoteVal(v, type)).join(', ');
      expr = `${row.field} ${op} (${list})`;
    } else if ((op === 'includes any' || op === 'includes all' || op === 'excludes') && Array.isArray(val)) {
      const list = (val as string[]).map(v => quoteVal(v, type)).join(', ');
      expr = `${row.field} ${op} (${list})`;
    } else if (op === 'between' && Array.isArray(val) && val.length === 2) {
      const [f, t] = val as [string, string];
      expr = `${row.field} between ${quoteVal(f, type)} and ${quoteVal(t, type)}`;
    } else {
      expr = `${row.field} ${op} ${quoteVal(String(val ?? ''), type)}`;
    }

    parts.push(expr);
  }

  // Build string with AND/OR; wrap OR-separated groups in parens
  let result = parts[0];
  for (let i = 1; i < parts.length; i++) {
    const connector = rows[i - 1].connector;
    if (connector === 'OR') {
      // Find the start of the OR group
      const prevConnector = i > 1 ? rows[i - 2].connector : 'AND';
      if (prevConnector === 'AND') {
        result = result.trimEnd().endsWith(')') ? result : result;
        result += ` OR ${parts[i]}`;
      } else {
        result += ` OR ${parts[i]}`;
      }
    } else {
      result += ` AND ${parts[i]}`;
    }
  }
  return result;
}

function jqlToFilters(jql: string): FilterRow[] | null {
  try {
    const rows: FilterRow[] = [];
    // Tokenise — split by top-level AND/OR (not inside parens/quotes)
    const tokens: { expr: string; connector: 'AND' | 'OR' }[] = [];
    let depth = 0, inQuote = false, quoteChar = '', buf = '';
    let pendingConnector: 'AND' | 'OR' = 'AND';

    const pushToken = (expr: string, conn: 'AND' | 'OR') => {
      const trimmed = expr.trim().replace(/^\(|\)$/g, '').trim();
      if (trimmed) tokens.push({ expr: trimmed, connector: conn });
    };

    const upper = jql + ' ';
    let i = 0;
    while (i < upper.length) {
      const ch = upper[i];
      if (!inQuote && (ch === '"' || ch === "'")) { inQuote = true; quoteChar = ch; buf += ch; i++; continue; }
      if (inQuote && ch === quoteChar) { inQuote = false; buf += ch; i++; continue; }
      if (!inQuote && ch === '(') { depth++; buf += ch; i++; continue; }
      if (!inQuote && ch === ')') { depth--; buf += ch; i++; continue; }
      if (!inQuote && depth === 0) {
        const rest = upper.slice(i);
        const andM = rest.match(/^AND\s+/i);
        const orM  = rest.match(/^OR\s+/i);
        if (andM) { pushToken(buf, pendingConnector); buf = ''; pendingConnector = 'AND'; i += andM[0].length; continue; }
        if (orM)  { pushToken(buf, pendingConnector); buf = ''; pendingConnector = 'OR';  i += orM[0].length;  continue; }
      }
      buf += ch; i++;
    }
    if (buf.trim()) pushToken(buf, pendingConnector);

    for (let t = 0; t < tokens.length; t++) {
      const { expr, connector } = tokens[t];
      const row = parseExpr(expr);
      if (!row) return null;
      row.connector = t < tokens.length - 1 ? tokens[t].connector : 'AND';
      rows.push(row);
    }
    return rows.length > 0 ? rows : null;
  } catch { return null; }
}

function parseExpr(expr: string): FilterRow | null {
  // between
  const betweenM = expr.match(/^(\S+)\s+between\s+"?([^"]+)"?\s+and\s+"?([^"]+)"?$/i);
  if (betweenM) return { ...newFilterRow(), field: betweenM[1], operator: 'between', value: [betweenM[2].trim(), betweenM[3].trim()] };
  // is EMPTY / is not EMPTY
  const emptyM = expr.match(/^(\S+)\s+(is not EMPTY|is EMPTY)$/i);
  if (emptyM) return { ...newFilterRow(), field: emptyM[1], operator: emptyM[2].toLowerCase() as any, value: '' };
  // in / not in / includes any / includes all / excludes (list)
  const listM = expr.match(/^(\S+)\s+(in|not in|includes any|includes all|excludes)\s+\(([^)]*)\)$/i);
  if (listM) {
    const vals = listM[3].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
    return { ...newFilterRow(), field: listM[1], operator: listM[2].toLowerCase() as any, value: vals };
  }
  // simple: field op "value" or field op value
  const simpleM = expr.match(/^(\S+)\s+(=|!=|contains|not contains|starts with|is not|is|before|after|>=|<=|>|<)\s+"?([^"]*)"?$/i);
  if (simpleM) return { ...newFilterRow(), field: simpleM[1], operator: simpleM[2].toLowerCase() as any, value: simpleM[3].trim() };
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
        {value.length === 0 ? <span className="text-[var(--text-muted)]">Select…</span> : <span className="truncate">{value.join(', ')}</span>}
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
    <div className="flex flex-wrap gap-1 items-center h-auto min-h-8 px-2 py-1 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-overlay)] min-w-[180px]">
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

// ─── Main Component ───────────────────────────────────────────────────────────

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
  const PAGE_SIZE = 10;

  // Load saved queries
  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/saved-queries?project=${projectId}`)
      .then(r => r.json())
      .then(d => { if (d.success) setSavedQueries(d.queries); });
  }, [projectId]);

  // Sync rows → JQL text
  useEffect(() => {
    setJqlText(filtersToJQL(rows));
    setJqlError('');
    runPreview(rows);
  }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps

  const runPreview = useCallback((currentRows: FilterRow[]) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const res = await fetch('/api/testcases/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, filters: currentRows }),
        });
        const data = await res.json();
        if (data.success) {
          setPreviewCount(data.count);
          setPreviewTCs(data.testCases);
          setPreviewPage(0);
        }
      } catch {
        setPreviewCount(null);
      } finally {
        setPreviewLoading(false);
      }
    }, 500);
  }, [projectId]);

  const handleJqlChange = (text: string) => {
    setJqlText(text);
    if (!text.trim()) { setRows([newFilterRow()]); setJqlError(''); return; }
    const parsed = jqlToFilters(text);
    if (parsed) { setRows(parsed); setJqlError(''); runPreview(parsed); }
    else setJqlError('Invalid JQL — check syntax');
  };

  const updateRow = (idx: number, patch: Partial<FilterRow>) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r));
  };

  const removeRow = (idx: number) => setRows(prev => prev.filter((_, i) => i !== idx));

  const addRow = () => setRows(prev => [...prev, newFilterRow()]);

  const toggleConnector = (idx: number) => {
    updateRow(idx, { connector: rows[idx].connector === 'AND' ? 'OR' : 'AND' });
  };

  const getValueInput = (row: FilterRow, idx: number) => {
    const meta = JQL_FIELD_MAP[row.field];
    const type = meta?.type ?? 'text';
    const op = row.operator;

    if (op === 'is empty' || op === 'is not empty') return null;

    if (op === 'between') {
      const rangeType = type === 'date' ? 'date' : 'number';
      const val: [string, string] = Array.isArray(row.value) && row.value.length === 2
        ? row.value as [string, string]
        : ['', ''];
      return <RangeInput type={rangeType} value={val} onChange={v => updateRow(idx, { value: v })} />;
    }

    if (type === 'multi-enum' && (op === 'in' || op === 'not in' || op === 'is' || op === 'is not')) {
      return <MultiSelect options={meta.options || []} value={Array.isArray(row.value) ? row.value as string[] : row.value ? [row.value as string] : []} onChange={v => updateRow(idx, { value: v })} />;
    }

    if (type === 'tags' && (op === 'includes any' || op === 'includes all' || op === 'excludes')) {
      return <TagInput value={Array.isArray(row.value) ? row.value as string[] : []} onChange={v => updateRow(idx, { value: v })} />;
    }

    if (type === 'date') {
      return <input type="date" value={String(row.value || '')} onChange={e => updateRow(idx, { value: e.target.value })} className="h-8 px-2 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-overlay)] text-[var(--text-primary)] text-xs w-[160px]" />;
    }

    if (type === 'number') {
      return <input type="number" value={String(row.value || '')} onChange={e => updateRow(idx, { value: e.target.value })} className="h-8 px-2 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-overlay)] text-[var(--text-primary)] text-xs w-[100px]" />;
    }

    // text / lookup
    return <input type="text" value={String(row.value || '')} onChange={e => updateRow(idx, { value: e.target.value })} placeholder="value" className="h-8 px-3 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-overlay)] text-[var(--text-primary)] text-xs w-[180px] placeholder:text-[var(--text-muted)]" />;
  };

  const handleSaveQuery = async () => {
    if (!saveName.trim()) return;
    const res = await fetch('/api/saved-queries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: saveName.trim(), projectId, jql: jqlText }),
    });
    const data = await res.json();
    if (data.success) { setSavedQueries(prev => [...prev, data.query]); setSaveName(''); setShowSavePopover(false); }
  };

  const handleDeleteSavedQuery = async (id: string) => {
    await fetch(`/api/saved-queries?id=${id}&project=${projectId}`, { method: 'DELETE' });
    setSavedQueries(prev => prev.filter(q => q.id !== id));
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

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const selectAllNew = () => setSelectedIds(new Set(newTCs.map(tc => tc.testCaseId)));

  const fieldOptions = Object.entries(JQL_FIELD_MAP);

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Saved Queries */}
        <div className="relative">
          <button type="button" onClick={() => setShowSavedDropdown(o => !o)} className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-xs hover:text-[var(--text-primary)] transition-colors">
            <Search size={12} /> Saved Queries <ChevronDown size={11} />
          </button>
          {showSavedDropdown && (
            <div className="absolute z-50 top-full left-0 mt-1 w-64 bg-[var(--bg-overlay)] border border-[var(--border-base)] rounded-xl shadow-xl overflow-hidden">
              {savedQueries.length === 0
                ? <p className="px-4 py-3 text-xs text-[var(--text-muted)]">No saved queries yet</p>
                : savedQueries.map(q => (
                  <div key={q.id} className="flex items-center gap-2 px-3 py-2 hover:bg-[var(--bg-elevated)] group">
                    <button type="button" onClick={() => loadSavedQuery(q)} className="flex-1 text-left text-xs text-[var(--text-primary)] truncate">{q.name}</button>
                    <button type="button" onClick={() => handleDeleteSavedQuery(q.id)} className="opacity-0 group-hover:opacity-100 text-[var(--accent-red)] transition-opacity"><Trash2 size={11} /></button>
                  </div>
                ))
              }
            </div>
          )}
        </div>

        {/* Save This Query */}
        <div className="relative">
          <button type="button" onClick={() => setShowSavePopover(o => !o)} className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-xs hover:text-[var(--accent-cyan)] transition-colors">
            <Save size={12} /> Save Query
          </button>
          {showSavePopover && (
            <div className="absolute z-50 top-full left-0 mt-1 w-64 bg-[var(--bg-overlay)] border border-[var(--border-base)] rounded-xl shadow-xl p-3 flex flex-col gap-2">
              <input autoFocus value={saveName} onChange={e => setSaveName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveQuery()} placeholder="Query name…" className="h-8 px-3 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-primary)] text-xs placeholder:text-[var(--text-muted)] outline-none" />
              <button type="button" onClick={handleSaveQuery} disabled={!saveName.trim()} className="h-8 rounded-lg bg-[var(--accent-cyan)] text-[var(--bg-base)] text-xs font-semibold disabled:opacity-40">Save</button>
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
                {/* Field */}
                <select value={row.field} onChange={e => { const newField = e.target.value; const newMeta = JQL_FIELD_MAP[newField]; const newType = newMeta?.type ?? 'text'; const newOps = OPERATORS_BY_TYPE[newType] || OPERATORS_BY_TYPE.text; updateRow(idx, { field: newField, operator: newOps[0], value: newType === 'multi-enum' ? [] : '' }); }} className="h-8 px-2 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-overlay)] text-[var(--text-primary)] text-xs cursor-pointer">
                  {fieldOptions.map(([key, f]) => <option key={key} value={key}>{f.label}</option>)}
                </select>

                {/* Operator */}
                <select value={row.operator} onChange={e => updateRow(idx, { operator: e.target.value as any, value: type === 'multi-enum' ? [] : '' })} className="h-8 px-2 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-overlay)] text-[var(--text-primary)] text-xs cursor-pointer">
                  {ops.map(op => <option key={op} value={op}>{op}</option>)}
                </select>

                {/* Value */}
                {getValueInput(row, idx)}

                {/* Remove */}
                {rows.length > 1 && (
                  <button type="button" onClick={() => removeRow(idx)} className="p-1 text-[var(--text-muted)] hover:text-[var(--accent-red)] transition-colors"><X size={14} /></button>
                )}
              </div>

              {/* Connector pill between rows */}
              {!isLast && (
                <div className="flex items-center gap-2 ml-2">
                  <button type="button" onClick={() => toggleConnector(idx)} className={`px-3 py-0.5 rounded-full text-xs font-bold border transition-colors ${row.connector === 'OR' ? 'bg-[var(--accent-orange)]/10 border-[var(--accent-orange)]/30 text-[var(--accent-orange)]' : 'bg-[var(--accent-cyan)]/10 border-[var(--accent-cyan)]/30 text-[var(--accent-cyan)]'}`}>
                    {row.connector}
                  </button>
                </div>
              )}
            </div>
          );
        })}

        <button type="button" onClick={addRow} className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-dashed border-[var(--border-base)] text-[var(--text-muted)] text-xs hover:text-[var(--accent-cyan)] hover:border-[var(--accent-cyan)] transition-colors w-fit">
          <Plus size={12} /> Add Condition
        </button>
      </div>

      {/* JQL Text Area */}
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">JQL</p>
        <textarea
          value={jqlText}
          onChange={e => handleJqlChange(e.target.value)}
          rows={3}
          className={`w-full px-3 py-2 rounded-xl border text-xs font-mono text-[var(--text-primary)] bg-[var(--bg-elevated)] resize-none outline-none transition-colors ${jqlError ? 'border-[var(--accent-red)]' : 'border-[var(--border-strong)] focus:border-[var(--accent-cyan)]'}`}
          placeholder='e.g. priority in (High, Highest) AND status = "Active"'
          spellCheck={false}
        />
        {jqlError && <p className="text-xs text-[var(--accent-red)]">{jqlError}</p>}
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
                  <div className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-elevated)] border-b border-[var(--border-base)]">
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
```

- [ ] **Step 5.2 — Commit**

```bash
git add src/app/components/JQLQueryBuilder.tsx
git commit -m "feat: add JQLQueryBuilder component with visual rows, JQL sync, live preview, saved queries"
```

---

## Task 6: `AdvancedFilterBar` Component

**Files:**
- Create: `src/app/components/AdvancedFilterBar.tsx`

- [ ] **Step 6.1 — Create the component**

```tsx
// src/app/components/AdvancedFilterBar.tsx
"use client";
import React, { useState } from "react";
import { Plus, X, ChevronDown, FilterX } from "lucide-react";
import { FilterRow, JQL_FIELD_MAP, OPERATORS_BY_TYPE, newFilterRow } from "@/types/filter";

// Suite-mode fields (subset)
const SUITE_FIELD_MAP: Record<string, { label: string; type: string; options?: string[] }> = {
  'name':        { label: 'Suite Name',   type: 'text' },
  'sprint':      { label: 'Sprint',       type: 'text' },
  'createdBy':   { label: 'Created By',   type: 'text' },
  'createdAt':   { label: 'Created Date', type: 'date' },
  'tcCount':     { label: 'TC Count',     type: 'number' },
};

export interface AdvancedFilterBarProps {
  mode: 'testcases' | 'suites';
  onChange: (rows: FilterRow[]) => void;
  initialRows?: FilterRow[];
}

function ValueInput({ row, idx, updateRow, fieldMap }: { row: FilterRow; idx: number; updateRow: (i: number, p: Partial<FilterRow>) => void; fieldMap: Record<string, any> }) {
  const meta = fieldMap[row.field];
  const type = meta?.type ?? 'text';
  const op = row.operator;

  if (op === 'is empty' || op === 'is not empty') return null;

  if (op === 'between') {
    const rangeType = type === 'date' ? 'date' : 'number';
    const val: [string, string] = Array.isArray(row.value) && row.value.length === 2 ? row.value as [string, string] : ['', ''];
    return (
      <div className="flex items-center gap-1">
        <input type={rangeType} value={val[0]} onChange={e => updateRow(idx, { value: [e.target.value, val[1]] })} className="h-8 px-2 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-overlay)] text-[var(--text-primary)] text-xs w-[130px]" />
        <span className="text-[var(--text-muted)] text-xs">→</span>
        <input type={rangeType} value={val[1]} onChange={e => updateRow(idx, { value: [val[0], e.target.value] })} className="h-8 px-2 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-overlay)] text-[var(--text-primary)] text-xs w-[130px]" />
      </div>
    );
  }

  if (type === 'multi-enum' && (op === 'in' || op === 'not in' || op === 'is' || op === 'is not')) {
    const [open, setOpen] = useState(false);
    const options: string[] = meta?.options || [];
    const selected: string[] = Array.isArray(row.value) ? row.value as string[] : row.value ? [row.value as string] : [];
    const toggle = (v: string) => updateRow(idx, { value: selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v] });
    return (
      <div className="relative">
        <button type="button" onClick={() => setOpen(o => !o)} className="flex items-center gap-1 h-8 px-3 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-overlay)] text-[var(--text-primary)] text-xs min-w-[130px] text-left">
          {selected.length === 0 ? <span className="text-[var(--text-muted)]">Select…</span> : <span className="truncate max-w-[120px]">{selected.join(', ')}</span>}
          <ChevronDown size={11} className="ml-auto shrink-0" />
        </button>
        {open && (
          <div className="absolute z-50 top-full left-0 mt-1 min-w-[160px] bg-[var(--bg-overlay)] border border-[var(--border-base)] rounded-xl shadow-xl overflow-hidden">
            {options.map(opt => (
              <button key={opt} type="button" onClick={() => toggle(opt)} className={`flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-[var(--bg-elevated)] transition-colors ${selected.includes(opt) ? 'text-[var(--accent-cyan)]' : 'text-[var(--text-primary)]'}`}>
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (type === 'date') return <input type="date" value={String(row.value || '')} onChange={e => updateRow(idx, { value: e.target.value })} className="h-8 px-2 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-overlay)] text-[var(--text-primary)] text-xs w-[150px]" />;
  if (type === 'number') return <input type="number" value={String(row.value || '')} onChange={e => updateRow(idx, { value: e.target.value })} className="h-8 px-2 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-overlay)] text-[var(--text-primary)] text-xs w-[100px]" />;
  return <input type="text" value={String(row.value || '')} onChange={e => updateRow(idx, { value: e.target.value })} placeholder="value" className="h-8 px-3 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-overlay)] text-[var(--text-primary)] text-xs w-[160px] placeholder:text-[var(--text-muted)]" />;
}

export default function AdvancedFilterBar({ mode, onChange, initialRows }: AdvancedFilterBarProps) {
  const [rows, setRows] = useState<FilterRow[]>(initialRows || []);
  const fieldMap = mode === 'suites' ? SUITE_FIELD_MAP : JQL_FIELD_MAP;
  const fieldOptions = Object.entries(fieldMap);

  const update = (newRows: FilterRow[]) => { setRows(newRows); onChange(newRows); };

  const updateRow = (idx: number, patch: Partial<FilterRow>) => {
    update(rows.map((r, i) => i === idx ? { ...r, ...patch } : r));
  };

  const removeRow = (idx: number) => update(rows.filter((_, i) => i !== idx));

  const addRow = () => update([...rows, newFilterRow()]);

  const clearAll = () => update([]);

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
        const type = meta?.type ?? 'text';
        const ops = OPERATORS_BY_TYPE[type] || OPERATORS_BY_TYPE.text;
        const isLast = idx === rows.length - 1;
        return (
          <div key={row.id} className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <select value={row.field} onChange={e => { const f = e.target.value; const m = fieldMap[f]; const t = m?.type ?? 'text'; const o = (OPERATORS_BY_TYPE[t] || OPERATORS_BY_TYPE.text)[0]; updateRow(idx, { field: f, operator: o, value: t === 'multi-enum' ? [] : '' }); }} className="h-8 px-2 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-overlay)] text-[var(--text-primary)] text-xs cursor-pointer">
                {fieldOptions.map(([key, f]) => <option key={key} value={key}>{(f as any).label}</option>)}
              </select>
              <select value={row.operator} onChange={e => updateRow(idx, { operator: e.target.value as any, value: type === 'multi-enum' ? [] : '' })} className="h-8 px-2 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-overlay)] text-[var(--text-primary)] text-xs cursor-pointer">
                {ops.map(op => <option key={op} value={op}>{op}</option>)}
              </select>
              <ValueInput row={row} idx={idx} updateRow={updateRow} fieldMap={fieldMap} />
              <button type="button" onClick={() => removeRow(idx)} className="p-1 text-[var(--text-muted)] hover:text-[var(--accent-red)] transition-colors"><X size={14} /></button>
            </div>
            {!isLast && (
              <div className="ml-2">
                <button type="button" onClick={() => updateRow(idx, { connector: row.connector === 'AND' ? 'OR' : 'AND' })} className={`px-3 py-0.5 rounded-full text-xs font-bold border transition-colors ${row.connector === 'OR' ? 'bg-[var(--accent-orange)]/10 border-[var(--accent-orange)]/30 text-[var(--accent-orange)]' : 'bg-[var(--accent-cyan)]/10 border-[var(--accent-cyan)]/30 text-[var(--accent-cyan)]'}`}>
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
```

- [ ] **Step 6.2 — Commit**

```bash
git add src/app/components/AdvancedFilterBar.tsx
git commit -m "feat: add AdvancedFilterBar component with AND/OR, range, multi-select operators"
```

---

## Task 7: Wire `AdvancedFilterBar` into `/testcases` page

**Files:**
- Modify: `src/app/testcases/page.tsx`

The goal: replace the existing hardcoded `.filter()` chain (lines ~456–468) with `AdvancedFilterBar` while keeping all existing functionality.

- [ ] **Step 7.1 — Add import at top of testcases/page.tsx**

Find this existing import block (near line 1–10):
```tsx
import { useProject } from "../components/ProjectContext";
```

Add after it:
```tsx
import AdvancedFilterBar from "../components/AdvancedFilterBar";
import { FilterRow, JQL_FIELD_MAP, OPERATORS_BY_TYPE } from "@/types/filter";
```

- [ ] **Step 7.2 — Add filterRows state**

Find the existing state declarations (near line 50–90 where `useState` calls are). Add:
```tsx
const [filterRows, setFilterRows] = useState<FilterRow[]>([]);
```

- [ ] **Step 7.3 — Replace the hardcoded filter chain**

Find and replace the entire `const filtered = testCases` block (lines ~456–468):

```tsx
// OLD — remove this entire block:
const filtered = testCases
  .filter(tc => !searchQuery || tc.title?.toLowerCase().includes(searchQuery.toLowerCase()) || tc.testCaseId?.toLowerCase().includes(searchQuery.toLowerCase()))
  .filter(tc => !filterPriority || tc.priority === filterPriority)
  .filter(tc => !filterStatus || tc.status === filterStatus)
  .filter(tc => !filterModule || tc.module === filterModule)
  .filter(tc => !filterSubModule || tc.subModule === filterSubModule)
  .filter(tc => !filterEntity || tc.entity === filterEntity)
  .filter(tc => !filterCategory || tc.testCategory === filterCategory)
  .filter(tc => !filterTestingType || tc.testingType === filterTestingType)
  .filter(tc => !filterCreatedBy || tc.createdBy?.toLowerCase().includes(filterCreatedBy.toLowerCase()))
  .filter(tc => !filterModifiedBy || tc.updatedBy?.toLowerCase().includes(filterModifiedBy.toLowerCase()))
  .filter(tc => !filterCreatedDate || (tc.createdDate && tc.createdDate.includes(filterCreatedDate)))
  .filter(tc => !filterModifiedDate || (tc.updatedDate && tc.updatedDate.includes(filterModifiedDate)));
```

Replace with:
```tsx
function applyClientFilter(tc: any, rows: FilterRow[]): boolean {
  if (rows.length === 0) return true;
  let result = matchClientRow(tc, rows[0]);
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1];
    const curr = matchClientRow(tc, rows[i]);
    result = prev.connector === 'OR' ? result || curr : result && curr;
  }
  return result;
}

function matchClientRow(tc: any, row: FilterRow): boolean {
  const raw = tc[row.field] ?? null;
  const op = row.operator;
  const val = row.value;
  const rawStr = raw === null ? '' : String(raw).toLowerCase();
  const valStr = Array.isArray(val) ? '' : String(val ?? '').toLowerCase();
  const rawArr = Array.isArray(raw) ? raw.map((v: any) => String(v).toLowerCase()) : [rawStr];
  const valArr = Array.isArray(val) && !Array.isArray(val[0]) ? (val as string[]).map(v => String(v).toLowerCase()) : [];

  if (op === 'is empty') return !raw || (Array.isArray(raw) && raw.length === 0);
  if (op === 'is not empty') return !!raw && !(Array.isArray(raw) && raw.length === 0);
  if (op === '=' || op === 'is') return rawArr.some(r => r === valStr);
  if (op === '!=' || op === 'is not') return rawArr.every(r => r !== valStr);
  if (op === 'contains') return rawArr.some(r => r.includes(valStr));
  if (op === 'not contains') return rawArr.every(r => !r.includes(valStr));
  if (op === 'starts with') return rawArr.some(r => r.startsWith(valStr));
  if (op === 'in') return valArr.length > 0 && rawArr.some(r => valArr.includes(r));
  if (op === 'not in') return valArr.length === 0 || rawArr.every(r => !valArr.includes(r));
  if (op === 'includes any') return valArr.some(v => rawArr.includes(v));
  if (op === 'includes all') return valArr.every(v => rawArr.includes(v));
  if (op === 'excludes') return !valArr.some(v => rawArr.includes(v));
  if (op === 'between' && Array.isArray(val) && val.length === 2) {
    const [from, to] = val as [string, string];
    const rawDate = raw ? new Date(raw).getTime() : NaN;
    if (!isNaN(rawDate)) return rawDate >= new Date(from).getTime() && rawDate <= new Date(to).getTime();
    const n = parseFloat(String(raw)); return n >= parseFloat(from) && n <= parseFloat(to);
  }
  if (op === 'before') return raw ? new Date(raw).getTime() < new Date(valStr).getTime() : false;
  if (op === 'after') return raw ? new Date(raw).getTime() > new Date(valStr).getTime() : false;
  const n = parseFloat(String(raw)); const vn = parseFloat(valStr);
  if (op === '>') return n > vn; if (op === '>=') return n >= vn;
  if (op === '<') return n < vn; if (op === '<=') return n <= vn;
  return false;
}

const filtered = testCases
  .filter(tc => !searchQuery || tc.title?.toLowerCase().includes(searchQuery.toLowerCase()) || tc.testCaseId?.toLowerCase().includes(searchQuery.toLowerCase()))
  .filter(tc => applyClientFilter(tc, filterRows));
```

- [ ] **Step 7.4 — Replace the old filter UI in JSX with AdvancedFilterBar**

Find the existing filter controls section in the JSX (the block with priority/status/module dropdowns, typically inside the `<main>` before the table). Remove those individual filter `<select>` elements and replace with:

```tsx
<div className="mb-4">
  <AdvancedFilterBar
    mode="testcases"
    onChange={setFilterRows}
  />
</div>
```

Keep the existing `searchQuery` input (`<input placeholder="Search TC No or Title…" />`) — it stays as-is above the AdvancedFilterBar.

- [ ] **Step 7.5 — Remove old unused filter state variables**

Remove these `useState` declarations that are no longer needed (the AdvancedFilterBar manages all filter state internally):
```tsx
const [filterPriority, setFilterPriority] = useState("");
const [filterStatus, setFilterStatus] = useState("");
const [filterModule, setFilterModule] = useState("");
const [filterSubModule, setFilterSubModule] = useState("");
const [filterEntity, setFilterEntity] = useState("");
const [filterCategory, setFilterCategory] = useState("");
const [filterTestingType, setFilterTestingType] = useState("");
const [filterCreatedBy, setFilterCreatedBy] = useState("");
const [filterModifiedBy, setFilterModifiedBy] = useState("");
const [filterCreatedDate, setFilterCreatedDate] = useState("");
const [filterModifiedDate, setFilterModifiedDate] = useState("");
```

- [ ] **Step 7.6 — Verify the page compiles with no TypeScript errors**

```bash
cd "e:/AI Agent/Bankai/bankai-app" && npx tsc --noEmit 2>&1 | head -40
```
Expected: 0 errors. Fix any type errors before proceeding.

- [ ] **Step 7.7 — Commit**

```bash
git add src/app/testcases/page.tsx
git commit -m "feat: replace testcases filter chain with AdvancedFilterBar (range + AND/OR support)"
```

---

## Task 8: Embed `JQLQueryBuilder` in `CreateSuiteModal` (testcases page)

**Files:**
- Modify: `src/app/testcases/page.tsx`

- [ ] **Step 8.1 — Add import**

Add to the import block (already has AdvancedFilterBar from Task 7):
```tsx
import JQLQueryBuilder from "../components/JQLQueryBuilder";
```

- [ ] **Step 8.2 — Add state for query builder tab**

Add with other state declarations:
```tsx
const [suiteModalTab, setSuiteModalTab] = useState<'manual' | 'query'>('manual');
```

- [ ] **Step 8.3 — Add query builder tab UI inside CreateSuiteModal**

Find the `CreateSuiteModal` JSX — it starts around line 647 with `{showSuiteModal && (`. Inside the modal's scrollable content div (after the existing "Adding N test case(s)" info box and before the Suite Name input), add tab switcher:

```tsx
{/* Tab switcher */}
<div className="flex gap-1 p-1 bg-[var(--bg-elevated)] rounded-xl">
  <button
    type="button"
    onClick={() => setSuiteModalTab('manual')}
    className={`flex-1 h-8 rounded-lg text-xs font-semibold transition-colors ${suiteModalTab === 'manual' ? 'bg-[var(--bg-overlay)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
  >
    Manual Selection ({selectedTCs.length} selected)
  </button>
  <button
    type="button"
    onClick={() => setSuiteModalTab('query')}
    className={`flex-1 h-8 rounded-lg text-xs font-semibold transition-colors ${suiteModalTab === 'query' ? 'bg-[var(--bg-overlay)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
  >
    Query Builder
  </button>
</div>
```

- [ ] **Step 8.4 — Conditionally render Query Builder tab content**

After the tab switcher, wrap the existing Sprint Selection + Suite Name form in a conditional and add Query Builder tab:

```tsx
{suiteModalTab === 'manual' ? (
  <>
    {/* existing suite name, description, sprint fields — keep exactly as-is */}
  </>
) : (
  <JQLQueryBuilder
    projectId={projectFilter || activeProject || ''}
    existingSuiteIds={[]}
    onAddToSuite={(tcIds) => {
      setSelectedTCs(prev => [...new Set([...prev, ...tcIds])]);
      setSuiteModalTab('manual');
    }}
    onCancel={() => setSuiteModalTab('manual')}
  />
)}
```

- [ ] **Step 8.5 — Verify and commit**

```bash
cd "e:/AI Agent/Bankai/bankai-app" && npx tsc --noEmit 2>&1 | head -40
```
Expected: 0 errors.

```bash
git add src/app/testcases/page.tsx
git commit -m "feat: add JQL Query Builder tab to CreateSuiteModal on testcases page"
```

---

## Task 9: Edit Suite Panel + Suite Filter on `/suites` page

**Files:**
- Modify: `src/app/suites/page.tsx`

- [ ] **Step 9.1 — Add imports to suites/page.tsx**

After existing imports, add:
```tsx
import { Edit2, Database } from "lucide-react";
import AdvancedFilterBar from "../components/AdvancedFilterBar";
import JQLQueryBuilder from "../components/JQLQueryBuilder";
import { FilterRow } from "@/types/filter";
```

- [ ] **Step 9.2 — Add EditSuitePanel state**

Add these state variables with the existing state declarations:
```tsx
const [editSuite, setEditSuite] = useState<any | null>(null);
const [editForm, setEditForm] = useState({ name: '', description: '', sprint: '' });
const [editSaving, setEditSaving] = useState(false);
const [editError, setEditError] = useState('');
const [showAddTCsPanel, setShowAddTCsPanel] = useState(false);
const [suiteFilterRows, setSuiteFilterRows] = useState<FilterRow[]>([]);
```

- [ ] **Step 9.3 — Add openEdit helper**

Add after the existing `openRun` function:
```tsx
const openEdit = (suite: any) => {
  setEditSuite(suite);
  setEditForm({ name: suite.name || '', description: suite.description || '', sprint: suite.sprint || '' });
  setEditError('');
  setShowAddTCsPanel(false);
};

const closeEdit = () => { setEditSuite(null); setShowAddTCsPanel(false); };

const saveEditMeta = async () => {
  if (!editForm.name.trim()) { setEditError('Suite name is required'); return; }
  if (!editForm.sprint.trim()) { setEditError('Sprint is required'); return; }
  setEditSaving(true); setEditError('');
  const res = await fetch('/api/suites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: editSuite.id, name: editForm.name.trim(), description: editForm.description, sprint: editForm.sprint.trim(), project: editSuite.project, testCaseIds: editSuite.testCaseIds }),
  });
  const data = await res.json();
  setEditSaving(false);
  if (data.success) {
    setSuites(prev => prev.map(s => s.id === editSuite.id ? { ...s, ...editForm, updatedAt: new Date().toISOString() } : s));
    setEditSuite((s: any) => ({ ...s, ...editForm }));
  } else {
    setEditError('Failed to save. Please try again.');
  }
};

const removeTCFromEdit = async (tcId: string) => {
  const res = await fetch('/api/suites', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ suiteId: editSuite.id, removeTcId: tcId }),
  });
  const data = await res.json();
  if (data.success) {
    setEditSuite((s: any) => ({ ...s, testCaseIds: s.testCaseIds.filter((id: string) => id !== tcId) }));
    setSuites(prev => prev.map(s => s.id === editSuite.id ? { ...s, testCaseIds: s.testCaseIds.filter((id: string) => id !== tcId) } : s));
  }
};

const addTCsFromQuery = async (tcIds: string[]) => {
  if (tcIds.length === 0) return;
  const merged = [...new Set([...(editSuite.testCaseIds || []), ...tcIds])];
  const res = await fetch('/api/suites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: editSuite.id, name: editSuite.name, description: editSuite.description, sprint: editSuite.sprint, project: editSuite.project, testCaseIds: merged }),
  });
  const data = await res.json();
  if (data.success) {
    setEditSuite((s: any) => ({ ...s, testCaseIds: merged }));
    setSuites(prev => prev.map(s => s.id === editSuite.id ? { ...s, testCaseIds: merged } : s));
    setShowAddTCsPanel(false);
  }
};
```

- [ ] **Step 9.4 — Add suite-level filter logic**

Add after existing `filteredTCs` useMemo (around line 110+):
```tsx
function matchSuiteRow(suite: any, row: FilterRow): boolean {
  const fieldVal = row.field === 'tcCount' ? (suite.testCaseIds?.length ?? 0) : (suite[row.field] ?? null);
  const op = row.operator;
  const val = row.value;
  const rawStr = fieldVal === null ? '' : String(fieldVal).toLowerCase();
  const valStr = Array.isArray(val) ? '' : String(val ?? '').toLowerCase();
  if (op === 'is empty') return !fieldVal;
  if (op === 'is not empty') return !!fieldVal;
  if (op === '=' || op === 'is') return rawStr === valStr;
  if (op === '!=' || op === 'is not') return rawStr !== valStr;
  if (op === 'contains') return rawStr.includes(valStr);
  if (op === 'before') return fieldVal ? new Date(fieldVal).getTime() < new Date(valStr).getTime() : false;
  if (op === 'after') return fieldVal ? new Date(fieldVal).getTime() > new Date(valStr).getTime() : false;
  if (op === 'between' && Array.isArray(val) && val.length === 2) {
    const [f, t] = val as [string, string];
    const d = fieldVal ? new Date(fieldVal).getTime() : NaN;
    if (!isNaN(d)) return d >= new Date(f).getTime() && d <= new Date(t).getTime();
    const n = parseFloat(String(fieldVal));
    return n >= parseFloat(f) && n <= parseFloat(t);
  }
  const n = parseFloat(String(fieldVal)); const vn = parseFloat(valStr);
  if (op === '>') return n > vn; if (op === '>=') return n >= vn;
  if (op === '<') return n < vn; if (op === '<=') return n <= vn;
  return false;
}

const filteredSuites = useMemo(() => {
  if (suiteFilterRows.length === 0) return suites;
  return suites.filter(suite => {
    let result = matchSuiteRow(suite, suiteFilterRows[0]);
    for (let i = 1; i < suiteFilterRows.length; i++) {
      const curr = matchSuiteRow(suite, suiteFilterRows[i]);
      result = suiteFilterRows[i - 1].connector === 'OR' ? result || curr : result && curr;
    }
    return result;
  });
}, [suites, suiteFilterRows]);
```

- [ ] **Step 9.5 — Add [Edit] button to each suite row in the table**

Find the suite table rows in JSX. Each row has action buttons (Run Suite, Delete). Add an Edit button:
```tsx
<button
  onClick={() => openEdit(suite)}
  title="Edit Suite"
  className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/10 transition-colors"
>
  <Edit2 size={15} />
</button>
```

- [ ] **Step 9.6 — Update the table's suite list to use filteredSuites**

Find where `suites.map(suite =>` is used in the table JSX and change it to `filteredSuites.map(suite =>`.

- [ ] **Step 9.7 — Add AdvancedFilterBar above the suite table**

Find the `<main>` content area in SuitesPage JSX. Before the suite table, add:
```tsx
<div className="mb-4">
  <AdvancedFilterBar
    mode="suites"
    onChange={setSuiteFilterRows}
  />
</div>
```

- [ ] **Step 9.8 — Add EditSuitePanel slide-over JSX**

Add this before the closing `</div>` of the page (alongside the existing Run Suite slide-over):

```tsx
{/* Edit Suite Panel */}
<AnimatePresence>
  {editSuite && (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90]" onClick={closeEdit} />
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} className="fixed right-0 top-0 h-full w-full max-w-[640px] bg-[var(--bg-base)] border-l border-[var(--border-base)] z-[91] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-base)] bg-[var(--bg-surface)] shrink-0">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2"><Edit2 size={18} className="text-[var(--accent-cyan)]" /> Edit Suite</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{editSuite.testCaseIds?.length || 0} test cases</p>
          </div>
          <button onClick={closeEdit} className="p-2 rounded-full hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {/* Section A — Metadata */}
          <div className="flex flex-col gap-4">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--accent-cyan)]">Suite Details</p>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">Suite Name *</label>
              <input value={editForm.name} onChange={e => { setEditForm(f => ({ ...f, name: e.target.value })); setEditError(''); }} className="w-full h-10 px-4 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-overlay)] text-[var(--text-primary)] text-sm outline-none focus:border-[var(--accent-cyan)] transition-colors" placeholder="Suite name" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">Description</label>
              <textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full px-4 py-3 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-overlay)] text-[var(--text-primary)] text-sm outline-none focus:border-[var(--accent-cyan)] transition-colors resize-none" placeholder="Purpose or scope…" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">Sprint *</label>
              <input list="edit-sprints-list" value={editForm.sprint} onChange={e => { setEditForm(f => ({ ...f, sprint: e.target.value })); setEditError(''); }} className="w-full h-10 px-4 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-overlay)] text-[var(--text-primary)] text-sm outline-none focus:border-[var(--accent-cyan)] transition-colors" placeholder="Sprint name" />
              <datalist id="edit-sprints-list">
                {(suites.map((s: any) => s.sprint).filter(Boolean) as string[]).filter((v, i, a) => a.indexOf(v) === i).map(sp => <option key={sp} value={sp} />)}
              </datalist>
            </div>
            {editError && <p className="text-xs text-[var(--accent-red)]">{editError}</p>}
            <button onClick={saveEditMeta} disabled={editSaving} className="self-end h-9 px-6 rounded-xl bg-[var(--accent-cyan)] text-[var(--bg-base)] text-sm font-semibold disabled:opacity-50 transition-opacity">
              {editSaving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>

          <div className="border-t border-[var(--border-base)]" />

          {/* Section B — Current TCs */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--accent-cyan)]">Test Cases in Suite ({editSuite.testCaseIds?.length || 0})</p>
            {(editSuite.testCaseIds || []).length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] text-center py-4">No test cases in this suite yet</p>
            ) : (
              <div className="flex flex-col gap-1 max-h-64 overflow-y-auto pr-1">
                {(editSuite.testCaseIds || []).map((tcId: string) => {
                  const tc = allTestCases.find((t: any) => t.testCaseId === tcId);
                  return (
                    <div key={tcId} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-[var(--border-base)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] transition-colors group">
                      <span className="text-xs font-mono text-[var(--accent-cyan)] w-28 shrink-0">{tcId}</span>
                      <span className="text-xs text-[var(--text-primary)] flex-1 truncate">{tc?.title || '—'}</span>
                      <span className="text-[10px] text-[var(--text-muted)] shrink-0">{tc?.priority}</span>
                      <button type="button" onClick={() => removeTCFromEdit(tcId)} className="opacity-0 group-hover:opacity-100 p-1 text-[var(--accent-red)] transition-opacity" title="Remove from suite"><X size={13} /></button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-[var(--border-base)]" />

          {/* Section C — Add TCs via Query Builder */}
          <div className="flex flex-col gap-3">
            <button type="button" onClick={() => setShowAddTCsPanel(o => !o)} className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--accent-cyan)] hover:opacity-80 transition-opacity">
              <Database size={14} /> {showAddTCsPanel ? '▲' : '▼'} Add Test Cases via Query Builder
            </button>
            {showAddTCsPanel && (
              <JQLQueryBuilder
                projectId={editSuite.project}
                existingSuiteIds={editSuite.testCaseIds || []}
                onAddToSuite={addTCsFromQuery}
                onCancel={() => setShowAddTCsPanel(false)}
              />
            )}
          </div>
        </div>
      </motion.div>
    </>
  )}
</AnimatePresence>
```

- [ ] **Step 9.9 — Verify TypeScript compiles**

```bash
cd "e:/AI Agent/Bankai/bankai-app" && npx tsc --noEmit 2>&1 | head -60
```
Expected: 0 errors. Fix any issues before proceeding.

- [ ] **Step 9.10 — Commit**

```bash
git add src/app/suites/page.tsx
git commit -m "feat: add EditSuitePanel slide-over, suite AdvancedFilterBar, and JQLQueryBuilder on suites page"
```

---

## Task 10: Build Verification

- [ ] **Step 10.1 — Run full TypeScript check**

```bash
cd "e:/AI Agent/Bankai/bankai-app" && npx tsc --noEmit 2>&1
```
Expected: 0 errors.

- [ ] **Step 10.2 — Run Next.js production build**

```bash
cd "e:/AI Agent/Bankai/bankai-app" && npm run build 2>&1 | tail -30
```
Expected: Build completes successfully. Zero build errors.

- [ ] **Step 10.3 — Commit final**

```bash
git add -A
git commit -m "feat: test suite edit + JQL query builder + advanced filters — complete"
```

- [ ] **Step 10.4 — Notify user to restart dev server**

Inform the user: "Build is clean. Use Admin → Settings → Reset Server to restart the dev server on port 4202 and test the new features."

---

## Self-Review Checklist

| Spec Requirement | Covered In |
|---|---|
| Edit Suite — name, description, sprint | Task 9 (EditSuitePanel Section A) |
| Edit Suite — remove existing TCs | Task 9 (Section B + removeTCFromEdit) |
| Edit Suite — add TCs via Query Builder | Task 9 (Section C + JQLQueryBuilder) |
| Advanced filter bar — TC page, 30+ fields | Tasks 1, 6, 7 |
| Advanced filter bar — Suites page | Tasks 1, 6, 9 |
| AND/OR connectors between rows | FilterRow.connector, Task 6, 7, 9 |
| Range operator (between) for dates + numbers | Task 1 (OPERATORS_BY_TYPE), Tasks 6, 7 |
| JQL hybrid (visual rows ↔ text auto-sync) | Task 5 (filtersToJQL + jqlToFilters) |
| Live preview count (500ms debounce) | Task 5 (runPreview + debounceRef) |
| JQL invalid → red border, rows unchanged | Task 5 (jqlError state) |
| Preview TC list, paginated 10/page | Task 5 (pagedTCs, totalPages) |
| In-suite TCs shown with ✓ badge | Task 5 (existingSuiteIds check) |
| Select All New | Task 5 (selectAllNew) |
| Saved Queries — create, load, delete | Tasks 3, 5 |
| Saved Queries — per project | Task 3 (dataHub/saved-queries/{project}.json) |
| JQL Query Builder on testcases page (suite creation) | Task 8 |
| JQL Query Builder on suites page (edit suite) | Task 9 |
| Epic, Story fields in filter | Task 1 (JQL_FIELD_MAP), Task 2 (getFieldValue) |
| No new npm dependencies | Confirmed — pure React + Lucide + Tailwind |
| Port 3003 / 4202 never killed by code | Confirmed — only data file writes |
| specGenerator.ts untouched | Not in scope |
| Run Suite panel untouched | Not in scope |
