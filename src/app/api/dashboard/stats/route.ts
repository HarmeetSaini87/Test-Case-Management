import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

function getExecutions() {
  const p = path.join(process.cwd(), "dataHub", "executions.json");
  if (!fs.existsSync(p)) return { executions: [] };
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

function getTestCase(testCaseId: string) {
  const dir = path.join(process.cwd(), "dataHub", "testcases");
  const safe = testCaseId.toLowerCase();
  const filePath = path.join(dir, `${safe}.json`);
  if (fs.existsSync(filePath)) {
    try { return JSON.parse(fs.readFileSync(filePath, "utf-8")); } catch { return null; }
  }
  return null;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const project = searchParams.get("project");
    const sprintFilter = searchParams.get("sprint");
    const suiteFilter = searchParams.get("suite");
    const versionFilter = searchParams.get("version");
    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");

    const rawExecutions = getExecutions();
    const executions = Array.isArray(rawExecutions) ? rawExecutions : (rawExecutions.executions || []);
    
    // Resolve Project Details & Master Filter Options
    let targetProjectKey = "";
    const availableVersions = new Set<string>();
    const availableSprints = new Set<string>();
    const availableSuites = new Set<string>();

    if (project) {
      // 1. Projects/Versions
      const pPath = path.join(process.cwd(), "dataHub", "projects.json");
      if (fs.existsSync(pPath)) {
        const projectsData = JSON.parse(fs.readFileSync(pPath, "utf-8"));
        const projects = Array.isArray(projectsData) ? projectsData : [];
        const p = projects.find((x: any) => x.id === project || x.name === project || x.key === project);
        if (p) {
          targetProjectKey = p.key;
          (p.versions || []).forEach((v: string) => availableVersions.add(v));
        }
      }

      // 2. Sprints
      const spPath = path.join(process.cwd(), "dataHub", "sprints.json");
      if (fs.existsSync(spPath)) {
        const sprintsData = JSON.parse(fs.readFileSync(spPath, "utf-8"));
        const sprints = Array.isArray(sprintsData) ? sprintsData : [];
        // Filter sprints belonging to this project (by name, id, or key)
        sprints.filter((s: any) => s.project === project || s.project === targetProjectKey)
               .forEach((s: any) => availableSprints.add(s.name));
      }

      // 3. Suites
      const stPath = path.join(process.cwd(), "dataHub", "suites.json");
      if (fs.existsSync(stPath)) {
        const suitesData = JSON.parse(fs.readFileSync(stPath, "utf-8"));
        const suites = Array.isArray(suitesData) ? suitesData : (suitesData.suites || []);
        suites.filter((s: any) => s.project === project || s.project === targetProjectKey)
              .forEach((s: any) => availableSuites.add(s.name));
      }
    }

    const stats: any = {
      summary: { total: 0, passed: 0, failed: 0, blocked: 0, pending: 0 },
      bySprint: {},
      bySuite: {},
      byResult: { Passed: 0, Failed: 0, Blocked: 0, "Not Executed": 0 },
      byAuthor: {},
      bySubModule: {},
      byCategory: {},
      byVersion: {},
      rawData: [],
      availableFilters: {
        sprints: Array.from(availableSprints).sort(),
        suites: Array.from(availableSuites).sort(),
        versions: Array.from(availableVersions).sort()
      },
      debug: { totalEx: executions.length, totalResultsSeen: 0, projectMatched: 0 }
    };

    const tcCache: Record<string, any> = {};

    executions.forEach((ex: any) => {
      if (!ex || !Array.isArray(ex.results)) return;
      
      const sprint = ex.sprint || "Unknown";
      const suite = ex.suiteName || "Unknown";
      
      // Basic Filters (Date range must be stable)
      const exDate = new Date(ex.lastRun);
      if (fromDate && exDate < new Date(fromDate)) return;
      if (toDate && exDate > new Date(toDate)) return;

      ex.results.forEach((res: any) => {
        if (!res || !res.testCaseId) return;

        if (!tcCache[res.testCaseId]) {
          tcCache[res.testCaseId] = getTestCase(res.testCaseId);
        }
        const tc = tcCache[res.testCaseId];
        
        // Project Isolation (IMPORTANT)
        const tcProject = tc?.project; 
        if (project && tcProject !== project && tcProject !== targetProjectKey) return;

        const isSprintMatch = !sprintFilter || sprint === sprintFilter;
        const isSuiteMatch = !suiteFilter || suite === suiteFilter;
        if (!isSprintMatch || !isSuiteMatch) return;

        // Registry check for project
        if (project && availableSprints.size > 0 && !availableSprints.has(sprint)) return;

        const tcVersions = (tc?.versionNumbers || []) as string[];
        if (versionFilter && !tcVersions.includes(versionFilter)) return;

        if (!stats.bySprint[sprint]) {
           stats.bySprint[sprint] = { Passed: 0, Failed: 0, Blocked: 0, "Not Executed": 0 };
        }
        if (!stats.bySuite[suite]) {
           stats.bySuite[suite] = { Passed: 0, Failed: 0, Blocked: 0, "Not Executed": 0 };
        }

        let status = res.status || "Pending";
        // Normalize
        if (status === "Pass") status = "Passed";
        if (status === "Fail") status = "Failed";
        if (status === "Pending") status = "Not Executed";
        
        // Summary
        stats.summary.total++;
        const sKey = status === "Not Executed" ? "pending" : status.toLowerCase();
        stats.summary[sKey] = (stats.summary[sKey] || 0) + 1;
        
        // Dimensions
        stats.bySprint[sprint][status]++;
        stats.bySuite[suite][status]++;
        if (!stats.byResult[status]) stats.byResult[status] = 0;
        stats.byResult[status]++;

        // Metadata dimension (Author & SubModule & Category)
        const author = tc?.createdBy || "Unknown";
        if (!stats.byAuthor[author]) stats.byAuthor[author] = { Passed: 0, Failed: 0, Blocked: 0, "Not Executed": 0 };
        stats.byAuthor[author][status]++;

        const subModule = tc?.subModule || "Uncategorized";
        if (!stats.bySubModule[subModule]) stats.bySubModule[subModule] = 0;
        stats.bySubModule[subModule]++;

        const category = tc?.testCategory || "Uncategorized";
        if (!stats.byCategory[category]) stats.byCategory[category] = 0;
        stats.byCategory[category]++;

        const vList = tcVersions;
        if (vList.length === 0) {
          if (!stats.byVersion["Unassigned"]) stats.byVersion["Unassigned"] = 0;
          stats.byVersion["Unassigned"]++;
        } else {
          vList.forEach(v => {
            if (!stats.byVersion[v]) stats.byVersion[v] = 0;
            stats.byVersion[v]++;
          });
        }

        // Data for drill down
        stats.rawData.push({
          testCaseId: res.testCaseId,
          title: tc?.title || "Unknown",
          suite,
          sprint,
          subModule,
          category,
          status,
          author,
          executedBy: ex.executedBy,
          date: ex.lastRun
        });
      });
    });

    return NextResponse.json({ success: true, stats });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
