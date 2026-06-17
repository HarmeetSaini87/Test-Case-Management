// src/app/api/testcases/query/route.ts
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { FilterRow } from '@/types/filter';
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
  try {
    const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
    const epics: any[] = data.epics || (Array.isArray(data) ? data : []);
    const map = new Map<string, any>();
    epics.forEach(e => { map.set(e.id, e); if (e.key) map.set(e.key, e); });
    return map;
  } catch { return new Map(); }
}

function loadStories(): Map<string, any> {
  const p = path.join(process.cwd(), 'dataHub', 'rtm', 'stories.json');
  if (!fs.existsSync(p)) return new Map();
  try {
    const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
    const stories: any[] = data.stories || (Array.isArray(data) ? data : []);
    const map = new Map<string, any>();
    stories.forEach(s => { map.set(s.id, s); if (s.key) map.set(s.key, s); });
    return map;
  } catch { return new Map(); }
}

function getFieldValue(tc: any, field: string, epics: Map<string, any>, stories: Map<string, any>): any {
  if (field === 'epic.key')    return tc.epic ? (epics.get(tc.epic.id)?.key ?? tc.epic.key ?? tc.epic.id ?? null) : null;
  if (field === 'epic.name')   return tc.epic ? (epics.get(tc.epic.id)?.name ?? tc.epic.title ?? null) : null;
  if (field === 'epic.status') return tc.epic ? (epics.get(tc.epic.id)?.status ?? null) : null;
  if (field === 'story.key')   return (tc.userStories || []).map((us: any) => stories.get(us.id)?.key ?? us.key ?? us.id);
  if (field === 'story.title') return (tc.userStories || []).map((us: any) => stories.get(us.id)?.title ?? us.title ?? '');
  if (field === 'story.status') return (tc.userStories || []).map((us: any) => stories.get(us.id)?.status ?? null);
  if (field === 'story.epicKey') return (tc.userStories || []).map((us: any) => { const s = stories.get(us.id); return s ? (epics.get(s.epicId)?.key ?? null) : null; });
  if (field === 'story.lastExecStatus') return (tc.userStories || []).map((us: any) => stories.get(us.id)?.coverage?.lastExecutionStatus ?? null);
  return tc[field] ?? null;
}

function matchRow(tc: any, row: FilterRow, epics: Map<string, any>, stories: Map<string, any>): boolean {
  const raw = getFieldValue(tc, row.field, epics, stories);
  const op = row.operator;
  const val = row.value;

  const rawStr = raw === null || raw === undefined ? '' : String(raw).toLowerCase();
  const valStr = Array.isArray(val) ? '' : String(val ?? '').toLowerCase();
  const rawArr: string[] = Array.isArray(raw)
    ? raw.filter(v => v !== null && v !== undefined).map((v: any) => String(v).toLowerCase())
    : [rawStr];
  const valArr: string[] = Array.isArray(val) && !(val.length === 2 && !Array.isArray(val[0]) && typeof val[0] === 'string' && typeof val[1] === 'string' && op === 'between')
    ? (val as string[]).map(v => String(v).toLowerCase())
    : [];

  if (op === 'is empty')     return raw === null || raw === undefined || raw === '' || (Array.isArray(raw) && raw.length === 0);
  if (op === 'is not empty') return !(raw === null || raw === undefined || raw === '' || (Array.isArray(raw) && raw.length === 0));
  if (op === '=' || op === 'is')        return rawArr.some(r => r === valStr);
  if (op === '!=' || op === 'is not')   return rawArr.every(r => r !== valStr);
  if (op === 'contains')     return rawArr.some(r => r.includes(valStr));
  if (op === 'not contains') return rawArr.every(r => !r.includes(valStr));
  if (op === 'starts with')  return rawArr.some(r => r.startsWith(valStr));
  if (op === 'in')           return valArr.length > 0 && rawArr.some(r => valArr.includes(r));
  if (op === 'not in')       return valArr.length === 0 || rawArr.every(r => !valArr.includes(r));
  if (op === 'includes any') return valArr.some(v => rawArr.includes(v));
  if (op === 'includes all') return valArr.every(v => rawArr.includes(v));
  if (op === 'excludes')     return !valArr.some(v => rawArr.includes(v));

  if (op === 'between' && Array.isArray(val) && val.length === 2) {
    const [from, to] = val as [string, string];
    const rawDate = raw ? new Date(String(raw)).getTime() : NaN;
    if (!isNaN(rawDate) && raw && String(raw).match(/\d{4}-\d{2}-\d{2}/)) {
      return rawDate >= new Date(from).getTime() && rawDate <= new Date(to).getTime();
    }
    const n = parseFloat(String(raw));
    return !isNaN(n) && n >= parseFloat(from) && n <= parseFloat(to);
  }
  if (op === 'before') { const d = raw ? new Date(String(raw)).getTime() : NaN; return !isNaN(d) && d < new Date(valStr).getTime(); }
  if (op === 'after')  { const d = raw ? new Date(String(raw)).getTime() : NaN; return !isNaN(d) && d > new Date(valStr).getTime(); }

  const rawNum = parseFloat(String(raw)); const valNum = parseFloat(valStr);
  if (op === '>')  return !isNaN(rawNum) && rawNum > valNum;
  if (op === '>=') return !isNaN(rawNum) && rawNum >= valNum;
  if (op === '<')  return !isNaN(rawNum) && rawNum < valNum;
  if (op === '<=') return !isNaN(rawNum) && rawNum <= valNum;

  return false;
}

function applyFilters(tcs: any[], filters: FilterRow[], epics: Map<string, any>, stories: Map<string, any>): any[] {
  if (!filters || filters.length === 0) return tcs;
  return tcs.filter(tc => {
    let result = matchRow(tc, filters[0], epics, stories);
    for (let i = 1; i < filters.length; i++) {
      const curr = matchRow(tc, filters[i], epics, stories);
      result = filters[i - 1].connector === 'OR' ? result || curr : result && curr;
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
