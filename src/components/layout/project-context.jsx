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
import {
  createProjectAction,
  updateProjectAction,
  deleteProjectAction,
  archiveProjectAction,
  unarchiveProjectAction,
} from "@/app/actions/projects";

const STORAGE_KEY = "reqflow_active_project_id";

const ProjectContext = createContext({
  activeProject: null,
  projects: [],
  isLoadingProjects: true,
  setActiveProject: () => { },
  refreshProjects: () => { },
  createProject: async () => { },
  updateProject: async () => { },
  deleteProject: async () => { },
  archiveProject: async () => { },
  unarchiveProject: async () => { },
});

export function ProjectProvider({ children }) {
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const handleSetActiveProject = useCallback((project) => {
    setActiveProject(project);
    if (typeof window !== "undefined") {
      if (project?.id) {
        localStorage.setItem(STORAGE_KEY, project.id);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      // 1. Tentar buscar incluindo as colunas is_archived e archived_at
      let { data, error } = await supabase
        .from("projects")
        .select("id, name, description, created_by, is_archived, archived_at, created_at, updated_at")
        .order("created_at", { ascending: false });

      // Fallback gracioso caso a coluna is_archived ainda não tenha sido criada no banco
      if (error && error.message?.includes("is_archived")) {
        const fallbackRes = await supabase
          .from("projects")
          .select("id, name, description, created_by, created_at, updated_at")
          .order("created_at", { ascending: false });
        data = (fallbackRes.data || []).map((p) => ({
          ...p,
          is_archived: false,
          archived_at: null,
        }));
        error = fallbackRes.error;
      }

      if (error) {
        console.warn("Aviso ao carregar projetos do Supabase:", error.message);
        setProjects([]);
        setActiveProject(null);
      } else if (data && data.length > 0) {
        const normalized = data.map((p) => ({
          ...p,
          is_archived: Boolean(p.is_archived),
        }));
        setProjects(normalized);

        // Restaurar projeto previamente ativo do localStorage
        const savedId =
          typeof window !== "undefined"
            ? localStorage.getItem(STORAGE_KEY)
            : null;
        const matched = normalized.find((p) => p.id === savedId);
        // Priorizar projeto salvo ou projeto ativo não-arquivado
        const fallbackProject = normalized.find((p) => !p.is_archived) || normalized[0];
        setActiveProject(matched || fallbackProject);
      } else {
        // Usuário novo ou sem projetos cadastrados: lista zerada
        setProjects([]);
        setActiveProject(null);
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

  // Função para excluir projeto do Supabase via Server Action
  const deleteProject = async (projectId) => {
    const result = await deleteProjectAction(projectId);
    if (!result.success) {
      throw new Error(result.error || "Não foi possível excluir o projeto.");
    }

    setProjects((prev) => {
      const remaining = prev.filter((p) => p.id !== projectId);
      if (activeProject?.id === projectId) {
        const nextActive = remaining[0] || null;
        handleSetActiveProject(nextActive);
      }
      return remaining;
    });

    return true;
  };

  // Função para arquivar projeto do Supabase via Server Action
  const archiveProject = async (projectId) => {
    const result = await archiveProjectAction(projectId);
    if (!result.success) {
      throw new Error(result.error || "Não foi possível arquivar o projeto.");
    }

    const updated = result.data;
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? {
              ...p,
              is_archived: true,
              archived_at: updated?.archived_at || new Date().toISOString(),
            }
          : p
      )
    );

    if (activeProject?.id === projectId) {
      setActiveProject((prev) => ({
        ...prev,
        is_archived: true,
        archived_at: updated?.archived_at || new Date().toISOString(),
      }));
    }

    return true;
  };

  // Função para desarquivar/restaurar projeto do Supabase via Server Action
  const unarchiveProject = async (projectId) => {
    const result = await unarchiveProjectAction(projectId);
    if (!result.success) {
      throw new Error(result.error || "Não foi possível desarquivar o projeto.");
    }

    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? {
              ...p,
              is_archived: false,
              archived_at: null,
            }
          : p
      )
    );

    if (activeProject?.id === projectId) {
      setActiveProject((prev) => ({
        ...prev,
        is_archived: false,
        archived_at: null,
      }));
    }

    return true;
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
        deleteProject,
        archiveProject,
        unarchiveProject,
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
