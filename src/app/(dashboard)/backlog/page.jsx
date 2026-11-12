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
import { STORY_STATUS_COLUMNS, STORY_STATUSES } from "@/lib/constants/statuses";
import {
  createSprintAction,
  archiveSprintAction,
  deleteSprintAction,
  updateStoryPlacementAction,
} from "@/app/actions/sprints";

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

      {/* Quick Move Action Buttons on Hover */}
      <div className="mt-3 pt-2 border-t border-dashed border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 opacity-80 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-1">
          {story.status !== STORY_STATUSES.BACKLOG && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMoveStatus(story, -1);
              }}
              title="Mover para coluna anterior"
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300 cursor-pointer"
            >
              <ArrowLeft className="w-3 h-3" />
            </button>
          )}
          {story.status !== STORY_STATUSES.DONE && (
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

        {/* Options to unlink or assign to sprint */}
        {story.sprint_id ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUnlinkSprint(story);
            }}
            title="Mover para Backlog Geral (desvincular da sprint)"
            className="text-[10px] text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors cursor-pointer"
          >
            Desvincular
          </button>
        ) : (
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowSprintMenu(!showSprintMenu);
              }}
              title="Atribuir à sprint"
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
                    Nenhuma sprint disponível
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
      className={`rounded-2xl p-4 border flex flex-col min-h-[460px] transition-all duration-150 ${
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
              automaticamente para o Backlog Geral e nenhuma história será perdida.
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

function SprintBlock({
  sprint,
  stories = [],
  allSprints = [],
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
      : sprint.status === "completed"
      ? 100
      : 0;

  const isCompleted = sprint.status === "completed";

  // Collapsed / Resumida View
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
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    isCompleted
                      ? "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                      : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                  }`}
                >
                  {isCompleted ? "Arquivada" : "Ativa"}
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
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  isCompleted
                    ? "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 hover:bg-purple-100"
                    : "text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
                title={isCompleted ? "Desarquivar sprint" : "Arquivar sprint"}
              >
                {isCompleted ? (
                  <ArchiveRestore className="w-4 h-4" />
                ) : (
                  <Archive className="w-4 h-4" />
                )}
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

  // Expanded View
  return (
    <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6 transition-colors">
      {/* Sprint Header Banner Card */}
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
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                  isCompleted
                    ? "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                    : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                }`}
              >
                {isCompleted ? "Arquivada" : "Ativa"}
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

          {/* Action buttons: Resumir, Arquivar, Excluir */}
          <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-800 pl-3">
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
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                isCompleted
                  ? "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 hover:bg-purple-100"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700"
              }`}
              title={isCompleted ? "Desarquivar sprint" : "Arquivar sprint"}
            >
              {isCompleted ? (
                <>
                  <ArchiveRestore className="w-3.5 h-3.5" />
                  <span>Desarquivar</span>
                </>
              ) : (
                <>
                  <Archive className="w-3.5 h-3.5" />
                  <span>Arquivar</span>
                </>
              )}
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

      {/* 4 Kanban Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {STORY_STATUS_COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            column={col}
            sprintId={sprint.id}
            stories={sprintStories.filter((s) => s.status === col.id)}
            sprints={allSprints}
            onMoveStatus={onMoveStatus}
            onDropStory={onDropStory}
            onUnlinkSprint={onUnlinkSprint}
            onAssignSprint={onAssignSprint}
          />
        ))}
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
  const [deleteModalState, setDeleteModalState] = useState({
    isOpen: false,
    sprint: null,
    storiesCount: 0,
    isDeleting: false,
  });

  // Filter tab: 'all' | 'active' | 'archived'
  const [sprintFilter, setSprintFilter] = useState("all");
  const [isBacklogCollapsed, setIsBacklogCollapsed] = useState(false);
  const [isDropOverGeneralBacklog, setIsDropOverGeneralBacklog] = useState(false);

  useEffect(() => {
    async function loadBacklog() {
      if (!activeProject?.id) return;
      try {
        // 1. Buscar todas as sprints do projeto
        const { data: dbSprints, error: sprintsError } = await supabase
          .from("sprints")
          .select("*")
          .eq("project_id", activeProject.id)
          .order("created_at", { ascending: false });

        if (dbSprints && dbSprints.length > 0) {
          setSprints(dbSprints);
        } else if (activeProject.id === "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa") {
          setSprints([
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
          ]);
        } else {
          setSprints([]);
        }

        // 2. Buscar todas as histórias de usuário vinculadas ao projeto
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

  const order = [
    STORY_STATUSES.BACKLOG,
    STORY_STATUSES.TODO,
    STORY_STATUSES.IN_PROGRESS,
    STORY_STATUSES.DONE,
  ];

  // Alternar colapso / resumo de uma sprint
  const handleToggleCollapse = (sprintId) => {
    setCollapsedSprints((prev) => ({
      ...prev,
      [sprintId]: !prev[sprintId],
    }));
  };

  // Recolher todas ou expandir todas
  const handleToggleAllCollapse = (collapseAll) => {
    const updated = {};
    sprints.forEach((s) => {
      updated[s.id] = collapseAll;
    });
    setCollapsedSprints(updated);
  };

  // Mover status por setas (dentro da sprint ou backlog)
  const handleMoveStatus = async (story, direction) => {
    const currentIndex = order.indexOf(story.status);
    const newIndex = currentIndex + direction;
    if (newIndex < 0 || newIndex >= order.length) return;

    const newStatus = order[newIndex];

    setStories((prev) =>
      prev.map((s) => (s.id === story.id ? { ...s, status: newStatus } : s))
    );

    try {
      await updateStoryPlacementAction(story.id, { status: newStatus });
    } catch (err) {
      console.warn("Erro ao atualizar status:", err);
    }
  };

  // Mover via drag-and-drop para qualquer coluna de qualquer sprint
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

  // Desvincular história de uma sprint (volta para o Backlog Geral)
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

  // Vincular história a uma sprint
  const handleAssignSprint = async (story, targetSprintId) => {
    setStories((prev) =>
      prev.map((s) => (s.id === story.id ? { ...s, sprint_id: targetSprintId } : s))
    );

    try {
      await updateStoryPlacementAction(story.id, { sprintId: targetSprintId });
    } catch (err) {
      console.warn("Erro ao vincular história à sprint:", err);
    }
  };

  // Arquivar / Desarquivar sprint
  const handleArchiveSprint = async (sprint) => {
    const willArchive = sprint.status !== "completed";

    setSprints((prev) =>
      prev.map((s) =>
        s.id === sprint.id ? { ...s, status: willArchive ? "completed" : "active" } : s
      )
    );

    // Se arquivar, resumir automaticamente para não ocupar espaço
    if (willArchive) {
      setCollapsedSprints((prev) => ({ ...prev, [sprint.id]: true }));
    }

    try {
      await archiveSprintAction(sprint.id, willArchive);
    } catch (err) {
      console.warn("Erro ao arquivar sprint:", err);
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
        s.sprint_id === sprintId ? { ...s, sprint_id: null, status: STORY_STATUSES.BACKLOG } : s
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

  // Filtragem de sprints para exibição
  const filteredSprints = useMemo(() => {
    if (sprintFilter === "active") {
      return sprints.filter((s) => s.status !== "completed");
    }
    if (sprintFilter === "archived") {
      return sprints.filter((s) => s.status === "completed");
    }
    return sprints;
  }, [sprints, sprintFilter]);

  // Histórias não atribuídas a nenhuma sprint existente
  const unassignedStories = useMemo(() => {
    const validSprintIds = new Set(sprints.map((s) => s.id));
    return stories.filter((s) => !s.sprint_id || !validSprintIds.has(s.sprint_id));
  }, [stories, sprints]);

  const activeCount = sprints.filter((s) => s.status !== "completed").length;
  const archivedCount = sprints.filter((s) => s.status === "completed").length;

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
        {/* Top Control Bar: Filtros, Estatísticas e Botões Principais */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#0f172a] rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          {/* Tabs de Filtro de Sprints */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl w-fit">
            <button
              onClick={() => setSprintFilter("all")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                sprintFilter === "all"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Todas ({sprints.length})
            </button>
            <button
              onClick={() => setSprintFilter("active")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                sprintFilter === "active"
                  ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Ativas ({activeCount})
            </button>
            <button
              onClick={() => setSprintFilter("archived")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                sprintFilter === "archived"
                  ? "bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Arquivadas ({archivedCount})
            </button>
          </div>

          {/* Ações Globais: Recolher/Expandir e Nova Sprint */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {sprints.length > 0 && (
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

        {/* Lista de Sprints Uma Embaixo da Outra */}
        <div className="space-y-6">
          {filteredSprints.map((sprint) => (
            <SprintBlock
              key={sprint.id}
              sprint={sprint}
              stories={stories}
              allSprints={sprints}
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

          {/* Estado Vazio de Sprints */}
          {filteredSprints.length === 0 && (
            <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-[#0f172a]">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
                {sprintFilter === "archived"
                  ? "Nenhuma sprint arquivada"
                  : "Nenhuma sprint cadastrada"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
                {sprintFilter === "archived"
                  ? "Sprints concluídas ou arquivadas serão listadas aqui."
                  : "Crie sua primeira sprint para organizar o fluxo de entregas da equipe no quadro Kanban."}
              </p>
              {sprintFilter !== "archived" && (
                <button
                  onClick={() => setShowSprintModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Criar Nova Sprint</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Backlog Geral do Produto (Histórias Não Planejadas) */}
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
          {/* Header do Backlog Geral */}
          <div className="p-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsBacklogCollapsed(!isBacklogCollapsed)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title={isBacklogCollapsed ? "Expandir Backlog Geral" : "Resumir Backlog Geral"}
              >
                {isBacklogCollapsed ? (
                  <ChevronRight className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </button>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
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
                    Histórias não planejadas ou aguardando vinculação a uma sprint.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 hidden sm:inline">
                Arraste histórias para cá para desvincular de sprints
              </span>
              <button
                onClick={() => setIsBacklogCollapsed(!isBacklogCollapsed)}
                className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                {isBacklogCollapsed ? "Expandir" : "Resumir"}
              </button>
            </div>
          </div>

          {/* Conteúdo do Backlog Geral */}
          {!isBacklogCollapsed && (
            <div className="p-5">
              {unassignedStories.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {unassignedStories.map((story) => (
                    <StoryCard
                      key={story.id}
                      story={story}
                      sprintId={null}
                      sprints={sprints}
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
                    Todas as histórias de usuário estão alocadas em sprints!
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                    Histórias criadas sem sprint aparecerão aqui para planejamento.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
