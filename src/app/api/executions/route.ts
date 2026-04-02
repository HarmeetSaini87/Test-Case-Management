import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const execPath = path.join(process.cwd(), 'dataHub', 'executions.json');

function readExec() {
  if (!fs.existsSync(execPath)) {
    fs.writeFileSync(execPath, JSON.stringify({ executions: [] }, null, 2));
    return { executions: [] };
  }
  return JSON.parse(fs.readFileSync(execPath, 'utf8'));
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const suiteId = url.searchParams.get('suiteId');
  const data = readExec();
  const executions = suiteId
    ? data.executions.filter((e: any) => e.suiteId === suiteId)
    : data.executions;
  return NextResponse.json({ success: true, executions });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { suiteId, suiteName, sprint, results, executedBy } = body;
  const data = readExec();
  const now = new Date().toISOString();

  // Find existing execution for this suite and update, or create new
  const idx = data.executions.findIndex((e: any) => e.suiteId === suiteId);
  const record = {
    id: idx > -1 ? data.executions[idx].id : String(Date.now()),
    suiteId, suiteName, sprint,
    results: results || [],
    executedBy: executedBy || 'admin',
    lastRun: now,
    createdAt: idx > -1 ? data.executions[idx].createdAt : now,
  };

  if (idx > -1) {
    data.executions[idx] = record;
  } else {
    data.executions.push(record);
  }

  fs.writeFileSync(execPath, JSON.stringify(data, null, 2));
  return NextResponse.json({ success: true, execution: record });
}
