"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, Plus, Trash2, Folder, FileText, 
  HelpCircle, ChevronRight, X, AlertTriangle 
} from "lucide-react";
import Sidebar from "../../../components/Sidebar";
import TopNav from "../../../components/TopNav";
import { useProject } from "../../../components/ProjectContext";

export default function RequirementsCatalog() {
  const router = useRouter();
  const { id: urlProjectId } = useParams();
  const { activeProject, setActiveProject } = useProject();
  
  const [epics, setEpics] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form States
  const [showEpicModal, setShowEpicModal] = useState(false);
  const [epicForm, setEpicForm] = useState({ key: "", name: "" });

  const [showStoryModal, setShowStoryModal] = useState(false);
  const [storyForm, setStoryForm] = useState({ epicId: "", key: "", title: "" });

  // Sync route param with global project context
  useEffect(() => {
    if (urlProjectId && activeProject !== urlProjectId) {
      setActiveProject(urlProjectId as string);
    }
  }, [urlProjectId]);

  // Sync changes in the global project selector back to the URL
  useEffect(() => {
    if (activeProject && activeProject !== urlProjectId) {
      router.push(`/projects/${activeProject}/requirements`);
    }
  }, [activeProject, urlProjectId, router]);

  const fetchData = async () => {
    if (!urlProjectId) return;
    setLoading(true);
    try {
      const [epicsRes, storiesRes] = await Promise.all([
        fetch(`/api/rtm/epics?projectId=${urlProjectId}`).then(res => res.json()),
        fetch(`/api/rtm/stories?projectId=${urlProjectId}`).then(res => res.json())
      ]);
      if (epicsRes.success) setEpics(epicsRes.epics);
      if (storiesRes.success) setStories(storiesRes.stories);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (urlProjectId) {
      fetchData();
    }
  }, [urlProjectId]);

  const handleCreateEpic = async (e: any) => {
    e.preventDefault();
    const res = await fetch("/api/rtm/epics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: urlProjectId, key: epicForm.key, name: epicForm.name })
    });
    const data = await res.json();
    if (data.success) {
      setShowEpicModal(false);
      setEpicForm({ key: "", name: "" });
      fetchData();
    } else {
      alert(data.error);
    }
  };

  const handleCreateStory = async (e: any) => {
    e.preventDefault();
    const res = await fetch("/api/rtm/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: urlProjectId, epicId: storyForm.epicId, key: storyForm.key, title: storyForm.title })
    });
    const data = await res.json();
    if (data.success) {
      setShowStoryModal(false);
      setStoryForm({ epicId: "", key: "", title: "" });
      fetchData();
    } else {
      alert(data.error);
    }
  };

  const handleArchiveStory = async (storyId: string) => {
    if (!confirm("Are you sure you want to archive this User Story?")) return;
    await fetch(`/api/rtm/stories?storyId=${storyId}`, { method: "DELETE" });
    fetchData();
  };

  const handleArchiveEpic = async (epicId: string) => {
    if (!confirm("Are you sure you want to delete this Epic?")) return;
    const res = await fetch(`/api/rtm/epics?epicId=${epicId}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      fetchData();
    } else {
      alert(data.error || "Failed to delete Epic");
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--bg-input)",
    border: "1px solid var(--border-strong)",
    borderRadius: 10,
    padding: "10px 14px",
    color: "var(--text-primary)",
    fontSize: 13,
    outline: "none",
    marginTop: 6
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: "pointer"
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg-base)", overflow: "hidden" }}>
      <Sidebar />

      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        <TopNav />

        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
          
          <header className="page-header" style={{ padding: "24px 28px 16px 28px" }}>
            <div>
              <Link href="/testcases" className="btn-ghost" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 12, padding: "4px 8px", fontSize: 12 }}>
                <ArrowLeft size={14} /> Back to Repository
              </Link>
              <h1 className="page-title">Requirements Catalog</h1>
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                Configure Epics and User Stories for Project: <strong>{urlProjectId}</strong>
              </p>
            </div>
            
            <div style={{ display: "flex", gap: 10, alignSelf: "flex-end" }}>
              <button onClick={() => setShowEpicModal(true)} className="btn-ghost" style={{ border: "1px solid var(--border-strong)" }}>
                <Plus size={14} style={{ marginRight: 6 }} /> New Epic
              </button>
              <button onClick={() => setShowStoryModal(true)} className="btn-primary">
                <Plus size={14} style={{ marginRight: 6 }} /> New User Story
              </button>
            </div>
          </header>

          <div style={{ flex: 1, padding: "0 28px 40px 28px" }}>
            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid var(--border-strong)", borderTopColor: "var(--accent-cyan)", animation: "spin 1s linear infinite" }}></div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : epics.filter(e => e.status !== "ARCHIVED").length === 0 ? (
              <div className="empty-state" style={{ marginTop: 40 }}>
                <Folder size={48} style={{ color: "var(--text-muted)", opacity: 0.5, marginBottom: 16 }} />
                <h3>No Requirements Registered</h3>
                <p>Add your first Epic and User Story to map test case coverages.</p>
                <button onClick={() => setShowEpicModal(true)} className="btn-primary" style={{ marginTop: 12 }}>
                  Create Epic
                </button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>
                {epics.filter(e => e.status !== "ARCHIVED").map(epic => {
                  const epicStories = stories.filter(s => s.epicId === epic.id && s.status !== "ARCHIVED");
                  return (
                    <div key={epic.id} className="section-card" style={{ padding: 0, overflow: "hidden" }}>
                      <div className="section-header" style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-surface)", borderBottom: "1px solid var(--border-base)" }}>
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <span style={{
                            fontSize: 9,
                            fontWeight: 800,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            background: "var(--accent-violet)",
                            color: "white",
                            padding: "2px 6px",
                            borderRadius: 4,
                            marginRight: 10
                          }}>Epic</span>
                          <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>{epic.key}: {epic.name}</span>
                        </div>
                        <button onClick={() => handleArchiveEpic(epic.id)} className="icon-btn delete" style={{ width: 28, height: 28 }} title="Delete Epic">
                          <Trash2 size={13} />
                        </button>
                      </div>
                      
                      <div style={{ padding: "20px 24px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {epicStories.length === 0 ? (
                            <div style={{ fontSize: 13, color: "var(--text-disabled)", fontStyle: "italic", padding: "10px 0" }}>
                              No user stories attached to this Epic.
                            </div>
                          ) : (
                            epicStories.map(story => (
                              <div key={story.id} style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "12px 16px",
                                background: "var(--bg-input)",
                                borderRadius: 10,
                                border: "1px solid var(--border-base)"
                              }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span style={{
                                    fontFamily: "var(--font-mono)",
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: "var(--accent-cyan)"
                                  }}>{story.key}</span>
                                  <ChevronRight size={12} style={{ color: "var(--text-disabled)" }} />
                                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{story.title}</span>
                                </div>
                                <button onClick={() => handleArchiveStory(story.id)} className="icon-btn delete" style={{ width: 28, height: 28 }}>
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Epic Modal */}
        {showEpicModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-[var(--bg-overlay)] border border-[var(--border-base)] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h2 className="font-bold text-[var(--text-primary)]" style={{ fontSize: 16 }}>Create New Epic</h2>
                <button onClick={() => setShowEpicModal(false)} className="p-1 hover:bg-[var(--bg-elevated)] rounded-lg text-[var(--text-muted)] transition-colors">
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleCreateEpic}>
                <div style={{ marginBottom: 16 }}>
                  <label className="form-label" style={{ fontSize: 11 }}>Epic Key (e.g., BSS-100)</label>
                  <input required type="text" style={inputStyle} value={epicForm.key} onChange={e => setEpicForm({...epicForm, key: e.target.value})} placeholder="e.g. BSS-100" />
                </div>
                <div style={{ marginBottom: 24 }}>
                  <label className="form-label" style={{ fontSize: 11 }}>Epic Name</label>
                  <input required type="text" style={inputStyle} value={epicForm.name} onChange={e => setEpicForm({...epicForm, name: e.target.value})} placeholder="e.g. User Authentication" />
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button type="button" onClick={() => setShowEpicModal(false)} className="flex-1 py-2.5 rounded-xl btn-ghost" style={{ border: "1px solid var(--border-strong)" }}>Cancel</button>
                  <button type="submit" className="flex-1 py-2.5 rounded-xl btn-primary">Save Epic</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Story Modal */}
        {showStoryModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-[var(--bg-overlay)] border border-[var(--border-base)] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h2 className="font-bold text-[var(--text-primary)]" style={{ fontSize: 16 }}>Create New User Story</h2>
                <button onClick={() => setShowStoryModal(false)} className="p-1 hover:bg-[var(--bg-elevated)] rounded-lg text-[var(--text-muted)] transition-colors">
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleCreateStory}>
                <div style={{ marginBottom: 16 }}>
                  <label className="form-label" style={{ fontSize: 11 }}>Parent Epic</label>
                  <select required style={selectStyle} value={storyForm.epicId} onChange={e => setStoryForm({...storyForm, epicId: e.target.value})}>
                    <option value="" style={{ background: 'var(--bg-overlay)' }}>-- Select Epic --</option>
                    {epics.filter(e => e.status !== "ARCHIVED").map(epic => (
                      <option key={epic.id} value={epic.id} style={{ background: 'var(--bg-overlay)' }}>{epic.key} - {epic.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label className="form-label" style={{ fontSize: 11 }}>Story Key (e.g., US-101)</label>
                  <input required type="text" style={inputStyle} value={storyForm.key} onChange={e => setStoryForm({...storyForm, key: e.target.value})} placeholder="e.g. US-101" />
                </div>
                <div style={{ marginBottom: 24 }}>
                  <label className="form-label" style={{ fontSize: 11 }}>Story Title</label>
                  <input required type="text" style={inputStyle} value={storyForm.title} onChange={e => setStoryForm({...storyForm, title: e.target.value})} placeholder="e.g. Users must be able to log in with MFA" />
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button type="button" onClick={() => setShowStoryModal(false)} className="flex-1 py-2.5 rounded-xl btn-ghost" style={{ border: "1px solid var(--border-strong)" }}>Cancel</button>
                  <button type="submit" className="flex-1 py-2.5 rounded-xl btn-primary">Save Story</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
