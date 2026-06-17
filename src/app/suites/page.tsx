"use client";
import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers, Plus, Trash2, PlayCircle, X, CheckCircle2, XCircle, Ban,
  MessageSquare, Paperclip, ChevronLeft, Clock, Search, UserCheck,
  AlertTriangle, FilterX, Eye, FileText, Download, Edit2, Database
} from "lucide-react";
import Link from "next/link";
import Sidebar from "../components/Sidebar";
import TopNav from "../components/TopNav";
import { useProject } from "../components/ProjectContext";
import AdvancedFilterBar from "../components/AdvancedFilterBar";
import JQLQueryBuilder from "../components/JQLQueryBuilder";
import type { FilterRow } from "@/types/filter";

const STATUS_CFG: any = {
  Pass:    { badge: "badge-green",  icon: <CheckCircle2 size={11} />, btnCls: "badge-green" },
  Fail:    { badge: "badge-red",    icon: <XCircle size={11} />,     btnCls: "badge-red" },
  Blocked: { badge: "badge-orange", icon: <Ban size={11} />,         btnCls: "badge-orange" },
  Pending: { badge: "badge-gray",   icon: <Clock size={11} />,       btnCls: "badge-gray" },
};
const PRIORITY_COLOR: any = {
  Highest: "var(--accent-red)", High: "var(--accent-orange)",
  Medium: "var(--accent-cyan)", Low: "var(--text-muted)",
};

function matchSuiteRow(suite: any, row: FilterRow): boolean {
  const fieldVal = row.field === 'tcCount' ? (suite.testCaseIds?.length ?? 0) : (suite[row.field] ?? null);
  const op = row.operator;
  const val = row.value;
  const rawStr = fieldVal === null ? '' : String(fieldVal).toLowerCase();
  const valStr = Array.isArray(val) ? '' : String(val ?? '').toLowerCase();
  if (op === 'is empty') return !fieldVal;
  if (op === 'is not empty') return !!fieldVal;
  if (op === '=' || op === 'is') return rawStr === valStr;
  if (op === '!=' || op === 'is not') return rawStr !== valStr;
  if (op === 'contains') return rawStr.includes(valStr);
  if (op === 'before') return fieldVal ? new Date(String(fieldVal)).getTime() < new Date(valStr).getTime() : false;
  if (op === 'after')  return fieldVal ? new Date(String(fieldVal)).getTime() > new Date(valStr).getTime() : false;
  if (op === 'between' && Array.isArray(val) && val.length === 2) {
    const [f, t] = val as [string, string];
    const d = fieldVal ? new Date(String(fieldVal)).getTime() : NaN;
    if (!isNaN(d)) return d >= new Date(f).getTime() && d <= new Date(t).getTime();
    const n = parseFloat(String(fieldVal));
    return n >= parseFloat(f) && n <= parseFloat(t);
  }
  const n = parseFloat(String(fieldVal)); const vn = parseFloat(valStr);
  if (op === '>') return n > vn; if (op === '>=') return n >= vn;
  if (op === '<') return n < vn; if (op === '<=') return n <= vn;
  return false;
}

export default function SuitesPage() {
  const { activeProject } = useProject();
  const [suites, setSuites] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState("admin");
  const [allTestCases, setAllTestCases] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  const [runSuite, setRunSuite] = useState<any | null>(null);
  const [results, setResults] = useState<Record<string, { status: string; comment: string }>>({});
  const [saving, setSaving] = useState(false);

  const [tcSearch, setTcSearch] = useState("");
  const [filterExecStatus, setFilterExecStatus] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");
  const [expandedTcId, setExpandedTcId] = useState<string | null>(null);
  const [tcAttachments, setTcAttachments] = useState<Record<string, any[]>>({});
  const [uploadingTcId, setUploadingTcId] = useState<string | null>(null);
  const [selectedRunTCs, setSelectedRunTCs] = useState<string[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTester, setAssignTester] = useState("");
  const [showReportMenu, setShowReportMenu] = useState(false);

  const [editSuite, setEditSuite] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', sprint: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [showAddTCsPanel, setShowAddTCsPanel] = useState(false);
  const [suiteFilterRows, setSuiteFilterRows] = useState<FilterRow[]>([]);

  useEffect(() => {
    fetch(`/api/suites${activeProject ? `?project=${activeProject}` : ""}`).then(r => r.json()).then(d => { if (d.success) setSuites(d.suites); });
    fetch(`/api/testcases${activeProject ? `?project=${activeProject}` : ""}`).then(r => r.json()).then(d => { if (d.success) setAllTestCases(d.testCases); });
    fetch("/api/auth/users").then(r => r.json()).then(d => { if (d.success) setUsers(d.users); });
    fetch("/api/auth/users?me=true").then(r => r.json()).then(d => {
      if (d.success) { setUserRole(d.user?.role); setCurrentUser(d.user?.username || "admin"); }
    });
  }, [activeProject]);

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
    const attMap: Record<string, any[]> = {};
    await Promise.all((suite.testCaseIds || []).map(async (tcId: string) => {
      const refId = `exec_${suite.id}_${tcId}`;
      const ar = await fetch(`/api/attachments?refId=${refId}`).then(r => r.json());
      if (ar.success && ar.attachments.length > 0) attMap[tcId] = ar.attachments;
    }));
    setTcAttachments(attMap);
  };

  const closeRun = () => { setRunSuite(null); setResults({}); setTcAttachments({}); setSelectedRunTCs([]); };

  const openEdit = (suite: any) => {
    setEditSuite(suite);
    setEditForm({ name: suite.name || '', description: suite.description || '', sprint: suite.sprint || '' });
    setEditError('');
    setShowAddTCsPanel(false);
  };

  const closeEdit = () => { setEditSuite(null); setShowAddTCsPanel(false); };

  const saveEditMeta = async () => {
    if (!editForm.name.trim()) { setEditError('Suite name is required'); return; }
    if (!editForm.sprint.trim()) { setEditError('Sprint is required'); return; }
    setEditSaving(true); setEditError('');
    try {
      const res = await fetch('/api/suites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editSuite.id,
          name: editForm.name.trim(),
          description: editForm.description,
          sprint: editForm.sprint.trim(),
          project: editSuite.project,
          testCaseIds: editSuite.testCaseIds,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuites((prev: any[]) => prev.map(s => s.id === editSuite.id ? { ...s, name: editForm.name.trim(), description: editForm.description, sprint: editForm.sprint.trim(), updatedAt: new Date().toISOString() } : s));
        setEditSuite((s: any) => ({ ...s, name: editForm.name.trim(), description: editForm.description, sprint: editForm.sprint.trim() }));
      } else {
        setEditError('Failed to save. Please try again.');
      }
    } catch { setEditError('Network error. Please try again.'); }
    finally { setEditSaving(false); }
  };

  const removeTCFromEdit = async (tcId: string) => {
    try {
      const res = await fetch('/api/suites', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suiteId: editSuite.id, removeTcId: tcId }),
      });
      const data = await res.json();
      if (data.success) {
        const updated = (editSuite.testCaseIds || []).filter((id: string) => id !== tcId);
        setEditSuite((s: any) => ({ ...s, testCaseIds: updated }));
        setSuites((prev: any[]) => prev.map(s => s.id === editSuite.id ? { ...s, testCaseIds: updated } : s));
      }
    } catch {}
  };

  const addTCsFromQuery = async (tcIds: string[]) => {
    if (tcIds.length === 0) return;
    const merged = [...new Set([...(editSuite.testCaseIds || []), ...tcIds])];
    try {
      const res = await fetch('/api/suites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editSuite.id,
          name: editSuite.name,
          description: editSuite.description,
          sprint: editSuite.sprint,
          project: editSuite.project,
          testCaseIds: merged,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditSuite((s: any) => ({ ...s, testCaseIds: merged }));
        setSuites((prev: any[]) => prev.map(s => s.id === editSuite.id ? { ...s, testCaseIds: merged } : s));
        setShowAddTCsPanel(false);
      }
    } catch {}
  };

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
    if (!confirm(`Remove ${tcId} from this suite?`)) return;
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
      setSelectedRunTCs([]); setShowAssignModal(false); setAssignTester("");
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
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingTcId(tcId);
    const refId = `exec_${runSuite.id}_${tcId}`;
    const fd = new FormData();
    fd.append("file", file); fd.append("refId", refId);
    fd.append("refType", "execution"); fd.append("uploadedBy", currentUser);
    const res = await fetch("/api/attachments", { method: "POST", body: fd });
    const data = await res.json();
    if (data.success) setTcAttachments(prev => ({ ...prev, [tcId]: [...(prev[tcId] || []), data.attachment] }));
    setUploadingTcId(null); e.target.value = "";
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

  const suiteTCs = useMemo(() =>
    runSuite ? allTestCases.filter(tc => runSuite.testCaseIds?.includes(tc.testCaseId)) : [],
    [runSuite, allTestCases]);

  const assignees = useMemo(() => [...new Set(suiteTCs.map(tc => tc.assignedTester).filter(Boolean))], [suiteTCs]);

  const filteredTCs = useMemo(() => suiteTCs.filter(tc => {
    const r = results[tc.testCaseId];
    if (tcSearch && !tc.testCaseId.toLowerCase().includes(tcSearch.toLowerCase()) && !tc.title?.toLowerCase().includes(tcSearch.toLowerCase())) return false;
    if (filterExecStatus && r?.status !== filterExecStatus) return false;
    if (filterAssignee && tc.assignedTester !== filterAssignee) return false;
    return true;
  }), [suiteTCs, results, tcSearch, filterExecStatus, filterAssignee]);

  const filteredSuites = useMemo(() => {
    if (suiteFilterRows.length === 0) return suites;
    return suites.filter(suite => {
      let result = matchSuiteRow(suite, suiteFilterRows[0]);
      for (let i = 1; i < suiteFilterRows.length; i++) {
        const curr = matchSuiteRow(suite, suiteFilterRows[i]);
        result = suiteFilterRows[i - 1].connector === 'OR' ? result || curr : result && curr;
      }
      return result;
    });
  }, [suites, suiteFilterRows]);

  const runStats = runSuite ? {
    total: runSuite.testCaseIds?.length || 0,
    pass:    Object.values(results).filter((r: any) => r.status === "Pass").length,
    fail:    Object.values(results).filter((r: any) => r.status === "Fail").length,
    blocked: Object.values(results).filter((r: any) => r.status === "Blocked").length,
    pending: Object.values(results).filter((r: any) => r.status === "Pending").length,
  } : null;

  const filtersActive = !!(tcSearch || filterExecStatus || filterAssignee);

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg-base)", overflow: "hidden" }}>
      <Sidebar />

      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        <TopNav />

        {/* Assign Modal */}
      <AnimatePresence>
        {showAssignModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-[var(--bg-overlay)] border border-[var(--border-base)] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
            >
              <div className="p-5 border-b border-[var(--border-base)] bg-gradient-to-r from-[var(--accent-cyan)]/10 to-[var(--accent-violet)]/10 flex justify-between items-center">
                <h2 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <UserCheck size={18} className="text-[var(--accent-cyan)]" /> Bulk Assign Tester
                </h2>
                <button onClick={() => setShowAssignModal(false)} className="p-1.5 hover:bg-[var(--bg-elevated)] rounded-lg text-[var(--text-muted)] transition-colors"><X size={18} /></button>
              </div>
              <div className="p-6 flex flex-col gap-5">
                <p className="text-sm text-[var(--text-secondary)]">
                  Assigning tester to <strong className="text-[var(--text-primary)]">{selectedRunTCs.length}</strong> test case(s)
                </p>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Select Tester</label>
                  <select value={assignTester} onChange={e => setAssignTester(e.target.value)}
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-xl px-4 py-3 text-[var(--text-primary)] font-medium focus:outline-none focus:border-[var(--accent-cyan)] transition-all">
                    <option value="" style={{ background: 'var(--bg-overlay)', color: 'var(--text-primary)' }}>— Choose a team member —</option>
                    {users.map((u: any) => <option key={u.username} value={u.username} style={{ background: 'var(--bg-overlay)', color: 'var(--text-primary)' }}>{u.username} ({u.role})</option>)}
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => { setShowAssignModal(false); setAssignTester(""); }} className="flex-1 py-3 rounded-xl glass-panel border border-[var(--border-base)] text-[var(--text-secondary)] font-semibold hover:bg-[var(--bg-surface)] transition-all">Cancel</button>
                  <button onClick={handleBulkAssign} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-violet)] text-white font-bold shadow-lg hover:opacity-90 active:scale-[0.98] transition-all">Assign</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main area */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Suite List */}
        <div style={{
          display: "flex", flexDirection: "column",
          flex: runSuite ? "0 0 0" : "1",
          overflow: runSuite ? "hidden" : "visible",
          opacity: runSuite ? 0 : 1,
          pointerEvents: runSuite ? "none" : "auto",
          transition: "all 0.3s",
          minWidth: 0
        }}>
          <header className="page-header">
            <div>
              <h1 className="page-title">Test Suites</h1>
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                {suites.length} suite{suites.length !== 1 ? "s" : ""}
              </p>
            </div>
            {activeProject ? (
              <Link href="/testcases" className="btn-primary">
                <Plus size={15} /> Add from Repository
              </Link>
            ) : (
              <div style={{ fontSize: 12, color: "var(--text-muted)", alignSelf: "center", fontStyle: "italic" }}>
                Select a project to add suites
              </div>
            )}
          </header>

          <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
            {!activeProject ? (
              <div className="text-center mt-20 p-12 glass-panel border border-[var(--border-base)] rounded-3xl max-w-lg mx-auto">
                <Layers className="mx-auto text-[var(--accent-cyan)] mb-4 animate-pulse" size={48} />
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">No Project Selected</h3>
                <p className="text-[var(--text-muted)] text-sm">
                  Please select a project from the top menu to view and manage your Test Suites.
                </p>
              </div>
            ) : suites.length === 0 ? (
              <div className="empty-state">
                <Layers size={52} />
                <h3>No Test Suites Found</h3>
                <p>Go to the Test Repository, select test cases, and use 'Add to Test Suite'.</p>
                <Link href="/testcases" className="btn-primary" style={{ marginTop: 8 }}>Go to Repository</Link>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 16 }}>
                  <AdvancedFilterBar mode="suites" onChange={setSuiteFilterRows} />
                </div>
                <div className="section-card">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Suite Name</th>
                        <th>Sprint</th>
                        <th style={{ width: 100 }}>Test Cases</th>
                        <th style={{ width: 140 }}>Created Details</th>
                        <th style={{ width: 140 }}>Modified Details</th>
                        <th style={{ width: 130, textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSuites.map((s: any, i: number) => (
                        <motion.tr key={s.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)" }}>{s.name}</div>
                            {s.description && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{s.description}</div>}
                          </td>
                          <td>
                            {s.sprint ? <span className="badge badge-cyan">{s.sprint}</span> : <span style={{ color: "var(--text-muted)" }}>—</span>}
                          </td>
                          <td>
                            <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>{s.testCaseIds?.length || 0}</span>
                            <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 4 }}>TCs</span>
                          </td>
                          <td>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)" }}>{s.createdBy || "admin"}</div>
                            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "—"}</div>
                          </td>
                          <td>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)" }}>{s.updatedBy || s.createdBy || "admin"}</div>
                            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{s.updatedAt ? new Date(s.updatedAt).toLocaleDateString() : "—"}</div>
                          </td>
                          <td>
                            <div className="actions-cell" style={{ display: "flex", justifyContent: "flex-end", gap: 4 }}>
                              <button
                                onClick={() => openEdit(s)}
                                title="Edit Suite"
                                className="p-2 rounded-lg transition-colors"
                                style={{ color: 'var(--text-muted)' }}
                                onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-cyan)')}
                                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                              >
                                <Edit2 size={15} />
                              </button>
                              <button className="icon-btn run" onClick={() => openRun(s)}>
                                <PlayCircle size={15} />
                                <span className="tooltip">Run Suite</span>
                              </button>
                              <button className="icon-btn delete" onClick={() => del(s.id)}>
                                <Trash2 size={14} />
                                <span className="tooltip">Delete Suite</span>
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Execution Run Panel */}
        <AnimatePresence>
          {runSuite && (
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--bg-base)", position: "relative", minWidth: 0 }}
            >
              {/* Run Header */}
              <header className="page-header" style={{ gap: 12, zIndex: 99 }}>
                <button onClick={closeRun} className="icon-btn view" style={{ marginLeft: -4, flexShrink: 0 }}>
                  <ChevronLeft size={20} />
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 10, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)" }}>
                    {runSuite.sprint && `Sprint: ${runSuite.sprint}`}
                  </p>
                  <h1 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{runSuite.name}</h1>
                </div>

                {/* Status pills */}
                {runStats && (
                  <div style={{ display: "flex", gap: 6 }}>
                    {[["Pending", runStats.pending, "badge-gray"], ["Pass", runStats.pass, "badge-green"], ["Fail", runStats.fail, "badge-red"], ["Blocked", runStats.blocked, "badge-orange"]].map(([label, count, cls]: any) => (
                      <span key={label} className={`badge ${cls}`} style={{ gap: 5 }}>
                        {STATUS_CFG[label]?.icon} {count}
                      </span>
                    ))}
                  </div>
                )}

                {/* Export */}
                {runStats && (
                  <div style={{ position: "relative" }}>
                    <button onClick={() => setShowReportMenu(!showReportMenu)} className="btn-ghost" style={{ padding: "7px 14px", fontSize: 12 }}>
                      <FileText size={14} color="var(--accent-cyan)" /> Export Report
                    </button>
                    <AnimatePresence>
                      {showReportMenu && (
                        <>
                          <div style={{ position: "fixed", inset: 0, zIndex: 9990 }} onClick={() => setShowReportMenu(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                            style={{
                              position: "absolute", right: 0, top: "calc(100% + 8px)",
                              background: "var(--bg-overlay)", border: "1px solid var(--border-strong)",
                              borderRadius: 12, overflow: "hidden", width: 210,
                              boxShadow: "var(--shadow-lg)", zIndex: 9999, padding: 6
                            }}
                          >
                            <a href={`/api/reports/execution?suiteId=${runSuite.id}&format=html`} target="_blank" onClick={() => setShowReportMenu(false)}
                              style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, cursor: "pointer", textDecoration: "none", color: "var(--text-secondary)", fontSize: 13, transition: "background 0.15s" }}
                              onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-elevated)")}
                              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                            >
                              <span className="badge badge-cyan" style={{ padding: "2px 6px", fontSize: 9 }}>WEB</span>
                              Summary Report
                            </a>
                            <div style={{ height: 1, background: "var(--border-base)", margin: "4px 0" }} />
                            <a href={`/api/reports/execution?suiteId=${runSuite.id}&format=pdf`} target="_blank" onClick={() => setShowReportMenu(false)}
                              style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, cursor: "pointer", textDecoration: "none", color: "var(--text-secondary)", fontSize: 13, transition: "background 0.15s" }}
                              onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-elevated)")}
                              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                            >
                              <Download size={14} color="var(--accent-red)" /> Download PDF
                            </a>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                <button onClick={saveRun} disabled={saving} className="btn-primary" style={{ flexShrink: 0, padding: "8px 16px", fontSize: 13 }}>
                  {saving ? "Saving..." : "💾 Save Results"}
                </button>
              </header>

              {/* Progress Bar */}
              {runStats && runStats.total > 0 && (
                <div style={{ height: 4, display: "flex", flexShrink: 0, background: "var(--border-base)", boxShadow: "0 2px 10px rgba(0,0,0,0.2)" }}>
                  <div style={{ background: "var(--accent-green)", width: `${(runStats.pass / runStats.total) * 100}%`, transition: "width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)", boxShadow: "0 0 12px var(--accent-green)" }} />
                  <div style={{ background: "var(--accent-red)",   width: `${(runStats.fail / runStats.total) * 100}%`, transition: "width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)", boxShadow: "0 0 12px var(--accent-red)" }} />
                  <div style={{ background: "var(--accent-orange)", width: `${(runStats.blocked / runStats.total) * 100}%`, transition: "width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)", boxShadow: "0 0 12px var(--accent-orange)" }} />
                </div>
              )}

              {/* Filter Bar */}
              <div className="filter-bar">
                <div className="search-input-wrap">
                  <Search size={13} />
                  <input type="text" value={tcSearch} onChange={e => setTcSearch(e.target.value)}
                    placeholder="Search TC No or title..." className="search-input" style={{ width: 220 }} />
                </div>
                <select value={filterExecStatus} onChange={e => setFilterExecStatus(e.target.value)} className="filter-select">
                  <option value="">All Statuses</option>
                  <option value="Pending">⏳ Pending</option>
                  <option value="Pass">✅ Pass</option>
                  <option value="Fail">❌ Fail</option>
                  <option value="Blocked">⊘ Blocked</option>
                </select>
                <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)} className="filter-select">
                  <option value="">All Assignees</option>
                  {assignees.map((a: any) => <option key={a} value={a}>{a}</option>)}
                </select>
                {filtersActive && (
                  <button onClick={() => { setTcSearch(""); setFilterExecStatus(""); setFilterAssignee(""); }}
                    className="btn-ghost" style={{ padding: "5px 10px", fontSize: 11, color: "var(--accent-red)" }}>
                    <FilterX size={12} /> Clear
                  </button>
                )}
                <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-muted)" }}>
                  {filteredTCs.length} / {suiteTCs.length} TCs
                </span>
              </div>

              {/* Table Area */}
              <div style={{ flex: 1, overflowY: "auto", position: "relative" }}>
                {/* Bulk Action Bar */}
                <AnimatePresence>
                  {selectedRunTCs.length > 0 && (
                    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
                      className="bulk-action-bar"
                      style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 50 }}
                    >
                      <span className="badge badge-cyan">{selectedRunTCs.length} Selected</span>
                      <div style={{ width: 1, height: 20, background: "var(--border-strong)" }} />
                      <div style={{ display: "flex", gap: 6 }}>
                        {["Pass", "Fail", "Blocked"].map(s => (
                          <button key={s} onClick={() => handleBulkStatus(s)} className={`badge ${STATUS_CFG[s].btnCls}`}
                            style={{ cursor: "pointer", border: "1px solid", padding: "4px 10px", fontSize: 11, fontWeight: 700 }}>
                            Mark {s}
                          </button>
                        ))}
                      </div>
                      <div style={{ width: 1, height: 20, background: "var(--border-strong)" }} />
                      <button onClick={() => setShowAssignModal(true)} className="btn-ghost" style={{ padding: "5px 12px", fontSize: 11 }}>
                        <UserCheck size={13} /> Assign
                      </button>
                      <button onClick={handleBulkRemoveFromSuite} className="badge badge-red"
                        style={{ cursor: "pointer", border: "1px solid", padding: "4px 10px", fontSize: 11, fontWeight: 700 }}>
                        <Trash2 size={11} /> Remove
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {suiteTCs.length === 0 ? (
                  <div className="empty-state">
                    <AlertTriangle size={40} color="var(--accent-yellow)" style={{ opacity: 0.5 }} />
                    <p>No test cases found in this suite.</p>
                  </div>
                ) : filteredTCs.length === 0 ? (
                  <div className="empty-state">
                    <FilterX size={36} />
                    <p>No results match the current filters.</p>
                  </div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: 40 }}>
                          <input type="checkbox"
                            checked={filteredTCs.length > 0 && selectedRunTCs.length === filteredTCs.length}
                            onChange={toggleSelectAll}
                            style={{ width: 14, height: 14, accentColor: "var(--accent-cyan)", cursor: "pointer" }}
                          />
                        </th>
                        <th style={{ width: 110 }}>TC No.</th>
                        <th>Title / Module</th>
                        <th style={{ width: 90 }}>Priority</th>
                        <th style={{ width: 130 }}>Assignee</th>
                        <th style={{ width: 110 }}>Status</th>
                        <th style={{ width: 170 }}>Mark Result</th>
                        <th style={{ width: 70, textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTCs.map((tc: any) => {
                        const r = results[tc.testCaseId] || { status: "Pending", comment: "" };
                        const isExpanded = expandedTcId === tc.testCaseId;
                        return (
                          <React.Fragment key={tc.testCaseId}>
                            <tr style={{ background: isExpanded ? "var(--bg-elevated)" : undefined }}>
                              <td onClick={e => e.stopPropagation()}>
                                <input type="checkbox"
                                  checked={selectedRunTCs.includes(tc.testCaseId)}
                                  onChange={() => setSelectedRunTCs(p => p.includes(tc.testCaseId) ? p.filter(x => x !== tc.testCaseId) : [...p, tc.testCaseId])}
                                  style={{ width: 14, height: 14, accentColor: "var(--accent-cyan)", cursor: "pointer" }}
                                />
                              </td>
                              <td><span className="mono-id">{tc.testCaseId}</span></td>
                              <td>
                                <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)" }}>{tc.title}</div>
                                {(tc.module || tc.subModule) && (
                                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                                    {tc.module}{tc.subModule ? ` › ${tc.subModule}` : ""}
                                  </div>
                                )}
                              </td>
                              <td>
                                <span style={{ fontSize: 11, fontWeight: 700, color: PRIORITY_COLOR[tc.priority] || "var(--text-muted)" }}>
                                  {tc.priority || "—"}
                                </span>
                              </td>
                              <td>
                                <select value={tc.assignedTester || ""} onChange={e => handleSingleAssign(tc.testCaseId, e.target.value)}
                                  style={{ background: "transparent", border: "none", fontSize: 12, color: "var(--text-secondary)", cursor: "pointer", outline: "none", width: "100%" }}>
                                  <option value="" style={{ background: "var(--bg-overlay)" }}>Unassigned</option>
                                  {users.map((u: any) => <option key={u.username} value={u.username} style={{ background: "var(--bg-overlay)" }}>{u.username}</option>)}
                                </select>
                              </td>
                              <td>
                                <span className={`badge ${STATUS_CFG[r.status]?.badge}`} style={{ gap: 5 }}>
                                  {STATUS_CFG[r.status]?.icon} {r.status}
                                </span>
                              </td>
                              <td>
                                <div style={{ display: "flex", gap: 4 }}>
                                  {["Pass", "Fail", "Blocked"].map(s => (
                                    <button key={s} onClick={() => setStatus(tc.testCaseId, s)}
                                      className={`badge ${r.status === s ? STATUS_CFG[s].btnCls : "badge-gray"}`}
                                      style={{ cursor: "pointer", padding: "3px 8px", fontSize: 10, fontWeight: 700, border: "1px solid",
                                        boxShadow: r.status === s ? "0 0 0 1px currentColor" : "none" }}>
                                      {s}
                                    </button>
                                  ))}
                                </div>
                              </td>
                              <td>
                                <div className="actions-cell" style={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
                                  <button className="icon-btn view" style={{ width: 28, height: 28 }}
                                    onClick={() => setExpandedTcId(isExpanded ? null : tc.testCaseId)}>
                                    <MessageSquare size={13} />
                                    <span className="tooltip">Notes & Steps</span>
                                  </button>
                                  <button className="icon-btn delete" style={{ width: 28, height: 28 }}
                                    onClick={() => removeFromSuite(tc.testCaseId)}>
                                    <Trash2 size={13} />
                                    <span className="tooltip">Remove from Suite</span>
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* Expanded Row */}
                            {isExpanded && (
                              <tr style={{ background: "var(--bg-elevated)" }}>
                                <td colSpan={8} style={{ padding: "16px 20px" }}>
                                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                    {/* Note */}
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                      <MessageSquare size={13} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                                      <input type="text" value={r.comment}
                                        onChange={e => setComment(tc.testCaseId, e.target.value)}
                                        placeholder={r.status === "Fail" ? "Describe the failure..." : r.status === "Blocked" ? "Describe the block..." : "Add execution notes..."}
                                        style={{ flex: 1, background: "var(--bg-input)", border: "1px solid var(--border-base)", borderRadius: 8, padding: "7px 12px", fontSize: 12, color: "var(--text-primary)", outline: "none" }}
                                      />
                                    </div>

                                    {/* Attachments */}
                                    <div style={{ borderTop: "1px solid var(--border-base)", paddingTop: 14 }}>
                                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                                        <Paperclip size={11} /> Attachments / Evidence
                                        {tcAttachments[tc.testCaseId]?.length > 0 && (
                                          <span className="badge badge-cyan" style={{ fontSize: 9 }}>{tcAttachments[tc.testCaseId].length}</span>
                                        )}
                                      </p>
                                      <label style={{
                                        display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                                        borderRadius: 10, border: "1px dashed var(--border-strong)", cursor: "pointer",
                                        background: "var(--bg-input)", marginBottom: 8,
                                        opacity: uploadingTcId === tc.testCaseId ? 0.5 : 1
                                      }}>
                                        <Paperclip size={13} color="var(--accent-cyan)" />
                                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                                          {uploadingTcId === tc.testCaseId ? "Uploading..." : "Attach screenshot, log, or document"}
                                        </span>
                                        <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-disabled)" }}>PNG · JPG · PDF · LOG · DOCX</span>
                                        <input type="file" style={{ display: "none" }}
                                          accept="image/*,.pdf,.log,.txt,.docx,.xlsx,.zip"
                                          onChange={e => handleTcUpload(tc.testCaseId, e)}
                                          disabled={uploadingTcId === tc.testCaseId}
                                        />
                                      </label>
                                      {tcAttachments[tc.testCaseId]?.map((att: any) => (
                                        <div key={att.id} style={{
                                          display: "flex", alignItems: "center", gap: 10, padding: "7px 12px",
                                          borderRadius: 8, background: "var(--bg-surface)", border: "1px solid var(--border-base)", marginBottom: 4
                                        }}>
                                          <Paperclip size={11} color="var(--text-muted)" />
                                          <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 12, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{att.originalName}</div>
                                            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{(att.size/1024).toFixed(1)} KB · {att.uploadedBy}</div>
                                          </div>
                                          <a href={att.url} target="_blank" rel="noreferrer" className="icon-btn view" style={{ width: 26, height: 26 }}>
                                            <Eye size={12} />
                                          </a>
                                          <button onClick={() => deleteTcAttachment(tc.testCaseId, att.id)} className="icon-btn delete" style={{ width: 26, height: 26 }}>
                                            <Trash2 size={12} />
                                          </button>
                                        </div>
                                      ))}
                                    </div>

                                    {/* Steps */}
                                    {tc.steps?.length > 0 && (
                                      <div style={{ borderTop: "1px solid var(--border-base)", paddingTop: 14 }}>
                                        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 10 }}>
                                          Test Steps ({tc.steps.length})
                                        </p>
                                        <table className="data-table" style={{ fontSize: 12 }}>
                                          <thead>
                                            <tr>
                                              <th style={{ width: 36 }}>#</th>
                                              <th>Action</th>
                                              <th>Test Data</th>
                                              <th>Expected Result</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {tc.steps.map((step: any, si: number) => (
                                              <tr key={si}>
                                                <td style={{ color: "var(--text-muted)", fontWeight: 700 }}>{si + 1}</td>
                                                <td>{step.action}</td>
                                                <td style={{ fontFamily: "var(--font-mono)", color: "var(--accent-yellow)", fontSize: 11 }}>{step.testData}</td>
                                                <td style={{ color: "var(--accent-green)", fontSize: 11 }}>{step.expectedResult}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Footer */}
              {runStats && (
                <div style={{
                  padding: "10px 24px", borderTop: "1px solid var(--border-base)",
                  display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
                  background: "var(--header-bg)", backdropFilter: "blur(12px)"
                }}>
                  <div style={{ display: "flex", gap: 20, fontSize: 12 }}>
                    <span style={{ color: "var(--text-secondary)" }}>Total: <strong style={{ color: "var(--text-primary)" }}>{runStats.total}</strong></span>
                    <span style={{ color: "var(--accent-green)" }}>✓ Pass: <strong>{runStats.pass}</strong></span>
                    <span style={{ color: "var(--accent-red)" }}>✗ Fail: <strong>{runStats.fail}</strong></span>
                    <span style={{ color: "var(--accent-orange)" }}>⊘ Blocked: <strong>{runStats.blocked}</strong></span>
                    <span style={{ color: "var(--text-muted)" }}>⏳ Pending: <strong>{runStats.pending}</strong></span>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {runStats.total > 0 && `${Math.round(((runStats.pass + runStats.fail + runStats.blocked) / runStats.total) * 100)}% executed`}
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Edit Suite Panel */}
      <AnimatePresence>
        {editSuite && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[90]"
              style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
              onClick={closeEdit}
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 h-full z-[91] flex flex-col shadow-2xl"
              style={{ width: '100%', maxWidth: 640, background: 'var(--bg-base)', borderLeft: '1px solid var(--border-base)' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border-base)', background: 'var(--bg-surface)' }}>
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <Edit2 size={18} style={{ color: 'var(--accent-cyan)' }} /> Edit Suite
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{editSuite.testCaseIds?.length || 0} test cases</p>
                </div>
                <button onClick={closeEdit} className="p-2 rounded-full transition-colors" style={{ color: 'var(--text-secondary)' }}>
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                {/* Section A — Metadata */}
                <div className="flex flex-col gap-4">
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--accent-cyan)' }}>Suite Details</p>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)', fontSize: 10 }}>Suite Name *</label>
                    <input
                      value={editForm.name}
                      onChange={e => { setEditForm(f => ({ ...f, name: e.target.value })); setEditError(''); }}
                      className="w-full h-10 px-4 rounded-xl outline-none transition-colors"
                      style={{ border: '1.5px solid var(--border-strong)', background: 'var(--bg-overlay)', color: 'var(--text-primary)', fontSize: 13 }}
                      placeholder="Suite name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)', fontSize: 10 }}>Description</label>
                    <textarea
                      value={editForm.description}
                      onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                      rows={2}
                      className="w-full px-4 py-3 rounded-xl outline-none transition-colors resize-none"
                      style={{ border: '1.5px solid var(--border-strong)', background: 'var(--bg-overlay)', color: 'var(--text-primary)', fontSize: 13 }}
                      placeholder="Purpose or scope…"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)', fontSize: 10 }}>Sprint *</label>
                    <input
                      list="edit-sprints-list"
                      value={editForm.sprint}
                      onChange={e => { setEditForm(f => ({ ...f, sprint: e.target.value })); setEditError(''); }}
                      className="w-full h-10 px-4 rounded-xl outline-none transition-colors"
                      style={{ border: '1.5px solid var(--border-strong)', background: 'var(--bg-overlay)', color: 'var(--text-primary)', fontSize: 13 }}
                      placeholder="Sprint name"
                    />
                    <datalist id="edit-sprints-list">
                      {[...new Set(suites.map((s: any) => s.sprint).filter(Boolean))].map((sp: any) => <option key={sp} value={sp} />)}
                    </datalist>
                  </div>
                  {editError && <p className="text-xs" style={{ color: 'var(--accent-red)' }}>{editError}</p>}
                  <button
                    onClick={saveEditMeta}
                    disabled={editSaving}
                    className="self-end h-9 px-6 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-50"
                    style={{ background: 'var(--accent-cyan)', color: 'var(--bg-base)' }}
                  >
                    {editSaving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>

                <div style={{ borderTop: '1px solid var(--border-base)' }} />

                {/* Section B — Current TCs */}
                <div className="flex flex-col gap-3">
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--accent-cyan)' }}>
                    Test Cases in Suite ({editSuite.testCaseIds?.length || 0})
                  </p>
                  {(editSuite.testCaseIds || []).length === 0 ? (
                    <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>No test cases in this suite yet</p>
                  ) : (
                    <div className="flex flex-col gap-1 overflow-y-auto pr-1" style={{ maxHeight: 256 }}>
                      {(editSuite.testCaseIds || []).map((tcId: string) => {
                        const tc = allTestCases.find((t: any) => t.testCaseId === tcId);
                        return (
                          <div key={tcId} className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group" style={{ border: '1px solid var(--border-base)', background: 'var(--bg-surface)' }}>
                            <span className="text-xs font-mono w-28 shrink-0" style={{ color: 'var(--accent-cyan)' }}>{tcId}</span>
                            <span className="text-xs flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{tc?.title || '—'}</span>
                            <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)', fontSize: 10 }}>{tc?.priority}</span>
                            <button
                              type="button"
                              onClick={() => removeTCFromEdit(tcId)}
                              className="opacity-0 group-hover:opacity-100 p-1 transition-opacity"
                              style={{ color: 'var(--accent-red)' }}
                              title="Remove from suite"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div style={{ borderTop: '1px solid var(--border-base)' }} />

                {/* Section C — Add TCs via Query Builder */}
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddTCsPanel(o => !o)}
                    className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-opacity hover:opacity-80"
                    style={{ color: 'var(--accent-cyan)' }}
                  >
                    <Database size={14} /> {showAddTCsPanel ? '▲' : '▼'} Add Test Cases via Query Builder
                  </button>
                  {showAddTCsPanel && (
                    <JQLQueryBuilder
                      projectId={editSuite.project}
                      existingSuiteIds={editSuite.testCaseIds || []}
                      onAddToSuite={addTCsFromQuery}
                      onCancel={() => setShowAddTCsPanel(false)}
                    />
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      </main>
    </div>
  );
}
