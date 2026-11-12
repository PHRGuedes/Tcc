"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { createProjectAction, updateProjectAction } from "@/app/actions/projects";

const STORAGE_KEY = "reqflow_active_project_id";

const ProjectContext = createContext({
  activeProject: null,
  projects: [],
  isLoadingProjects: true,
  setActiveProject: () => {},
  refreshProjects: () => {},
  createProject: async () => {},
  updateProject: async () => {},
});

export function ProjectProvider({ children }) {
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const handleSetActiveProject = useCallback((project) => {
    setActiveProject(project);
    if (typeof window !== "undefined" && project?.id) {
      localStorage.setItem(STORAGE_KEY, project.id);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Aviso ao carregar projetos do Supabase:", error.message);
        const defaultProject = {
          id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          name: "Sistema de Gestão Acadêmica",
          description: "Sistema acadêmico modular de gestão de matrículas, cursos e notas.",
        };
        setProjects([defaultProject]);
        setActiveProject(defaultProject);
      } else if (data && data.length > 0) {
        setProjects(data);

        // Restaurar projeto previamente ativo do localStorage
        const savedId =
          typeof window !== "undefined"
            ? localStorage.getItem(STORAGE_KEY)
            : null;
        const matched = data.find((p) => p.id === savedId);
        setActiveProject(matched || data[0]);
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
    } finally {
      setIsLoadingProjects(false);
    }
  }, [supabase]);

  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(() => {
      if (!ignore) fetchProjects();
    });
    return () => {
      ignore = true;
    };
  }, [fetchProjects]);

  // Função para criar novo projeto persistindo no Supabase via Server Action
  const createProject = async ({ name, description }) => {
    const result = await createProjectAction({ name, description });

    if (!result.success) {
      throw new Error(result.error || "Não foi possível criar o projeto.");
    }

    const newProject = result.data;

    // Atualiza a lista de projetos e define o novo como ativo
    setProjects((prev) => [
      newProject,
      ...prev.filter((p) => p.id !== newProject.id),
    ]);
    handleSetActiveProject(newProject);

    return newProject;
  };

  // Função para atualizar projeto persistindo no Supabase via Server Action
  const updateProject = async ({ id, name, description }) => {
    const result = await updateProjectAction({
      projectId: id,
      name,
      description,
    });

    if (!result.success) {
      throw new Error(result.error || "Não foi possível atualizar o projeto.");
    }

    const updated = result.data;

    // Atualiza a lista de projetos em memória
    setProjects((prev) =>
      prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
    );

    // Se o projeto alterado for o ativo, atualiza o estado ativo
    if (activeProject?.id === updated.id) {
      setActiveProject((prev) => ({ ...prev, ...updated }));
    }

    return updated;
  };

  return (
    <ProjectContext.Provider
      value={{
        activeProject,
        projects,
        isLoadingProjects,
        setActiveProject: handleSetActiveProject,
        refreshProjects: fetchProjects,
        createProject,
        updateProject,
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
