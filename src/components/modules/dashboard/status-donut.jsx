"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export function StatusDonutChart({ data, total = 0 }) {
  const chartData = data || [
    { name: "Aprovados", value: 0, color: "#10b981" },
    { name: "Em Análise", value: 0, color: "#f59e0b" },
    { name: "Não Aprovados", value: 0, color: "#f43f5e" },
  ];

  const hasData = chartData.some((d) => d.value > 0);
  const displayData = hasData
    ? chartData
    : [{ name: "Sem dados", value: 1, color: "#94a3b8" }];

  return (
    <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors h-full">
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
          Distribuição por Status
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Requisitos do projeto atual
        </p>
      </div>

      <div className="relative w-full h-56 flex items-center justify-center my-2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={displayData}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={95}
              paddingAngle={hasData ? 3 : 0}
              dataKey="value"
            >
              {displayData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center Donut Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-extrabold text-slate-900 dark:text-white leading-none">
            {total}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
            requisitos
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
        {chartData.map((item, index) => (
          <div key={index} className="flex items-center justify-between text-xs font-medium">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-slate-600 dark:text-slate-300">{item.name}</span>
            </div>
            <span className="text-slate-900 dark:text-white font-bold">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
