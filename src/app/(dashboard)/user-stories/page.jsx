"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Plus,
  Search,
  Tag,
  Pencil,
  Trash2,
  Calendar,
  CheckCircle2,
  X,
  Loader2,
  AlertTriangle,
  Layers,
  Check,
} from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { useProject } from "@/components/layout/project-context";
import { usePermissions } from "@/components/layout/permissions-context";
import { createClient } from "@/lib/supabase/client";
import {
  createUserStoryAction,
  updateUserStoryAction,
  deleteUserStoryAction,
} from "@/app/actions/user-stories";

const STATUS_LABELS = {
  backlog: "Product Backlog",
  todo: "A Fazer",
  in_progress: "Em Progresso",
  done: "Concluído",
};

const STATUS_BADGE_STYLES = {
  backlog:
    "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  todo: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60",
  in_progress:
    "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60",
  done: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60",
};

export default function UserStoriesPage() {
  const { activeProject } = useProject();
  const { hasPermission, guardAction } = usePermissions();
  const canManageStories = hasPermission("user_stories_manage");
  const supabase = useMemo(() => createClient(), []);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [stories, setStories] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [projectRequirements, setProjectRequirements] = useState([]);
  const [storyReqLinks, setStoryReqLinks] = useState({}); // { [storyId]: [reqId, ...] }
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState("");

  // Modal Create / Edit
  const [showModal, setShowModal] = useState(false);
  const [editingStory, setEditingStory] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [storyForm, setStoryForm] = useState({
    code: "US-01",
    title: "",
    as_a: "",
    i_want: "",
    so_that: "",
    priority: "medium",
    status: "backlog",
    sprint_id: "",
    requirementIds: [],
  });

  // Delete confirmation
  const [storyToDelete, setStoryToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    if (!activeProject?.id) return;
    setLoading(true);
    try {
      // 1. Buscar Sprints do Projeto
      const { data: sprintsData } = await supabase
        .from("sprints")
        .select("id, name, status")
        .eq("project_id", activeProject.id)
        .order("created_at", { ascending: true });

      setSprints(sprintsData || []);

      // 2. Buscar Requisitos do Projeto (via project_id direto e fallback via project_requirements)
      let reqs = [];
      try {
        const { data: directReqs, error: directErr } = await supabase
          .from("requirements")
          .select("id, code, title, status, type")
          .eq("project_id", activeProject.id)
          .order("code", { ascending: true });

        if (!directErr && directReqs && directReqs.length > 0) {
          reqs = directReqs;
        }
      } catch {}

      if (reqs.length === 0) {
        try {
          const { data: linkedReqs } = await supabase
            .from("project_requirements")
            .select("requirement:requirements(id, code, title, status, type)")
            .eq("project_id", activeProject.id);

          if (linkedReqs && linkedReqs.length > 0) {
            reqs = linkedReqs
              .map((l) => l.requirement)
              .filter(Boolean)
              .sort((a, b) => (a.code || "").localeCompare(b.code || ""));
          }
        } catch {}
      }

      setProjectRequirements(reqs);

      // 3. Buscar User Stories do Projeto
      const { data: storiesData, error: storiesErr } = await supabase
        .from("user_stories")
        .select("*")
        .eq("project_id", activeProject.id)
        .order("code", { ascending: true });

      if (!storiesErr && storiesData && storiesData.length > 0) {
        setStories(storiesData);

        // 4. Buscar vínculos requirement_user_stories
        const storyIds = storiesData.map((s) => s.id);
        const { data: linksData } = await supabase
          .from("requirement_user_stories")
          .select("requirement_id, user_story_id")
          .in("user_story_id", storyIds);

        const mapLinks = {};
        (linksData || []).forEach((row) => {
          if (!mapLinks[row.user_story_id]) {
            mapLinks[row.user_story_id] = [];
          }
          mapLinks[row.user_story_id].push(row.requirement_id);
        });
        setStoryReqLinks(mapLinks);
      } else {
        setStories([]);
        setStoryReqLinks({});
      }
    } catch (err) {
      console.warn("Erro ao carregar dados de User Stories:", err);
      setStories([]);
    } finally {
      setLoading(false);
    }
  }, [activeProject?.id, supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  const handleOpenCreate = () => {
    guardAction(
      "user_stories_manage",
      () => {
        const nextNum = String(stories.length + 1).padStart(2, "0");
        setEditingStory(null);
        setFormError("");
        setStoryForm({
          code: `US-${nextNum}`,
          title: "",
          as_a: "",
          i_want: "",
          so_that: "",
          priority: "medium",
          status: "backlog",
          sprint_id: "",
          requirementIds: [],
        });
        setShowModal(true);
      },
      "criar novas histórias de usuário"
    );
  };

  const handleOpenEdit = (story) => {
    guardAction(
      "user_stories_manage",
      () => {
        setEditingStory(story);
        setFormError("");
        setStoryForm({
          code: story.code || "US-01",
          title: story.title || "",
          as_a: story.as_a || "",
          i_want: story.i_want || "",
          so_that: story.so_that || "",
          priority: story.priority || "medium",
          status: story.status || "backlog",
          sprint_id: story.sprint_id || "",
          requirementIds: storyReqLinks[story.id] || [],
        });
        setShowModal(true);
      },
      "editar histórias de usuário"
    );
  };

  const toggleRequirementSelection = (reqId) => {
    setStoryForm((prev) => {
      const exists = prev.requirementIds.includes(reqId);
      return {
        ...prev,
        requirementIds: exists
          ? prev.requirementIds.filter((id) => id !== reqId)
          : [...prev.requirementIds, reqId],
      };
    });
  };

  const handleSaveStory = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!storyForm.title.trim() || !activeProject?.id) {
      setFormError("O título da história é obrigatório.");
      return;
    }

    setIsSaving(true);
    try {
      let res;
      if (editingStory) {
        res = await updateUserStoryAction(editingStory.id, {
          projectId: activeProject.id,
          code: storyForm.code,
          title: storyForm.title,
          as_a: storyForm.as_a,
          i_want: storyForm.i_want,
          so_that: storyForm.so_that,
          priority: storyForm.priority,
          status: storyForm.status,
          sprintId: storyForm.sprint_id || null,
          requirementIds: storyForm.requirementIds,
        });
      } else {
        res = await createUserStoryAction({
          projectId: activeProject.id,
          code: storyForm.code,
          title: storyForm.title,
          as_a: storyForm.as_a,
          i_want: storyForm.i_want,
          so_that: storyForm.so_that,
          priority: storyForm.priority,
          status: storyForm.status,
          sprintId: storyForm.sprint_id || null,
          requirementIds: storyForm.requirementIds,
        });
      }

      if (!res.success) {
        setFormError(res.error || "Não foi possível salvar a história.");
        setIsSaving(false);
        return;
      }

      setShowModal(false);
      await loadData();
      showToast(
        editingStory
          ? `História "${storyForm.code}" atualizada com sucesso!`
          : `História "${storyForm.code}" criada com sucesso!`
      );
    } catch (err) {
      console.error("Erro ao salvar história:", err);
      setFormError("Erro inesperado ao salvar a história.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!storyToDelete || !activeProject?.id) return;
    setIsDeleting(true);
    try {
      const res = await deleteUserStoryAction(storyToDelete.id, activeProject.id);
      if (res.success) {
        setStories((prev) => prev.filter((s) => s.id !== storyToDelete.id));
        showToast(`História "${storyToDelete.code}" excluída do projeto.`);
      } else {
        alert(res.error || "Não foi possível excluir a história.");
      }
    } catch (err) {
      console.error("Erro ao excluir história:", err);
    } finally {
      setIsDeleting(false);
      setStoryToDelete(null);
    }
  };

  const reqByIdMap = useMemo(() => {
    const map = {};
    projectRequirements.forEach((r) => {
      map[r.id] = r;
    });
    return map;
  }, [projectRequirements]);

  const sprintByIdMap = useMemo(() => {
    const map = {};
    sprints.forEach((sp) => {
      map[sp.id] = sp;
    });
    return map;
  }, [sprints]);

  const filteredStories = useMemo(() => {
    return stories.filter((s) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        s.code?.toLowerCase().includes(q) ||
        s.title?.toLowerCase().includes(q) ||
        s.as_a?.toLowerCase().includes(q) ||
        s.i_want?.toLowerCase().includes(q);

      const matchStatus = filterStatus === "all" || s.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [stories, search, filterStatus]);

  return (
    <>
      <Topbar title="User Stories" />

      <div className="p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Toast de confirmação */}
        {toastMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <button
              onClick={() => setToastMessage("")}
              className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Header Controls */}
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 transition-colors">
          <div className="flex flex-col sm:flex-row items-center gap-3 flex-1 w-full">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por código, título, persona ou ação da história..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300/80 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full sm:w-48 px-3.5 py-2.5 rounded-xl border border-slate-300/80 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">Todos os status ({stories.length})</option>
              <option value="backlog">Product Backlog</option>
              <option value="todo">A Fazer</option>
              <option value="in_progress">Em Progresso</option>
              <option value="done">Concluído</option>
            </select>
          </div>

          <button
            onClick={handleOpenCreate}
            className={`w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-all shrink-0 ${
              canManageStories ? "cursor-pointer" : "opacity-60 hover:opacity-85 cursor-not-allowed"
            }`}
            title={
              canManageStories
                ? "Criar uma nova User Story vinculada a requisitos"
                : "Seu perfil não possui permissão para criar User Stories neste projeto"
            }
          >
            <Plus className="w-4 h-4" />
            <span>Nova User Story</span>
          </button>
        </div>

        {/* List of User Stories */}
        {loading ? (
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-12 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
            Carregando histórias de usuário do projeto...
          </div>
        ) : filteredStories.length === 0 ? (
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-14 border border-slate-200 dark:border-slate-800 text-center space-y-2">
            <Layers className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto stroke-1" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
              Nenhuma User Story encontrada neste projeto.
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-md mx-auto">
              Transforme os requisitos aprovados em Histórias de Usuário no formato &ldquo;Como / Quero / Para&rdquo; para planejar e executar nas Sprints.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredStories.map((story) => {
              const linkedReqIds = storyReqLinks[story.id] || [];
              const linkedReqs = linkedReqIds
                .map((id) => reqByIdMap[id])
                .filter(Boolean);
              const linkedSprint = story.sprint_id ? sprintByIdMap[story.sprint_id] : null;

              return (
                <div
                  key={story.id}
                  className="bg-white dark:bg-[#0f172a] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-xs border border-blue-200 dark:border-blue-800 font-mono">
                        {story.code}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {story.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                      {/* Badge da Sprint */}
                      <span
                        className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                          linkedSprint
                            ? "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60"
                            : "bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                        }`}
                      >
                        <Calendar className="w-3 h-3" />
                        <span>{linkedSprint ? linkedSprint.name : "Sem Sprint"}</span>
                      </span>

                      <PriorityBadge priority={story.priority} />

                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                          STATUS_BADGE_STYLES[story.status] || STATUS_BADGE_STYLES.backlog
                        }`}
                      >
                        {STATUS_LABELS[story.status] || "Product Backlog"}
                      </span>

                      {/* Botões de Ação (Editar / Excluir) */}
                      <div className="flex items-center gap-1 pl-2 border-l border-slate-200 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(story)}
                          title="Editar história e vínculos"
                          className={`p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer ${
                            !canManageStories ? "opacity-60" : ""
                          }`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            guardAction(
                              "user_stories_manage",
                              () => setStoryToDelete(story),
                              "excluir histórias de usuário"
                            )
                          }
                          title="Excluir história de usuário"
                          className={`p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer ${
                            !canManageStories ? "opacity-60" : ""
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Persona Pattern (Como / Quero / Para) */}
                  <div className="bg-slate-50/80 dark:bg-slate-950/60 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800 mb-3 space-y-1.5 text-xs">
                    <p className="text-slate-700 dark:text-slate-300">
                      <strong className="text-slate-900 dark:text-white font-semibold">
                        Como
                      </strong>{" "}
                      {story.as_a || "usuário"},
                    </p>
                    <p className="text-slate-700 dark:text-slate-300">
                      <strong className="text-blue-600 dark:text-blue-400 font-semibold">
                        Quero
                      </strong>{" "}
                      {story.i_want || "..."},
                    </p>
                    <p className="text-slate-700 dark:text-slate-300">
                      <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        Para
                      </strong>{" "}
                      {story.so_that || "..."}.
                    </p>
                  </div>

                  {/* Requisitos vinculados */}
                  <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Tag className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                      <span className="font-medium">Requisitos atendidos:</span>
                      {linkedReqs.length > 0 ? (
                        <div className="flex gap-1.5 flex-wrap">
                          {linkedReqs.map((req) => (
                            <span
                              key={req.id}
                              title={req.title}
                              className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px] border border-slate-200 dark:border-slate-700 font-mono flex items-center gap-1"
                            >
                              <span>{req.code}</span>
                              {req.status === "approved" && (
                                <Check className="w-3 h-3 text-emerald-500" />
                              )}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 italic">
                          Nenhum requisito vinculado (clique em editar para associar)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Criar / Editar User Story */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingStory ? `Editar ${editingStory.code}` : "Cadastrar Nova User Story"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Preencha no formato padrão ágil e vincule aos requisitos e sprints do projeto.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveStory} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                    Código
                  </label>
                  <input
                    type="text"
                    required
                    value={storyForm.code}
                    onChange={(e) => setStoryForm({ ...storyForm, code: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-bold text-slate-800 dark:text-slate-100 font-mono focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                    Prioridade
                  </label>
                  <select
                    value={storyForm.priority}
                    onChange={(e) => setStoryForm({ ...storyForm, priority: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                    <option value="critical">Crítica</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                    Status no Kanban
                  </label>
                  <select
                    value={storyForm.status}
                    onChange={(e) => setStoryForm({ ...storyForm, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="backlog">Product Backlog</option>
                    <option value="todo">A Fazer</option>
                    <option value="in_progress">Em Progresso</option>
                    <option value="done">Concluído</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                    Título da História
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Autenticação Segura de Usuários"
                    value={storyForm.title}
                    onChange={(e) => setStoryForm({ ...storyForm, title: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                    Sprint de Execução
                  </label>
                  <select
                    value={storyForm.sprint_id}
                    onChange={(e) => {
                      const nextSprintId = e.target.value;
                      setStoryForm((prev) => ({
                        ...prev,
                        sprint_id: nextSprintId,
                        status:
                          nextSprintId && prev.status === "backlog"
                            ? "todo"
                            : !nextSprintId
                            ? "backlog"
                            : prev.status,
                      }));
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="">Sem Sprint (Product Backlog)</option>
                    {sprints.map((sp) => (
                      <option key={sp.id} value={sp.id}>
                        {sp.name} {sp.status === "completed" ? "(Arquivada)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                  Como (Perfil / Persona)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: usuário do sistema"
                  value={storyForm.as_a}
                  onChange={(e) => setStoryForm({ ...storyForm, as_a: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                  Quero (Ação Desejada)
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Ex: receber alertas quando um requisito for aprovado"
                  value={storyForm.i_want}
                  onChange={(e) => setStoryForm({ ...storyForm, i_want: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                  Para (Benefício / Valor de Negócio)
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Ex: iniciar a implementação na sprint com segurança"
                  value={storyForm.so_that}
                  onChange={(e) => setStoryForm({ ...storyForm, so_that: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Seletor de Requisitos Vinculados */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Requisitos Vinculados ({storyForm.requirementIds.length})
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Selecione os requisitos que esta história implementa
                  </span>
                </div>

                {projectRequirements.length === 0 ? (
                  <div className="p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400 text-center">
                    Nenhum requisito cadastrado neste projeto ainda.
                  </div>
                ) : (
                  <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/60 bg-slate-50/50 dark:bg-slate-950/50">
                    {projectRequirements.map((req) => {
                      const isChecked = storyForm.requirementIds.includes(req.id);
                      return (
                        <label
                          key={req.id}
                          className={`flex items-center justify-between px-3.5 py-2 text-xs cursor-pointer transition-colors ${
                            isChecked
                              ? "bg-blue-50/70 dark:bg-blue-950/30"
                              : "hover:bg-slate-100/70 dark:hover:bg-slate-900/60"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleRequirementSelection(req.id)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <span className="font-mono font-bold text-blue-600 dark:text-blue-400 shrink-0">
                              {req.code}
                            </span>
                            <span className="text-slate-700 dark:text-slate-200 truncate">
                              {req.title}
                            </span>
                          </div>
                          <StatusBadge status={req.status} className="shrink-0 scale-90" />
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingStory ? "Salvar Alterações" : "Criar User Story"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {storyToDelete && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center z-[110] p-4">
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Excluir User Story {storyToDelete.code}?
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Esta ação removerá a história e seus vínculos com sprints e matriz.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStoryToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Excluir</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
