"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  GripVertical,
  FileText,
  Plus,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  ChevronDown,
  X,
  Loader2,
  AlertTriangle,
  Trash2,
  Archive,
  ArchiveRestore,
  Minimize2,
  Maximize2,
  Layers,
  Inbox,
  CheckCircle2,
} from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { PriorityBadge } from "@/components/ui/badge";
import { useProject } from "@/components/layout/project-context";
import { createClient } from "@/lib/supabase/client";
import { STORY_STATUSES } from "@/lib/constants/statuses";
import {
  createSprintAction,
  archiveSprintAction,
  deleteSprintAction,
  updateStoryPlacementAction,
} from "@/app/actions/sprints";

// Colunas do Kanban dentro de cada Sprint (apenas o fluxo de execução da sprint)
export const SPRINT_KANBAN_COLUMNS = [
  {
    id: STORY_STATUSES.TODO,
    title: "A Fazer",
    colorDot: "bg-amber-500 dark:bg-amber-400",
  },
  {
    id: STORY_STATUSES.IN_PROGRESS,
    title: "Em Progresso",
    colorDot: "bg-blue-600 dark:bg-blue-400",
  },
  {
    id: STORY_STATUSES.DONE,
    title: "Concluído",
    colorDot: "bg-emerald-500 dark:bg-emerald-400",
  },
];

const SPRINT_FLOW_ORDER = [
  STORY_STATUSES.TODO,
  STORY_STATUSES.IN_PROGRESS,
  STORY_STATUSES.DONE,
];

function formatDateDisplay(dateStr) {
  if (!dateStr || dateStr === "--") return "--";
  try {
    if (dateStr.includes("/")) return dateStr;
    const parts = dateStr.split("T")[0].split("-");
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString("pt-BR");
  } catch {
    return dateStr;
  }
}

export function StoryCard({
  story,
  sprintId,
  sprints = [],
  onMoveStatus,
  onUnlinkSprint,
  onAssignSprint,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [showSprintMenu, setShowSprintMenu] = useState(false);

  const isInSprint = Boolean(story.sprint_id);
  const currentSprintIndex = SPRINT_FLOW_ORDER.indexOf(story.status);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(
          "application/json",
          JSON.stringify({ storyId: story.id, sourceSprintId: story.sprint_id })
        );
        e.dataTransfer.setData("text/plain", story.id);
        e.dataTransfer.effectAllowed = "move";
        setIsDragging(true);
      }}
      onDragEnd={() => {
        setIsDragging(false);
      }}
      className={`bg-white dark:bg-[#0f172a] rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all group cursor-grab active:cursor-grabbing select-none relative ${
        isDragging ? "opacity-30 scale-95 border-dashed border-blue-500 shadow-none" : ""
      }`}
    >
      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
        <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{story.code}</span>
        <GripVertical className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 transition-colors" />
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

      {/* Ações Rápidas nos Cards */}
      <div className="mt-3 pt-2 border-t border-dashed border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 opacity-80 group-hover:opacity-100 transition-opacity">
        {isInSprint ? (
          <>
            <div className="flex items-center gap-1">
              {currentSprintIndex > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveStatus(story, -1);
                  }}
                  title="Voltar status"
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3" />
                </button>
              )}
              {currentSprintIndex < SPRINT_FLOW_ORDER.length - 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveStatus(story, 1);
                  }}
                  title="Avançar status"
                  className="p-1 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-0.5 cursor-pointer"
                >
                  <span>Avançar</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUnlinkSprint(story);
              }}
              title="Mover para o Backlog do Produto (desvincular da sprint)"
              className="text-[10px] text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors cursor-pointer"
            >
              Desvincular
            </button>
          </>
        ) : (
          <div className="w-full flex items-center justify-between">
            <span className="text-[10px] text-slate-400">Não planejada</span>
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSprintMenu(!showSprintMenu);
                }}
                title="Atribuir a uma sprint"
                className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>+ Sprint</span>
              </button>
              {showSprintMenu && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 bottom-6 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-1 z-30 space-y-0.5 animate-in fade-in"
                >
                  <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase">
                    Vincular à Sprint
                  </div>
                  {sprints.length === 0 ? (
                    <div className="px-2 py-2 text-[11px] text-slate-400 italic">
                      Nenhuma sprint ativa
                    </div>
                  ) : (
                    sprints.map((sp) => (
                      <button
                        key={sp.id}
                        type="button"
                        onClick={() => {
                          onAssignSprint(story, sp.id);
                          setShowSprintMenu(false);
                        }}
                        className="w-full text-left px-2 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 rounded-lg transition-colors truncate"
                      >
                        {sp.name}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function KanbanColumn({
  column,
  sprintId,
  stories = [],
  onMoveStatus,
  onDropStory,
  sprints,
  onUnlinkSprint,
  onAssignSprint,
}) {
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (!isOver) setIsOver(true);
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsOver(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsOver(false);
    const rawData = e.dataTransfer.getData("application/json");
    let storyId = e.dataTransfer.getData("text/plain");

    if (rawData) {
      try {
        const parsed = JSON.parse(rawData);
        storyId = parsed.storyId || storyId;
      } catch {}
    }

    if (storyId) {
      onDropStory(storyId, column.id, sprintId);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`rounded-2xl p-4 border flex flex-col min-h-[420px] transition-all duration-150 ${
        isOver
          ? "bg-blue-50/60 dark:bg-blue-950/40 border-blue-500 dark:border-blue-500 ring-2 ring-blue-500/20"
          : "bg-slate-200/50 dark:bg-[#0c1427]/80 border-slate-300/70 dark:border-slate-800/80"
      }`}
    >
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
          <StoryCard
            key={story.id}
            story={story}
            sprintId={sprintId}
            sprints={sprints}
            onMoveStatus={onMoveStatus}
            onUnlinkSprint={onUnlinkSprint}
            onAssignSprint={onAssignSprint}
          />
        ))}

        {stories.length === 0 && (
          <div
            className={`h-28 border-2 border-dashed rounded-xl flex items-center justify-center text-[11px] transition-colors ${
              isOver
                ? "border-blue-400 dark:border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/20 font-semibold"
                : "border-slate-300 dark:border-slate-800 text-slate-400 dark:text-slate-500"
            }`}
          >
            {isOver ? "Soltar história aqui" : "Nenhuma história nesta coluna"}
          </div>
        )}
      </div>
    </div>
  );
}

function SprintModal({ activeProject, onClose, onSaved }) {
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
      const res = await createSprintAction({
        projectId: activeProject.id,
        name: form.name.trim(),
        goal: form.goal.trim() || null,
        startDate: form.start_date || null,
        endDate: form.end_date || null,
      });

      if (!res.success) {
        setError(`Erro ao salvar: ${res.error}`);
        return;
      }

      onSaved(res.data);
    } catch (err) {
      console.error("Erro inesperado ao criar sprint:", err);
      setError("Ocorreu um erro inesperado. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center z-[100] p-4">
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95">
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

        <form onSubmit={handleSave} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
              Nome da Sprint <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ex.: Sprint 3 — Autenticação"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

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

function DeleteSprintModal({ sprint, storiesCount, onClose, onConfirm, isDeleting }) {
  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center z-[110] p-4 animate-in fade-in">
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-6 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <Trash2 className="w-6 h-6" />
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Excluir Sprint?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Você está prestes a excluir permanentemente a sprint{" "}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                "{sprint?.name}"
              </span>
              .
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <span>
              <strong>Suas histórias estão protegidas:</strong>{" "}
              {storiesCount > 0
                ? `${storiesCount} histórias associadas retornarão`
                : "As histórias associadas retornarão"}{" "}
              automaticamente para o Backlog do Produto e nenhuma história será perdida.
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs flex items-center gap-2 transition-colors disabled:opacity-60 cursor-pointer"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Excluindo...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir Sprint</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Modal exclusivo para visualização e desarquivamento de Sprints Arquivadas
 */
function ArchivedSprintsModal({
  isOpen,
  onClose,
  archivedSprints,
  stories,
  onUnarchive,
  onDeleteRequest,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center z-[100] p-4 animate-in fade-in">
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Sprints Arquivadas
                </h2>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                  {archivedSprints.length}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Sprints finalizadas ou arquivadas. Clique em "Desarquivar" para trazê-las de volta ao quadro.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {archivedSprints.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Archive className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                Nenhuma sprint arquivada
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                Quando você arquivar uma sprint no quadro principal, ela ficará guardada aqui para consulta ou reativação.
              </p>
            </div>
          ) : (
            archivedSprints.map((sprint) => {
              const sprintStories = stories.filter((s) => s.sprint_id === sprint.id);
              const doneCount = sprintStories.filter((s) => s.status === STORY_STATUSES.DONE).length;
              const progress =
                sprintStories.length > 0
                  ? Math.round((doneCount / sprintStories.length) * 100)
                  : 100;

              return (
                <div
                  key={sprint.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {sprint.name}
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                        Arquivada
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {formatDateDisplay(sprint.start_date)} — {formatDateDisplay(sprint.end_date)}
                      </span>
                      <span>•</span>
                      <span>
                        {sprintStories.length} histórias ({doneCount} concluídas)
                      </span>
                    </div>

                    {sprint.goal && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 italic pt-1">
                        "{sprint.goal}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                    <div className="w-28 hidden sm:block">
                      <div className="flex items-center justify-between text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        <span>Progresso</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => onUnarchive(sprint)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-xl transition-colors cursor-pointer"
                      title="Desarquivar e retornar ao quadro principal"
                    >
                      <ArchiveRestore className="w-3.5 h-3.5" />
                      <span>Desarquivar</span>
                    </button>

                    <button
                      onClick={() => onDeleteRequest(sprint, sprintStories.length)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                      title="Excluir sprint"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-slate-900/60">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

function SprintBlock({
  sprint,
  index = 0,
  isFirst = false,
  isLast = false,
  onMoveOrder,
  stories = [],
  allActiveSprints = [],
  isCollapsed,
  onToggleCollapse,
  onArchive,
  onDeleteRequest,
  onMoveStatus,
  onDropStory,
  onUnlinkSprint,
  onAssignSprint,
}) {
  const sprintStories = useMemo(
    () => stories.filter((s) => s.sprint_id === sprint.id),
    [stories, sprint.id]
  );

  const doneCount = sprintStories.filter((s) => s.status === STORY_STATUSES.DONE).length;
  const progress =
    sprintStories.length > 0
      ? Math.round((doneCount / sprintStories.length) * 100)
      : 0;

  // Visualização Resumida (Collapsed)
  if (isCollapsed) {
    return (
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onToggleCollapse(sprint.id)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Expandir sprint"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {sprint.name}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Ativa
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  {formatDateDisplay(sprint.start_date)} — {formatDateDisplay(sprint.end_date)}
                </span>
                <span>•</span>
                <span>
                  {sprintStories.length} histórias ({doneCount} concluídas)
                </span>
                {sprint.goal && (
                  <>
                    <span>•</span>
                    <span className="italic truncate max-w-xs text-slate-600 dark:text-slate-300">
                      "{sprint.goal}"
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap self-end md:self-auto">
            <div className="w-36">
              <div className="flex items-center justify-between text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                <span>Progresso</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{progress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/60 dark:border-slate-700">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5 border-l border-slate-200 dark:border-slate-800 pl-3">
              {/* Botões para Reordenar Sprints */}
              <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200/60 dark:border-slate-700/60" title="Alterar ordem da sprint">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveOrder(sprint.id, -1);
                  }}
                  disabled={isFirst}
                  className="p-1 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 disabled:opacity-20 rounded hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:cursor-not-allowed"
                  title="Mover sprint para cima"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveOrder(sprint.id, 1);
                  }}
                  disabled={isLast}
                  className="p-1 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 disabled:opacity-20 rounded hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:cursor-not-allowed"
                  title="Mover sprint para baixo"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={() => onToggleCollapse(sprint.id)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
                title="Expandir sprint"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Expandir</span>
              </button>

              <button
                onClick={() => onArchive(sprint)}
                className="p-1.5 rounded-lg border border-transparent text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Arquivar sprint"
              >
                <Archive className="w-4 h-4" />
              </button>

              <button
                onClick={() => onDeleteRequest(sprint, sprintStories.length)}
                className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                title="Excluir sprint"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Visualização Completa (Expanded) com 3 Colunas: A Fazer, Em Progresso, Concluído
  return (
    <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6 transition-colors">
      {/* Banner da Sprint */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-5">
        <div className="flex items-start gap-3">
          <button
            onClick={() => onToggleCollapse(sprint.id)}
            className="p-1.5 mt-0.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Resumir sprint (minimizar)"
          >
            <ChevronDown className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {sprint.name}
              </h2>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Ativa
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                <span>
                  {formatDateDisplay(sprint.start_date)} — {formatDateDisplay(sprint.end_date)}
                </span>
              </div>
              <span>•</span>
              <span>
                {sprintStories.length} histórias ({doneCount} concluídas)
              </span>
              {sprint.goal && (
                <>
                  <span>•</span>
                  <span className="text-slate-600 dark:text-slate-300 italic">
                    "{sprint.goal}"
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          {/* Progresso da Sprint */}
          <div className="w-48 sm:w-56">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              <span>Progresso da sprint</span>
              <span className="text-blue-600 dark:text-blue-400 font-bold">{progress}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/60 dark:border-slate-700">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Ações da Sprint: Reordenar, Resumir, Arquivar, Excluir */}
          <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-800 pl-3">
            {/* Botões para Reordenar Sprints */}
            <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200/60 dark:border-slate-700/60" title="Alterar ordem da sprint">
              <button
                type="button"
                onClick={() => onMoveOrder(sprint.id, -1)}
                disabled={isFirst}
                className="p-1 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 disabled:opacity-20 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:cursor-not-allowed"
                title="Mover sprint para cima"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onMoveOrder(sprint.id, 1)}
                disabled={isLast}
                className="p-1 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 disabled:opacity-20 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:cursor-not-allowed"
                title="Mover sprint para baixo"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={() => onToggleCollapse(sprint.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors cursor-pointer"
              title="Resumir para não ocupar espaço"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>Resumir</span>
            </button>

            <button
              onClick={() => onArchive(sprint)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Arquivar sprint (vai para a lista de arquivadas)"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Arquivar</span>
            </button>

            <button
              onClick={() => onDeleteRequest(sprint, sprintStories.length)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl transition-colors cursor-pointer"
              title="Excluir sprint"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3 Colunas Kanban da Sprint: A Fazer, Em Progresso, Concluído */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {SPRINT_KANBAN_COLUMNS.map((col) => {
          // Histórias da coluna correspondente (se uma história tiver status backlog, ela é exibida em A Fazer para execução)
          const columnStories = sprintStories.filter((s) => {
            if (col.id === STORY_STATUSES.TODO) {
              return s.status === STORY_STATUSES.TODO || s.status === STORY_STATUSES.BACKLOG;
            }
            return s.status === col.id;
          });

          return (
            <KanbanColumn
              key={col.id}
              column={col}
              sprintId={sprint.id}
              stories={columnStories}
              sprints={allActiveSprints}
              onMoveStatus={onMoveStatus}
              onDropStory={onDropStory}
              onUnlinkSprint={onUnlinkSprint}
              onAssignSprint={onAssignSprint}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function BacklogPage() {
  const { activeProject } = useProject();
  const supabase = useMemo(() => createClient(), []);

  const [sprints, setSprints] = useState([]);
  const [stories, setStories] = useState([]);
  const [collapsedSprints, setCollapsedSprints] = useState({});
  const [showSprintModal, setShowSprintModal] = useState(false);
  const [showArchivedModal, setShowArchivedModal] = useState(false);

  const [deleteModalState, setDeleteModalState] = useState({
    isOpen: false,
    sprint: null,
    storiesCount: 0,
    isDeleting: false,
  });

  const [isBacklogCollapsed, setIsBacklogCollapsed] = useState(false);
  const [isDropOverGeneralBacklog, setIsDropOverGeneralBacklog] = useState(false);

  useEffect(() => {
    async function loadBacklog() {
      if (!activeProject?.id) return;
      try {
        // 1. Buscar todas as sprints do projeto
        const { data: dbSprints } = await supabase
          .from("sprints")
          .select("*")
          .eq("project_id", activeProject.id)
          .order("created_at", { ascending: false });

        // Ordenador auxiliar baseado na preferência salva no localStorage
        const sortWithSavedOrder = (list) => {
          if (!activeProject?.id || typeof window === "undefined") return list;
          try {
            const saved = JSON.parse(
              localStorage.getItem(`reqflow_sprint_order_${activeProject.id}`) || "[]"
            );
            if (Array.isArray(saved) && saved.length > 0) {
              const map = new Map(saved.map((id, idx) => [id, idx]));
              return [...list].sort((a, b) => {
                const idxA = map.has(a.id) ? map.get(a.id) : 999;
                const idxB = map.has(b.id) ? map.get(b.id) : 999;
                return idxA - idxB;
              });
            }
          } catch {}
          return list;
        };

        if (dbSprints && dbSprints.length > 0) {
          setSprints(sortWithSavedOrder(dbSprints));
        } else if (activeProject.id === "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa") {
          setSprints(
            sortWithSavedOrder([
              {
                id: "sprint-demo-2",
                name: "Sprint 2 — Rastreabilidade & Validação",
                goal: "Finalizar matriz de rastreabilidade e histórico de versões",
                start_date: "2026-11-01",
                end_date: "2026-11-15",
                status: "active",
              },
              {
                id: "sprint-demo-1",
                name: "Sprint 1 — MVP Inicial",
                goal: "Modelagem inicial de requisitos e autenticação",
                start_date: "2026-10-15",
                end_date: "2026-10-31",
                status: "completed",
              },
            ])
          );
        } else {
          setSprints([]);
        }

        // 2. Buscar histórias de usuário vinculadas ao projeto
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
              id: "1",
              code: "US-01",
              title: "Autenticação de usuários",
              priority: "high",
              status: STORY_STATUSES.DONE,
              sprint_id: "sprint-demo-1",
              rf_count: 2,
            },
            {
              id: "2",
              code: "US-02",
              title: "Painel de indicadores",
              priority: "high",
              status: STORY_STATUSES.IN_PROGRESS,
              sprint_id: "sprint-demo-2",
              rf_count: 3,
            },
            {
              id: "3",
              code: "US-03",
              title: "Gestão de requisitos (CRUD)",
              priority: "high",
              status: STORY_STATUSES.IN_PROGRESS,
              sprint_id: "sprint-demo-2",
              rf_count: 4,
            },
            {
              id: "4",
              code: "US-04",
              title: "Histórico de versões",
              priority: "medium",
              status: STORY_STATUSES.TODO,
              sprint_id: "sprint-demo-2",
              rf_count: 2,
            },
            {
              id: "5",
              code: "US-05",
              title: "Matriz de rastreabilidade",
              priority: "high",
              status: STORY_STATUSES.TODO,
              sprint_id: "sprint-demo-2",
              rf_count: 3,
            },
            {
              id: "6",
              code: "US-06",
              title: "Criptografia de dados",
              priority: "high",
              status: STORY_STATUSES.BACKLOG,
              sprint_id: null,
              rf_count: 1,
            },
            {
              id: "7",
              code: "US-07",
              title: "Exportação de relatórios",
              priority: "low",
              status: STORY_STATUSES.BACKLOG,
              sprint_id: null,
              rf_count: 2,
            },
            {
              id: "8",
              code: "US-08",
              title: "Experiência responsiva",
              priority: "medium",
              status: STORY_STATUSES.BACKLOG,
              sprint_id: null,
              rf_count: 3,
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

  // Alternar colapso / resumo de uma sprint
  const handleToggleCollapse = (sprintId) => {
    setCollapsedSprints((prev) => ({
      ...prev,
      [sprintId]: !prev[sprintId],
    }));
  };

  // Recolher todas ou expandir todas as sprints ativas
  const handleToggleAllCollapse = (collapseAll) => {
    const updated = {};
    sprints.forEach((s) => {
      updated[s.id] = collapseAll;
    });
    setCollapsedSprints(updated);
  };

  // Alterar a ordem das sprints ativas (Subir / Descer)
  const handleMoveSprintOrder = (sprintId, direction) => {
    setSprints((prev) => {
      const active = prev.filter((s) => s.status !== "completed");
      const archived = prev.filter((s) => s.status === "completed");

      const currentIndex = active.findIndex((s) => s.id === sprintId);
      if (currentIndex < 0) return prev;

      const targetIndex = currentIndex + direction;
      if (targetIndex < 0 || targetIndex >= active.length) return prev;

      const reorderedActive = [...active];
      const [moved] = reorderedActive.splice(currentIndex, 1);
      reorderedActive.splice(targetIndex, 0, moved);

      // Salvar preferência de ordenação no localStorage
      if (activeProject?.id && typeof window !== "undefined") {
        try {
          localStorage.setItem(
            `reqflow_sprint_order_${activeProject.id}`,
            JSON.stringify(reorderedActive.map((s) => s.id))
          );
        } catch (e) {
          console.warn("Aviso ao salvar ordem das sprints:", e);
        }
      }

      return [...reorderedActive, ...archived];
    });
  };

  // Mover status de história dentro da sprint (A Fazer <-> Em Progresso <-> Concluído)
  const handleMoveStatus = async (story, direction) => {
    const currentIndex = SPRINT_FLOW_ORDER.indexOf(
      story.status === STORY_STATUSES.BACKLOG ? STORY_STATUSES.TODO : story.status
    );
    const newIndex = currentIndex + direction;
    if (newIndex < 0 || newIndex >= SPRINT_FLOW_ORDER.length) return;

    const newStatus = SPRINT_FLOW_ORDER[newIndex];

    setStories((prev) =>
      prev.map((s) => (s.id === story.id ? { ...s, status: newStatus } : s))
    );

    try {
      await updateStoryPlacementAction(story.id, { status: newStatus });
    } catch (err) {
      console.warn("Erro ao atualizar status:", err);
    }
  };

  // Drag and drop para qualquer coluna de uma sprint
  const handleDropStory = async (storyId, targetStatus, targetSprintId) => {
    const story = stories.find((s) => s.id === storyId);
    if (!story) return;

    if (story.status === targetStatus && story.sprint_id === targetSprintId) {
      return;
    }

    setStories((prev) =>
      prev.map((s) =>
        s.id === storyId ? { ...s, status: targetStatus, sprint_id: targetSprintId } : s
      )
    );

    try {
      await updateStoryPlacementAction(storyId, {
        status: targetStatus,
        sprintId: targetSprintId,
      });
    } catch (err) {
      console.warn("Erro ao mover história via drag-and-drop:", err);
    }
  };

  // Desvincular história de uma sprint (volta para o Backlog do Produto no topo)
  const handleUnlinkSprint = async (story) => {
    setStories((prev) =>
      prev.map((s) =>
        s.id === story.id ? { ...s, sprint_id: null, status: STORY_STATUSES.BACKLOG } : s
      )
    );

    try {
      await updateStoryPlacementAction(story.id, {
        sprintId: null,
        status: STORY_STATUSES.BACKLOG,
      });
    } catch (err) {
      console.warn("Erro ao desvincular história:", err);
    }
  };

  // Vincular história a uma sprint (status inicial: A Fazer)
  const handleAssignSprint = async (story, targetSprintId) => {
    setStories((prev) =>
      prev.map((s) =>
        s.id === story.id
          ? { ...s, sprint_id: targetSprintId, status: STORY_STATUSES.TODO }
          : s
      )
    );

    try {
      await updateStoryPlacementAction(story.id, {
        sprintId: targetSprintId,
        status: STORY_STATUSES.TODO,
      });
    } catch (err) {
      console.warn("Erro ao vincular história à sprint:", err);
    }
  };

  // Arquivar sprint (some da tela principal e vai para a lista de arquivadas)
  const handleArchiveSprint = async (sprint) => {
    setSprints((prev) =>
      prev.map((s) => (s.id === sprint.id ? { ...s, status: "completed" } : s))
    );

    try {
      await archiveSprintAction(sprint.id, true);
    } catch (err) {
      console.warn("Erro ao arquivar sprint:", err);
    }
  };

  // Desarquivar sprint (volta a aparecer na tela principal)
  const handleUnarchiveSprint = async (sprint) => {
    setSprints((prev) =>
      prev.map((s) => (s.id === sprint.id ? { ...s, status: "active" } : s))
    );

    try {
      await archiveSprintAction(sprint.id, false);
    } catch (err) {
      console.warn("Erro ao desarquivar sprint:", err);
    }
  };

  // Solicitar exclusão de sprint
  const handleDeleteRequest = (sprint, storiesCount) => {
    setDeleteModalState({
      isOpen: true,
      sprint,
      storiesCount,
      isDeleting: false,
    });
  };

  // Confirmar exclusão de sprint
  const handleConfirmDelete = async () => {
    const sprintId = deleteModalState.sprint?.id;
    if (!sprintId) return;

    setDeleteModalState((prev) => ({ ...prev, isDeleting: true }));

    // Atualização otimista
    setSprints((prev) => prev.filter((s) => s.id !== sprintId));
    setStories((prev) =>
      prev.map((s) =>
        s.sprint_id === sprintId
          ? { ...s, sprint_id: null, status: STORY_STATUSES.BACKLOG }
          : s
      )
    );

    try {
      await deleteSprintAction(sprintId);
    } catch (err) {
      console.warn("Erro ao excluir sprint:", err);
    } finally {
      setDeleteModalState({
        isOpen: false,
        sprint: null,
        storiesCount: 0,
        isDeleting: false,
      });
    }
  };

  // Sprints ativas: SOMENTE estas aparecem na tela principal!
  const activeSprints = useMemo(
    () => sprints.filter((s) => s.status !== "completed"),
    [sprints]
  );

  // Sprints arquivadas: aparecem apenas no modal "Sprints Arquivadas"
  const archivedSprints = useMemo(
    () => sprints.filter((s) => s.status === "completed"),
    [sprints]
  );

  // Histórias não atribuídas a nenhuma sprint ativa (Backlog do Produto)
  const unassignedStories = useMemo(() => {
    const activeSprintIds = new Set(activeSprints.map((s) => s.id));
    return stories.filter((s) => !s.sprint_id || !activeSprintIds.has(s.sprint_id));
  }, [stories, activeSprints]);

  return (
    <>
      <Topbar title="Backlog & Sprints" />

      {/* Modal de Criação de Nova Sprint */}
      {showSprintModal && (
        <SprintModal
          activeProject={activeProject}
          onClose={() => setShowSprintModal(false)}
          onSaved={(saved) => {
            setSprints((prev) => [saved, ...prev]);
            setShowSprintModal(false);
          }}
        />
      )}

      {/* Modal de Sprints Arquivadas (com opção de desarquivar) */}
      <ArchivedSprintsModal
        isOpen={showArchivedModal}
        onClose={() => setShowArchivedModal(false)}
        archivedSprints={archivedSprints}
        stories={stories}
        onUnarchive={handleUnarchiveSprint}
        onDeleteRequest={handleDeleteRequest}
      />

      {/* Modal de Confirmação para Excluir Sprint */}
      {deleteModalState.isOpen && (
        <DeleteSprintModal
          sprint={deleteModalState.sprint}
          storiesCount={deleteModalState.storiesCount}
          isDeleting={deleteModalState.isDeleting}
          onClose={() =>
            setDeleteModalState({
              isOpen: false,
              sprint: null,
              storiesCount: 0,
              isDeleting: false,
            })
          }
          onConfirm={handleConfirmDelete}
        />
      )}

      <div className="p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Top Control Bar: Status das Sprints Ativas, Botão de Arquivadas e Ações */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#0f172a] rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Sprints Ativas ({activeSprints.length})
              </h2>
            </div>

            {/* Opção para Ver e Desarquivar Sprints Arquivadas */}
            <button
              onClick={() => setShowArchivedModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-300 dark:hover:border-purple-800 transition-all cursor-pointer shadow-2xs"
              title="Visualizar sprints arquivadas e desarquivar"
            >
              <Archive className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>Sprints Arquivadas</span>
              {archivedSprints.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-[10px] font-bold">
                  {archivedSprints.length}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {activeSprints.length > 0 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleToggleAllCollapse(true)}
                  className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                  title="Resumir todas as sprints"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Recolher Todas</span>
                </button>
                <button
                  onClick={() => handleToggleAllCollapse(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                  title="Expandir todas as sprints"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Expandir Todas</span>
                </button>
              </div>
            )}

            <button
              onClick={() => setShowSprintModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Sprint</span>
            </button>
          </div>
        </div>

        {/* 1. BACKLOG DO PRODUTO: SEMPRE NO INÍCIO DA PÁGINA (ACIMA DAS SPRINTS) */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            if (!isDropOverGeneralBacklog) setIsDropOverGeneralBacklog(true);
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) {
              setIsDropOverGeneralBacklog(false);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDropOverGeneralBacklog(false);
            const rawData = e.dataTransfer.getData("application/json");
            let storyId = e.dataTransfer.getData("text/plain");
            if (rawData) {
              try {
                const parsed = JSON.parse(rawData);
                storyId = parsed.storyId || storyId;
              } catch {}
            }
            if (storyId) {
              handleUnlinkSprint({ id: storyId });
            }
          }}
          className={`bg-white dark:bg-[#0f172a] rounded-2xl border transition-all ${
            isDropOverGeneralBacklog
              ? "border-blue-500 dark:border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/40 dark:bg-blue-950/20"
              : "border-slate-200 dark:border-slate-800 shadow-sm"
          }`}
        >
          {/* Header do Backlog do Produto */}
          <div className="p-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsBacklogCollapsed(!isBacklogCollapsed)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title={isBacklogCollapsed ? "Expandir Backlog do Produto" : "Resumir Backlog do Produto"}
              >
                {isBacklogCollapsed ? (
                  <ChevronRight className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </button>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Inbox className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Backlog do Produto</span>
                    <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold flex items-center justify-center">
                      {unassignedStories.length}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Histórias do produto não planejadas. Arraste para uma sprint abaixo para iniciar o desenvolvimento.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 hidden md:inline">
                Solte histórias aqui para desvinculá-las de qualquer sprint
              </span>
              <button
                onClick={() => setIsBacklogCollapsed(!isBacklogCollapsed)}
                className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                {isBacklogCollapsed ? "Expandir" : "Resumir"}
              </button>
            </div>
          </div>

          {/* Cards do Backlog do Produto */}
          {!isBacklogCollapsed && (
            <div className="p-5">
              {unassignedStories.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {unassignedStories.map((story) => (
                    <StoryCard
                      key={story.id}
                      story={story}
                      sprintId={null}
                      sprints={activeSprints}
                      onMoveStatus={handleMoveStatus}
                      onUnlinkSprint={handleUnlinkSprint}
                      onAssignSprint={handleAssignSprint}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800/80 rounded-xl">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2 opacity-80" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Todas as histórias de usuário estão alocadas em sprints ativas!
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                    Novas histórias cadastradas aparecerão aqui automaticamente.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. LISTA DE SPRINTS ATIVAS (UMA EMBAIXO DA OUTRA) */}
        <div className="space-y-6">
          {activeSprints.map((sprint, index) => (
            <SprintBlock
              key={sprint.id}
              sprint={sprint}
              index={index}
              isFirst={index === 0}
              isLast={index === activeSprints.length - 1}
              onMoveOrder={handleMoveSprintOrder}
              stories={stories}
              allActiveSprints={activeSprints}
              isCollapsed={collapsedSprints[sprint.id] ?? false}
              onToggleCollapse={handleToggleCollapse}
              onArchive={handleArchiveSprint}
              onDeleteRequest={handleDeleteRequest}
              onMoveStatus={handleMoveStatus}
              onDropStory={handleDropStory}
              onUnlinkSprint={handleUnlinkSprint}
              onAssignSprint={handleAssignSprint}
            />
          ))}

          {/* Estado Vazio de Sprints Ativas */}
          {activeSprints.length === 0 && (
            <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-[#0f172a]">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
                Nenhuma sprint ativa no momento
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
                Crie uma nova sprint ou reative uma sprint em "Sprints Arquivadas" para organizar as entregas da equipe.
              </p>
              <div className="flex items-center justify-center gap-3">
                {archivedSprints.length > 0 && (
                  <button
                    onClick={() => setShowArchivedModal(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/40 border border-purple-200 dark:border-purple-800 rounded-xl transition-colors cursor-pointer"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>Ver Arquivadas ({archivedSprints.length})</span>
                  </button>
                )}
                <button
                  onClick={() => setShowSprintModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Criar Nova Sprint</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
