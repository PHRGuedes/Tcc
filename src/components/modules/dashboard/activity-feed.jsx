"use client";

import { getInitials } from "@/lib/utils/formatters";

export function ActivityFeed({ activities }) {
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

  return (
    <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col transition-colors h-full">
      <div className="mb-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
          Atividade Recente
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Últimas 5 alterações no projeto
        </p>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {items.map((item, idx) => {
          const initials = getInitials(item.user_name);
          return (
            <div key={item.id || idx} className="py-3.5 flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-xs shrink-0 border border-slate-200 dark:border-slate-700">
                {initials}
              </div>
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
    </div>
  );
}
