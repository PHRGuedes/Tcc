"use client";

import { useState } from "react";
import { getInitials } from "@/lib/utils/formatters";
import { ChevronDown, ChevronUp, History } from "lucide-react";

export function ActivityFeed({ activities }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const defaultActivities = [
    {
      id: "1",
      user_name: "Ana Ribeiro",
      text: "aprovou o requisito REQ-004",
      time: "há 12 minutos",
    },
    {
      id: "2",
      user_name: "Carlos Mendes",
      text: "criou o requisito REQ-012",
      time: "há 1 hora",
    },
    {
      id: "3",
      user_name: "Diego Almeida",
      text: "atualizou o status de REQ-011 para Em Desenvolvimento",
      time: "há 3 horas",
    },
    {
      id: "4",
      user_name: "Beatriz Souza",
      text: "comentou no requisito REQ-006",
      time: "ontem, 17:42",
    },
    {
      id: "5",
      user_name: "Ana Ribeiro",
      text: "vinculou REQ-009 à user story US-07",
      time: "ontem, 09:15",
    },
  ];

  const items = activities && activities.length > 0 ? activities : defaultActivities;
  const hasMoreThanFive = items.length > 5;
  const displayedItems = isExpanded ? items : items.slice(0, 5);

  return (
    <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col transition-colors h-full">
      <div className="flex items-center justify-between mb-4 gap-2">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight flex items-center gap-2">
            <History className="w-4 h-4 text-blue-500 shrink-0" />
            Atividade Recente
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isExpanded
              ? `Mostrando todas as ${items.length} alterações no projeto`
              : hasMoreThanFive
              ? `Últimas 5 de ${items.length} alterações no projeto`
              : "Últimas alterações no projeto"}
          </p>
        </div>

        {hasMoreThanFive && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
          >
            {isExpanded ? (
              <>
                <span>Recolher</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>Ver todas ({items.length})</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        )}
      </div>

      <div
        className={`divide-y divide-slate-100 dark:divide-slate-800/80 transition-all ${
          isExpanded ? "max-h-[500px] overflow-y-auto pr-1" : ""
        }`}
      >
        {displayedItems.map((item, idx) => {
          const initials = getInitials(item.user_name);
          return (
            <div key={item.id || idx} className="py-3.5 flex items-center gap-3.5">
              {item.avatar_url ? (
                <img
                  src={item.avatar_url}
                  alt={item.user_name}
                  className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700 shadow-2xs"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-xs shrink-0 border border-slate-200 dark:border-slate-700">
                  {initials}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-snug truncate">
                  <strong className="font-semibold text-slate-900 dark:text-white">
                    {item.user_name}
                  </strong>{" "}
                  {item.text}
                </p>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 block">
                  {item.time}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {hasMoreThanFive && (
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 mt-auto">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full py-2 px-3 flex items-center justify-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer border border-slate-200/60 dark:border-slate-700/60"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Recolher para as últimas 5 alterações</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Mostrar todas as alterações ({items.length})</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
