"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LayoutDashboard, ShieldCheck, Settings, LogOut, FolderOpen, Layers, Calendar, FileText, TrendingUp, CheckCircle, XCircle, Clock, AlertCircle, Upload } from "lucide-react";
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

function StatCard({ title, value, change, icon, color }: any) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="glass-panel rounded-2xl p-6 border border-white/10 hover:border-white/20 transition">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-white/50">{title}</p>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
      </div>
      <p className="text-4xl font-bold text-white mb-1">{value}</p>
      {change && <p className="text-sm text-white/40">{change}</p>}
    </motion.div>
  );
}

export default function DashboardPage() {
  const [testCases, setTestCases] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [sprints, setSprints] = useState<any[]>([]);
  const [executions, setExecutions] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("there");

  useEffect(() => {
    fetch("/api/testcases").then(r => r.json()).then(d => { if (d.success) setTestCases(d.testCases); });
    fetch("/api/projects").then(r => r.json()).then(d => { if (d.success) setProjects(d.projects); });
    fetch("/api/sprints").then(r => r.json()).then(d => { if (d.success) setSprints(d.sprints); });
    fetch("/api/executions").then(r => r.json()).then(d => { if (d.success) setExecutions(d.executions); });
    fetch("/api/auth/users?me=true").then(r => r.json()).then(d => { if (d.success) { setUserRole(d.user?.role); setUsername(d.user?.username || "there"); } });
  }, []);

  const totalTCs = testCases.length;
  const activeTCs = testCases.filter(t => t.status === "Active").length;
  const draftTCs = testCases.filter(t => t.status === "Draft").length;
  const highPriority = testCases.filter(t => t.priority === "Highest" || t.priority === "High").length;
  const activeSprint = sprints.find(s => s.status === "Active");

  const byModule: any = {};
  testCases.forEach(tc => { const k = tc.module || "Unassigned"; byModule[k] = (byModule[k] || 0) + 1; });
  const moduleStats = Object.entries(byModule).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="flex h-screen bg-[#050511] text-[#ededed] font-sans">
      <aside className="w-64 glass-panel border-r border-white/10 hidden md:flex flex-col">
        <div className="h-20 flex items-center px-8 border-b border-white/10">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Panamax Logo" className="h-8 w-auto rounded-lg" />
            <span className="text-xl font-bold tracking-wider text-gradient">PANAMAX</span>
          </div>
        </div>
        <nav className="flex-1 py-8 px-4 flex flex-col gap-2">
          <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" active href="/" />
          <NavItem icon={<FolderOpen size={20} />} label="Projects" href="/projects" />
          <NavItem icon={<ShieldCheck size={20} />} label="Test Repository" href="/testcases" />
          <NavItem icon={<Layers size={20} />} label="Test Suites" href="/suites" />
          <NavItem icon={<Calendar size={20} />} label="Sprints" href="/sprints" />
          <NavItem icon={<Upload size={20} />} label="Import" href="/import" />
        </nav>
        <div className="p-4 mt-auto flex flex-col gap-2">
          {userRole === 'admin' && <NavItem icon={<Settings size={20} />} label="Admin Ops" href="/admin" />}
          <NavItem icon={<LogOut size={20} />} label="Logout" onClick={async () => { await fetch('/api/auth/login', { method: 'DELETE' }); window.location.href = '/login'; }} />
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="h-20 glass-panel border-b border-white/10 flex items-center justify-between px-8 z-10 sticky top-0">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <Link href="/testcases" className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 flex items-center gap-2 font-medium hover:opacity-90 transition shadow-lg text-sm">
            <FileText size={16} /> Create Test Case
          </Link>
        </header>

        <div className="p-8 flex flex-col gap-8 max-w-7xl w-full mx-auto pb-20">
          {/* Welcome Banner */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="p-8 rounded-2xl glass-panel relative overflow-hidden border border-white/10">
            <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10">
              <ShieldCheck size={140} className="text-blue-400" />
            </div>
            <div className="relative z-10">
              <h2 className="text-3xl font-bold mb-2">Welcome back, <span className="text-gradient capitalize">{username}</span> 👋</h2>
              <p className="text-white/50 text-lg max-w-xl">
                {activeSprint ? `Active Sprint: ${activeSprint.name}` : null}<br />
                <span className="text-sm">{totalTCs} test cases across {projects.length} project{projects.length !== 1 ? "s" : ""}.</span>
              </p>
            </div>
          </motion.div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title="Total Test Cases" value={totalTCs} change={`${projects.length} projects`} icon={<FileText size={20} />} color="bg-blue-500/20 text-blue-400" />
            <StatCard title="Active / Approved" value={activeTCs} change="Validated" icon={<CheckCircle size={20} />} color="bg-green-500/20 text-green-400" />
            <StatCard title="In Draft" value={draftTCs} change="Pending" icon={<Clock size={20} />} color="bg-yellow-500/20 text-yellow-400" />
            <StatCard title="High Priority" value={highPriority} change="Attention" icon={<AlertCircle size={20} />} color="bg-red-500/20 text-red-400" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sprint Performance horizontal table */}
            <div className="glass-panel rounded-2xl p-6 border border-white/10">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 font-black">SP</div>
                  <h3 className="font-bold text-white leading-tight">Sprint Performance</h3>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/5 text-[10px] text-white/30 uppercase tracking-widest font-black">
                      <th className="pb-3 px-1">Sprint</th>
                      <th className="pb-3 px-1">Status</th>
                      <th className="pb-3 px-1 text-right">Pass/Fail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {[...new Set(executions.map(e => e.sprint))].slice(0, 4).map(s => {
                      const sprintEx = executions.filter(e => e.sprint === s);
                      const totalSteps = sprintEx.reduce((acc, curr) => acc + curr.results.length, 0);
                      const passSteps = sprintEx.reduce((acc, curr) => acc + curr.results.filter((r:any) => r.status === 'Pass').length, 0);
                      const failSteps = sprintEx.reduce((acc, curr) => acc + curr.results.filter((r:any) => r.status === 'Fail').length, 0);
                      const per = totalSteps > 0 ? Math.round((passSteps / totalSteps) * 100) : 0;
                      return (
                        <tr key={s || 'unplanned'}>
                           <td className="py-3 px-1 text-sm font-bold text-white/70">{s || "Unplanned"}</td>
                           <td className="py-3 px-1"><span className={`text-[10px] font-black px-2 py-0.5 rounded border ${per > 80 ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>{per}% PASS</span></td>
                           <td className="py-3 px-1 text-right text-xs font-mono"><span className="text-green-400">{passSteps}</span> <span className="text-white/20">/</span> <span className="text-red-500">{failSteps}</span></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Suite Health horizontal table */}
            <div className="glass-panel rounded-2xl p-6 border border-white/10">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 font-black">SH</div>
                  <h3 className="font-bold text-white leading-tight">Suite Health</h3>
                </div>
                <Link href="/suites" className="text-[10px] font-black text-blue-400 hover:text-blue-300">DETAILS →</Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/5 text-[10px] text-white/30 uppercase tracking-widest font-black">
                      <th className="pb-3 px-1">Suite Name</th>
                      <th className="pb-3 px-1">Sprint</th>
                      <th className="pb-3 px-1 text-right">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {executions.slice(0, 4).map(e => {
                      const total = e.results.length;
                      const pass = e.results.filter((r:any) => r.status === 'Pass').length;
                      const per = total > 0 ? Math.round((pass/total)*100) : 0;
                      return (
                        <tr key={e.id}>
                          <td className="py-3 px-1 text-sm font-bold text-white/70 truncate max-w-[120px]">{e.suiteName}</td>
                          <td className="py-3 px-1 text-[10px] text-white/40 uppercase font-black">{e.sprint}</td>
                          <td className="py-3 px-1 text-right font-black text-xs" style={{ color: per > 80 ? '#10b981' : per > 50 ? '#f59e0b' : '#ef4444' }}>{per}%</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Coverage by Module */}
            <div className="glass-panel rounded-2xl p-6 border border-white/10">
              <h3 className="font-semibold text-white/90 mb-5">Coverage by Module</h3>
              <div className="flex flex-col gap-3">
                {moduleStats.map(([mod, cnt]: any) => (
                  <div key={mod} className="flex items-center gap-3">
                    <p className="text-sm text-white/60 w-32 truncate shrink-0">{mod}</p>
                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" style={{ width: `${(cnt / totalTCs) * 100}%` }} />
                    </div>
                    <span className="text-xs font-mono text-white/40 w-8 text-right">{cnt}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sprints Summary */}
            <div className="glass-panel rounded-2xl p-6 border border-white/10">
              <div className="flex justify-between items-center mb-5">
                <h3 className="font-semibold text-white/90">Sprint Cycles</h3>
                <Link href="/sprints" className="text-xs text-blue-400 hover:text-blue-300">Manage →</Link>
              </div>
              {sprints.slice(0, 4).map((s: any) => (
                <div key={s.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0 px-2">
                  <p className="text-sm text-white/80 font-bold">{s.name}</p>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded ${s.status === 'Active' ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-white/40'}`}>{s.status.toUpperCase()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
