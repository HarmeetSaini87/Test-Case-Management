"use client";
import React, { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams, useRouter } from "next/navigation";
import {
  LayoutDashboard, ShieldCheck, Settings, LogOut, FolderOpen, Plus, Trash2,
  Save, Layers, Calendar, ChevronRight, ChevronDown, FileText, Copy, Search,
  Tag, Filter, FilterX, X, MoveUp, MoveDown, GripVertical, UserCheck, History,
  Paperclip, CheckCircle2, Clock, ChevronUp, Upload, Eye, Download
} from "lucide-react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { useProject } from "@/app/components/ProjectContext";
import TopNav from "../components/TopNav";
import Sidebar from "../components/Sidebar";

function NavItem({ icon, label, active = false, href = "#", onClick }: any) {
  if (onClick) return (
    <button onClick={onClick} className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-red-400 transition-all">
      {icon}<span className="font-medium">{label}</span>
    </button>
  );
  return (
    <Link href={href} className={`flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left transition-all ${active ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-400 border border-blue-500/30' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-white'}`}>
      {icon}<span className="font-medium">{label}</span>
    </Link>
  );
}

const EMPTY_TC = {
  title: "", objective: "", description: "", project: "", module: "", subModule: "", entity: "",
  priority: "Medium", status: "Draft", testCategory: "", testingType: "",
  testIntent: "", automationType: "Not Automated", labels: [] as string[],
  preconditions: "", estimatedTime: "",
  steps: [] as { action: string; testData: string; expectedResult: string }[],
};

// --- Export Component ---
function ExportDropdown({ testCases, activeProject }: { testCases: any[]; activeProject: string }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const getFileName = (ext: string) => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = pad(d.getDate()) + pad(d.getMonth() + 1) + String(d.getFullYear()).slice(-2);
    const timeStr = pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
    const cleanProjName = String(activeProject || 'Global_All_Context').replace(/[^a-z0-9]/gi, '');
    return `${cleanProjName}_TestCases_${dateStr}${timeStr}.${ext}`;
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const exportCSV = () => {
    try {
      if (!testCases || testCases.length === 0) { alert("Nothing to export!"); return; }
      console.log("📊 Starting CSV Export (Multi-Row Mode)...");
      const headers = ["ID", "Title", "Project", "Module", "Sub-Module", "Entity", "Priority", "Status", "Test Category", "Testing Type", "Test Intent", "Automation Type", "Labels", "Objective", "Description", "Preconditions", "Postconditions", "Test Step", "Expected Result", "Step Test Data", "Estimated Time", "Version", "Created By", "Created On", "Updated By", "Updated On"];
      
      const rows: any[] = [];
      testCases.forEach(tc => {
        const stepsArr = Array.isArray(tc.steps) && tc.steps.length > 0 ? tc.steps : [{ action: "—", expectedResult: "—", testData: "—" }];
        const labelsStr = Array.isArray(tc.labels) ? tc.labels.join("; ") : String(tc.labels || "");
        
        stepsArr.forEach((s: any, idx: number) => {
          rows.push([
            idx === 0 ? (tc.testCaseId || "") : "", 
            idx === 0 ? (tc.title || "") : "", 
            idx === 0 ? (tc.project || "") : "", 
            idx === 0 ? (tc.module || "") : "", 
            idx === 0 ? (tc.subModule || "") : "", 
            idx === 0 ? (tc.entity || "") : "",
            idx === 0 ? (tc.priority || "") : "", 
            idx === 0 ? (tc.status || "") : "", 
            idx === 0 ? (tc.testCategory || "") : "", 
            idx === 0 ? (tc.testingType || "") : "", 
            idx === 0 ? (tc.testIntent || "") : "", 
            idx === 0 ? (tc.automationType || "") : "",
            idx === 0 ? labelsStr : "", 
            idx === 0 ? (tc.objective || "") : "", 
            idx === 0 ? (tc.description || "") : "", 
            idx === 0 ? (tc.preconditions || "") : "", 
            idx === 0 ? (tc.postconditions || "") : "", 
            s.action || "", 
            s.expectedResult || "", 
            s.testData || "", 
            idx === 0 ? (tc.estimatedTime || "") : "", 
            idx === 0 ? String(tc.version || "1") : "",
            idx === 0 ? (tc.createdBy || "") : "", 
            idx === 0 ? (tc.createdDate ? String(tc.createdDate).split('T')[0] : "") : "", 
            idx === 0 ? (tc.updatedBy || "") : "", 
            idx === 0 ? (tc.updatedDate ? String(tc.updatedDate).split('T')[0] : "") : "",
          ]);
        });
      });

      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      const csvOutput = XLSX.write(wb, { bookType: 'csv', type: 'string' });
      
      const fileName = getFileName('csv');
      const blob = new Blob(["\uFEFF" + csvOutput], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      console.log("🚀 ATOMIC TRIGGER: CSV Delivery (Blob)...");
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
      if (!testCases || testCases.length === 0) { alert("Nothing to export!"); return; }
      console.log("📊 Starting Excel Export (Multi-Row Mode)...");
      const headers = ["ID", "Title", "Project", "Module", "Sub-Module", "Entity", "Priority", "Status", "Test Category", "Testing Type", "Test Intent", "Automation Type", "Labels", "Objective", "Description", "Preconditions", "Postconditions", "Test Step", "Expected Result", "Step Test Data", "Estimated Time", "Version", "Created By", "Created On", "Updated By", "Updated On"];
      
      const rows: any[] = [];
      testCases.forEach(tc => {
        const stepsArr = Array.isArray(tc.steps) && tc.steps.length > 0 ? tc.steps : [{ action: "—", expectedResult: "—", testData: "—" }];
        const labelsStr = Array.isArray(tc.labels) ? tc.labels.join("; ") : String(tc.labels || "");
        
        stepsArr.forEach((s: any, idx: number) => {
          rows.push([
            idx === 0 ? (tc.testCaseId || "") : "", 
            idx === 0 ? (tc.title || "") : "", 
            idx === 0 ? (tc.project || "") : "", 
            idx === 0 ? (tc.module || "") : "", 
            idx === 0 ? (tc.subModule || "") : "", 
            idx === 0 ? (tc.entity || "") : "",
            idx === 0 ? (tc.priority || "") : "", 
            idx === 0 ? (tc.status || "") : "", 
            idx === 0 ? (tc.testCategory || "") : "", 
            idx === 0 ? (tc.testingType || "") : "", 
            idx === 0 ? (tc.testIntent || "") : "", 
            idx === 0 ? (tc.automationType || "") : "",
            idx === 0 ? labelsStr : "", 
            idx === 0 ? (tc.objective || "") : "", 
            idx === 0 ? (tc.description || "") : "", 
            idx === 0 ? (tc.preconditions || "") : "", 
            idx === 0 ? (tc.postconditions || "") : "", 
            s.action || "", 
            s.expectedResult || "", 
            s.testData || "", 
            idx === 0 ? (tc.estimatedTime || "") : "", 
            idx === 0 ? String(tc.version || "1") : "",
            idx === 0 ? (tc.createdBy || "") : "", 
            idx === 0 ? (tc.createdDate ? String(tc.createdDate).split('T')[0] : "") : "", 
            idx === 0 ? (tc.updatedBy || "") : "", 
            idx === 0 ? (tc.updatedDate ? String(tc.updatedDate).split('T')[0] : "") : "",
          ]);
        });
      });

      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      ws['!cols'] = [
        { wch: 18 }, { wch: 40 }, { wch: 15 }, { wch: 25 }, { wch: 25 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, 
        { wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 25 }, { wch: 30 }, { wch: 40 }, { wch: 30 }, 
        { wch: 30 }, { wch: 50 }, { wch: 50 }, { wch: 30 }, { wch: 12 }, { wch: 8 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
      ];
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Test Cases");
      
      const fileName = getFileName('xlsx');
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      
      console.log("🚀 ATOMIC TRIGGER: Excel Delivery (Blob)...");
      const a = document.createElement('a'); a.href = url; a.download = fileName; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (err: any) {
      console.error("Excel Export Error:", err);
      alert("Excel Export failed! " + (err.message || "Unknown error"));
    }
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-5 py-2 bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-primary)] font-semibold hover:bg-[var(--bg-elevated)] transition shadow-sm"
      >
        <Download size={15} className="text-[var(--accent-cyan)]" /> Export <ChevronDown size={13} className="opacity-50" />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '110%', right: 0, minWidth: 200,
          background: 'var(--bg-overlay)', border: '1px solid var(--border-strong)',
          borderRadius: 12, zIndex: 99999, overflow: 'hidden', boxShadow: 'var(--shadow-lg)'
        }}>
          <button onClick={exportCSV} className="w-full text-left px-4 py-3 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition flex items-center gap-3">📄 CSV</button>
          <button onClick={exportExcel} className="w-full text-left px-4 py-3 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition flex items-center gap-3 border-t border-[var(--border-base)]">📊 Excel</button>
        </div>
      )}
    </div>
  );
}

 function TestCasesInner() {
   const router = useRouter();
   const { activeProject: projectFilter, projects: allProjectsContext, setActiveProject } = useProject();

  const [testCases, setTestCases] = useState<any[]>([]);
  // Use state or context. Since TopNav handles project context, we can rely on that for projects.
  const [projects, setProjects] = useState<any[]>([]);
  const [sprints, setSprints] = useState<any[]>([]);
  const [configs, setConfigs] = useState<any>({ testCategories: [], testingTypes: [], testIntents: [] });
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<string>("admin");
  const [selectedTC, setSelectedTC] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<any>({ ...EMPTY_TC, project: projectFilter });
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterModule, setFilterModule] = useState("");
  const [filterSubModule, setFilterSubModule] = useState("");
  const [filterEntity, setFilterEntity] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterTestingType, setFilterTestingType] = useState("");
  const [filterCreatedBy, setFilterCreatedBy] = useState("");
  const [filterModifiedBy, setFilterModifiedBy] = useState("");
  const [filterCreatedDate, setFilterCreatedDate] = useState("");
  const [filterModifiedDate, setFilterModifiedDate] = useState("");
  const [newLabel, setNewLabel] = useState("");

  const [selectedTCs, setSelectedTCs] = useState<string[]>([]);
  const [showSuiteModal, setShowSuiteModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTester, setAssignTester] = useState("");
  const [suiteForm, setSuiteForm] = useState({
    name: "", suiteDesc: "", sprint: "", sprintStart: "", sprintEnd: "", sprintDesc: "", project: ""
  });
  const [existingSuites, setExistingSuites] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // Detail-panel tabs
  const [detailTab, setDetailTab] = useState<'edit' | 'history' | 'attachments'>('edit');
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchAll();
    fetch("/api/auth/users?me=true").then(r => r.json()).then(d => {
      if (d.success) { setUserRole(d.user?.role); setCurrentUser(d.user?.username || "admin"); }
    });
  }, [projectFilter]);

  const fetchAll = async () => {
    const [tcRes, prRes, cfgRes, stRes, spRes] = await Promise.all([
      fetch(`/api/testcases${projectFilter ? `?project=${projectFilter}` : ""}`).then(r => r.json()),
      fetch("/api/projects").then(r => r.json()),
      fetch("/api/admin/configs").then(r => r.json()),
      fetch("/api/suites").then(r => r.json()),
      fetch("/api/sprints").then(r => r.json()),
    ]);
    if (tcRes.success) setTestCases(tcRes.testCases);
    if (prRes.success) setProjects(prRes.projects);
    if (cfgRes.success) setConfigs(cfgRes.configs);
    if (stRes.success) setExistingSuites(stRes.suites);
    if (spRes.success) setSprints(spRes.sprints);

    // load users for assignment
    const usrRes = await fetch("/api/auth/users").then(r => r.json());
    if (usrRes.success) setUsers(usrRes.users || []);
  };

  const selectedProject = projects.find((p: any) => p.key === form.project);
  const modules = selectedProject?.modules || [];
  const subModules = modules.find((m: any) => m.name === form.module)?.subModules || [];
  const entities = subModules.find((s: any) => s.name === form.subModule)?.entities || [];

  const startNew = () => {
    setForm({ ...EMPTY_TC, project: projectFilter, createdBy: currentUser } as any);
    setSelectedTC(null);
    setIsEditing(true);
  };

  const openTC = (tc: any) => {
    setSelectedTC(tc);
    setForm({ ...tc });
    setIsEditing(true);
    setDetailTab('edit');
    setAttachments([]);
    // Load attachments for this TC
    fetch(`/api/attachments?refId=${tc.testCaseId}`).then(r => r.json()).then(d => {
      if (d.success) setAttachments(d.attachments);
    });
  };

  const cloneTC = (tc: any) => {
    setForm({
      title: tc.title + " (Copy)", objective: tc.objective || "", description: tc.description || "",
      project: tc.project || "", module: tc.module || "", subModule: tc.subModule || "",
      entity: tc.entity || "", priority: tc.priority || "Medium", status: "Draft",
      testCategory: tc.testCategory || "", testingType: tc.testingType || "",
      testIntent: tc.testIntent || "", automationType: tc.automationType || "Not Automated",
      labels: tc.labels || [], preconditions: tc.preconditions || "",
      estimatedTime: tc.estimatedTime || "",
      steps: tc.steps?.map((s: any) => ({ ...s })) || [],
    });
    setSelectedTC(null);
    setIsEditing(true);
  };

  const save = async () => {
    if (!form.title.trim()) {
      alert("Test Case Title is required.");
      return;
    }
    if (!form.project) {
      alert("Please select a Project.");
      return;
    }

    // 1. Prune empty steps first
    const prunedSteps = (form.steps || []).filter((s: any) => s.action.trim() || s.expectedResult.trim());
    
    // 2. Validate at least one valid step remains
    if (prunedSteps.length === 0) {
      alert("Test steps are required to create a Test Case.");
      return;
    }

    setSaving(true);
    const payload = selectedTC ? { ...form, steps: prunedSteps, testCaseId: selectedTC.testCaseId, updatedBy: currentUser } : { ...form, steps: prunedSteps, createdBy: currentUser };
    const res = await fetch("/api/testcases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (data.success) { await fetchAll(); setSelectedTC(data.testCase); } else alert(data.error);
    setSaving(false);
  };

  const deleteTC = async (id: string) => {
    if (!confirm(`Delete test case ${id}?`)) return;
    await fetch("/api/testcases", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ testCaseId: id }) });
    await fetchAll();
    setIsEditing(false); setSelectedTC(null);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedTCs.length} test case(s)?`)) return;
    const res = await fetch("/api/testcases", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ testCaseIds: selectedTCs }) });
    const data = await res.json();
    if (data.success) {
      setSelectedTCs([]);
      fetchAll();
    }
  };

  const addStep = () => setForm((f: any) => ({ ...f, steps: [...f.steps, { action: "", testData: "", expectedResult: "" }] }));
  const updateStep = (idx: number, key: string, val: string) => setForm((f: any) => {
    const steps = [...f.steps]; steps[idx] = { ...steps[idx], [key]: val }; return { ...f, steps };
  });
  const removeStep = (idx: number) => setForm((f: any) => ({ ...f, steps: f.steps.filter((_: any, i: number) => i !== idx) }));
  const moveStep = (idx: number, dir: 'up' | 'down') => {
    const steps = [...form.steps];
    const tgt = dir === 'up' ? idx - 1 : idx + 1;
    if (tgt < 0 || tgt >= steps.length) return;
    [steps[tgt], steps[idx]] = [steps[idx], steps[tgt]];
    setForm((f: any) => ({ ...f, steps }));
  };

  const addLabel = () => { if (!newLabel.trim()) return; setForm((f: any) => ({ ...f, labels: [...f.labels, newLabel.trim()] })); setNewLabel(""); };

  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTCs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleAddToSuite = async () => {
    if (!suiteForm.name.trim()) return alert("Suite Name is required.");
    if (!suiteForm.sprint.trim()) return alert("Sprint Name is required.");
    if (!suiteForm.sprintStart) return alert("Sprint Start Date is required.");
    if (!suiteForm.sprintEnd) return alert("Sprint End Date is required.");

    const targetProject = suiteForm.project || projectFilter;

    // Auto-create sprint if it's a new name not in existing sprints
    const existingSprint = sprints.find((s: any) => s.name.toLowerCase() === suiteForm.sprint.toLowerCase());
    if (!existingSprint) {
      await fetch("/api/sprints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: suiteForm.sprint,
          startDate: suiteForm.sprintStart,
          endDate: suiteForm.sprintEnd,
          description: suiteForm.sprintDesc,
          status: "Planned",
          project: targetProject
        })
      });
    }

    const res = await fetch("/api/suites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: suiteForm.name, description: suiteForm.suiteDesc, sprint: suiteForm.sprint, project: targetProject, testCaseIds: selectedTCs, createdBy: currentUser })
    });
    if ((await res.json()).success) {
      setSelectedTCs([]);
      setShowSuiteModal(false);
      setSuiteForm({ name: "", suiteDesc: "", sprint: "", sprintStart: "", sprintEnd: "", sprintDesc: "", project: "" });
      fetchAll();
      alert(`✅ ${selectedTCs.length} test case(s) added to suite "${suiteForm.name}" under Sprint "${suiteForm.sprint}"`);
      router.push("/suites");
    }
  };

  const handleBulkAssign = async () => {
    if (!assignTester) return alert("Select a tester");
    const res = await fetch("/api/testcases/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ testCaseIds: selectedTCs, assignedTester: assignTester, updatedBy: currentUser })
    });
    const data = await res.json();
    if (data.success) {
      alert(`✅ Assigned "${assignTester}" to ${data.updated} test case(s)`);
      setSelectedTCs([]);
      setShowAssignModal(false);
      setAssignTester("");
      fetchAll();
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTC) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("refId", selectedTC.testCaseId);
    fd.append("refType", "testcase");
    fd.append("uploadedBy", currentUser);
    const res = await fetch("/api/attachments", { method: "POST", body: fd });
    const data = await res.json();
    if (data.success) setAttachments(prev => [...prev, data.attachment]);
    setUploading(false);
    e.target.value = "";
  };

  const deleteAttachment = async (id: string) => {
    await fetch("/api/attachments", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const filtered = testCases
    .filter(tc => !searchQuery || tc.title?.toLowerCase().includes(searchQuery.toLowerCase()) || tc.testCaseId?.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(tc => !filterPriority || tc.priority === filterPriority)
    .filter(tc => !filterStatus || tc.status === filterStatus)
    .filter(tc => !filterModule || tc.module === filterModule)
    .filter(tc => !filterSubModule || tc.subModule === filterSubModule)
    .filter(tc => !filterEntity || tc.entity === filterEntity)
    .filter(tc => !filterCategory || tc.testCategory === filterCategory)
    .filter(tc => !filterTestingType || tc.testingType === filterTestingType)
    .filter(tc => !filterCreatedBy || tc.createdBy?.toLowerCase().includes(filterCreatedBy.toLowerCase()))
    .filter(tc => !filterModifiedBy || tc.updatedBy?.toLowerCase().includes(filterModifiedBy.toLowerCase()))
    .filter(tc => !filterCreatedDate || (tc.createdDate && tc.createdDate.includes(filterCreatedDate)))
    .filter(tc => !filterModifiedDate || (tc.updatedDate && tc.updatedDate.includes(filterModifiedDate)));

  const priorityColor: any = { Highest: "text-red-400 bg-red-500/10 border-red-500/20", High: "text-orange-400 bg-orange-500/10 border-orange-500/20", Medium: "text-blue-400 bg-blue-500/10 border-blue-500/20", Low: "text-gray-400 bg-gray-500/10 border-gray-500/20" };
  const statusColor: any = { Draft: "text-yellow-400 bg-yellow-500/10", Active: "text-green-400 bg-green-500/10", Deprecated: "text-red-400 bg-red-500/10", Review: "text-purple-400 bg-purple-500/10" };

  return (
    <div className="flex h-screen bg-[var(--bg-base)] text-[var(--text-primary)] font-sans">
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <TopNav />
        <header className="page-header sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <h1 className="page-title">Test Repository</h1>
          </div>
          <div className="flex gap-3 items-center">
             <ExportDropdown 
               testCases={selectedTCs.length > 0 ? filtered.filter(tc => selectedTCs.includes(tc.testCaseId)) : filtered} 
               activeProject={allProjectsContext.find((p: any) => p.key === projectFilter)?.name || "Global_All_Context"} 
             />
             <Link href="/testcases/new" target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ padding: "10px 22px", boxShadow: "0 8px 24px rgba(6,182,212,0.3)" }}>
               <FileText size={16} strokeWidth={2.5} /> New Test Case
             </Link>
          </div>
        </header>


        {/* Filter Bar */}
        <div className="px-6 py-3 border-b border-[var(--border-base)] bg-[var(--bg-base)] flex flex-wrap items-center gap-3 shrink-0">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-[var(--bg-surface)] border-[var(--border-base)] rounded-lg pl-8 pr-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500 transition" placeholder="Search test cases..." />
          </div>

          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
            className="bg-[var(--bg-surface)] border-[var(--border-base)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500 transition appearance-none min-w-32">
            <option value="">All Priorities</option>
            <option value="Highest">Highest</option><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="bg-[var(--bg-surface)] border-[var(--border-base)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500 transition appearance-none min-w-32">
            <option value="">All Statuses</option>
            <option value="Draft">Draft</option><option value="Active">Active</option><option value="Review">Review</option><option value="Deprecated">Deprecated</option>
          </select>
          <select value={filterModule} onChange={e => { setFilterModule(e.target.value); setFilterSubModule(""); setFilterEntity(""); }}
            className="bg-[var(--bg-surface)] border-[var(--border-base)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500 transition appearance-none min-w-32">
            <option value="">All Modules</option>
            {[...new Set(testCases.map((t:any)=>t.module).filter(Boolean))].map((m:any) => <option key={m} value={m}>{m}</option>)}
          </select>

          <div className="flex items-center gap-2 border-[var(--border-base)] pl-3">
            <Search size={12} className="text-[var(--text-muted)]" />
            <input value={filterCreatedBy} onChange={e => setFilterCreatedBy(e.target.value)}
              className="bg-[var(--bg-surface)] border-[var(--border-base)] rounded-lg px-2 py-1.5 text-[11px] text-[var(--text-primary)] focus:outline-none focus:border-blue-500 transition w-24" placeholder="Author..." title="Created By" />
            <div className="flex items-center gap-1.5 bg-[var(--bg-surface)] border-[var(--border-base)] rounded-lg px-2 text-[11px] text-[var(--text-primary)] focus-within:border-blue-500 transition cursor-pointer group"
              onClick={(e) => { const input = e.currentTarget.querySelector('input'); if(input) { (input as any).showPicker?.() || input.focus(); } }}>
              <Calendar size={11} className="group-hover:text-blue-400 transition" />
              <input type="date" value={filterCreatedDate} onChange={e => setFilterCreatedDate(e.target.value)}
                className="bg-transparent border-none py-1.5 text-[var(--text-primary)] focus:outline-none w-24 cursor-pointer" title="Created On" onClick={e => e.stopPropagation()} />
            </div>
          </div>

          <div className="flex items-center gap-2 border-[var(--border-base)] pl-3">
            <Clock size={12} className="text-[var(--text-muted)]" />
            <input value={filterModifiedBy} onChange={e => setFilterModifiedBy(e.target.value)}
              className="bg-[var(--bg-surface)] border-[var(--border-base)] rounded-lg px-2 py-1.5 text-[11px] text-[var(--text-primary)] focus:outline-none focus:border-blue-500 transition w-24" placeholder="Modifier..." title="Modified By" />
            <div className="flex items-center gap-1.5 bg-[var(--bg-surface)] border-[var(--border-base)] rounded-lg px-2 text-[11px] text-[var(--text-primary)] focus-within:border-blue-500 transition cursor-pointer group"
              onClick={(e) => { const input = e.currentTarget.querySelector('input'); if(input) { (input as any).showPicker?.() || input.focus(); } }}>
              <Calendar size={11} className="group-hover:text-blue-400 transition" />
              <input type="date" value={filterModifiedDate} onChange={e => setFilterModifiedDate(e.target.value)}
                className="bg-transparent border-none py-1.5 text-[var(--text-primary)] focus:outline-none w-24 cursor-pointer" title="Modified On" onClick={e => e.stopPropagation()} />
            </div>
          </div>

          {(filterPriority||filterStatus||filterModule||searchQuery||filterCreatedBy||filterModifiedBy||filterCreatedDate||filterModifiedDate) && (
            <button onClick={() => { setSearchQuery(""); setFilterPriority(""); setFilterStatus(""); setFilterModule(""); setFilterSubModule(""); setFilterEntity(""); setFilterCategory(""); setFilterTestingType(""); }}
              className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-red-400 transition px-3 py-2 border border-[var(--border-base)] rounded-lg hover:border-red-400/30">
              <FilterX size={13} /> Clear
            </button>
          )}

          <span className="text-xs text-[var(--text-muted)] ml-auto">{filtered.length} / {testCases.length} TCs</span>
        </div>

        {/* Table View */}
        <div className="flex-1 overflow-auto relative">
          <AnimatePresence>
            {selectedTCs.length > 0 && (
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
                className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 glass-panel border border-[var(--border-strong)] rounded-full px-6 py-3 flex items-center gap-4 shadow-2xl bg-[var(--bg-overlay)] backdrop-blur-md">
                <span className="text-[var(--text-primary)] font-bold text-sm bg-[var(--accent-cyan)]/20 px-3 py-1 rounded-full">{selectedTCs.length} Selected</span>
                <div className="h-6 w-px bg-[var(--border-base)]" />
                <button onClick={() => {
                  setSuiteForm(prev => ({ ...prev, project: projectFilter }));
                  setShowSuiteModal(true);
                }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-[var(--accent-cyan)] text-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 hover:bg-[var(--accent-cyan)]/20 transition">
                  <Layers size={14}/> Add to Suite
                </button>
                <button onClick={() => setShowAssignModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--bg-surface)] border border-[var(--border-base)] hover:bg-[var(--bg-elevated)] transition">
                  <UserCheck size={14}/> Assign Tester
                </button>
                <div className="h-6 w-px bg-[var(--border-base)]" />
                <button onClick={handleBulkDelete} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-red-500/50 text-red-400 bg-red-500/10 hover:bg-red-500/20 transition">
                  <Trash2 size={14}/> Delete
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {!projectFilter ? (
            <div className="text-center mt-20 p-12 glass-panel border border-[var(--border-base)] rounded-3xl max-w-lg mx-auto">
              <FolderOpen className="mx-auto text-[var(--accent-cyan)] mb-4 animate-pulse" size={48} />
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">No Project Selected</h3>
              <p className="text-[var(--text-muted)] text-sm">
                Please select a project from the top menu to view and manage your Test Repository.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center mt-20">
              <FileText className="mx-auto text-[var(--text-muted)] mb-3" size={40} />
              <p className="text-[var(--text-muted)] text-sm">No test cases match filters.</p>
            </div>
          ) : (
            <table className="w-full text-sm border-collapse min-w-[max-content]">
              <thead className="sticky top-0 z-10 bg-[var(--bg-elevated)] border-b border-[var(--border-base)]">
                <tr>
                  <th className="px-4 py-3 w-10">
                     <input type="checkbox" checked={filtered.length > 0 && selectedTCs.length === filtered.length} onChange={(e) => setSelectedTCs(e.target.checked ? filtered.map(t => t.testCaseId) : [])} className="w-4 h-4 rounded border-[var(--border-base)] bg-black/50 accent-blue-500 cursor-pointer" />
                  </th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-4 py-3 w-28">TC No.</th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-4 py-3">Title / Module</th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-4 py-3 w-32">Priority</th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-4 py-3 w-36">Status</th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-4 py-3 w-40">Assignee</th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-4 py-3 w-36">Created Details</th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-4 py-3 w-36">Modified Details</th>
                  <th className="text-right text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-4 py-3 w-28">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tc: any) => (
                  <tr key={tc.testCaseId} className="border-b border-[var(--border-base)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer group" onClick={() => window.open(`/testcases/${tc.testCaseId}/edit`, '_blank')}>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedTCs.includes(tc.testCaseId)} onChange={(e) => handleToggleSelect(tc.testCaseId, e as any)} className="w-4 h-4 rounded border-[var(--border-base)] bg-black/50 accent-blue-500 cursor-pointer" />
                    </td>
                    <td className="px-4 py-3"><span className="font-mono text-xs text-blue-400/80">{tc.testCaseId}</span></td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[var(--text-primary)] leading-tight truncate max-w-sm">{tc.title}</div>
                      {(tc.module || tc.subModule) && <div className="text-[10px] text-[var(--text-muted)] mt-0.5 truncate max-w-sm">{tc.module}{tc.subModule ? ` › ${tc.subModule}` : ""}</div>}
                    </td>
                    <td className="px-4 py-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${priorityColor[tc.priority] || 'text-[var(--text-muted)] bg-[var(--bg-surface)] border-[var(--border-base)]'}`}>{tc.priority}</span></td>
                    <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColor[tc.status] || 'text-[var(--text-muted)] bg-[var(--bg-surface)]'}`}>{tc.status}</span></td>
                    <td className="px-4 py-3">
                      {tc.assignedTester ? <span className="flex items-center gap-1 text-xs text-[var(--text-secondary)]"><UserCheck size={11} className="text-blue-400" />{tc.assignedTester}</span> : <span className="text-xs text-[var(--text-muted)]">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-[10px] text-[var(--text-secondary)] font-bold">{tc.createdBy || "admin"}</div>
                      <div className="text-[9px] text-[var(--text-muted)] mt-0.5">{tc.createdDate ? new Date(tc.createdDate).toLocaleDateString() : "—"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-[10px] text-[var(--text-secondary)] font-bold">{tc.updatedBy || "admin"}</div>
                      <div className="text-[9px] text-[var(--text-muted)] mt-0.5">{tc.updatedDate ? new Date(tc.updatedDate).toLocaleDateString() : "—"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end" onClick={e => e.stopPropagation()}>
                         <button onClick={() => cloneTC(tc)} className="p-1.5 text-blue-400 hover:text-white bg-blue-400/10 hover:bg-blue-500 rounded-lg transition-all border border-blue-400/20" title="Clone"><Copy size={14} /></button>
                         <button onClick={() => deleteTC(tc.testCaseId)} className="p-1.5 text-red-400 hover:text-white bg-red-400/10 hover:bg-red-500 rounded-lg transition-all border border-red-400/20" title="Delete"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Suite + Sprint Creation Modal */}
      <AnimatePresence>
        {showSuiteModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-[var(--bg-overlay)] border border-[var(--border-base)] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-[var(--border-base)] bg-[var(--bg-surface)] flex justify-between items-center shadow-sm">
                <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2"><Layers size={20} className="text-[var(--accent-cyan)]" /> Add to Test Suite</h2>
                <button onClick={() => { setShowSuiteModal(false); setSuiteForm({ name: "", suiteDesc: "", sprint: "", sprintStart: "", sprintEnd: "", sprintDesc: "", project: "" }); }} className="p-2 hover:bg-[var(--bg-elevated)] rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"><X size={20} /></button>
              </div>
              <div className="p-6 flex flex-col gap-5 max-h-[80vh] overflow-y-auto">
                <div className="px-4 py-3 bg-[var(--accent-cyan)]/5 border border-[var(--accent-cyan)]/15 rounded-xl flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full bg-[var(--accent-cyan)]/10 flex items-center justify-center text-[var(--accent-cyan)]"><FileText size={16} /></div>
                   <p className="text-sm text-[var(--text-secondary)] font-medium">Adding <strong className="text-[var(--text-primary)]">{selectedTCs.length}</strong> test case(s) to a suite and execution sprint.</p>
                </div>

                {/* Suite Name + Description */}
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div>
                    <label className="text-[var(--text-secondary)] font-bold uppercase tracking-wider" style={{ display: "block", marginBottom: 8, fontSize: 10 }}>Suite Name *</label>
                    <input 
                      list="suites-list" 
                      value={suiteForm.name} 
                      onChange={e => setSuiteForm((f: any) => ({ ...f, name: e.target.value }))} 
                      className="form-input"
                      style={{ height: 46, padding: "0 16px", fontSize: 13, background: "var(--bg-overlay)", border: "1.5px solid var(--border-strong)", color: "var(--text-primary)" }}
                      placeholder="e.g. Payment Regression Suite" 
                    />
                    <datalist id="suites-list">
                      {existingSuites.map((s: any) => <option key={s.id} value={s.name} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className="text-[var(--text-secondary)] font-bold uppercase tracking-wider" style={{ display: "block", marginBottom: 8, fontSize: 10 }}>Suite Description</label>
                    <textarea 
                      value={suiteForm.suiteDesc} 
                      onChange={e => setSuiteForm((f: any) => ({ ...f, suiteDesc: e.target.value }))} 
                      rows={2}
                      className="form-textarea"
                      style={{ padding: "12px 16px", fontSize: 13, background: "var(--bg-overlay)", border: "1.5px solid var(--border-strong)", color: "var(--text-primary)", resize: "none" }}
                      placeholder="Purpose or scope of this suite..." 
                    />
                  </div>
                </div>

                {/* Divider */}
                <div style={{ marginTop: 8, paddingTop: 20, borderTop: "1px solid var(--border-base)" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.5px", color: "var(--accent-cyan)", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                    <Layers size={14} /> Sprint Selection
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {/* Sprint Name */}
                    <div>
                      <label className="text-[var(--text-secondary)] font-bold uppercase tracking-wider" style={{ display: "block", marginBottom: 8, fontSize: 10 }}>Sprint Name *</label>
                      <select 
                        value={suiteForm.sprint} 
                        onChange={e => {
                          const selected = sprints.find((s: any) => s.name === e.target.value);
                          setSuiteForm((f: any) => ({ 
                            ...f, 
                            sprint: e.target.value,
                            sprintStart: selected ? (selected.start || selected.startDate || "") : f.sprintStart,
                            sprintEnd: selected ? (selected.end || selected.endDate || "") : f.sprintEnd,
                            sprintDesc: selected ? (selected.description || selected.suiteDesc || "") : f.sprintDesc
                          }));
                        }} 
                        className="form-input"
                        style={{ height: 46, padding: "0 16px", fontSize: 13, border: "1px solid var(--border-strong)", color: "var(--text-primary)" }}
                      >
                        <option value="" style={{ color: "var(--text-primary)", background: "var(--bg-overlay)" }}>— Select Sprint —</option>
                        {sprints.map((s: any) => <option key={s.id} value={s.name} style={{ color: "var(--text-primary)", background: "var(--bg-overlay)" }}>{s.name}</option>)}
                      </select>
                      <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 6 }}>
                        Select an active sprint to automatically sync its duration.
                      </p>
                    </div>

                    {/* Sprint Dates */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <div>
                        <label className="text-[var(--text-secondary)] font-bold uppercase tracking-wider" style={{ display: "block", marginBottom: 8, fontSize: 10 }}>📅 Start Date *</label>
                        <input
                          type="date"
                          value={suiteForm.sprintStart}
                          disabled={!!suiteForm.sprint}
                          onChange={e => setSuiteForm((f: any) => ({ ...f, sprintStart: e.target.value }))}
                          style={{
                            opacity: suiteForm.sprint ? 0.6 : 1,
                            cursor: suiteForm.sprint ? 'not-allowed' : 'pointer',
                            height: 46, padding: "0 16px", fontSize: 13, background: "var(--bg-overlay)", border: "1.5px solid var(--border-strong)", color: "var(--text-primary)"
                          }}
                          className="form-input"
                        />
                      </div>
                      <div>
                        <label className="text-[var(--text-secondary)] font-bold uppercase tracking-wider" style={{ display: "block", marginBottom: 8, fontSize: 10 }}>🏁 End Date *</label>
                        <input
                          type="date"
                          value={suiteForm.sprintEnd}
                          disabled={!!suiteForm.sprint}
                          min={suiteForm.sprintStart || undefined}
                          onChange={e => setSuiteForm((f: any) => ({ ...f, sprintEnd: e.target.value }))}
                          style={{
                            opacity: suiteForm.sprint ? 0.6 : 1,
                            cursor: suiteForm.sprint ? 'not-allowed' : 'pointer',
                            height: 46, padding: "0 16px", fontSize: 13, background: "var(--bg-overlay)", border: "1.5px solid var(--border-strong)", color: "var(--text-primary)"
                          }}
                          className="form-input"
                        />
                      </div>
                    </div>

                    {/* Sprint Description */}
                    <div>
                      <label className="text-[var(--text-secondary)] font-bold uppercase tracking-wider" style={{ display: "block", marginBottom: 8, fontSize: 10 }}>Description</label>
                      <textarea
                        value={suiteForm.sprintDesc}
                        onChange={e => setSuiteForm((f: any) => ({ ...f, sprintDesc: e.target.value }))}
                        rows={2}
                        className="form-textarea"
                        style={{ padding: "12px 16px", fontSize: 13, background: "var(--bg-overlay)", border: "1.5px solid var(--border-strong)", color: "var(--text-primary)", resize: "none" }}
                        placeholder="Optional sprint description..."
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => { setShowSuiteModal(false); setSuiteForm({ name: "", suiteDesc: "", sprint: "", sprintStart: "", sprintEnd: "", sprintDesc: "", project: "" }); }} className="flex-1 py-3 rounded-xl glass-panel border border-[var(--border-base)] text-[var(--text-secondary)] font-semibold hover:bg-[var(--bg-surface)]">Cancel</button>
                  <button onClick={handleAddToSuite} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold shadow-lg hover:opacity-90 active:scale-95 transition">Confirm & Plan</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assign Tester Modal */}
      <AnimatePresence>
        {showAssignModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-[var(--bg-overlay)] border border-[var(--border-base)] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
              <div className="p-5 border-b border-[var(--border-base)] bg-gradient-to-r from-[var(--accent-cyan)]/10 to-[var(--accent-violet)]/10 flex justify-between items-center">
                <h2 className="font-bold text-[var(--text-primary)] flex items-center gap-2"><UserCheck size={18} className="text-[var(--accent-cyan)]" /> Assign Tester</h2>
                <button onClick={() => setShowAssignModal(false)} className="p-1.5 hover:bg-[var(--bg-elevated)] rounded-lg text-[var(--text-muted)] transition-colors"><X size={18} /></button>
              </div>
              <div className="p-6 flex flex-col gap-5">
                <p className="text-sm text-[var(--text-secondary)]">Assigning tester to <strong className="text-[var(--text-primary)] underline decoration-[var(--accent-cyan)]/30 underline-offset-4">{selectedTCs.length}</strong> test case(s)</p>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Select Tester</label>
                  <select value={assignTester} onChange={e => setAssignTester(e.target.value)}
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-xl px-4 py-3 text-[var(--text-primary)] font-medium focus:outline-none focus:border-[var(--accent-cyan)] transition-all shadow-sm">
                    <option value="" style={{ background: 'var(--bg-overlay)', color: 'var(--text-primary)' }}>— Choose a team member —</option>
                    {users.map((u: any) => (
                      <option key={u.username} value={u.username} style={{ background: 'var(--bg-overlay)', color: 'var(--text-primary)' }}>
                        {u.username} ({u.role})
                      </option>
                    ))}
                  </select>
                  <div className="relative mt-4">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-[var(--border-base)]"></span></div>
                    <div className="relative flex justify-center text-[9px] uppercase tracking-tighter"><span className="bg-[var(--bg-overlay)] px-2 text-[var(--text-muted)] font-bold">OR TYPE MANUALLY</span></div>
                  </div>
                  <input value={assignTester} onChange={e => setAssignTester(e.target.value)} placeholder="Type tester name..."
                    className="mt-4 w-full bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm font-medium focus:outline-none focus:border-[var(--accent-cyan)] transition-all shadow-sm" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => { setShowAssignModal(false); setAssignTester(""); }} className="flex-1 py-3 rounded-xl glass-panel border border-[var(--border-base)] text-[var(--text-secondary)] font-semibold hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition-all">Cancel</button>
                  <button onClick={handleBulkAssign} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-violet)] text-white font-bold shadow-lg shadow-cyan-500/20 hover:opacity-90 active:scale-[0.98] transition-all">Assign Now</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Editing Modal Slide-Over */}
      <AnimatePresence>
        {isEditing && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]" onClick={() => setIsEditing(false)} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: "spring", damping: 25, stiffness: 200 }} 
              className="fixed inset-y-0 right-0 w-full md:w-[85vw] lg:w-[70vw] bg-[var(--bg-overlay)] shadow-2xl z-[70] flex flex-col border-l border-[var(--border-base)] overflow-hidden text-sm">
              
              <header className="h-16 flex items-center justify-between px-6 border-b border-[var(--border-base)] flex-shrink-0 bg-white/[0.02]">
                <div className="flex items-center gap-3">
                   <button onClick={() => setIsEditing(false)} className="p-2 -ml-2 text-[var(--text-muted)] hover:text-white rounded-lg hover:bg-[var(--bg-surface)] transition"><ChevronRight size={20}/></button>
                   <div>
                     <h2 className="text-lg font-semibold text-[var(--text-primary)] leading-tight">{selectedTC ? "Edit Test Case" : "New Test Case"}</h2>
                     {selectedTC && <p className="text-[10px] font-mono text-[var(--text-muted)]">{selectedTC.testCaseId} · v{selectedTC.version}</p>}
                   </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedTC && <button onClick={() => cloneTC(selectedTC)} className="px-3 py-1.5 rounded-lg glass-panel border border-[var(--border-base)] text-[var(--text-secondary)] hover:text-white flex items-center gap-1.5 text-xs transition"><Copy size={14} />Clone</button>}
                  <button onClick={save} disabled={saving} className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 font-medium flex items-center gap-1.5 hover:opacity-90 transition shadow-lg text-xs font-bold text-[var(--text-primary)]">
                    <Save size={14} />{saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto w-full pb-20 pt-4">
                <div className="p-8 max-w-5xl w-full mx-auto">
            {/* Title */}
            <input
              value={form.title}
              onChange={e => setForm((f: any) => ({ ...f, title: e.target.value }))}
              className="text-3xl font-bold bg-transparent border-none focus:outline-none text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 placeholder-white/20 w-full mb-6"
              placeholder="Test Case Title..."
            />

            {/* Section 1: Classification */}
            <div className="glass-panel rounded-2xl border border-[var(--border-base)] overflow-hidden mb-6">
              <div className="bg-[var(--bg-surface)] px-6 py-3 border-b border-[var(--border-base)] text-sm font-semibold text-[var(--text-secondary)]">📁 Classification & Metadata</div>
              <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-4">
                {/* Project */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">Project *</label>
                  <select value={form.project} onChange={e => setForm((f: any) => ({ ...f, project: e.target.value, module: "", subModule: "", entity: "" }))}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-base)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm focus:outline-none focus:border-blue-500 transition appearance-none">
                    <option value="" style={{ background: 'var(--bg-overlay)' }}>— Select Project —</option>
                    {projects.map((p: any) => <option key={p.id} value={p.key} style={{ background: 'var(--bg-overlay)' }}>{p.name} ({p.key})</option>)}
                  </select>
                </div>
                {/* Module */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">Module</label>
                  <select value={form.module} onChange={e => setForm((f: any) => ({ ...f, module: e.target.value, subModule: "", entity: "" }))}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-base)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm focus:outline-none focus:border-blue-500 transition appearance-none">
                    <option value="" style={{ background: 'var(--bg-overlay)' }}>— Select Module —</option>
                    {modules.map((m: any) => <option key={m.name} value={m.name} style={{ background: 'var(--bg-overlay)' }}>{m.name}</option>)}
                  </select>
                </div>
                {/* SubModule */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">Sub Module</label>
                  <select value={form.subModule} onChange={e => setForm((f: any) => ({ ...f, subModule: e.target.value, entity: "" }))}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-base)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm focus:outline-none focus:border-blue-500 transition appearance-none">
                    <option value="" style={{ background: 'var(--bg-overlay)' }}>— Select Sub Module —</option>
                    {subModules.map((s: any) => <option key={s.name} value={s.name} style={{ background: 'var(--bg-overlay)' }}>{s.name}</option>)}
                  </select>
                </div>
                {/* Entity */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">Entity</label>
                  <select value={form.entity} onChange={e => setForm((f: any) => ({ ...f, entity: e.target.value }))}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-base)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm focus:outline-none focus:border-blue-500 transition appearance-none">
                    <option value="" style={{ background: 'var(--bg-overlay)' }}>— Select Entity —</option>
                    {entities.map((e: string) => <option key={e} value={e} style={{ background: 'var(--bg-overlay)' }}>{e}</option>)}
                  </select>
                </div>
                {/* Priority */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">Priority</label>
                  <select value={form.priority} onChange={e => setForm((f: any) => ({ ...f, priority: e.target.value as any }))}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-base)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm focus:outline-none focus:border-blue-500 transition appearance-none">
                    <option value="Highest" style={{ background: 'var(--bg-overlay)' }}>🚨 Highest</option>
                    <option value="High" style={{ background: 'var(--bg-overlay)' }}>🔴 High</option>
                    <option value="Medium" style={{ background: 'var(--bg-overlay)' }}>🔵 Medium</option>
                    <option value="Low" style={{ background: 'var(--bg-overlay)' }}>⚪ Low</option>
                  </select>
                </div>
                {/* Status */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm((f: any) => ({ ...f, status: e.target.value as any }))}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-base)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm focus:outline-none focus:border-blue-500 transition appearance-none">
                    <option value="Draft" style={{ background: 'var(--bg-overlay)' }}>🏗️ Draft</option>
                    <option value="Review" style={{ background: 'var(--bg-overlay)' }}>🔍 Review</option>
                    <option value="Active" style={{ background: 'var(--bg-overlay)' }}>✅ Active</option>
                    <option value="Deprecated" style={{ background: 'var(--bg-overlay)' }}>❌ Deprecated</option>
                  </select>
                </div>
                {/* Test Category */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">Test Category</label>
                  <select value={form.testCategory} onChange={e => setForm((f: any) => ({ ...f, testCategory: e.target.value }))}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-base)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm focus:outline-none focus:border-blue-500 transition appearance-none">
                    <option value="" style={{ background: 'var(--bg-overlay)' }}>— Select —</option>
                    {configs.testCategories?.filter((c: any) => c.enabled || c.name === form.testCategory).map((c: any) => <option key={c.id} value={c.name} style={{ background: 'var(--bg-overlay)' }}>{c.name}</option>)}
                  </select>
                </div>
                {/* Testing Type */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">Testing Type</label>
                  <select value={form.testingType} onChange={e => setForm((f: any) => ({ ...f, testingType: e.target.value }))}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-base)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm focus:outline-none focus:border-blue-500 transition appearance-none">
                    <option value="" style={{ background: 'var(--bg-overlay)' }}>— Select —</option>
                    {configs.testingTypes?.filter((c: any) => c.enabled || c.name === form.testingType).map((c: any) => <option key={c.id} value={c.name} style={{ background: 'var(--bg-overlay)' }}>{c.name}</option>)}
                  </select>
                </div>
                {/* Test Intent */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">Test Intent</label>
                  <select value={form.testIntent} onChange={e => setForm((f: any) => ({ ...f, testIntent: e.target.value }))}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-base)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm focus:outline-none focus:border-blue-500 transition appearance-none">
                    <option value="" style={{ background: 'var(--bg-overlay)' }}>— Select —</option>
                    {configs.testIntents?.filter((c: any) => c.enabled || c.name === form.testIntent).map((c: any) => <option key={c.id} value={c.name} style={{ background: 'var(--bg-overlay)' }}>{c.name}</option>)}
                  </select>
                </div>
                {/* Automation Type */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">Automation Type</label>
                  <select value={form.automationType} onChange={e => setForm((f: any) => ({ ...f, automationType: e.target.value }))}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-base)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm focus:outline-none focus:border-blue-500 transition appearance-none">
                    <option value="Not Automated" style={{ background: 'var(--bg-overlay)' }}>Not Automated</option>
                    <option value="Automated" style={{ background: 'var(--bg-overlay)' }}>Automated</option>
                    <option value="Semi-Automated" style={{ background: 'var(--bg-overlay)' }}>Semi-Automated</option>
                  </select>
                </div>

                {/* Estimated Time */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">Estimated Time (mins)</label>
                  <input type="number" value={form.estimatedTime} onChange={e => setForm((f: any) => ({ ...f, estimatedTime: e.target.value }))}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-base)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm focus:outline-none focus:border-blue-500 transition" placeholder="e.g. 15" />
                </div>
              </div>
            </div>

            {/* Section 2: Description & Preconditions */}
            <div className="glass-panel rounded-2xl border border-[var(--border-base)] overflow-hidden mb-6">
              <div className="bg-[var(--bg-surface)] px-6 py-3 border-b border-[var(--border-base)] text-sm font-semibold text-[var(--text-secondary)]">📋 Description & Conditions</div>
              <div className="p-6 flex flex-col gap-4">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">Test Objective</label>
                  <input value={form.objective} onChange={e => setForm((f: any) => ({ ...f, objective: e.target.value }))}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-base)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] text-sm focus:outline-none focus:border-blue-500 transition" placeholder="Brief purpose of this test case..." />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">Description</label>
                  <textarea value={form.description} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} rows={3}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-base)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] text-sm focus:outline-none focus:border-blue-500 transition resize-none" placeholder="Detailed description..." />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">Preconditions</label>
                  <textarea value={form.preconditions} onChange={e => setForm((f: any) => ({ ...f, preconditions: e.target.value }))} rows={3}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-base)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] text-sm focus:outline-none focus:border-blue-500 transition resize-none" placeholder="1. User must be logged in&#10;2. Module must be configured..." />
                </div>
                {/* Labels */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">Labels / Tags</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {form.labels.map((l: string, i: number) => (
                      <span key={i} className="flex items-center gap-1 px-2 py-0.5 bg-purple-500/10 text-purple-400 text-xs rounded-full border border-purple-500/20">
                        <Tag size={10} />{l}
                        <button onClick={() => setForm((f: any) => ({ ...f, labels: f.labels.filter((_: any, j: number) => j !== i) }))} className="hover:text-red-400 transition ml-0.5"><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input value={newLabel} onChange={e => setNewLabel(e.target.value)} onKeyDown={e => e.key === 'Enter' && addLabel()}
                      className="flex-1 bg-[var(--bg-input)] border border-[var(--border-base)] rounded-lg px-3 py-1.5 text-[var(--text-primary)] text-sm focus:outline-none focus:border-purple-500 transition" placeholder="Add label and press Enter..." />
                    <button onClick={addLabel} className="px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition text-sm"><Plus size={14} /></button>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Test Steps */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">🧪 Test Script (Steps)</h3>
                <button onClick={addStep} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition text-sm font-medium">
                  <Plus size={15} /> Add Step
                </button>
              </div>

              {/* Table Header */}
              <div className="hidden md:grid grid-cols-[3rem_1fr_1fr_1fr_3rem] gap-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] px-4 pb-1 border-b border-[var(--border-base)] mb-2">
                <span className="text-center">#</span>
                <span>Action / Step Description</span>
                <span>Test Data (Input)</span>
                <span>Expected Result / Outcome</span>
                <span></span>
              </div>

              <div className="flex flex-col gap-2">
                {form.steps.length === 0 && (
                  <div className="p-8 text-center border border-dashed border-[var(--border-base)] rounded-2xl text-[var(--text-muted)] text-sm">
                    No steps yet. Click "Add Step" to begin writing the test script.
                  </div>
                )}
                {form.steps.map((step: any, idx: number) => (
                  <motion.div key={idx} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 md:grid-cols-[3rem_1fr_1fr_1fr_3rem] gap-2 items-start group glass-panel rounded-xl p-3 border border-[var(--border-base)] hover:border-[var(--border-base)] transition">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs font-bold text-[var(--text-muted)]">{idx + 1}</span>
                      <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition">
                        <button onClick={() => moveStep(idx, 'up')} disabled={idx === 0} className="p-0.5 text-[var(--text-muted)] hover:text-white disabled:opacity-20"><MoveUp size={13} /></button>
                        <button onClick={() => moveStep(idx, 'down')} disabled={idx === form.steps.length - 1} className="p-0.5 text-[var(--text-muted)] hover:text-white disabled:opacity-20"><MoveDown size={13} /></button>
                      </div>
                    </div>
                    <textarea value={step.action} onChange={e => updateStep(idx, 'action', e.target.value)} rows={3}
                      placeholder="Step action/description..." className="bg-black/20 border border-[var(--border-base)] hover:border-[var(--border-base)] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition resize-none w-full" />
                    <textarea value={step.testData} onChange={e => updateStep(idx, 'testData', e.target.value)} rows={3}
                      placeholder="Input data, values, credentials..." className="bg-black/20 border border-[var(--border-base)] hover:border-[var(--border-base)] rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-yellow-500 transition resize-none w-full" />
                    <textarea value={step.expectedResult} onChange={e => updateStep(idx, 'expectedResult', e.target.value)} rows={3}
                      placeholder="What should happen after this step..." className="bg-black/20 border border-green-500/5 hover:border-green-500/30 rounded-lg px-3 py-2 text-sm text-green-100/80 focus:outline-none focus:border-green-500 transition resize-none w-full" />
                    <button onClick={() => removeStep(idx)} className="p-2 text-red-400/30 hover:text-red-400 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition self-center">
                      <Trash2 size={15} />
                    </button>
                  </motion.div>
                ))}
              </div>

              {form.steps.length > 0 && (
                <div className="mt-4 flex justify-center">
                  <button onClick={addStep} className="px-6 py-2.5 rounded-xl border border-dashed border-[var(--border-base)] text-[var(--text-muted)] hover:text-white hover:border-[var(--border-base)]0 transition flex items-center gap-2 text-sm bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)]">
                    <Plus size={16} /> Append Step
                  </button>
                </div>
              )}
            </div>

            {/* Metadata Footer */}
            {selectedTC && (
              <div className="mt-8">
                {/* Tab Bar */}
                <div className="flex gap-0 border-b border-[var(--border-base)] mb-4">
                  {(['edit', 'history', 'attachments'] as const).map(t => (
                    <button key={t} onClick={() => setDetailTab(t)}
                      className={`px-4 py-2 text-xs font-bold uppercase tracking-wider capitalize border-b-2 transition ${detailTab === t ? 'border-blue-500 text-blue-400' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}>
                      {t === 'history' ? '📋 History' : t === 'attachments' ? `📎 Attachments${attachments.length ? ` (${attachments.length})` : ''}` : '📝 Metadata'}
                    </button>
                  ))}
                </div>

                {/* Metadata Tab */}
                {detailTab === 'edit' && (
                  <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-base)] text-xs text-[var(--text-muted)] grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div><span className="text-[var(--text-muted)] block">Created By</span>{selectedTC.createdBy}</div>
                    <div><span className="text-[var(--text-muted)] block">Created</span>{new Date(selectedTC.createdDate).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" })}</div>
                    <div><span className="text-[var(--text-muted)] block">Last Modified By</span>{selectedTC.updatedBy}</div>
                    <div><span className="text-[var(--text-muted)] block">Last Modified</span>{new Date(selectedTC.updatedDate).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" })}</div>
                    <div><span className="text-[var(--text-muted)] block">Version</span>v{selectedTC.version}</div>
                    <div><span className="text-[var(--text-muted)] block">Test Case ID</span>{selectedTC.testCaseId}</div>
                    {selectedTC.assignedTester && <div className="col-span-2"><span className="text-[var(--text-muted)] block">Assigned Tester</span><span className="text-blue-400">{selectedTC.assignedTester}</span></div>}
                  </div>
                )}

                {/* History Tab */}
                {detailTab === 'history' && (
                  <div className="flex flex-col gap-3">
                    {(!selectedTC.history || selectedTC.history.length === 0) ? (
                      <div className="p-6 text-center text-[var(--text-muted)] text-sm border border-dashed border-[var(--border-base)] rounded-xl">
                        No history yet. Save a change to start tracking versions.
                      </div>
                    ) : [...selectedTC.history].reverse().map((h: any, i: number) => (
                      <div key={i} className="p-4 glass-panel rounded-xl border border-white/8 text-xs">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-[var(--text-secondary)]">v{h.version}</span>
                          <div className="text-[var(--text-muted)]">{h.savedBy} · {new Date(h.savedAt).toLocaleString("en-GB", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })}</div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-[var(--text-muted)]">
                          {h.snapshot?.title && <div><span className="text-[var(--text-muted)] block">Title</span>{h.snapshot.title}</div>}
                          {h.snapshot?.priority && <div><span className="text-[var(--text-muted)] block">Priority</span>{h.snapshot.priority}</div>}
                          {h.snapshot?.status && <div><span className="text-[var(--text-muted)] block">Status</span>{h.snapshot.status}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Attachments Tab */}
                {detailTab === 'attachments' && (
                  <div className="flex flex-col gap-3">
                    <label className={`flex items-center justify-center gap-3 p-4 border-2 border-dashed rounded-xl cursor-pointer transition ${uploading ? 'border-[var(--border-base)] bg-[var(--bg-surface)]' : 'border-blue-500/30 hover:border-blue-500/60 hover:bg-blue-500/5'}`}>
                      <Upload size={18} className="text-blue-400" />
                      <span className="text-sm text-white/50">{uploading ? "Uploading..." : "Click to upload screenshot, log, or document"}</span>
                      <input type="file" className="hidden" accept="image/*,.pdf,.log,.txt,.docx,.xlsx,.zip" onChange={handleUpload} disabled={uploading} />
                    </label>
                    <p className="text-[10px] text-[var(--text-muted)] text-center">Supported: PNG, JPG, PDF, LOG, TXT, DOCX, XLSX, ZIP</p>

                    {attachments.length === 0 ? (
                      <div className="p-6 text-center text-[var(--text-muted)] text-sm">No attachments yet.</div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {attachments.map((a: any) => (
                          <div key={a.id} className="flex items-center gap-3 p-3 glass-panel rounded-xl border border-white/8 group">
                            <Paperclip size={14} className="text-[var(--text-muted)] flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-[var(--text-secondary)] truncate">{a.originalName}</p>
                              <p className="text-[10px] text-[var(--text-muted)]">{(a.size / 1024).toFixed(1)} KB · {new Date(a.uploadedAt).toLocaleDateString("en-GB")} · {a.uploadedBy}</p>
                            </div>
                            <a href={a.url} target="_blank" rel="noreferrer" className="p-1.5 text-blue-400/50 hover:text-blue-400 transition"><Eye size={14} /></a>
                            <button onClick={() => deleteAttachment(a.id)} className="p-1.5 text-red-400/30 hover:text-red-400 transition opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function TestCasesPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-[var(--bg-base)] text-[var(--text-primary)]">Loading...</div>}>
      <TestCasesInner />
    </Suspense>
  );
}
