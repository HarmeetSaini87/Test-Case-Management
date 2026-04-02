import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const suitesPath = path.join(process.cwd(), 'dataHub', 'suites.json');

function readSuites() {
  if (!fs.existsSync(suitesPath)) {
    const initial = { suites: [] };
    fs.writeFileSync(suitesPath, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(suitesPath, 'utf8'));
}

export async function GET() {
  return NextResponse.json({ success: true, ...readSuites() });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { id, name, description, sprint, project, testCaseIds, createdBy } = body;
  const data = readSuites();
  
  const now = new Date().toISOString();
  
  if (id) {
    // Update
    const idx = data.suites.findIndex((s: any) => s.id === id);
    if (idx > -1) {
      data.suites[idx] = { 
        ...data.suites[idx], 
        name, description, sprint, project, 
        testCaseIds: testCaseIds || [],
        updatedAt: now 
      };
    }
  } else {
    // Create
    data.suites.push({
      id: String(Date.now()),
      name,
      description,
      sprint,
      project,
      testCaseIds: testCaseIds || [],
      createdBy: createdBy || 'admin',
      createdAt: now,
      updatedAt: now
    });
  }
  
  fs.writeFileSync(suitesPath, JSON.stringify(data, null, 2));
  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const { id } = await req.json();
  const data = readSuites();
  data.suites = data.suites.filter((s: any) => s.id !== id);
  fs.writeFileSync(suitesPath, JSON.stringify(data, null, 2));
  return NextResponse.json({ success: true });
}

// PATCH: remove test case(s) from a suite (does NOT delete from repository)
export async function PATCH(req: Request) {
  const { suiteId, removeTcId, removeTcIds } = await req.json();
  const idsToRemove = removeTcIds || (removeTcId ? [removeTcId] : []);
  const data = readSuites();
  const suite = data.suites.find((s: any) => s.id === suiteId);
  if (!suite) return NextResponse.json({ success: false, error: 'Suite not found' }, { status: 404 });
  suite.testCaseIds = (suite.testCaseIds || []).filter((id: string) => !idsToRemove.includes(id));
  suite.updatedAt = new Date().toISOString();
  fs.writeFileSync(suitesPath, JSON.stringify(data, null, 2));
  return NextResponse.json({ success: true, suite });
}
