import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";

function getDataHubPath() {
  const p = path.join(process.cwd(), "dataHub", "testcases");
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
  return p;
}

function getNextId(dir: string, projectKey: string): string {
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

/**
 * Detect which format the Excel file uses based on header row
 * Format 1: TestCases-RA style (Created By, Entity Key, Test Case Summary...)
 * Format 2: Regression / Sprint style (S.no., Test Id, Component, Test Case Name...)
 */
function detectFormat(headers: string[]): "RA" | "SPRINT" | "UNKNOWN" {
  const h = headers.map(h => String(h || "").toLowerCase());
  if (h.includes("entity key") || h.includes("test case summary")) return "RA";
  if (h.includes("test id") || h.includes("component") || h.includes("test case name")) return "SPRINT";
  return "UNKNOWN";
}

function parseComponent(component: string): { module: string; subModule: string } {
  if (!component) return { module: "", subModule: "" };
  const parts = component.split("/");
  return { module: parts[0]?.trim() || "", subModule: parts[1]?.trim() || "" };
}

function extractStepsRA(rows: any[][], currentRow: number, headers: string[]): any[] {
  const stepOrderIdx = headers.findIndex(h => String(h).toLowerCase().includes("step order"));
  const stepDescIdx = headers.findIndex(h => String(h).toLowerCase() === "step description(plain text)" || String(h).toLowerCase() === "step description");
  const stepInputIdx = headers.findIndex(h => String(h).toLowerCase() === "step inputdata(plain text)" || String(h).toLowerCase() === "step inputdata");
  const stepExpectedIdx = headers.findIndex(h => String(h).toLowerCase() === "step expected outcome(plain text)" || String(h).toLowerCase() === "step expected outcome");

  const steps: any[] = [];
  let i = currentRow;

  while (i < rows.length) {
    const row = rows[i];
    // If this row has a new test case identity (non-empty first few columns), stop
    if (i > currentRow && row[0] && String(row[0]).trim() !== "") break;
    if (row[stepOrderIdx] !== undefined && row[stepOrderIdx] !== "") {
      steps.push({
        action: String(row[stepDescIdx] || "").trim(),
        testData: String(row[stepInputIdx] || "").trim(),
        expectedResult: String(row[stepExpectedIdx] || "").trim(),
      });
    }
    i++;
  }
  return steps;
}

function extractStepsSprint(rows: any[][], startRow: number, headers: string[]): { steps: any[]; endRow: number } {
  const stepsIdx = headers.findIndex(h => String(h).toLowerCase() === "test steps");
  const expectedIdx = headers.findIndex(h => String(h).toLowerCase() === "expected results");
  const stepDataIdx = headers.findIndex(h => String(h).toLowerCase() === "step data");
  const testDataIdx = headers.findIndex(h => String(h).toLowerCase() === "test data");
  const snoIdx = headers.findIndex(h => String(h).toLowerCase() === "s.no.");

  const steps: any[] = [];
  let i = startRow;

  while (i < rows.length) {
    const row = rows[i];
    // new test case starts when S.No is non-empty (and it's not the header row)
    if (i > startRow && row[snoIdx] !== undefined && row[snoIdx] !== null && row[snoIdx] !== "") break;
    if (row[stepsIdx] !== undefined && row[stepsIdx] !== null && row[stepsIdx] !== "") {
      steps.push({
        action: String(row[stepsIdx] || "").trim(),
        testData: String(row[stepDataIdx] || row[testDataIdx] || "").trim(),
        expectedResult: String(row[expectedIdx] || "").trim(),
      });
    }
    i++;
  }

  return { steps, endRow: i };
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const projectKey = (formData.get("projectKey") as string) || "IMP";

    if (!file) return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });

    const dir = getDataHubPath();
    const now = new Date().toISOString();
    const imported: any[] = [];
    const skipped: any[] = [];

    for (const sheetName of workbook.SheetNames) {
      const ws = workbook.Sheets[sheetName];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      if (rows.length < 2) continue;

      const headers = (rows[0] as string[]).map(h => String(h || ""));
      const format = detectFormat(headers);

      if (format === "UNKNOWN") {
        skipped.push({ sheet: sheetName, reason: "Unrecognized format" });
        continue;
      }

      if (format === "RA") {
        // Columns: Created By, Entity Key, Test Case Summary, Description, Version, Priority, Status, Test Category, Testing Type, Labels, Created Date, Updated Date, Updated By, Test Case Folder Path, ...Preconditions, Steps
        const idIdx = headers.findIndex(h => h.toLowerCase() === "entity key");
        const titleIdx = headers.findIndex(h => h.toLowerCase() === "test case summary");
        const descIdx = headers.findIndex(h => h.toLowerCase() === "test case description(plain text)" || h.toLowerCase() === "test case description");
        const priorityIdx = headers.findIndex(h => h.toLowerCase() === "test case priority");
        const statusIdx = headers.findIndex(h => h.toLowerCase() === "test case status");
        const categoryIdx = headers.findIndex(h => h.toLowerCase() === "test category");
        const typeIdx = headers.findIndex(h => h.toLowerCase() === "testing type");
        const labelsIdx = headers.findIndex(h => h.toLowerCase() === "label(s)");
        const createdByIdx = headers.findIndex(h => h.toLowerCase() === "created by");
        const folderIdx = headers.findIndex(h => h.toLowerCase() === "test case folder path");
        const precondIdx = headers.findIndex(h => h.toLowerCase() === "testcase pre-condition(plain text)" || h.toLowerCase() === "testcase pre-condition");

        let i = 1;
        while (i < rows.length) {
          const row = rows[i];
          const title = String(row[titleIdx] || "").trim();
          if (!title) { i++; continue; }

          const steps = extractStepsRA(rows, i, headers);
          const folderPath = String(row[folderIdx] || "");
          const folderParts = folderPath.split("/").filter(Boolean);
          const module = folderParts[1] || "";
          const subModule = folderParts[2] || "";

          const id = getNextId(dir, projectKey);
          const tc: any = {
            testCaseId: id,
            originalId: String(row[idIdx] || ""),
            title,
            description: String(row[descIdx] || "").trim(),
            objective: "",
            project: projectKey,
            module,
            subModule,
            entity: "",
            priority: String(row[priorityIdx] || "Medium"),
            status: String(row[statusIdx] || "Draft") || "Draft",
            testCategory: String(row[categoryIdx] || "Functional"),
            testingType: String(row[typeIdx] || "Regression"),
            testIntent: "Positive",
            automationType: "Not Automated",
            labels: String(row[labelsIdx] || "").split(",").map((s: string) => s.trim()).filter(Boolean),
            preconditions: String(row[precondIdx] || "").trim(),
            estimatedTime: "",
            testCycle: "",
            steps,
            createdBy: String(row[createdByIdx] || "import"),
            createdDate: now,
            updatedBy: "import",
            updatedDate: now,
            version: 1,
          };

          const safe = id.replace(/[^a-z0-9-]/gi, "_").toLowerCase();
          fs.writeFileSync(path.join(dir, `${safe}.json`), JSON.stringify(tc, null, 2), "utf-8");
          imported.push({ id, title, sheet: sheetName });

          // Skip continuation rows (step rows of same test case)
          i += Math.max(1, steps.length);
        }
      }

      if (format === "SPRINT") {
        // Columns: S.no., Test Id, Component, Test Case Name, Test Objective?, Precondition, Test Data, Test Steps, Expected Results, Step Data, Priority, Testing Type, Automation Type?, Test Cycle?, References?, Created By?, Testing Type (duplicate?), Test Intent?
        const snoIdx = headers.findIndex(h => h.toLowerCase() === "s.no.");
        const idIdx = headers.findIndex(h => h.toLowerCase() === "test id");
        const componentIdx = headers.findIndex(h => h.toLowerCase() === "component");
        const nameIdx = headers.findIndex(h => h.toLowerCase() === "test case name");
        const objectiveIdx = headers.findIndex(h => h.toLowerCase() === "test objective");
        const precondIdx = headers.findIndex(h => h.toLowerCase() === "test precondition");
        const priorityIdx = headers.findIndex(h => h.toLowerCase() === "priority");
        const typeIdx = headers.findIndex(h => h.toLowerCase() === "testing type");
        const autoTypeIdx = headers.findIndex(h => h.toLowerCase() === "automation type");
        const cycleIdx = headers.findIndex(h => h.toLowerCase() === "test cycle");
        const createdByIdx = headers.findIndex(h => h.toLowerCase() === "created by");
        const intentIdx = headers.findIndex(h => h.toLowerCase() === "test intent");

        let i = 1;
        while (i < rows.length) {
          const row = rows[i];
          const sno = row[snoIdx];
          const title = String(row[nameIdx] || "").trim();
          if (!title || sno === "" || sno === undefined) { i++; continue; }

          const { steps, endRow } = extractStepsSprint(rows, i, headers);
          const { module, subModule } = parseComponent(String(row[componentIdx] || ""));

          const id = getNextId(dir, projectKey);
          const tc: any = {
            testCaseId: id,
            originalId: String(row[idIdx] || ""),
            title,
            description: "",
            objective: objectiveIdx >= 0 ? String(row[objectiveIdx] || "").trim() : "",
            project: projectKey,
            module,
            subModule,
            entity: "",
            priority: String(row[priorityIdx] || "Medium"),
            status: "Active",
            testCategory: "Functional",
            testingType: typeIdx >= 0 ? String(row[typeIdx] || "Regression") : "Regression",
            testIntent: intentIdx >= 0 ? String(row[intentIdx] || "Positive") : "Positive",
            automationType: autoTypeIdx >= 0 ? String(row[autoTypeIdx] || "Not Automated") : "Not Automated",
            labels: [],
            preconditions: precondIdx >= 0 ? String(row[precondIdx] || "").trim() : "",
            estimatedTime: "",
            testCycle: cycleIdx >= 0 ? String(row[cycleIdx] || "") : "",
            steps,
            createdBy: createdByIdx >= 0 ? String(row[createdByIdx] || "import") : "import",
            createdDate: now,
            updatedBy: "import",
            updatedDate: now,
            version: 1,
          };

          const safe = id.replace(/[^a-z0-9-]/gi, "_").toLowerCase();
          fs.writeFileSync(path.join(dir, `${safe}.json`), JSON.stringify(tc, null, 2), "utf-8");
          imported.push({ id, title, sheet: sheetName, originalId: tc.originalId });

          i = endRow;
        }
      }
    }

    return NextResponse.json({
      success: true,
      imported: imported.length,
      skipped,
      summary: imported,
    });
  } catch (e: any) {
    console.error("Import error:", e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
