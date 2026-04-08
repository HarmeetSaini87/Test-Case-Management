"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { usePathname } from "next/navigation";

interface ProjectContextType {
  activeProject: string;
  setActiveProject: (key: string) => void;
  projects: any[];
}

const ProjectContext = createContext<ProjectContextType>({
  activeProject: "",
  setActiveProject: () => {},
  projects: []
});

export const ProjectProvider = ({ children }: { children: React.ReactNode }) => {
  const [activeProject, setActiveProject] = useState<string>("");
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // No need to fetch projects on login page or if not a module page that needs them
    if (pathname === "/login") {
      setIsLoaded(true);
      return;
    }

    const fetchProjects = async () => {
      try {
        const r = await fetch("/api/projects", { cache: "no-store", credentials: "include" });
        if (!r.ok) {
          if (r.status === 401) return; // Silent return for auth issues
          throw new Error("API Status: " + r.status);
        }
        const contentType = r.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
           throw new Error("Received non-JSON response");
        }
        const d = await r.json();
        if (d.success && Array.isArray(d.projects)) {
          setProjects(d.projects);
        }
      } catch (e) {
        // Only log actual errors, not auth redirects/failures
        console.warn("Project list load failed:", e);
      } finally {
        setIsLoaded(true);
      }
    };
    fetchProjects();

    const stored = localStorage.getItem("panamax-project");
    if (stored) setActiveProject(stored);
  }, [pathname]);

  const handleSetProject = (k: string) => {
    setActiveProject(k);
    if (k) {
      localStorage.setItem("panamax-project", k);
    } else {
      localStorage.removeItem("panamax-project");
    }
    // Auto-reload to apply new project state uniformly without prop-drilling into 50 files
    window.location.reload(); 
  };

  return (
    <ProjectContext.Provider value={{ activeProject, setActiveProject: handleSetProject, projects }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => useContext(ProjectContext);
