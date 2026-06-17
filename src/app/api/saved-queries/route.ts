// src/app/api/saved-queries/route.ts
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
export const dynamic = 'force-dynamic';

function filePath(projectId: string): string {
  const dir = path.join(process.cwd(), 'dataHub', 'saved-queries');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${projectId}.json`);
}

function readQueries(projectId: string): any[] {
  const p = filePath(projectId);
  if (!fs.existsSync(p)) return [];
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch { return []; }
}

function writeQueries(projectId: string, queries: any[]): void {
  fs.writeFileSync(filePath(projectId), JSON.stringify(queries, null, 2));
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('project');
    if (!projectId) return NextResponse.json({ success: false, error: 'project is required' }, { status: 400 });
    return NextResponse.json({ success: true, queries: readQueries(projectId) });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, projectId, jql, createdBy } = await req.json();
    if (!name?.trim())   return NextResponse.json({ success: false, error: 'name is required' }, { status: 400 });
    if (!projectId)      return NextResponse.json({ success: false, error: 'projectId is required' }, { status: 400 });
    if (!jql?.trim())    return NextResponse.json({ success: false, error: 'jql is required' }, { status: 400 });

    const queries = readQueries(projectId);
    const query = {
      id: `sq-${Date.now()}`,
      name: name.trim(),
      projectId,
      jql: jql.trim(),
      createdBy: createdBy || 'admin',
      createdAt: new Date().toISOString(),
    };
    queries.push(query);
    writeQueries(projectId, queries);
    return NextResponse.json({ success: true, query });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const projectId = searchParams.get('project');
    if (!id || !projectId) return NextResponse.json({ success: false, error: 'id and project are required' }, { status: 400 });

    const queries = readQueries(projectId).filter((q: any) => q.id !== id);
    writeQueries(projectId, queries);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
