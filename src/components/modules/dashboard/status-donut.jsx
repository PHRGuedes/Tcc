"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export function StatusDonutChart({ data, total = 44 }) {
  const chartData = data || [
    { name: "Aprovados", value: 21, color: "#16a34a" }, // green
    { name: "Em Desenvolvimento", value: 10, color: "#2563eb" }, // blue
    { name: "Pendentes", value: 8, color: "#d97706" }, // amber
    { name: "Implementados", value: 5, color: "#1e293b" }, // dark slate
  ];

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
      <div>
        <h3 className="text-base font-bold text-slate-900 leading-tight">
          Distribuição por Status
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">Requisitos do projeto atual</p>
      </div>

      <div className="relative w-full h-56 flex items-center justify-center my-2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={95}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center Donut Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-extrabold text-slate-900 leading-none">
            {total}
          </span>
          <span className="text-xs text-slate-500 font-medium mt-1">requisitos</span>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-2 pt-2 border-t border-slate-100">
        {chartData.map((item, index) => (
          <div key={index} className="flex items-center justify-between text-xs font-medium">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-slate-600">{item.name}</span>
            </div>
            <span className="text-slate-900 font-bold">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
