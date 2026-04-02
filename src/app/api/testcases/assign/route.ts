import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const tcDir = path.join(process.cwd(), 'dataHub', 'testcases');

export async function POST(req: Request) {
  try {
    const { testCaseIds, assignedTester, updatedBy } = await req.json();
    if (!testCaseIds?.length || !assignedTester) {
      return NextResponse.json({ success: false, error: 'testCaseIds and assignedTester are required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    let updated = 0;

    for (const id of testCaseIds) {
      const safe = id.replace(/[^a-z0-9-]/gi, '_').toLowerCase();
      const filePath = path.join(tcDir, `${safe}.json`);
      if (fs.existsSync(filePath)) {
        const tc = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        tc.assignedTester = assignedTester;
        tc.updatedBy = updatedBy || 'admin';
        tc.updatedDate = now;
        fs.writeFileSync(filePath, JSON.stringify(tc, null, 2));
        updated++;
      }
    }

    return NextResponse.json({ success: true, updated });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
