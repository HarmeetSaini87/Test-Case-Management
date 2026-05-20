"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, Check, AlertTriangle, ShieldCheck, 
  Layers, Database, FileSpreadsheet, Eye,
  Search, FilterX, ChevronLeft, ChevronRight, Clock, UserCheck,
  Download, ChevronDown
} from "lucide-react";
import * as XLSX from "xlsx";
import Sidebar from "../../../components/Sidebar";
import TopNav from "../../../components/TopNav";
import { useProject } from "../../../components/ProjectContext";

// --- Export Component ---
function RtmExportDropdown({ stories, epics, testcases, activeProject }: { stories: any[]; epics: any[]; testcases: any[]; activeProject: string }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  const getFileName = (ext: string) => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = pad(d.getDate()) + pad(d.getMonth() + 1) + String(d.getFullYear()).slice(-2);
    const timeStr = pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
    const cleanProjName = String(activeProject || 'Global_All_Context').replace(/[^a-z0-9]/gi, '');
    return `${cleanProjName}_RTM_Matrix_${dateStr}${timeStr}.${ext}`;
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const getLinkedTestcases = (storyId: string) => {
    return testcases.filter(tc => tc.userStories?.some((us: any) => us.id === storyId));
  };

  const isCovered = (storyId: string) => {
    const linked = getLinkedTestcases(storyId);
    return linked.some(tc => ["ACTIVE", "APPROVED", "DRAFT", "REVIEW"].includes(tc.status?.toUpperCase()));
  };

  const exportCSV = () => {
    try {
      if (!stories || stories.length === 0) { alert("Nothing to export!"); return; }
      console.log("📊 Starting RTM CSV Export...");
      const headers = [
        "Epic Key",
        "Epic Name",
        "User Story Key",
        "User Story Title",
        "Story Status",
        "Coverage Status",
        "Linked Test Cases Count",
        "Linked Test Case IDs",
        "Linked Test Case Details (ID: Status)"
      ];

      const rows: any[] = [];
      stories.forEach(story => {
        const parentEpic = epics.find(e => e.id === story.epicId);
        const linked = getLinkedTestcases(story.id);
        const covered = isCovered(story.id);
        
        const linkedIdsStr = linked.map(tc => tc.testCaseId).join("; ");
        const linkedDetailsStr = linked.map(tc => `${tc.testCaseId} (${tc.status || 'Draft'})`).join("; ");

        rows.push([
          parentEpic?.key || "—",
          parentEpic?.name || "—",
          story.key || "—",
          story.title || "—",
          story.status || "DRAFT",
          covered ? "Covered" : "Coverage Gap",
          linked.length,
          linkedIdsStr || "—",
          linkedDetailsStr || "—"
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "RTM Matrix");
      const csvOutput = XLSX.write(wb, { bookType: 'csv', type: 'string' });
      
      const fileName = getFileName('csv');
      const blob = new Blob(["\uFEFF" + csvOutput], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a'); a.href = url; a.download = fileName; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (err: any) {
      console.error("CSV Export Error:", err);
      alert("CSV Export failed: " + (err.message || "Unknown error"));
    }
    setOpen(false);
  };

  const exportExcel = () => {
    try {
      if (!stories || stories.length === 0) { alert("Nothing to export!"); return; }
      console.log("📊 Starting RTM Excel Export...");
      const headers = [
        "Epic Key",
        "Epic Name",
        "User Story Key",
        "User Story Title",
        "Story Status",
        "Coverage Status",
        "Linked Test Cases Count",
        "Linked Test Case IDs",
        "Linked Test Case Details (ID: Status)"
      ];

      const rows: any[] = [];
      stories.forEach(story => {
        const parentEpic = epics.find(e => e.id === story.epicId);
        const linked = getLinkedTestcases(story.id);
        const covered = isCovered(story.id);

        const linkedIdsStr = linked.map(tc => tc.testCaseId).join("; ");
        const linkedDetailsStr = linked.map(tc => `${tc.testCaseId} (${tc.status || 'Draft'})`).join("; ");

        rows.push([
          parentEpic?.key || "—",
          parentEpic?.name || "—",
          story.key || "—",
          story.title || "—",
          story.status || "DRAFT",
          covered ? "Covered" : "Coverage Gap",
          linked.length,
          linkedIdsStr || "—",
          linkedDetailsStr || "—"
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      ws['!cols'] = [
        { wch: 15 }, { wch: 30 }, { wch: 18 }, { wch: 40 }, { wch: 15 }, { wch: 18 }, { wch: 22 }, { wch: 30 }, { wch: 50 }
      ];
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "RTM Traceability Matrix");
      
      const fileName = getFileName('xlsx');
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a'); a.href = url; a.download = fileName; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (err: any) {
      console.error("Excel Export Error:", err);
      alert("Excel Export failed! " + (err.message || "Unknown error"));
    }
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block', marginLeft: 'auto' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="btn-ghost"
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '6px 12px', height: '34px', fontSize: '12px',
          border: '1px solid var(--border-strong)', borderRadius: '8px',
          background: 'var(--bg-surface)', cursor: 'pointer', fontWeight: 600
        }}
      >
        <Download size={14} style={{ color: 'var(--accent-cyan)' }} /> Export <ChevronDown size={12} style={{ opacity: 0.5 }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '105%', right: 0, minWidth: 140,
          background: 'var(--bg-surface)', border: '1px solid var(--border-strong)',
          borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 50,
          overflow: 'hidden', display: 'flex', flexDirection: 'column'
        }}>
          <button 
            onClick={exportCSV} 
            style={{ 
              padding: '8px 14px', background: 'transparent', border: 'none',
              textAlign: 'left', cursor: 'pointer', color: 'var(--text-secondary)',
              fontSize: '12px', width: '100%', transition: 'background 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >📄 CSV</button>
          <button 
            onClick={exportExcel} 
            style={{ 
              padding: '8px 14px', background: 'transparent', border: 'none',
              textAlign: 'left', cursor: 'pointer', color: 'var(--text-secondary)',
              fontSize: '12px', width: '100%', transition: 'background 0.2s',
              borderTop: '1px solid var(--border-base)'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >📊 Excel</button>
        </div>
      )}
    </div>
  );
}

export default function RtmDashboard() {
  const router = useRouter();
  const { id: urlProjectId } = useParams();
  const { activeProject, setActiveProject } = useProject();

  const [epics, setEpics] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [testcases, setTestcases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterEpic, setFilterEpic] = useState("");
  const [filterCoverage, setFilterCoverage] = useState("");
  const [filterStoryStatus, setFilterStoryStatus] = useState("");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Sync route param with global project context
  useEffect(() => {
    if (urlProjectId && activeProject !== urlProjectId) {
      setActiveProject(urlProjectId as string);
    }
  }, [urlProjectId]);

  // Sync changes in the global project selector back to the URL
  useEffect(() => {
    if (activeProject && activeProject !== urlProjectId) {
      router.push(`/projects/${activeProject}/rtm`);
    }
  }, [activeProject, urlProjectId, router]);

  const fetchAll = async () => {
    if (!urlProjectId) return;
    setLoading(true);
    try {
      const [epicsRes, storiesRes, tcRes] = await Promise.all([
        fetch(`/api/rtm/epics?projectId=${urlProjectId}`).then(res => res.json()),
        fetch(`/api/rtm/stories?projectId=${urlProjectId}`).then(res => res.json()),
        fetch(`/api/testcases?project=${urlProjectId}`).then(res => res.json())
      ]);

      if (epicsRes.success) setEpics(epicsRes.epics);
      if (storiesRes.success) setStories(storiesRes.stories);
      if (tcRes.success) setTestcases(tcRes.testCases);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (urlProjectId) {
      fetchAll();
    }
  }, [urlProjectId]);

  // Matrix Engine Logic
  const getLinkedTestcases = (storyId: string) => {
    return testcases.filter(tc => tc.userStories?.some((us: any) => us.id === storyId));
  };

  const isCovered = (storyId: string) => {
    const linked = getLinkedTestcases(storyId);
    return linked.some(tc => ["ACTIVE", "APPROVED", "DRAFT", "REVIEW"].includes(tc.status?.toUpperCase()));
  };

  // Metrics Engine
  const activeStories = stories.filter(s => s.status !== "ARCHIVED");
  const coveredStories = activeStories.filter(s => isCovered(s.id)).length;
  const uncoveredStories = activeStories.length - coveredStories;
  const coveragePercent = activeStories.length > 0 ? Math.round((coveredStories / activeStories.length) * 100) : 0;

  // Filter Engine
  const filteredStories = stories.filter(story => {
    // 1. Epic filter
    if (filterEpic && story.epicId !== filterEpic) return false;

    // 2. Story status filter
    if (filterStoryStatus && story.status?.toUpperCase() !== filterStoryStatus.toUpperCase()) return false;

    // 3. Coverage filter
    const covered = isCovered(story.id);
    if (filterCoverage === "covered" && !covered) return false;
    if (filterCoverage === "gap" && covered) return false;

    // 4. Search query (matches Epic Key/Name, Story Key/Title, or Linked Test Case ID)
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const parentEpic = epics.find(e => e.id === story.epicId);
      const linkedTcs = getLinkedTestcases(story.id);
      
      const epicMatch = parentEpic && (parentEpic.key?.toLowerCase().includes(q) || parentEpic.name?.toLowerCase().includes(q));
      const storyMatch = story.key?.toLowerCase().includes(q) || story.title?.toLowerCase().includes(q);
      const tcMatch = linkedTcs.some(tc => tc.testCaseId?.toLowerCase().includes(q));

      if (!epicMatch && !storyMatch && !tcMatch) return false;
    }

    return true;
  });

  // Pagination Calculations
  const totalStories = filteredStories.length;
  const totalPages = Math.ceil(totalStories / rowsPerPage) || 1;
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredStories.slice(indexOfFirstRow, indexOfLastRow);

  // Auto-reset page to 1 if any filter or query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterEpic, filterCoverage, filterStoryStatus, rowsPerPage]);

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg-base)", overflow: "hidden" }}>
      <Sidebar />

      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        <TopNav />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          
          <header className="page-header" style={{ padding: "0 28px" }}>
            <div>
              <Link href="/testcases" className="btn-ghost" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 8px", fontSize: 12 }}>
                <ArrowLeft size={14} /> Back to Repository
              </Link>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
              <h1 className="page-title" style={{ fontSize: "15px", margin: 0 }}>Requirements Traceability Matrix (RTM)</h1>
              <span className="badge badge-cyan" style={{ fontSize: "10px", padding: "2px 8px" }}>{urlProjectId}</span>
            </div>

            {/* Metrics cards inside header zone */}
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-base)", borderRadius: 10, padding: "6px 14px", textAlign: "center", minWidth: 90 }}>
                <div style={{ fontSize: 8, fontWeight: 800, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.05em" }}>Coverage</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: coveragePercent === 100 ? "var(--accent-green)" : coveragePercent >= 80 ? "var(--accent-cyan)" : "var(--accent-red)", marginTop: 1 }}>
                  {coveragePercent}%
                </div>
              </div>
              <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-base)", borderRadius: 10, padding: "6px 14px", textAlign: "center", minWidth: 110 }}>
                <div style={{ fontSize: 8, fontWeight: 800, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.05em" }}>Catalog</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", marginTop: 1 }}>
                  {epics.length} <span style={{ color: "var(--text-disabled)", fontWeight: "normal", fontSize: 10 }}>epics</span> / {activeStories.length} <span style={{ color: "var(--text-disabled)", fontWeight: "normal", fontSize: 10 }}>stories</span>
                </div>
              </div>
              <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-base)", borderRadius: 10, padding: "6px 14px", textAlign: "center", minWidth: 80 }}>
                <div style={{ fontSize: 8, fontWeight: 800, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.05em" }}>Gaps</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: uncoveredStories > 0 ? "var(--accent-orange)" : "var(--accent-green)", marginTop: 1 }}>
                  {uncoveredStories}
                </div>
              </div>
            </div>
          </header>

          {/* Premium Filter & Search Bar */}
          <div className="filter-bar" style={{ gap: "12px", padding: "12px 28px" }}>
            <div className="search-input-wrap" style={{ flex: "1", minWidth: "200px", maxWidth: "300px" }}>
              <Search size={13} />
              <input
                type="text"
                className="search-input"
                style={{ width: "100%", height: "34px" }}
                placeholder="Search Epic, Story, TC ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <select
              className="filter-select"
              value={filterEpic}
              onChange={e => setFilterEpic(e.target.value)}
              style={{ minWidth: "140px", height: "34px" }}
            >
              <option value="">All Epics</option>
              {epics.map(epic => (
                <option key={epic.id} value={epic.id}>
                  {epic.key}
                </option>
              ))}
            </select>

            <select
              className="filter-select"
              value={filterStoryStatus}
              onChange={e => setFilterStoryStatus(e.target.value)}
              style={{ minWidth: "140px", height: "34px" }}
            >
              <option value="">All Story Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="DRAFT">Draft</option>
              <option value="ARCHIVED">Archived</option>
              <option value="DEPRECATED">Deprecated</option>
            </select>

            <select
              className="filter-select"
              value={filterCoverage}
              onChange={e => setFilterCoverage(e.target.value)}
              style={{ minWidth: "150px", height: "34px" }}
            >
              <option value="">All Coverage Statuses</option>
              <option value="covered">Covered</option>
              <option value="gap">Coverage Gap</option>
            </select>

            {(searchQuery || filterEpic || filterStoryStatus || filterCoverage) && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilterEpic("");
                  setFilterStoryStatus("");
                  setFilterCoverage("");
                }}
                className="btn-ghost"
                style={{ padding: "6px 12px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px", height: "34px" }}
              >
                <FilterX size={12} /> Clear
              </button>
            )}

            <RtmExportDropdown 
              stories={filteredStories} 
              epics={epics} 
              testcases={testcases} 
              activeProject={activeProject} 
            />

            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              {filteredStories.length} / {stories.length} stories
            </span>
          </div>

          {/* Grid/Table Body */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px" }}>
            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "40vh" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid var(--border-strong)", borderTopColor: "var(--accent-cyan)", animation: "spin 1s linear infinite" }}></div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : epics.length === 0 ? (
              <div className="empty-state" style={{ marginTop: 40 }}>
                <ShieldCheck size={48} style={{ color: "var(--text-muted)", opacity: 0.5, marginBottom: 16 }} />
                <h3>No Requirements Mapped</h3>
                <p>Ensure you configure your Epics and User Stories in the Requirements Catalog to view the RTM Matrix.</p>
                <Link href={`/projects/${urlProjectId}/requirements`} className="btn-primary" style={{ marginTop: 12 }}>
                  Go to Catalog
                </Link>
              </div>
            ) : currentRows.length === 0 ? (
              <div className="empty-state" style={{ marginTop: 40 }}>
                <AlertTriangle size={48} style={{ color: "var(--text-muted)", opacity: 0.5, marginBottom: 16 }} />
                <h3>No Stories Found</h3>
                <p>No User Stories match the active search queries and filter selections.</p>
              </div>
            ) : (
              <div className="section-card" style={{ padding: 0, overflow: "hidden" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: "25%", padding: "14px 20px" }}>Epic</th>
                      <th style={{ width: "30%", padding: "14px 20px" }}>User Story</th>
                      <th style={{ width: "10%", padding: "14px 20px" }}>Story Status</th>
                      <th style={{ width: "25%", padding: "14px 20px" }}>Linked Test Cases</th>
                      <th style={{ width: "10%", textAlign: "center", padding: "14px 20px" }}>Coverage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRows.map(story => {
                      const parentEpic = epics.find(e => e.id === story.epicId);
                      const covered = isCovered(story.id);
                      const linkedTc = getLinkedTestcases(story.id);
                      
                      // Resolve last modified TC for audit tracking metadata
                      const lastTc = linkedTc[linkedTc.length - 1];

                      // Status styles
                      const storyStatusUpper = story.status?.toUpperCase() || "DRAFT";
                      const storyStatusBadge = 
                        storyStatusUpper === "ACTIVE" ? "badge-green" : 
                        storyStatusUpper === "DRAFT" ? "badge-yellow" : 
                        storyStatusUpper === "ARCHIVED" ? "badge-gray" : "badge-red";

                      return (
                        <tr key={story.id} style={{ 
                          background: covered ? undefined : "rgba(var(--accent-red-rgb, 239, 68, 68), 0.02)",
                          transition: "background 0.2s"
                        }}>
                          {/* Epic Cell */}
                          <td style={{ verticalAlign: "top", padding: "16px 20px" }}>
                            {parentEpic ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--accent-cyan)" }}>{parentEpic.key}</span>
                                <span style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)", lineHeight: 1.4 }}>{parentEpic.name}</span>
                              </div>
                            ) : (
                              <span style={{ color: "var(--text-disabled)", fontSize: 12 }}>— No Epic linked —</span>
                            )}
                          </td>
                          
                          {/* Story Cell */}
                          <td style={{ verticalAlign: "top", padding: "16px 20px" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--text-muted)" }}>{story.key}</span>
                              <span style={{ 
                                fontWeight: 600, 
                                fontSize: 13, 
                                color: covered ? "var(--text-secondary)" : "var(--accent-orange)"
                              }}>{story.title}</span>
                            </div>
                          </td>

                          {/* Story Status */}
                          <td style={{ verticalAlign: "top", padding: "16px 20px" }}>
                            <span className={`badge ${storyStatusBadge}`} style={{ fontSize: "10px" }}>
                              {storyStatusUpper}
                            </span>
                          </td>
                          
                          {/* Linked Test Cases */}
                          <td style={{ verticalAlign: "top", padding: "16px 20px" }}>
                            {linkedTc.length > 0 ? (
                              <div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                  {linkedTc.map(tc => {
                                    const isPassing = ["ACTIVE", "APPROVED", "DRAFT", "REVIEW"].includes(tc.status?.toUpperCase());
                                    return (
                                      <Link key={tc.testCaseId} href={`/testcases/${tc.testCaseId}/edit`} style={{ textDecoration: "none" }}>
                                        <span style={{ 
                                          display: "inline-flex", 
                                          alignItems: "center", 
                                          gap: 6,
                                          padding: "4px 8px", 
                                          fontSize: 11,
                                          fontFamily: "var(--font-mono)",
                                          fontWeight: 700,
                                          background: "var(--bg-input)", 
                                          border: "1px solid var(--border-strong)", 
                                          borderRadius: 6,
                                          color: "var(--text-secondary)",
                                          cursor: "pointer",
                                          transition: "all 0.15s"
                                        }}
                                        onMouseEnter={e => {
                                          e.currentTarget.style.borderColor = "var(--accent-cyan)";
                                          e.currentTarget.style.color = "var(--text-primary)";
                                        }}
                                        onMouseLeave={e => {
                                          e.currentTarget.style.borderColor = "var(--border-strong)";
                                          e.currentTarget.style.color = "var(--text-secondary)";
                                        }}
                                        >
                                          {tc.testCaseId}
                                          <span style={{ 
                                            width: 6, 
                                            height: 6, 
                                            borderRadius: "50%", 
                                            background: isPassing ? "var(--accent-green)" : "var(--accent-orange)"
                                          }}></span>
                                        </span>
                                      </Link>
                                    );
                                  })}
                                </div>
                                {lastTc && (
                                  <div style={{ fontSize: "9px", color: "var(--text-muted)", marginTop: "6px", display: "flex", alignItems: "center", gap: "4px" }}>
                                    <Clock size={9} />
                                    <span>TCs updated by <strong>{lastTc.updatedBy || lastTc.createdBy || "admin"}</strong> on {new Date(lastTc.updatedDate || lastTc.createdDate).toLocaleDateString()}</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span style={{ 
                                display: "inline-flex", 
                                alignItems: "center", 
                                gap: 6, 
                                fontSize: 11,
                                fontWeight: 700,
                                color: "var(--accent-orange)"
                              }}>
                                <AlertTriangle size={12} />
                                <span>Coverage Gap</span>
                              </span>
                            )}
                          </td>
                          
                          {/* Coverage Badge */}
                          <td style={{ verticalAlign: "middle", textAlign: "center", padding: "16px 20px" }}>
                            {covered ? (
                              <span className="badge badge-green" style={{ fontSize: "10px" }}>
                                Covered
                              </span>
                            ) : (
                              <span className="badge badge-orange" style={{ fontSize: "10px", animation: "pulse 2s infinite" }}>
                                Gap
                              </span>
                            )}
                            <style>{`
                              @keyframes pulse {
                                  0%, 100% { opacity: 1; }
                                  50% { opacity: 0.55; }
                              }
                            `}</style>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Paginated Footer */}
          {!loading && currentRows.length > 0 && (
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 28px",
              borderTop: "1px solid var(--border-base)",
              background: "var(--bg-base)",
              flexShrink: 0
            }}>
              <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                Showing <strong>{totalStories > 0 ? indexOfFirstRow + 1 : 0}</strong> to <strong>{Math.min(indexOfLastRow, totalStories)}</strong> of <strong>{totalStories}</strong> stories
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                {/* Rows per page selector */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Rows per page:</span>
                  <select
                    className="filter-select"
                    value={rowsPerPage}
                    onChange={e => setRowsPerPage(Number(e.target.value))}
                    style={{ padding: "4px 8px", height: "30px", fontSize: "11px" }}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                {/* Navigation buttons */}
                <div style={{ display: "flex", gap: "4px" }}>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="btn-ghost"
                    style={{ padding: "4px 10px", fontSize: "11px", opacity: currentPage === 1 ? 0.4 : 1, cursor: currentPage === 1 ? "not-allowed" : "pointer", height: "30px" }}
                  >
                    <ChevronLeft size={13} style={{ marginRight: 2 }} /> Prev
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className="btn-ghost"
                      style={{
                        padding: "4px 10px",
                        fontSize: "11px",
                        background: currentPage === page ? "rgba(6,182,212,0.12)" : undefined,
                        borderColor: currentPage === page ? "var(--accent-cyan)" : undefined,
                        color: currentPage === page ? "var(--accent-cyan)" : undefined,
                        fontWeight: currentPage === page ? "bold" : "normal",
                        height: "30px"
                      }}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="btn-ghost"
                    style={{ padding: "4px 10px", fontSize: "11px", opacity: currentPage === totalPages ? 0.4 : 1, cursor: currentPage === totalPages ? "not-allowed" : "pointer", height: "30px" }}
                  >
                    Next <ChevronRight size={13} style={{ marginLeft: 2 }} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
