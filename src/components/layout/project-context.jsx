"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const ProjectContext = createContext({
  activeProject: null,
  projects: [],
  isLoadingProjects: true,
  setActiveProject: () => {},
  refreshProjects: () => {},
});

export function ProjectProvider({ children }) {
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const supabase = createClient();

  const fetchProjects = async () => {
    setIsLoadingProjects(true);
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Aviso ao carregar projetos do Supabase:", error.message);
        // Fallback local garantindo funcionamento fluido mesmo se o banco ainda não tiver migrado
        const defaultProject = {
          id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          name: "Sistema de Gestão Acadêmica",
          description: "Sistema acadêmico modular de gestão de matrículas, cursos e notas.",
        };
        setProjects([defaultProject]);
        setActiveProject(defaultProject);
      } else if (data && data.length > 0) {
        setProjects(data);
        setActiveProject(data[0]);
      } else {
        const defaultProject = {
          id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          name: "Sistema de Gestão Acadêmica",
          description: "Sistema acadêmico modular de gestão de matrículas, cursos e notas.",
        };
        setProjects([defaultProject]);
        setActiveProject(defaultProject);
      }
    } catch (err) {
      console.warn("Erro ao buscar projetos:", err);
      const defaultProject = {
        id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        name: "Sistema de Gestão Acadêmica",
        description: "Sistema acadêmico modular de gestão de matrículas, cursos e notas.",
      };
      setProjects([defaultProject]);
      setActiveProject(defaultProject);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  return (
    <ProjectContext.Provider
      value={{
        activeProject,
        projects,
        isLoadingProjects,
        setActiveProject,
        refreshProjects: fetchProjects,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProject deve ser utilizado dentro de um ProjectProvider");
  }
  return context;
}
