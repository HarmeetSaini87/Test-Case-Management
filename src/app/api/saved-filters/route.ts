// src/app/api/saved-filters/route.ts
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { FilterRow } from '@/types/filter';
export const dynamic = 'force-dynamic';

export interface SavedFilter {
  id: string;
  name: string;
  projectId: string;
  filters: FilterRow[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

function filePath(projectId: string) {
  const dir = path.join(process.cwd(), 'dataHub', 'saved-filters');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${projectId}.json`);
}

function load(projectId: string): SavedFilter[] {
  const p = filePath(projectId);
  if (!fs.existsSync(p)) return [];
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch { return []; }
}

function save(projectId: string, data: SavedFilter[]) {
  fs.writeFileSync(filePath(projectId), JSON.stringify(data, null, 2));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('project') || '';
  if (!projectId) return NextResponse.json({ success: false, error: 'project is required' }, { status: 400 });
  return NextResponse.json({ success: true, filters: load(projectId) });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, projectId, filters, createdBy } = body;
    if (!name || !projectId || !Array.isArray(filters))
      return NextResponse.json({ success: false, error: 'name, projectId, filters required' }, { status: 400 });
    const data = load(projectId);
    const now = new Date().toISOString();
    const entry: SavedFilter = { id: `sf-${Date.now()}`, name, projectId, filters, createdBy: createdBy || 'admin', createdAt: now, updatedAt: now };
    data.push(entry);
    save(projectId, data);
    return NextResponse.json({ success: true, filter: entry });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, projectId, name, filters } = body;
    if (!id || !projectId) return NextResponse.json({ success: false, error: 'id and projectId required' }, { status: 400 });
    const data = load(projectId);
    const idx = data.findIndex(f => f.id === id);
    if (idx === -1) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    data[idx] = { ...data[idx], name: name ?? data[idx].name, filters: filters ?? data[idx].filters, updatedAt: new Date().toISOString() };
    save(projectId, data);
    return NextResponse.json({ success: true, filter: data[idx] });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id') || '';
  const projectId = searchParams.get('project') || '';
  if (!id || !projectId) return NextResponse.json({ success: false, error: 'id and project required' }, { status: 400 });
  const data = load(projectId).filter(f => f.id !== id);
  save(projectId, data);
  return NextResponse.json({ success: true });
}
