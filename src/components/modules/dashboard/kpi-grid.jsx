"use client";

import { FileText, Clock, CheckCircle2, Code2, Rocket } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function KpiGrid({ stats }) {
  const kpis = [
    {
      title: "Total de Requisitos",
      value: stats?.total ?? 44,
      icon: FileText,
      iconColor: "text-slate-600",
      iconBg: "bg-slate-100",
    },
    {
      title: "Pendentes",
      value: stats?.pending ?? 8,
      icon: Clock,
      iconColor: "text-amber-600",
      iconBg: "bg-amber-50",
    },
    {
      title: "Aprovados",
      value: stats?.approved ?? 21,
      icon: CheckCircle2,
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-50",
    },
    {
      title: "Em Desenvolvimento",
      value: stats?.inDevelopment ?? 10,
      icon: Code2,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-50",
    },
    {
      title: "Implementados",
      value: stats?.implemented ?? 5,
      icon: Rocket,
      iconColor: "text-indigo-600",
      iconBg: "bg-indigo-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {kpis.map((kpi, index) => {
        const Icon = kpi.icon;
        return (
          <div
            key={index}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between"
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
              <div className="text-3xl font-bold text-slate-900 tracking-tight leading-none mb-1">
                {kpi.value}
              </div>
              <div className="text-xs font-medium text-slate-500">{kpi.title}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
