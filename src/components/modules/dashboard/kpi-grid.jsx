"use client";

import { FileText, Clock, CheckCircle2, XCircle, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function KpiGrid({ stats }) {
  const kpis = [
    {
      title: "Total de Requisitos",
      value: stats?.total ?? 0,
      icon: FileText,
      iconColor: "text-slate-700 dark:text-slate-300",
      iconBg: "bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700",
    },
    {
      title: "Em Análise",
      value: stats?.underReview ?? 0,
      icon: Clock,
      iconColor: "text-amber-600 dark:text-amber-400",
      iconBg: "bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50",
    },
    {
      title: "Aprovados",
      value: stats?.approved ?? 0,
      icon: CheckCircle2,
      iconColor: "text-emerald-600 dark:text-emerald-400",
      iconBg: "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50",
    },
    {
      title: "Não Aprovados",
      value: stats?.notApproved ?? 0,
      icon: XCircle,
      iconColor: "text-rose-600 dark:text-rose-400",
      iconBg: "bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50",
    },
    {
      title: "Histórias de Usuário",
      value: stats?.userStories ?? 0,
      icon: BookOpen,
      iconColor: "text-blue-600 dark:text-blue-400",
      iconBg: "bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {kpis.map((kpi, index) => {
        const Icon = kpi.icon;
        return (
          <div
            key={index}
            className="bg-white dark:bg-[#0f172a] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  kpi.iconBg,
                  kpi.iconColor
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none mb-1">
                {kpi.value}
              </div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {kpi.title}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
