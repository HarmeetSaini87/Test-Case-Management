"use client";
import React, { useState, useEffect, useMemo } from "react";
import { 
  LayoutDashboard, Filter, Calendar, Users, Layers, 
  CheckCircle2, XCircle, Ban, Clock, ChevronRight,
  ShieldCheck, TrendingUp, BarChart3, PieChart as PieIcon, Search,
  ArrowUpRight, ArrowDownRight, FileText, X, FileCheck, Tag
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
} from "chart.js";
import { Bar, Pie, Line, getElementAtEvent } from "react-chartjs-2";
import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ChartDataLabels from 'chartjs-plugin-datalabels';
import Sidebar from "../components/Sidebar";
import TopNav from "../components/TopNav";
import { useProject } from "../components/ProjectContext";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  ChartDataLabels
);

const CHART_COLORS = {
  Pass: { bg: "rgba(34, 197, 94, 0.6)", border: "rgb(34, 197, 94)" },
  Fail: { bg: "rgba(239, 68, 68, 0.6)", border: "rgb(239, 68, 68)" },
  Blocked: { bg: "rgba(245, 158, 11, 0.6)", border: "rgb(245, 158, 11)" },
  Pending: { bg: "rgba(107, 114, 128, 0.6)", border: "rgb(107, 114, 128)" }
};

export default function DashboardPage() {
  useProject();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [localProject, setLocalProject] = useState("");
  const [drillDownFilter, setDrillDownFilter] = useState<{ key: string, value: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Dashboard Filters
  const [selectedSprint, setSelectedSprint] = useState("");
  const [selectedSuite, setSelectedSuite] = useState("");
  const [selectedVersion, setSelectedVersion] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const sprintChartRef = useRef<any>(null);
  const suiteChartRef = useRef<any>(null);
  const qualityChartRef = useRef<any>(null);
  const authorChartRef = useRef<any>(null);

  // Fetch all projects for the dropdown
  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setAllProjects(data.projects || []);
        }
      });
  }, []);

  // When localProject changes, reset dependent filters
  const handleProjectChange = (newProj: string) => {
    setLocalProject(newProj);
    setSelectedSprint("");
    setSelectedSuite("");
    setSelectedVersion("");
    setStats(null);
  };

  useEffect(() => {
    if (!localProject) return;
    setLoading(true);
    const params = new URLSearchParams({
      project: localProject,
      sprint: selectedSprint,
      suite: selectedSuite,
      version: selectedVersion,
      from: fromDate,
      to: toDate
    });
    
    fetch(`/api/dashboard/stats?${params.toString()}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setStats(data.stats);
        }
        setLoading(false);
      });
  }, [localProject, selectedSprint, selectedSuite, selectedVersion, fromDate, toDate]);

  // Chart Click Handler
  const handleChartClick = (event: any, ref: any, dimension: string) => {
    if (!ref.current) return;
    const elements = getElementAtEvent(ref.current, event);
    if (!elements.length) return;
    const { index } = elements[0];
    let value = "";
    
    if (dimension === "Sprint") value = Object.keys(stats.bySprint)[index];
    if (dimension === "Suite") value = Object.keys(stats.bySuite)[index];
    if (dimension === "Result") value = Object.keys(stats.byResult)[index];
    if (dimension === "Author") value = Object.keys(stats.byAuthor)[index];

    setDrillDownFilter({ key: dimension, value });
  };

  // Aggregated Chart Data
  const sprintData = useMemo(() => {
    if (!stats) return null;
    const labels = Object.keys(stats.bySprint);
    return {
      labels,
      datasets: [
        { label: "Passed", data: labels.map(l => stats.bySprint[l].Passed), backgroundColor: CHART_COLORS.Pass.bg, stack: 'stack0' },
        { label: "Failed", data: labels.map(l => stats.bySprint[l].Failed), backgroundColor: CHART_COLORS.Fail.bg, stack: 'stack0' },
        { label: "Blocked", data: labels.map(l => stats.bySprint[l].Blocked), backgroundColor: CHART_COLORS.Blocked.bg, stack: 'stack0' },
        { label: "Not Executed", data: labels.map(l => stats.bySprint[l]["Not Executed"]), backgroundColor: CHART_COLORS.Pending.bg, stack: 'stack0' },
      ]
    };
  }, [stats]);

  const suiteData = useMemo(() => {
    if (!stats) return null;
    const labels = Object.keys(stats.bySuite);
    return {
      labels,
      datasets: [
        { label: "Passed", data: labels.map(l => stats.bySuite[l].Passed), backgroundColor: CHART_COLORS.Pass.bg, stack: 'stack0' },
        { label: "Failed", data: labels.map(l => stats.bySuite[l].Failed), backgroundColor: CHART_COLORS.Fail.bg, stack: 'stack0' },
        { label: "Blocked", data: labels.map(l => stats.bySuite[l].Blocked), backgroundColor: CHART_COLORS.Blocked.bg, stack: 'stack0' },
        { label: "Not Executed", data: labels.map(l => stats.bySuite[l]["Not Executed"]), backgroundColor: CHART_COLORS.Pending.bg, stack: 'stack0' },
      ]
    };
  }, [stats]);

  const resultData = useMemo(() => {
    if (!stats) return null;
    return {
      labels: ["Passed", "Failed", "Blocked", "Not Executed"],
      datasets: [{
        data: [stats.byResult.Passed, stats.byResult.Failed, stats.byResult.Blocked, stats.byResult["Not Executed"]],
        backgroundColor: [CHART_COLORS.Pass.bg, CHART_COLORS.Fail.bg, CHART_COLORS.Blocked.bg, CHART_COLORS.Pending.bg],
        borderColor: [CHART_COLORS.Pass.border, CHART_COLORS.Fail.border, CHART_COLORS.Blocked.border, CHART_COLORS.Pending.border],
        borderWidth: 1
      }]
    };
  }, [stats]);

  const authorData = useMemo(() => {
    if (!stats) return null;
    const labels = Object.keys(stats.byAuthor);
    return {
      labels,
      datasets: [
        { label: "Passed", data: labels.map(l => stats.byAuthor[l].Passed), backgroundColor: CHART_COLORS.Pass.bg, stack: 'stack0' },
        { label: "Failed", data: labels.map(l => stats.byAuthor[l].Failed), backgroundColor: CHART_COLORS.Fail.bg, stack: 'stack0' },
        { label: "Blocked", data: labels.map(l => stats.byAuthor[l].Blocked), backgroundColor: CHART_COLORS.Blocked.bg, stack: 'stack0' },
        { label: "Not Executed", data: labels.map(l => stats.byAuthor[l]["Not Executed"]), backgroundColor: CHART_COLORS.Pending.bg, stack: 'stack0' },
      ]
    };
  }, [stats]);

  const trendData = useMemo(() => {
    if (!stats) return null;
    // Group rawData by date
    const daily: Record<string, { Pass: number, Fail: number, Blocked: number }> = {};
    stats.rawData.forEach((item: any) => {
      const d = new Date(item.date).toLocaleDateString();
      if (!daily[d]) daily[d] = { Pass: 0, Fail: 0, Blocked: 0 };
      if (item.status === 'Passed') daily[d].Pass++;
      if (item.status === 'Failed') daily[d].Fail++;
      if (item.status === 'Blocked') daily[d].Blocked++;
    });
    const labels = Object.keys(daily).sort();
    return {
      labels,
      datasets: [
        { label: "Passed", data: labels.map(l => daily[l].Pass), borderColor: CHART_COLORS.Pass.border, backgroundColor: CHART_COLORS.Pass.bg, fill: true, tension: 0.4 },
        { label: "Failed", data: labels.map(l => daily[l].Fail), borderColor: CHART_COLORS.Fail.border, backgroundColor: CHART_COLORS.Fail.bg, fill: true, tension: 0.4 },
        { label: "Blocked", data: labels.map(l => daily[l].Blocked), borderColor: CHART_COLORS.Blocked.border, backgroundColor: CHART_COLORS.Blocked.bg, fill: true, tension: 0.4 },
      ]
    };
  }, [stats]);

  const sprintSuccessData = useMemo(() => {
    if (!stats) return null;
    const labels = Object.keys(stats.bySprint);
    return {
      labels,
      datasets: [
        { label: "Passed", data: labels.map(l => stats.bySprint[l].Passed), backgroundColor: CHART_COLORS.Pass.bg },
        { label: "Failed", data: labels.map(l => stats.bySprint[l].Failed), backgroundColor: CHART_COLORS.Fail.bg },
      ]
    };
  }, [stats]);

  const suiteCoverageData = useMemo(() => {
    if (!stats) return null;
    const labels = Object.keys(stats.bySuite);
    const data = labels.map(l => {
      const s = stats.bySuite[l];
      return s.Passed + s.Failed + s.Blocked + s["Not Executed"];
    });
    return {
      labels,
      datasets: [{
        data,
        backgroundColor: [
          "rgba(6, 182, 212, 0.6)", "rgba(124, 58, 237, 0.6)", 
          "rgba(34, 197, 94, 0.6)", "rgba(239, 68, 68, 0.6)",
          "rgba(245, 158, 11, 0.6)", "rgba(107, 114, 128, 0.6)",
          "rgba(244, 63, 94, 0.6)", "rgba(168, 85, 247, 0.6)"
        ],
        borderWidth: 1
      }]
    };
  }, [stats]);

  const filteredDrillDown = useMemo(() => {
    if (!stats) return [];
    return stats.rawData.filter((item: any) => {
      if (drillDownFilter) {
        const { key, value } = drillDownFilter;
        if (key === "Sprint" && item.sprint !== value) return false;
        if (key === "Suite" && item.suite !== value) return false;
        if (key === "Result" && item.status !== value) return false;
        if (key === "Author" && item.author !== value) return false;
      }
      if (searchTerm && !item.testCaseId.toLowerCase().includes(searchTerm.toLowerCase()) && !item.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [stats, drillDownFilter, searchTerm]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom" as const, labels: { color: "var(--text-secondary)", font: { size: 10 } } },
      tooltip: { backgroundColor: "rgba(15, 23, 42, 0.9)", cornerRadius: 8, padding: 12 },
      datalabels: {
        color: '#fff',
        font: { weight: 'bold' as const, size: 9 },
        formatter: (value: any, context: any) => {
          if (value <= 0) return '';
          const label = context.chart.data.labels[context.dataIndex];
          return `${label}\n(${value})`;
        },
        anchor: 'center' as const,
        align: 'center' as const,
        textAlign: 'center' as const,
        offset: 0
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: "var(--text-muted)", font: { size: 10 } } },
      y: { grid: { color: "rgba(255, 255, 255, 0.05)" }, ticks: { color: "var(--text-muted)", font: { size: 10 } } }
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-[var(--bg-base)]">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--accent-cyan)]"></div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto flex flex-col">
        <TopNav />
        
        <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
          {/* Header */}
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-[var(--text-primary)] to-[var(--text-secondary)] bg-clip-text text-transparent">
                Interactive Dashboard
              </h1>
              <p className="text-[var(--text-muted)] mt-1">Real-time test analytics and visual insights</p>
            </div>
            <div className="flex gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-xl text-sm text-[var(--text-secondary)] shadow-sm">
                <Calendar size={14} className="text-[var(--accent-cyan)]" />
                <span className="font-bold text-[10px] uppercase tracking-tighter">Filters</span>
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-[var(--bg-overlay)] border border-[var(--border-strong)] rounded-2xl p-4 flex flex-wrap items-center gap-4 shadow-lg backdrop-blur-md">
            <div className="flex flex-wrap gap-6 items-end">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase text-[var(--accent-cyan)] tracking-widest pl-1">Project</p>
                <select 
                  value={localProject}
                  onChange={(e) => handleProjectChange(e.target.value)}
                  className="px-4 py-2.5 bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-xl text-sm font-bold hover:border-[var(--accent-cyan, #22d3ee)] transition-all outline-none min-w-[180px]"
                >
                  <option value="">— Select Project —</option>
                  {allProjects.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <p className={`text-[10px] font-black uppercase tracking-widest pl-1 transition-colors ${localProject ? 'text-[var(--accent-cyan)]' : 'text-[var(--text-muted)]'}`}>Sprint</p>
                <select 
                  value={selectedSprint}
                  disabled={!localProject}
                  onChange={(e) => setSelectedSprint(e.target.value)}
                  className={`px-4 py-2.5 bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-xl text-sm font-bold transition-all outline-none min-w-[160px] ${localProject ? 'hover:border-[var(--accent-cyan)] cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
                >
                  <option value="">Select Sprint</option>
                  {(stats?.availableFilters?.sprints || []).map((s: string) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <p className={`text-[10px] font-black uppercase tracking-widest pl-1 transition-colors ${localProject ? 'text-[var(--accent-cyan)]' : 'text-[var(--text-muted)]'}`}>Test Suite</p>
                <select 
                  value={selectedSuite}
                  disabled={!localProject}
                  onChange={(e) => setSelectedSuite(e.target.value)}
                  className={`px-4 py-2.5 bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-xl text-sm font-bold transition-all outline-none min-w-[160px] ${localProject ? 'hover:border-[var(--accent-cyan)] cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
                >
                  <option value="">Select Test Suite</option>
                  {(stats?.availableFilters?.suites || []).map((s: string) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <p className={`text-[10px] font-black uppercase tracking-widest pl-1 transition-colors ${localProject ? 'text-[var(--accent-cyan)]' : 'text-[var(--text-muted)]'}`}>Version Number</p>
                <select 
                  value={selectedVersion}
                  disabled={!localProject}
                  onChange={(e) => setSelectedVersion(e.target.value)}
                  className={`px-4 py-2.5 bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-xl text-sm font-bold transition-all outline-none min-w-[150px] ${localProject ? 'hover:border-[var(--accent-cyan)] cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
                >
                  <option value="">Select Version</option>
                  {(stats?.availableFilters?.versions || []).map((v: string) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>

            <div className="h-10 w-px bg-[var(--border-base)] mx-2 hidden lg:block" />

            <div className="flex flex-col gap-1.5 min-w-[140px]">
              <label className="text-[10px] font-black uppercase text-[var(--text-secondary)] tracking-widest pl-1">Date From</label>
              <input 
                type="date" 
                className="px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-xl text-xs focus:outline-none focus:border-[var(--accent-cyan)]"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5 min-w-[140px]">
              <label className="text-[10px] font-black uppercase text-[var(--text-secondary)] tracking-widest pl-1">Date To</label>
              <input 
                type="date" 
                className="px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-xl text-xs focus:outline-none focus:border-[var(--accent-cyan)]"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
              />
            </div>

            <button 
              onClick={() => { setSelectedSprint(""); setSelectedSuite(""); setSelectedVersion(""); setFromDate(""); setToDate(""); }}
              className="mt-5 ml-auto flex items-center gap-2 px-4 py-2 bg-[var(--bg-elevated)] hover:bg-[var(--accent-red)]/10 text-[var(--text-muted)] hover:text-[var(--accent-red)] border border-[var(--border-base)] hover:border-[var(--accent-red)]/30 rounded-xl text-xs font-bold transition-all"
            >
              <X size={14} /> Reset Filters
            </button>
          </div>

          {!localProject ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-24 px-8 bg-[var(--bg-overlay)] border border-dashed border-[var(--border-strong)] rounded-[2.5rem] text-center space-y-6 shadow-inner"
            >
              <div className="w-20 h-20 bg-[var(--accent-cyan)]/10 rounded-full flex items-center justify-center animate-pulse">
                <LayoutDashboard size={40} className="text-[var(--accent-cyan)]" />
              </div>
              <div className="max-w-md">
                <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3">Project Selection Required</h2>
                <p className="text-[var(--text-muted)] leading-relaxed">
                  To view execution analytics and quality trends, please select a project from the filter menu above.
                </p>
              </div>
              <div className="flex gap-4">
                <div className="px-6 py-3 bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-2xl text-[10px] font-black uppercase text-[var(--accent-cyan)] tracking-widest flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[var(--accent-cyan)]"></div>
                  Real-time Data Fetching
                </div>
                <div className="px-6 py-3 bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-2xl text-[10px] font-black uppercase text-[var(--accent-blue)] tracking-widest flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[var(--accent-blue)]"></div>
                  Registry-First Filtering
                </div>
              </div>
            </motion.div>
          ) : !stats ? (
            <div className="flex items-center justify-center py-32">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--accent-cyan)]"></div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div 
                key={localProject}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-8"
              >
                {/* Summary Tiles */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <SummaryTile title="Total Executed" value={stats.summary.total} icon={<TrendingUp size={20} />} color="var(--accent-cyan)" />
                  <SummaryTile title="Passed" value={stats.summary.passed} icon={<CheckCircle2 size={20} />} color="var(--accent-green)" />
                  <SummaryTile title="Failed" value={stats.summary.failed} icon={<XCircle size={20} />} color="var(--accent-red)" />
                  <SummaryTile title="Remaining" value={stats.summary.pending + stats.summary.blocked} icon={<Clock size={20} />} color="var(--text-muted)" />
                </div>

                {/* Row 1: Sprint Results */}
                <div className="grid grid-cols-1 gap-8">
                  <DashboardCard title="Sprint-Wise/Test Suite wise Insights" icon={<BarChart3 size={18} />}>
                    <div className="h-[280px]">
                      {sprintData && <Bar 
                        ref={sprintChartRef}
                        data={sprintData} 
                        options={{ ...chartOptions, scales: { 
                          x: { ...chartOptions.scales.x, stacked: true },
                          y: { ...chartOptions.scales.y, stacked: true, title: { display: true, text: 'No. of Test Cases', color: 'var(--text-muted)' } }
                        }, plugins: { ...chartOptions.plugins, tooltip: { ...chartOptions.plugins.tooltip, callbacks: { label: (ctx: any) => `${ctx.dataset.label}: ${ctx.formattedValue}` } } } }} 
                        onClick={(e: any) => handleChartClick(e, sprintChartRef, "Sprint")} 
                      />}
                    </div>
                  </DashboardCard>
                </div>

                {/* Row 2: Result by Creator | Pass/Fail by Suite */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <DashboardCard title="Author Performance" icon={<Users size={18} />}>
                    <div className="h-[280px]">
                      {authorData && <Bar 
                        ref={authorChartRef}
                        data={authorData} 
                        options={{ ...chartOptions, scales: { 
                          x: { ...chartOptions.scales.x, stacked: true },
                          y: { ...chartOptions.scales.y, stacked: true, title: { display: true, text: 'No. of Test Cases', color: 'var(--text-muted)' } }
                        }, plugins: { ...chartOptions.plugins, tooltip: { ...chartOptions.plugins.tooltip, callbacks: { label: (ctx: any) => `${ctx.dataset.label}: ${ctx.formattedValue}` } } } }} 
                        onClick={(e: any) => handleChartClick(e, authorChartRef, "Author")}
                      />}
                    </div>
                  </DashboardCard>

                  <DashboardCard title="Sprint Quality Report (Pass/Fail)" icon={<FileCheck size={18} />}>
                    <div className="h-[280px]">
                      {sprintSuccessData && <Bar 
                        data={sprintSuccessData} 
                        options={{ ...chartOptions, indexAxis: 'y' as const, scales: { 
                          x: { ...chartOptions.scales.x, stacked: true },
                          y: { ...chartOptions.scales.y, stacked: true }
                        } }} 
                      />}
                    </div>
                  </DashboardCard>
                </div>

                {/* Row 3: Execution Trend Over Time (Full Width) */}
                <DashboardCard title="Execution Trend (Quality Over Time)" icon={<TrendingUp size={18} />}>
                  <div className="h-[320px]">
                    {trendData && <Line 
                      data={trendData} 
                      options={{...chartOptions, scales: { ...chartOptions.scales, y: { ...chartOptions.scales.y, stacked: false } } }} 
                    />}
                  </div>
                </DashboardCard>

                {/* Row 4: Distribution Tables */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <DashboardCard title="Sub-Module Distribution (Tabular)" icon={<Layers size={18} />}>
                    <div className="h-[280px] overflow-y-auto pr-2 custom-scrollbar">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-[var(--bg-overlay)]">
                          <tr className="text-[10px] font-black uppercase text-[var(--accent-cyan)] border-b border-[var(--border-base)]">
                            <th className="text-left pb-3 pl-2">Sub Module</th>
                            <th className="text-right pb-3 pr-2">Test Count</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-base)]/30">
                          {stats.bySubModule && Object.entries(stats.bySubModule).map(([name, count]: any) => (
                            <tr key={name} className="hover:bg-[var(--accent-cyan)]/5">
                              <td className="py-3 pl-2 font-medium">{name}</td>
                              <td className="py-3 pr-2 text-right">
                                <span className="px-2.5 py-1 bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-lg font-bold text-[var(--accent-cyan)]">
                                  {count}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </DashboardCard>

                  <DashboardCard title="Test Category Distribution (Tabular)" icon={<Filter size={18} />}>
                    <div className="h-[280px] overflow-y-auto pr-2 custom-scrollbar">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-[var(--bg-overlay)]">
                          <tr className="text-[10px] font-black uppercase text-[var(--accent-blue, #3b82f6)] border-b border-[var(--border-base)]">
                            <th className="text-left pb-3 pl-2">Category</th>
                            <th className="text-right pb-3 pr-2">Test Count</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-base)]/30">
                          {stats.byCategory && Object.entries(stats.byCategory).map(([name, count]: any) => (
                            <tr key={name} className="hover:bg-blue-500/5">
                              <td className="py-3 pl-2 font-medium">{name}</td>
                              <td className="py-3 pr-2 text-right">
                                <span className="px-2.5 py-1 bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-lg font-bold text-[var(--accent-blue, #3b82f6)]">
                                  {count}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </DashboardCard>
                </div>

                <div className="grid grid-cols-1 gap-8">
                  <DashboardCard title="Version Wise Distribution (Tabular)" icon={<Tag size={18} />}>
                    <div className="h-[280px] overflow-y-auto pr-2 custom-scrollbar">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-[var(--bg-overlay)]">
                          <tr className="text-[10px] font-black uppercase text-[var(--accent-purple, #a855f7)] border-b border-[var(--border-base)]">
                            <th className="text-left pb-3 pl-2">Release Version</th>
                            <th className="text-right pb-3 pr-2">Test Count</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-base)]/30">
                          {stats.byVersion && Object.entries(stats.byVersion).sort((a:any, b:any) => b[1] - a[1]).map(([name, count]: any) => (
                            <tr key={name} className="hover:bg-purple-500/5">
                              <td className="py-3 pl-2 font-medium">
                                <span className="px-2 py-0.5 bg-[var(--bg-surface)] border border-[var(--accent-purple)]/30 rounded text-[10px] text-[var(--accent-purple)]">
                                   {name}
                                </span>
                              </td>
                              <td className="py-3 pr-2 text-right">
                                <span className="px-2.5 py-1 bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-lg font-bold text-[var(--accent-purple, #a855f7)]">
                                  {count}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {(!stats.byVersion || Object.keys(stats.byVersion).length === 0) && (
                            <tr>
                              <td colSpan={2} className="py-8 text-center text-[var(--text-muted)] italic text-xs">
                                No version-specific data available for this project.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </DashboardCard>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <DashboardCard title="Functional Coverage Distribution" icon={<PieIcon size={18} />}>
                    <div className="h-[280px] flex items-center justify-center">
                      <div className="w-[200px] h-[200px]">
                        {suiteCoverageData && <Pie 
                          data={suiteCoverageData} 
                          options={{ ...chartOptions, scales: undefined }} 
                        />}
                      </div>
                    </div>
                  </DashboardCard>
                  <DashboardCard title="Total Quality Distribution" icon={<PieIcon size={18} />}>
                      <div className="h-[280px] flex items-center justify-center">
                        <div className="w-[200px] h-[200px]">
                          {resultData && <Pie 
                            ref={qualityChartRef}
                            data={resultData} 
                            options={{ ...chartOptions, scales: undefined }} 
                            onClick={(e: any) => handleChartClick(e, qualityChartRef, "Result")}
                          />}
                        </div>
                      </div>
                  </DashboardCard>
                </div>

                {/* Drill-down Section */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        <FileText size={18} className="text-[var(--accent-cyan)]" /> Drill-down Results
                      </h2>
                      {drillDownFilter && (
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                          className="flex items-center gap-2 px-3 py-1 bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/30 rounded-full text-xs font-bold text-[var(--accent-cyan)]"
                        >
                          {drillDownFilter.key}: {drillDownFilter.value}
                          <button onClick={() => setDrillDownFilter(null)} className="hover:text-white"><X size={12} /></button>
                        </motion.div>
                      )}
                    </div>
                    <div className="relative group">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--accent-cyan)] transition-colors" />
                      <input 
                        type="text" 
                        placeholder="Filter drill-down..." 
                        className="bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-xl pl-9 pr-4 py-2 text-sm w-64 focus:outline-none focus:border-[var(--accent-cyan)] focus:ring-1 focus:ring-[var(--accent-cyan)] transition-all"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="section-card overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>TC ID</th>
                            <th>Title / Module</th>
                            <th>Sub Module</th>
                            <th>Category</th>
                            <th>Sprint</th>
                            <th>Suite</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredDrillDown.map((item: any, idx: number) => (
                            <tr key={idx} className="hover:bg-[var(--bg-elevated)]/50">
                              <td className="font-mono text-xs text-[var(--accent-cyan)] font-bold">{item.testCaseId}</td>
                              <td>
                                <div className="font-medium text-[var(--text-primary)]">{item.title}</div>
                                <div className="text-[10px] text-[var(--text-muted)]">{item.author} • {new Date(item.date).toLocaleDateString()}</div>
                              </td>
                              <td className="text-xs text-[var(--text-secondary)]">{item.subModule}</td>
                              <td className="text-xs text-[var(--text-secondary)]">
                                <span className="px-2 py-0.5 bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-md">
                                  {item.category}
                                </span>
                              </td>
                              <td className="text-sm">{item.sprint}</td>
                              <td className="text-sm">{item.suite}</td>
                              <td>
                                <span className={`${item.status === 'Passed' ? 'badge-green' : item.status === 'Failed' ? 'badge-red' : 'badge-gray'} text-[10px] px-2 py-0.5 rounded-full font-bold`}>
                                  {item.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {filteredDrillDown.length === 0 && (
                            <tr>
                              <td colSpan={7} className="text-center py-12 text-[var(--text-muted)]">No records match current filters</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
          </div>
      </main>

      <style jsx>{`
        .section-card {
          background: var(--bg-overlay);
          border: 1px solid var(--border-base);
          border-radius: 1.5rem;
          box-shadow: var(--shadow-sm);
        }
      `}</style>
    </div>
  );
}

function SummaryTile({ title, value, icon, color }: any) {
  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="bg-[var(--bg-overlay)] border border-[var(--border-base)] rounded-3xl p-6 relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/5 to-transparent rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: `${color}15`, border: `1px solid ${color}30`, color }}>
          {icon}
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{title}</div>
          <div className="text-2xl font-black text-[var(--text-primary)]">{value}</div>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <span className="flex items-center text-[10px] font-bold text-[var(--accent-green)]">
          <ArrowUpRight size={12} /> +0%
        </span>
        <span className="text-[10px] text-[var(--text-muted)]">from last session</span>
      </div>
    </motion.div>
  );
}

function DashboardCard({ title, icon, children }: any) {
  return (
    <div className="bg-[var(--bg-overlay)] border border-[var(--border-base)] rounded-3xl p-6 flex flex-col gap-6 shadow-sm">
      <div className="flex justify-between items-center">
        <h3 className="font-bold flex items-center gap-2 text-[var(--text-primary)]">
          <span className="text-[var(--accent-cyan)]">{icon}</span> {title}
        </h3>
        <button className="p-1.5 hover:bg-[var(--bg-elevated)] rounded-lg text-[var(--text-muted)] transition-all">
          <ArrowUpRight size={14} />
        </button>
      </div>
      <div className="flex-1 min-h-0">
        {children}
      </div>
    </div>
  );
}
