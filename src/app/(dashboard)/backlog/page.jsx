"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  GripVertical,
  FileText,
  Plus,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  X,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { PriorityBadge } from "@/components/ui/badge";
import { useProject } from "@/components/layout/project-context";
import { createClient } from "@/lib/supabase/client";
import { STORY_STATUS_COLUMNS, STORY_STATUSES } from "@/lib/constants/statuses";

export function StoryCard({ story, onMoveStatus }) {
  return (
    <div className="bg-white dark:bg-[#0f172a] rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
        <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{story.code}</span>
        <GripVertical className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 cursor-grab" />
      </div>

      <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-3 leading-snug">
        {story.title}
      </h4>

      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
        <PriorityBadge priority={story.priority} />

        <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
          <FileText className="w-3.5 h-3.5 text-slate-400" />
          <span>{story.rf_count ?? 1} RF</span>
        </div>
      </div>

      {/* Quick Move Action Buttons on Hover */}
      <div className="mt-3 pt-2 border-t border-dashed border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 opacity-80 group-hover:opacity-100 transition-opacity">
        <span className="text-[10px] text-slate-400 dark:text-slate-500">Mover:</span>
        <div className="flex items-center gap-1">
          {story.status !== STORY_STATUSES.BACKLOG && (
            <button
              onClick={() => onMoveStatus(story, -1)}
              title="Mover para coluna anterior"
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300 cursor-pointer"
            >
              <ArrowLeft className="w-3 h-3" />
            </button>
          )}
          {story.status !== STORY_STATUSES.DONE && (
            <button
              onClick={() => onMoveStatus(story, 1)}
              title="Avançar status"
              className="p-1 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-0.5 cursor-pointer"
            >
              <span>Avançar</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function KanbanColumn({ column, stories = [], onMoveStatus }) {
  return (
    <div className="bg-slate-200/50 dark:bg-[#0c1427]/80 rounded-2xl p-4 border border-slate-300/70 dark:border-slate-800/80 flex flex-col min-h-[550px] transition-colors">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${column.colorDot}`} />
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            {column.title}
          </h3>
        </div>
        <span className="w-5 h-5 rounded-full bg-slate-300/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold flex items-center justify-center">
          {stories.length}
        </span>
      </div>

      <div className="space-y-3 flex-1 overflow-y-auto">
        {stories.map((story) => (
          <StoryCard key={story.id} story={story} onMoveStatus={onMoveStatus} />
        ))}

        {stories.length === 0 && (
          <div className="h-32 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-xl flex items-center justify-center text-[11px] text-slate-400 dark:text-slate-500">
            Nenhuma história nesta coluna
          </div>
        )}
      </div>
    </div>
  );
}

function SprintModal({ activeProject, supabase, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: "",
    goal: "",
    start_date: "",
    end_date: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("O nome da sprint é obrigatório.");
      return;
    }
    if (!activeProject?.id) {
      setError("Nenhum projeto ativo selecionado.");
      return;
    }

    setIsSaving(true);
    try {
      const { data, error: dbError } = await supabase
        .from("sprints")
        .insert({
          project_id: activeProject.id,
          name: form.name.trim(),
          goal: form.goal.trim() || null,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
          status: "active",
        })
        .select()
        .single();

      if (dbError) {
        setError(`Erro ao salvar: ${dbError.message}`);
        return;
      }

      onSaved(data);
    } catch (err) {
      console.error("Erro inesperado ao criar sprint:", err);
      setError("Ocorreu um erro inesperado. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Nova Sprint</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Defina o nome, objetivo e período da sprint.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Nome */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
              Nome da Sprint <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ex.: Sprint 5 — Autenticação"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Objetivo */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
              Objetivo da Sprint
            </label>
            <textarea
              rows={2}
              placeholder="O que a equipe deve entregar ao final desta sprint?"
              value={form.goal}
              onChange={(e) => setForm({ ...form, goal: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                Data de Início
              </label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                Data de Término
              </label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs flex items-center gap-2 transition-colors disabled:opacity-60 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  Criar Sprint
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function BacklogPage() {
  const { activeProject } = useProject();
  const supabase = useMemo(() => createClient(), []);

  const [sprint, setSprint] = useState({
    name: "Sprint 4 — Rastreabilidade & Qualidade",
    startDate: "01/08/2026",
    endDate: "15/08/2026",
    progress: 20,
  });

  const [stories, setStories] = useState([]);
  const [showSprintModal, setShowSprintModal] = useState(false);

  useEffect(() => {
    async function loadBacklog() {
      if (!activeProject?.id) return;
      try {
        // Buscar sprint ativa do projeto
        const { data: dbSprint } = await supabase
          .from("sprints")
          .select("*")
          .eq("project_id", activeProject.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (dbSprint) {
          setSprint({
            name: dbSprint.name,
            startDate: dbSprint.start_date || "Não definida",
            endDate: dbSprint.end_date || "Não definida",
            progress: dbSprint.status === "completed" ? 100 : 25,
          });
        } else if (activeProject.id === "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa") {
          setSprint({
            name: "Sprint 4 — Rastreabilidade & Qualidade",
            startDate: "01/08/2026",
            endDate: "15/08/2026",
            progress: 20,
          });
        } else {
          setSprint({
            name: "Nenhuma Sprint Cadastrada",
            startDate: "--",
            endDate: "--",
            progress: 0,
          });
        }

        // Buscar histórias vinculadas ao projeto ativo
        const { data: dbStories } = await supabase
          .from("user_stories")
          .select("*, requirement_user_stories(count)")
          .eq("project_id", activeProject.id);

        if (dbStories && dbStories.length > 0) {
          setStories(
            dbStories.map((s) => ({
              ...s,
              rf_count: s.requirement_user_stories?.[0]?.count ?? 0,
            }))
          );
        } else if (activeProject.id === "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa") {
          setStories([
            {
              id: "6",
              code: "US-06",
              title: "Criptografia de dados",
              priority: "high",
              status: STORY_STATUSES.BACKLOG,
              rf_count: 1,
            },
            {
              id: "7",
              code: "US-07",
              title: "Exportação de relatórios",
              priority: "low",
              status: STORY_STATUSES.BACKLOG,
              rf_count: 2,
            },
            {
              id: "8",
              code: "US-08",
              title: "Experiência responsiva",
              priority: "medium",
              status: STORY_STATUSES.BACKLOG,
              rf_count: 3,
            },
            {
              id: "4",
              code: "US-04",
              title: "Histórico de versões",
              priority: "medium",
              status: STORY_STATUSES.TODO,
              rf_count: 2,
            },
            {
              id: "5",
              code: "US-05",
              title: "Matriz de rastreabilidade",
              priority: "high",
              status: STORY_STATUSES.TODO,
              rf_count: 3,
            },
            {
              id: "2",
              code: "US-02",
              title: "Painel de indicadores",
              priority: "high",
              status: STORY_STATUSES.IN_PROGRESS,
              rf_count: 3,
            },
            {
              id: "3",
              code: "US-03",
              title: "Gestão de requisitos (CRUD)",
              priority: "high",
              status: STORY_STATUSES.IN_PROGRESS,
              rf_count: 4,
            },
            {
              id: "1",
              code: "US-01",
              title: "Autenticação de usuários",
              priority: "high",
              status: STORY_STATUSES.DONE,
              rf_count: 2,
            },
          ]);
        } else {
          setStories([]);
        }
      } catch (err) {
        console.warn("Erro ao carregar backlog do Supabase:", err);
        setStories([]);
      }
    }

    loadBacklog();
  }, [activeProject?.id, supabase]);

  const order = [
    STORY_STATUSES.BACKLOG,
    STORY_STATUSES.TODO,
    STORY_STATUSES.IN_PROGRESS,
    STORY_STATUSES.DONE,
  ];

  const handleMoveStatus = async (story, direction) => {
    const currentIndex = order.indexOf(story.status);
    const newIndex = currentIndex + direction;
    if (newIndex < 0 || newIndex >= order.length) return;

    const newStatus = order[newIndex];

    setStories((prev) =>
      prev.map((s) => (s.id === story.id ? { ...s, status: newStatus } : s))
    );

    // Calcular novo progresso da sprint com base em histórias concluídas
    const totalSprintStories = stories.filter((s) => s.status !== STORY_STATUSES.BACKLOG).length;
    const doneStories = stories.filter((s) => (s.id === story.id ? newStatus === STORY_STATUSES.DONE : s.status === STORY_STATUSES.DONE)).length;
    const progress = totalSprintStories > 0 ? Math.round((doneStories / totalSprintStories) * 100) : 0;
    setSprint((prev) => ({ ...prev, progress }));

    try {
      await supabase
        .from("user_stories")
        .update({ status: newStatus })
        .eq("id", story.id);
    } catch (err) {
      console.warn("Erro ao atualizar status:", err);
    }
  };

  return (
    <>
      <Topbar title="Backlog & Sprints" />

      {/* Modal de Nova Sprint */}
      {showSprintModal && (
        <SprintModal
          activeProject={activeProject}
          supabase={supabase}
          onClose={() => setShowSprintModal(false)}
          onSaved={(saved) => {
            setSprint({
              name: saved.name,
              startDate: saved.start_date
                ? new Date(saved.start_date).toLocaleDateString("pt-BR")
                : "--",
              endDate: saved.end_date
                ? new Date(saved.end_date).toLocaleDateString("pt-BR")
                : "--",
              progress: 0,
            });
            setShowSprintModal(false);
          }}
        />
      )}

      <div className="p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Sprint Header Banner Card */}
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              {sprint.name}
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <span>
                {sprint.startDate} — {sprint.endDate}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            {/* Botão Nova Sprint */}
            <button
              onClick={() => setShowSprintModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Nova Sprint
            </button>

            <div className="w-full md:w-64">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                <span>Progresso da sprint</span>
                <span className="text-blue-600 dark:text-blue-400 font-bold">{sprint.progress}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/60 dark:border-slate-700">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${sprint.progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 4 Kanban Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {STORY_STATUS_COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              column={col}
              stories={stories.filter((s) => s.status === col.id)}
              onMoveStatus={handleMoveStatus}
            />
          ))}
        </div>
      </div>
    </>
  );
}
