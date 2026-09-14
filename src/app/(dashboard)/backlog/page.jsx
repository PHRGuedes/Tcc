"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  GripVertical,
  FileText,
  Plus,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { PriorityBadge } from "@/components/ui/badge";
import { useProject } from "@/components/layout/project-context";
import { createClient } from "@/lib/supabase/client";
import { STORY_STATUS_COLUMNS, STORY_STATUSES } from "@/lib/constants/statuses";

export function StoryCard({ story, onMoveStatus }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow group">
      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
        <span className="font-bold text-slate-700">{story.code}</span>
        <GripVertical className="w-4 h-4 text-slate-300 group-hover:text-slate-500 cursor-grab" />
      </div>

      <h4 className="text-xs font-semibold text-slate-900 mb-3 leading-snug">
        {story.title}
      </h4>

      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <PriorityBadge priority={story.priority} />

        <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
          <FileText className="w-3.5 h-3.5 text-slate-400" />
          <span>{story.rf_count ?? 1} RF</span>
        </div>
      </div>

      {/* Quick Move Action Buttons on Hover */}
      <div className="mt-3 pt-2 border-t border-dashed border-slate-100 flex items-center justify-between text-[11px] text-slate-400 opacity-80 group-hover:opacity-100 transition-opacity">
        <span className="text-[10px] text-slate-400">Mover:</span>
        <div className="flex items-center gap-1">
          {story.status !== STORY_STATUSES.BACKLOG && (
            <button
              onClick={() => onMoveStatus(story, -1)}
              title="Mover para coluna anterior"
              className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-3 h-3" />
            </button>
          )}
          {story.status !== STORY_STATUSES.DONE && (
            <button
              onClick={() => onMoveStatus(story, 1)}
              title="Avançar status"
              className="p-1 hover:bg-blue-50 rounded text-blue-600 font-semibold flex items-center gap-0.5"
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
    <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200/80 flex flex-col min-h-[550px]">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${column.colorDot}`} />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            {column.title}
          </h3>
        </div>
        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[11px] font-bold flex items-center justify-center">
          {stories.length}
        </span>
      </div>

      <div className="space-y-3 flex-1 overflow-y-auto">
        {stories.map((story) => (
          <StoryCard key={story.id} story={story} onMoveStatus={onMoveStatus} />
        ))}

        {stories.length === 0 && (
          <div className="h-32 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-[11px] text-slate-400">
            Nenhuma história nesta coluna
          </div>
        )}
      </div>
    </div>
  );
}

export default function BacklogPage() {
  const { activeProject } = useProject();
  const supabase = createClient();

  const [sprint, setSprint] = useState({
    name: "Sprint 4 — Rastreabilidade & Qualidade",
    startDate: "01/08/2026",
    endDate: "15/08/2026",
    progress: 20,
  });

  const [stories, setStories] = useState([
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

  useEffect(() => {
    async function loadBacklog() {
      try {
        const { data: dbStories } = await supabase
          .from("user_stories")
          .select("*, requirement_user_stories(count)");

        if (dbStories && dbStories.length > 0) {
          setStories(
            dbStories.map((s) => ({
              ...s,
              rf_count: s.requirement_user_stories?.[0]?.count ?? 1,
            }))
          );
        }
      } catch (err) {
        console.warn("Erro ao carregar backlog do Supabase:", err);
      }
    }

    loadBacklog();
  }, [activeProject]);

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

      <div className="p-8 max-w-7xl w-full mx-auto">
        {/* Sprint Header Banner Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-1">
              {sprint.name}
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {sprint.startDate} — {sprint.endDate}
              </span>
            </div>
          </div>

          <div className="w-full md:w-72">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
              <span>Progresso da sprint</span>
              <span className="text-blue-600 font-bold">{sprint.progress}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${sprint.progress}%` }}
              />
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
