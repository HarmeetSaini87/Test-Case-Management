import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function getPath() {
  const p = path.join(process.cwd(), "dataHub", "testcases");
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
  return p;
}

function nextId(dir: string, projectKey: string): string {
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".json"));
  const nums: number[] = [];
  files.forEach(f => {
    try {
      const tc = JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8"));
      if (tc.testCaseId) {
        const parts = tc.testCaseId.split("-TC-");
        if (parts.length === 2) nums.push(parseInt(parts[1], 10));
      }
    } catch {}
  });
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${projectKey}-TC-${String(next).padStart(3, "0")}`;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const project = searchParams.get("project");
    const testCaseId = searchParams.get("testCaseId");
    const dir = getPath();

    if (testCaseId) {
      const safe = testCaseId.replace(/[^a-z0-9-]/gi, "_").toLowerCase();
      const filePath = path.join(dir, `${safe}.json`);
      if (fs.existsSync(filePath)) {
        const testCase = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        return NextResponse.json({ success: true, testCase });
      }
      return NextResponse.json({ success: false, error: "Test Case not found" }, { status: 404 });
    }

    const files = fs.readdirSync(dir).filter(f => f.endsWith(".json"));
    const testCases = files
      .map(f => {
        try { return JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8")); } catch { return null; }
      })
      .filter(tc => tc !== null)
      .filter(tc => !project || tc.project === project);
    return NextResponse.json({ success: true, testCases });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.title) return NextResponse.json({ success: false, error: "Title is required" }, { status: 400 });

    const dir = getPath();
    const now = new Date().toISOString();

    let testCase: any;
    if (body.testCaseId) {
      // Update existing — snapshot previous version first
      const safe = body.testCaseId.replace(/[^a-z0-9-]/gi, "_").toLowerCase();
      const filePath = path.join(dir, `${safe}.json`);
      const existing = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf-8")) : {};

      // Build version history entry
      const historyEntry = {
        version: existing.version || 1,
        savedAt: existing.updatedDate || now,
        savedBy: existing.updatedBy || "admin",
        snapshot: {
          title: existing.title, priority: existing.priority, status: existing.status,
          testCategory: existing.testCategory, testingType: existing.testingType,
          testIntent: existing.testIntent, preconditions: existing.preconditions,
          steps: existing.steps, description: existing.description,
          assignedTester: existing.assignedTester,
        },
      };

      const history = [...(existing.history || []), historyEntry].slice(-20); // keep last 20 versions

      testCase = {
        ...existing,
        ...body,
        assignedTester: body.assignedTester ?? existing.assignedTester ?? "",
        updatedDate: now,
        updatedBy: body.updatedBy || "admin",
        createdDate: existing.createdDate || now,
        createdBy: existing.createdBy || "admin",
        version: (existing.version || 0) + 1,
        history,
      };
      fs.writeFileSync(filePath, JSON.stringify(testCase, null, 2), "utf-8");
    } else {
      // Create new
      const projectKey = body.project || "TC";
      const id = nextId(dir, projectKey);
      testCase = {
        testCaseId: id,
        title: body.title,
        objective: body.objective || "",
        description: body.description || "",
        project: body.project || "",
        module: body.module || "",
        subModule: body.subModule || "",
        entity: body.entity || "",
        priority: body.priority || "Medium",
        status: body.status || "Draft",
        testCategory: body.testCategory || "",
        testingType: body.testingType || "",
        testIntent: body.testIntent || "",
        automationType: body.automationType || "Not Automated",
        assignedTester: body.assignedTester || "",
        labels: body.labels || [],
        preconditions: body.preconditions || "",
        estimatedTime: body.estimatedTime || "",
        steps: body.steps || [],
        createdDate: now,
        createdBy: body.createdBy || "admin",
        updatedDate: now,
        updatedBy: body.createdBy || "admin",
        version: 1,
        history: []
      };
      const safe = id.replace(/[^a-z0-9-]/gi, "_").toLowerCase();
      fs.writeFileSync(path.join(dir, `${safe}.json`), JSON.stringify(testCase, null, 2), "utf-8");
    }

    return NextResponse.json({ success: true, testCase });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { testCaseId, testCaseIds } = await req.json();
    const dir = getPath();

    if (testCaseIds && Array.isArray(testCaseIds)) {
      testCaseIds.forEach(id => {
        const safe = id.replace(/[^a-z0-9-]/gi, "_").toLowerCase();
        const filePath = path.join(dir, `${safe}.json`);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      });
      return NextResponse.json({ success: true, count: testCaseIds.length });
    }

    if (testCaseId) {
      const safe = testCaseId.replace(/[^a-z0-9-]/gi, "_").toLowerCase();
      const filePath = path.join(dir, `${safe}.json`);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: "No ID provided" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
