"use client";
import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, ShieldCheck, Settings, LogOut, FolderOpen, Layers,
  Calendar, Plus, Trash2, PlayCircle, X, CheckCircle2, XCircle, Ban,
  MessageSquare, Paperclip, ChevronLeft, Clock, Search, UserCheck,
  AlertTriangle, FilterX, Eye, FileText, Download
} from "lucide-react";
import Link from "next/link";

function NavItem({ icon, label, active = false, href = "#", onClick }: any) {
  if (onClick) return (
    <button onClick={onClick} className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left text-white/60 hover:bg-white/5 hover:text-red-400 transition-all">
      {icon}<span className="font-medium">{label}</span>
    </button>
  );
  return (
    <Link href={href} className={`flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left transition-all ${active ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-400 border border-blue-500/30' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}>
      {icon}<span className="font-medium">{label}</span>
    </Link>
  );
}

const STATUS_CFG: any = {
  Pass:    { badge: 'bg-green-500/20 text-green-400 border border-green-500/30',  icon: <CheckCircle2 size={12} />, btn: 'bg-green-500/20 text-green-400 border-green-500/40 hover:bg-green-500/30' },
  Fail:    { badge: 'bg-red-500/20 text-red-400 border border-red-500/30',        icon: <XCircle size={12} />,     btn: 'bg-red-500/20 text-red-400 border-red-500/40 hover:bg-red-500/30' },
  Blocked: { badge: 'bg-orange-500/20 text-orange-400 border border-orange-500/30', icon: <Ban size={12} />,       btn: 'bg-orange-500/20 text-orange-400 border-orange-500/40 hover:bg-orange-500/30' },
  Pending: { badge: 'bg-white/5 text-white/40 border border-white/10',            icon: <Clock size={12} />,       btn: 'bg-white/5 text-white/30 border-white/10 hover:bg-white/10' },
};

const PRIORITY_COLOR: any = {
  Highest: 'text-red-400', High: 'text-orange-400', Medium: 'text-blue-400', Low: 'text-gray-400',
};

export default function SuitesPage() {
  const [suites, setSuites] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState("admin");
  const [allTestCases, setAllTestCases] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // Execution Run State
  const [runSuite, setRunSuite] = useState<any | null>(null);
  const [results, setResults] = useState<Record<string, { status: string; comment: string }>>({});
  const [saving, setSaving] = useState(false);

  // Filter state for execution table
  const [tcSearch, setTcSearch] = useState("");
  const [filterExecStatus, setFilterExecStatus] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");

  // Expand detail row
  const [expandedTcId, setExpandedTcId] = useState<string | null>(null);

  // Attachments per TC (keyed by tcId) within this execution
  const [tcAttachments, setTcAttachments] = useState<Record<string, any[]>>({});
  const [uploadingTcId, setUploadingTcId] = useState<string | null>(null);

  // Bulk Selection
  const [selectedRunTCs, setSelectedRunTCs] = useState<string[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTester, setAssignTester] = useState("");
  const [showReportMenu, setShowReportMenu] = useState(false);

  useEffect(() => {
    fetch("/api/suites").then(r => r.json()).then(d => { if (d.success) setSuites(d.suites); });
    fetch("/api/testcases").then(r => r.json()).then(d => { if (d.success) setAllTestCases(d.testCases); });
    fetch("/api/auth/users").then(r => r.json()).then(d => { if (d.success) setUsers(d.users); });
    fetch("/api/auth/users?me=true").then(r => r.json()).then(d => {
      if (d.success) { setUserRole(d.user?.role); setCurrentUser(d.user?.username || "admin"); }
    });
  }, []);

  const openRun = async (suite: any) => {
    setRunSuite(suite);
    setTcSearch(""); setFilterExecStatus(""); setFilterAssignee(""); setExpandedTcId(null);
    const res = await fetch(`/api/executions?suiteId=${suite.id}`);
    const data = await res.json();
    const existing = data.executions?.[0];
    if (existing?.results) {
      const map: Record<string, { status: string; comment: string }> = {};
      existing.results.forEach((r: any) => { map[r.testCaseId] = { status: r.status, comment: r.comment || "" }; });
      setResults(map);
    } else {
      const map: Record<string, { status: string; comment: string }> = {};
      suite.testCaseIds?.forEach((id: string) => { map[id] = { status: "Pending", comment: "" }; });
      setResults(map);
    }

    // Pre-load existing attachments for all TCs in this suite
    const attMap: Record<string, any[]> = {};
    await Promise.all((suite.testCaseIds || []).map(async (tcId: string) => {
      const refId = `exec_${suite.id}_${tcId}`;
      const ar = await fetch(`/api/attachments?refId=${refId}`).then(r => r.json());
      if (ar.success && ar.attachments.length > 0) attMap[tcId] = ar.attachments;
    }));
    setTcAttachments(attMap);

  };

  const closeRun = () => { setRunSuite(null); setResults({}); setTcAttachments({}); setSelectedRunTCs([]); };

  const setStatus = (tcId: string, status: string) =>
    setResults(prev => ({ ...prev, [tcId]: { ...prev[tcId], status: prev[tcId]?.status === status ? "Pending" : status } }));
  const setComment = (tcId: string, comment: string) =>
    setResults(prev => ({ ...prev, [tcId]: { ...prev[tcId], comment } }));

  const saveRun = async () => {
    setSaving(true);
    await fetch("/api/executions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        suiteId: runSuite.id, suiteName: runSuite.name, sprint: runSuite.sprint, executedBy: currentUser,
        results: Object.entries(results).map(([testCaseId, r]) => ({ testCaseId, ...r })),
      })
    });
    setSaving(false);
    alert("✅ Execution results saved successfully!");
  };

  const removeFromSuite = async (tcId: string) => {
    if (!confirm(`Remove ${tcId} from this suite? It will remain in the Test Repository.`)) return;
    const res = await fetch("/api/suites", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suiteId: runSuite.id, removeTcId: tcId })
    });
    if ((await res.json()).success) {
      const updated = { ...runSuite, testCaseIds: runSuite.testCaseIds.filter((id: string) => id !== tcId) };
      setRunSuite(updated);
      setSuites(prev => prev.map(s => s.id === runSuite.id ? updated : s));
      setResults(prev => { const n = { ...prev }; delete n[tcId]; return n; });
      setTcAttachments(prev => { const n = { ...prev }; delete n[tcId]; return n; });
      setSelectedRunTCs(prev => prev.filter(id => id !== tcId));
    }
  };

  const handleBulkRemoveFromSuite = async () => {
    if (!selectedRunTCs.length) return;
    if (!confirm(`Remove ${selectedRunTCs.length} test case(s) from this suite?`)) return;
    
    const res = await fetch("/api/suites", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suiteId: runSuite.id, removeTcIds: selectedRunTCs })
    });
    if ((await res.json()).success) {
      const updated = { ...runSuite, testCaseIds: runSuite.testCaseIds.filter((id: string) => !selectedRunTCs.includes(id)) };
      setRunSuite(updated);
      setSuites(prev => prev.map(s => s.id === runSuite.id ? updated : s));
      setResults(prev => { const n = { ...prev }; selectedRunTCs.forEach(id => delete n[id]); return n; });
      setTcAttachments(prev => { const n = { ...prev }; selectedRunTCs.forEach(id => delete n[id]); return n; });
      setSelectedRunTCs([]);
    }
  };

  const handleBulkAssign = async () => {
    if (!assignTester) return alert("Select a tester");
    const res = await fetch("/api/testcases/assign", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ testCaseIds: selectedRunTCs, assignedTester: assignTester, updatedBy: currentUser })
    });
    const data = await res.json();
    if (data.success) {
      setAllTestCases(prev => prev.map(tc => selectedRunTCs.includes(tc.testCaseId) ? { ...tc, assignedTester: assignTester } : tc));
      setSelectedRunTCs([]);
      setShowAssignModal(false);
      setAssignTester("");
    }
  };

  const handleSingleAssign = async (tcId: string, tester: string) => {
    const res = await fetch("/api/testcases/assign", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ testCaseIds: [tcId], assignedTester: tester, updatedBy: currentUser })
    });
    if ((await res.json()).success) {
      setAllTestCases(prev => prev.map(tc => tc.testCaseId === tcId ? { ...tc, assignedTester: tester } : tc));
    }
  };

  const handleBulkStatus = (status: string) => {
    setResults(prev => {
      const next = { ...prev };
      selectedRunTCs.forEach(id => { next[id] = { ...next[id], status }; });
      return next;
    });
    setSelectedRunTCs([]);
  };

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedRunTCs(e.target.checked ? filteredTCs.map(t => t.testCaseId) : []);
  };

  const handleTcUpload = async (tcId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingTcId(tcId);
    const refId = `exec_${runSuite.id}_${tcId}`;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("refId", refId);
    fd.append("refType", "execution");
    fd.append("uploadedBy", currentUser);
    const res = await fetch("/api/attachments", { method: "POST", body: fd });
    const data = await res.json();
    if (data.success) {
      setTcAttachments(prev => ({ ...prev, [tcId]: [...(prev[tcId] || []), data.attachment] }));
    }
    setUploadingTcId(null);
    e.target.value = "";
  };

  const deleteTcAttachment = async (tcId: string, attId: string) => {
    await fetch("/api/attachments", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: attId }) });
    setTcAttachments(prev => ({ ...prev, [tcId]: (prev[tcId] || []).filter(a => a.id !== attId) }));
  };

  const del = async (id: string) => {
    if (!confirm("Delete this suite? Test cases will remain in the Repository.")) return;
    await fetch("/api/suites", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setSuites(s => s.filter(x => x.id !== id));
  };

  // All TCs for current suite
  const suiteTCs = useMemo(() =>
    runSuite ? allTestCases.filter(tc => runSuite.testCaseIds?.includes(tc.testCaseId)) : [],
  [runSuite, allTestCases]);

  // Unique assignees for filter dropdown
  const assignees = useMemo(() => [...new Set(suiteTCs.map(tc => tc.assignedTester).filter(Boolean))], [suiteTCs]);

  // Filtered + searched TCs
  const filteredTCs = useMemo(() => suiteTCs.filter(tc => {
    const r = results[tc.testCaseId];
    if (tcSearch && !tc.testCaseId.toLowerCase().includes(tcSearch.toLowerCase()) && !tc.title?.toLowerCase().includes(tcSearch.toLowerCase())) return false;
    if (filterExecStatus && r?.status !== filterExecStatus) return false;
    if (filterAssignee && tc.assignedTester !== filterAssignee) return false;
    return true;
  }), [suiteTCs, results, tcSearch, filterExecStatus, filterAssignee]);

  const runStats = runSuite ? {
    total: runSuite.testCaseIds?.length || 0,
    pass: Object.values(results).filter((r: any) => r.status === "Pass").length,
    fail: Object.values(results).filter((r: any) => r.status === "Fail").length,
    blocked: Object.values(results).filter((r: any) => r.status === "Blocked").length,
    pending: Object.values(results).filter((r: any) => r.status === "Pending").length,
  } : null;

  const filtersActive = !!(tcSearch || filterExecStatus || filterAssignee);

  return (
    <div className="flex h-screen bg-[#050511] text-[#ededed] font-sans">
      {/* Sidebar */}
      <aside className="w-64 glass-panel border-r border-white/10 hidden md:flex flex-col flex-shrink-0">
        <div className="h-20 flex items-center px-8 border-b border-white/10">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Panamax Logo" className="h-8 w-auto rounded-lg" />
            <span className="text-xl font-bold tracking-wider text-gradient">PANAMAX</span>
          </div>
        </div>
        <nav className="flex-1 py-8 px-4 flex flex-col gap-2">
          <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" href="/" />
          <NavItem icon={<FolderOpen size={20} />} label="Projects" href="/projects" />
          <NavItem icon={<ShieldCheck size={20} />} label="Test Repository" href="/testcases" />
          <NavItem icon={<Layers size={20} />} label="Test Suites" active href="/suites" />
          <NavItem icon={<Calendar size={20} />} label="Sprints" href="/sprints" />
        </nav>
        <div className="p-4 mt-auto flex flex-col gap-2">
          {userRole === 'admin' && <NavItem icon={<Settings size={20} />} label="Admin Ops" href="/admin" />}
          <NavItem icon={<LogOut size={20} />} label="Logout" onClick={async () => { await fetch('/api/auth/login', { method: 'DELETE' }); window.location.href = '/login'; }} />
        </div>
      </aside>

      {/* Assign Tester Modal */}
      <AnimatePresence>
        {showAssignModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-[#0a0a1a] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
              <div className="p-5 border-b border-white/10 bg-gradient-to-r from-blue-600/10 to-purple-600/10 flex justify-between items-center">
                <h2 className="font-bold text-white flex items-center gap-2"><UserCheck size={18} className="text-blue-400" /> Bulk Assign</h2>
                <button onClick={() => setShowAssignModal(false)} className="p-1.5 hover:bg-white/10 rounded-lg text-white/40"><X size={18} /></button>
              </div>
              <div className="p-6 flex flex-col gap-4">
                <p className="text-xs text-white/40">Assigning tester to <strong className="text-white">{selectedRunTCs.length}</strong> test case(s)</p>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/40 mb-2">Select Tester</label>
                  <select value={assignTester} onChange={e => setAssignTester(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition appearance-none">
                    <option value="">— Choose a team member —</option>
                    {users.map((u: any) => <option key={u.username} value={u.username}>{u.username} ({u.role})</option>)}
                  </select>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { setShowAssignModal(false); setAssignTester(""); }} className="flex-1 py-2.5 rounded-xl glass-panel border border-white/10 text-white/60 font-semibold hover:bg-white/5">Cancel</button>
                  <button onClick={handleBulkAssign} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold shadow-lg hover:opacity-90 transition">Assign</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden">
        {/* Suite Cards */}
        <div className={`flex flex-col transition-all duration-300 ${runSuite ? 'w-0 overflow-hidden opacity-0 pointer-events-none' : 'flex-1'}`}>
          <header className="h-20 glass-panel border-b border-white/10 flex items-center justify-between px-8 z-10 flex-shrink-0">
            <h1 className="text-2xl font-semibold">Test Suites</h1>
            <Link href="/testcases" className="px-5 py-2.5 rounded-xl border border-white/10 text-white/60 hover:text-white flex items-center gap-2 font-medium hover:bg-white/5 transition">
              <Plus size={18} /> Add from Repository
            </Link>
          </header>
          <div className="flex-1 overflow-y-auto p-8">
            {suites.length === 0 ? (
              <div className="text-center mt-24 flex flex-col items-center">
                <Layers size={64} className="text-white/20 mb-4" />
                <h2 className="text-2xl font-bold mb-2 text-white/80">No Test Suites Yet</h2>
                <p className="text-white/40 max-w-sm mb-6">Go to the Test Repository, select test cases, and use "Add to Test Suite".</p>
                <Link href="/testcases" className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 font-semibold hover:opacity-90 transition shadow-lg">Go to Repository</Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {suites.map((s: any) => (
                  <motion.div key={s.id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                    className="glass-panel group p-6 rounded-2xl border border-white/10 hover:border-blue-500/30 transition shadow-xl flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition truncate">{s.name}</h3>
                        {s.description && <p className="text-xs text-white/40 mt-1 line-clamp-2">{s.description}</p>}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {s.sprint && <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">🏃 {s.sprint}</span>}
                          {s.project && <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-white/5 text-white/40 border border-white/10">{s.project}</span>}
                        </div>
                      </div>
                      <button onClick={() => del(s.id)} className="p-2 text-red-400/30 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-white">{s.testCaseIds?.length || 0}</span>
                        <span className="text-xs text-white/30 uppercase tracking-wider">Test Cases</span>
                      </div>
                      <button onClick={() => openRun(s)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl font-bold hover:opacity-90 transition shadow-lg text-sm">
                        <PlayCircle size={16} /> Run Suite
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Execution Run Panel */}
        <AnimatePresence>
          {runSuite && (
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="flex-1 flex flex-col bg-[#050511] relative">

              {/* Run Header */}
              <header className="h-20 glass-panel border-b border-white/10 flex items-center gap-4 px-6 flex-shrink-0 relative z-[99]">
                <button onClick={closeRun} className="p-2 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition">
                  <ChevronLeft size={22} />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-white/40 font-mono uppercase tracking-wider">{runSuite.sprint && `Sprint: ${runSuite.sprint}`}{runSuite.project && ` · ${runSuite.project}`}</p>
                  <h1 className="text-xl font-bold text-white truncate">{runSuite.name}</h1>
                </div>
                {runStats && (
                  <div className="hidden md:flex items-center gap-2">
                    {[['Pending', runStats.pending, 'bg-white/5 text-white/40 border-white/10'],
                      ['Pass', runStats.pass, 'bg-green-500/10 text-green-400 border-green-500/20'],
                      ['Fail', runStats.fail, 'bg-red-500/10 text-red-400 border-red-500/20'],
                      ['Blocked', runStats.blocked, 'bg-orange-500/10 text-orange-400 border-orange-500/20']
                    ].map(([label, count, cls]: any) => (
                      <span key={label} className={`flex items-center gap-1 text-xs px-3 py-1 rounded-full border ${cls}`}>
                        {STATUS_CFG[label]?.icon} {count}
                      </span>
                    ))}
                  </div>
                )}
                {runStats && (
                  <div className="relative">
                    <button onClick={() => setShowReportMenu(!showReportMenu)}
                      className="px-5 py-2.5 rounded-xl border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition flex items-center gap-2 font-bold text-sm bg-blue-600/5 group">
                      <FileText size={16} className="text-blue-400 group-hover:text-blue-300" /> Export Report
                    </button>
                    <AnimatePresence>
                      {showReportMenu && (
                        <>
                          <div className="fixed inset-0 z-[9990]" onClick={() => setShowReportMenu(false)} />
                          <motion.div 
                            initial={{ opacity: 0, y: 5, scale: 0.98 }} 
                            animate={{ opacity: 1, y: 0, scale: 1 }} 
                            exit={{ opacity: 0, y: 5, scale: 0.98 }}
                            className="absolute right-0 top-full mt-2 w-56 bg-[#0a0a20] border border-white/15 rounded-2xl overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.8)] z-[9999] py-1.5 backdrop-blur-3xl"
                          >
                            <a href={`/api/reports/execution?suiteId=${runSuite.id}&format=html`} target="_blank" onClick={() => setShowReportMenu(false)}
                              className="w-full px-4 py-3.5 text-left text-sm text-white/70 hover:text-white hover:bg-white/10 flex items-center gap-3 transition">
                              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 font-black text-[10px]">WEB</div>
                              <span className="font-bold">Summary Report</span>
                            </a>
                            <div className="h-px bg-white/5 mx-2" />
                            <a href={`/api/reports/execution?suiteId=${runSuite.id}&format=pdf`} target="_blank" onClick={() => setShowReportMenu(false)}
                              className="w-full px-4 py-3.5 text-left text-sm text-white/70 hover:text-white hover:bg-white/10 flex items-center gap-3 transition">
                              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400"><Download size={14} /></div>
                              <span className="font-bold">Download PDF</span>
                            </a>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                )}
                <button onClick={saveRun} disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 font-bold text-sm hover:opacity-90 transition shadow-lg disabled:opacity-50 whitespace-nowrap">
                  {saving ? "Saving..." : "💾 Save Results"}
                </button>
              </header>

              {/* Progress Bar */}
              {runStats && runStats.total > 0 && (
                <div className="h-1 bg-white/5 flex-shrink-0 flex">
                  <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${(runStats.pass / runStats.total) * 100}%` }} />
                  <div className="h-full bg-red-500 transition-all duration-500" style={{ width: `${(runStats.fail / runStats.total) * 100}%` }} />
                  <div className="h-full bg-orange-500 transition-all duration-500" style={{ width: `${(runStats.blocked / runStats.total) * 100}%` }} />
                </div>
              )}

              {/* Filter Bar */}
              <div className="px-6 py-3 border-b border-white/8 bg-[#080816] flex flex-wrap items-center gap-3 flex-shrink-0">
                {/* TC ID / Title search */}
                <div className="relative flex-1 min-w-48">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type="text"
                    value={tcSearch}
                    onChange={e => setTcSearch(e.target.value)}
                    placeholder="Search by TC No or title..."
                    className="w-full bg-black/40 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
                {/* Execution Status */}
                <select value={filterExecStatus} onChange={e => setFilterExecStatus(e.target.value)}
                  className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition appearance-none min-w-36">
                  <option value="">All Statuses</option>
                  <option value="Pending">⏳ Pending</option>
                  <option value="Pass">✅ Pass</option>
                  <option value="Fail">❌ Fail</option>
                  <option value="Blocked">⊘ Blocked</option>
                </select>
                {/* Assignee */}
                <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}
                  className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition appearance-none min-w-40">
                  <option value="">All Assignees</option>
                  {assignees.map((a: any) => <option key={a} value={a}>{a}</option>)}
                  {assignees.length === 0 && <option disabled>No assignees yet</option>}
                </select>
                {/* Clear */}
                {filtersActive && (
                  <button onClick={() => { setTcSearch(""); setFilterExecStatus(""); setFilterAssignee(""); }}
                    className="flex items-center gap-1.5 text-xs text-white/40 hover:text-red-400 transition px-3 py-2 border border-white/10 rounded-lg hover:border-red-400/30">
                    <FilterX size={13} /> Clear
                  </button>
                )}
                <span className="text-xs text-white/30 ml-auto">{filteredTCs.length} / {suiteTCs.length} TCs</span>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto relative">
                <AnimatePresence>
                  {selectedRunTCs.length > 0 && (
                    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
                      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 glass-panel border border-blue-500/30 rounded-full px-6 py-3 flex items-center gap-4 shadow-2xl bg-[#1a1a2e]/90 backdrop-blur-md">
                      <span className="text-white font-bold text-sm bg-blue-500/20 px-3 py-1 rounded-full">{selectedRunTCs.length} Selected</span>
                      <div className="h-6 w-px bg-white/20" />
                      
                      <div className="flex items-center gap-2">
                        {["Pass", "Fail", "Blocked"].map(s => (
                          <button key={s} onClick={() => handleBulkStatus(s)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${STATUS_CFG[s].btn}`}>
                            Mark {s}
                          </button>
                        ))}
                      </div>

                      <div className="h-6 w-px bg-white/20" />
                      
                      <button onClick={() => setShowAssignModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 border border-white/10 hover:bg-white/10 transition">
                        <UserCheck size={14} /> Assign
                      </button>
                      <button onClick={handleBulkRemoveFromSuite} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition">
                        <Trash2 size={14} /> Remove
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {suiteTCs.length === 0 ? (
                  <div className="text-center mt-20">
                    <AlertTriangle size={40} className="mx-auto text-yellow-400/40 mb-3" />
                    <p className="text-white/40">No test cases found in this suite.</p>
                  </div>
                ) : filteredTCs.length === 0 ? (
                  <div className="text-center mt-16">
                    <FilterX size={36} className="mx-auto text-white/20 mb-3" />
                    <p className="text-white/30">No results match the current filters.</p>
                  </div>
                ) : (
                  <table className="w-full text-sm border-collapse">
                    <thead className="sticky top-0 z-10 bg-[#080816] border-b border-white/10">
                      <tr>
                        <th className="px-4 py-3 w-10">
                          <input type="checkbox" checked={filteredTCs.length > 0 && selectedRunTCs.length === filteredTCs.length} onChange={toggleSelectAll} className="w-4 h-4 rounded border-white/20 bg-black/50 accent-blue-500 cursor-pointer" />
                        </th>
                        <th className="text-left text-[10px] font-bold uppercase tracking-wider text-white/30 px-4 py-3 w-28">TC No.</th>
                        <th className="text-left text-[10px] font-bold uppercase tracking-wider text-white/30 px-4 py-3">Title / Module</th>
                        <th className="text-left text-[10px] font-bold uppercase tracking-wider text-white/30 px-4 py-3 w-24">Priority</th>
                        <th className="text-left text-[10px] font-bold uppercase tracking-wider text-white/30 px-4 py-3 w-28">Assignee</th>
                        <th className="text-left text-[10px] font-bold uppercase tracking-wider text-white/30 px-4 py-3 w-36">Status</th>
                        <th className="text-left text-[10px] font-bold uppercase tracking-wider text-white/30 px-4 py-3 w-44">Actions</th>
                        <th className="px-4 py-3 w-20"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTCs.map((tc: any, idx: number) => {
                        const r = results[tc.testCaseId] || { status: "Pending", comment: "" };
                        const isExpanded = expandedTcId === tc.testCaseId;
                        return (
                          <React.Fragment key={tc.testCaseId}>
                            <tr className={`border-b transition-colors ${isExpanded ? 'bg-white/[0.04] border-blue-500/20' : 'border-white/5 hover:bg-white/[0.02]'}`}>
                              <td className="px-4 py-3">
                                <input type="checkbox" checked={selectedRunTCs.includes(tc.testCaseId)} onChange={() => setSelectedRunTCs(p => p.includes(tc.testCaseId) ? p.filter(x => x !== tc.testCaseId) : [...p, tc.testCaseId])} className="w-4 h-4 rounded border-white/20 bg-black/50 accent-blue-500 cursor-pointer" />
                              </td>
                              {/* TC No */}
                              <td className="px-4 py-3">
                                <span className="font-mono text-xs text-blue-400/80">{tc.testCaseId}</span>
                              </td>
                              {/* Title + Module */}
                              <td className="px-4 py-3">
                                <div className="font-medium text-white/90 leading-tight">{tc.title}</div>
                                {(tc.module || tc.subModule) && (
                                  <div className="text-[10px] text-white/30 mt-0.5">{tc.module}{tc.subModule ? ` › ${tc.subModule}` : ""}</div>
                                )}
                              </td>
                              {/* Priority */}
                              <td className="px-4 py-3">
                                <span className={`text-xs font-bold ${PRIORITY_COLOR[tc.priority] || 'text-white/40'}`}>{tc.priority || '—'}</span>
                              </td>
                              {/* Assignee */}
                              <td className="px-4 py-3">
                                <select value={tc.assignedTester || ""} onChange={e => handleSingleAssign(tc.testCaseId, e.target.value)}
                                  className="bg-transparent border-0 font-medium w-full text-xs focus:ring-1 focus:ring-blue-500 rounded px-1 -ml-1 py-1 cursor-pointer hover:bg-white/5 transition appearance-none">
                                  <option value="" className="text-white/40 bg-[#050511]">Unassigned</option>
                                  {users.map((u: any) => <option key={u.username} value={u.username} className="bg-[#050511]">{u.username}</option>)}
                                </select>
                              </td>
                              {/* Execution Status */}
                              <td className="px-4 py-3">
                                <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full w-fit ${STATUS_CFG[r.status]?.badge}`}>
                                  {STATUS_CFG[r.status]?.icon}{r.status}
                                </span>
                              </td>
                              {/* Pass/Fail/Blocked Buttons */}
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1">
                                  {["Pass", "Fail", "Blocked"].map(s => (
                                    <button key={s} onClick={() => setStatus(tc.testCaseId, s)}
                                      className={`px-2 py-1 rounded text-[10px] font-bold border transition-all whitespace-nowrap ${r.status === s ? STATUS_CFG[s].btn + ' ring-1 ring-current ring-offset-1 ring-offset-black' : 'bg-white/5 text-white/30 border-white/10 hover:border-white/30'}`}>
                                      {s}
                                    </button>
                                  ))}
                                </div>
                              </td>
                              {/* Actions */}
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1 justify-end">
                                  <button title="Add note / View steps" onClick={() => setExpandedTcId(isExpanded ? null : tc.testCaseId)}
                                    className={`p-1.5 rounded-lg transition ${isExpanded ? 'bg-blue-500/20 text-blue-400' : 'text-white/30 hover:text-white hover:bg-white/10'}`}>
                                    <MessageSquare size={14} />
                                  </button>
                                  <button title="Remove from this Suite (stays in Repository)" onClick={() => removeFromSuite(tc.testCaseId)}
                                    className="p-1.5 rounded-lg text-red-400/30 hover:text-red-400 hover:bg-red-500/10 transition">
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* Expanded Row — Notes + Attachments + Steps */}
                            <AnimatePresence>
                              {isExpanded && (
                                <tr className="bg-white/[0.03] border-b border-blue-500/10">
                                  <td colSpan={8} className="px-6 py-4">
                                    <div className="flex flex-col gap-5">

                                      {/* Notes */}
                                      <div className="flex items-center gap-3">
                                        <MessageSquare size={13} className="text-white/20 flex-shrink-0" />
                                        <input
                                          type="text"
                                          value={r.comment}
                                          onChange={e => setComment(tc.testCaseId, e.target.value)}
                                          placeholder={r.status === "Fail" ? "Describe the failure... (required for defect logging)" : r.status === "Blocked" ? "Describe what's blocked..." : "Add execution notes or observations..."}
                                          className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/70 placeholder-white/20 focus:outline-none focus:border-blue-500 transition"
                                        />
                                      </div>

                                      {/* Attachments */}
                                      <div className="border-t border-white/5 pt-4">
                                        <div className="flex items-center gap-2 mb-3">
                                          <Paperclip size={13} className="text-white/30" />
                                          <span className="text-[10px] font-bold uppercase tracking-wider text-white/30">Attachments / Evidence</span>
                                          {tcAttachments[tc.testCaseId]?.length > 0 && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400">{tcAttachments[tc.testCaseId].length}</span>
                                          )}
                                        </div>

                                        {/* Upload area */}
                                        <label className={`flex items-center gap-3 px-4 py-2.5 border border-dashed rounded-xl cursor-pointer transition mb-3 ${
                                          uploadingTcId === tc.testCaseId
                                            ? 'border-white/10 bg-white/5 opacity-50 pointer-events-none'
                                            : 'border-blue-500/20 hover:border-blue-500/50 hover:bg-blue-500/5'
                                        }`}>
                                          <Paperclip size={14} className="text-blue-400 flex-shrink-0" />
                                          <span className="text-xs text-white/40">
                                            {uploadingTcId === tc.testCaseId ? "Uploading..." : "Attach screenshot, log, or document"}
                                          </span>
                                          <span className="ml-auto text-[10px] text-white/20">PNG · JPG · PDF · LOG · TXT · DOCX</span>
                                          <input
                                            type="file"
                                            className="hidden"
                                            accept="image/*,.pdf,.log,.txt,.docx,.xlsx,.zip"
                                            onChange={e => handleTcUpload(tc.testCaseId, e)}
                                            disabled={uploadingTcId === tc.testCaseId}
                                          />
                                        </label>

                                        {/* Attachment list */}
                                        {tcAttachments[tc.testCaseId]?.length > 0 && (
                                          <div className="flex flex-col gap-1.5">
                                            {tcAttachments[tc.testCaseId].map((att: any) => (
                                              <div key={att.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/8 group">
                                                <Paperclip size={12} className="text-white/25 flex-shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                  <span className="text-xs text-white/60 truncate block">{att.originalName}</span>
                                                  <span className="text-[10px] text-white/25">{(att.size / 1024).toFixed(1)} KB · {att.uploadedBy} · {new Date(att.uploadedAt).toLocaleDateString("en-GB")}</span>
                                                </div>
                                                <a href={att.url} target="_blank" rel="noreferrer"
                                                  className="p-1 text-blue-400/40 hover:text-blue-400 transition" title="Open">
                                                  <Eye size={13} />
                                                </a>
                                                <button onClick={() => deleteTcAttachment(tc.testCaseId, att.id)}
                                                  className="p-1 text-red-400/20 hover:text-red-400 transition opacity-0 group-hover:opacity-100" title="Remove">
                                                  <Trash2 size={13} />
                                                </button>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>

                                      {/* Steps preview */}
                                      {tc.steps?.length > 0 && (
                                        <div className="border-t border-white/5 pt-4">
                                          <p className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-2">Test Steps ({tc.steps.length})</p>
                                          <div className="grid grid-cols-[2rem_1fr_1fr_1fr] gap-2 text-[10px] font-bold uppercase text-white/20 px-2 pb-1 border-b border-white/5">
                                            <span>#</span><span>Action</span><span>Test Data</span><span>Expected Result</span>
                                          </div>
                                          {tc.steps.map((step: any, si: number) => (
                                            <div key={si} className="grid grid-cols-[2rem_1fr_1fr_1fr] gap-2 text-xs text-white/50 px-2 py-1.5 border-b border-white/5 last:border-0">
                                              <span className="text-white/25">{si + 1}</span>
                                              <span>{step.action}</span>
                                              <span className="font-mono text-yellow-300/50">{step.testData}</span>
                                              <span className="text-green-300/50">{step.expectedResult}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                    </div>
                                  </td>
                                </tr>
                              )}
                            </AnimatePresence>
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Footer Summary */}
              {runStats && (
                <div className="glass-panel border-t border-white/10 px-6 py-3 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-5 text-xs">
                    <span className="text-white/40">Total: <strong className="text-white">{runStats.total}</strong></span>
                    <span className="text-green-400">✓ Pass: <strong>{runStats.pass}</strong></span>
                    <span className="text-red-400">✗ Fail: <strong>{runStats.fail}</strong></span>
                    <span className="text-orange-400">⊘ Blocked: <strong>{runStats.blocked}</strong></span>
                    <span className="text-white/25">⏳ Pending: <strong>{runStats.pending}</strong></span>
                  </div>
                  <div className="text-xs text-white/20">
                    {runStats.total > 0 && `${Math.round(((runStats.pass + runStats.fail + runStats.blocked) / runStats.total) * 100)}% executed`}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
