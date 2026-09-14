"use client";

import { useState, useEffect } from "react";
import { Download, Check, Network, ArrowRight } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { useProject } from "@/components/layout/project-context";
import { createClient } from "@/lib/supabase/client";

export default function TraceabilityPage() {
  const { activeProject } = useProject();
  const supabase = createClient();

  const [requirements, setRequirements] = useState([
    { id: "r1", code: "REQ-001" },
    { id: "r2", code: "REQ-002" },
    { id: "r3", code: "REQ-003" },
    { id: "r4", code: "REQ-004" },
    { id: "r5", code: "REQ-005" },
    { id: "r6", code: "REQ-006" },
    { id: "r7", code: "REQ-007" },
    { id: "r8", code: "REQ-008" },
    { id: "r9", code: "REQ-009" },
    { id: "r10", code: "REQ-010" },
  ]);

  const [userStories, setUserStories] = useState([
    { id: "us1", code: "US-01" },
    { id: "us2", code: "US-02" },
    { id: "us3", code: "US-03" },
    { id: "us4", code: "US-04" },
    { id: "us5", code: "US-05" },
  ]);

  const [stakeholders, setStakeholders] = useState([
    { id: "stk1", name: "Ana" },
    { id: "stk2", name: "Carlos" },
    { id: "stk3", name: "Beatriz" },
    { id: "stk4", name: "Diego" },
  ]);

  // Mapa de ligações (reqId -> Set of targetIds)
  // Baseado exatamente na matriz da imagem:
  // REQ-001: US-01, Ana
  // REQ-002: US-02, Carlos
  // REQ-003: Beatriz
  // REQ-004: US-03, Ana
  // REQ-005: US-04, Diego
  // REQ-006: Beatriz
  // REQ-007: US-05, Carlos
  // REQ-008: Diego
  // REQ-009: Ana
  // REQ-010: Beatriz
  const [links, setLinks] = useState({
    "r1-us1": true,
    "r1-stk1": true,
    "r2-us2": true,
    "r2-stk2": true,
    "r3-stk3": true,
    "r4-us3": true,
    "r4-stk1": true,
    "r5-us4": true,
    "r5-stk4": true,
    "r6-stk3": true,
    "r7-us5": true,
    "r7-stk2": true,
    "r8-stk4": true,
    "r9-stk1": true,
    "r10-stk3": true,
  });

  const toggleLink = (reqId, targetId) => {
    const key = `${reqId}-${targetId}`;
    setLinks((prev) => {
      const next = { ...prev };
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = true;
      }
      return next;
    });
  };

  // Cálculo de cobertura por coluna (% de requisitos cobertos)
  const getCoverage = (targetId) => {
    if (!requirements.length) return "0%";
    const linkedCount = requirements.filter((r) => links[`${r.id}-${targetId}`]).length;
    return `${Math.round((linkedCount / requirements.length) * 100)}%`;
  };

  const handleExportCSV = () => {
    const headers = [
      "REQUISITO",
      ...userStories.map((u) => u.code),
      ...stakeholders.map((s) => s.name),
    ];
    const rows = requirements.map((req) => [
      req.code,
      ...userStories.map((u) => (links[`${req.id}-${u.id}`] ? "SIM" : "NAO")),
      ...stakeholders.map((s) => (links[`${req.id}-${s.id}`] ? "SIM" : "NAO")),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `matriz_rastreabilidade_${activeProject?.name || "projeto"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <Topbar title="Rastreabilidade" />

      <div className="p-8 max-w-7xl w-full mx-auto">
        {/* Card da Matriz */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden mb-6">
          {/* Header do Card */}
          <div className="p-6 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Matriz de Rastreabilidade
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Cruzamento entre requisitos, user stories e stakeholders.
              </p>
            </div>

            <button
              onClick={handleExportCSV}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 border border-slate-300 rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Exportar</span>
            </button>
          </div>

          {/* Grid da Matriz */}
          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse">
              <thead>
                {/* Super Header */}
                <tr className="border-b border-slate-200 text-xs font-bold text-blue-600 bg-slate-50/50">
                  <th className="py-2.5 px-4 text-left border-r border-slate-200 text-slate-400 font-semibold text-[11px] uppercase">
                    REQUISITO
                  </th>
                  <th
                    colSpan={userStories.length}
                    className="py-2.5 px-4 border-r border-slate-200 text-blue-700 bg-blue-50/30"
                  >
                    User Stories
                  </th>
                  <th colSpan={stakeholders.length} className="py-2.5 px-4 text-slate-700">
                    Stakeholders
                  </th>
                </tr>

                {/* Sub Headers */}
                <tr className="border-b border-slate-200 text-xs font-bold text-slate-600 bg-white">
                  <th className="py-2.5 px-4 text-left border-r border-slate-200 text-[11px] font-semibold text-slate-400">
                    ID
                  </th>
                  {userStories.map((us) => (
                    <th
                      key={us.id}
                      className="py-2.5 px-4 font-semibold text-slate-600 min-w-[70px]"
                    >
                      {us.code}
                    </th>
                  ))}
                  {stakeholders.map((stk) => (
                    <th
                      key={stk.id}
                      className="py-2.5 px-4 font-semibold text-slate-600 min-w-[80px]"
                    >
                      {stk.name}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-xs">
                {requirements.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Requisito ID */}
                    <td className="py-3 px-4 text-left font-bold text-slate-800 border-r border-slate-200 bg-white whitespace-nowrap">
                      {req.code}
                    </td>

                    {/* Colunas de User Stories */}
                    {userStories.map((us) => {
                      const isLinked = links[`${req.id}-${us.id}`];
                      return (
                        <td
                          key={us.id}
                          onClick={() => toggleLink(req.id, us.id)}
                          className={`py-3 px-4 cursor-pointer transition-colors border-r border-slate-100 ${
                            isLinked
                              ? "bg-emerald-50/90 text-emerald-600 hover:bg-emerald-100/90"
                              : "bg-rose-50/30 text-transparent hover:bg-slate-100"
                          }`}
                        >
                          {isLinked ? (
                            <Check className="w-4 h-4 mx-auto stroke-[2.5]" />
                          ) : (
                            <span className="inline-block w-4 h-4" />
                          )}
                        </td>
                      );
                    })}

                    {/* Colunas de Stakeholders */}
                    {stakeholders.map((stk) => {
                      const isLinked = links[`${req.id}-${stk.id}`];
                      return (
                        <td
                          key={stk.id}
                          onClick={() => toggleLink(req.id, stk.id)}
                          className={`py-3 px-4 cursor-pointer transition-colors border-r border-slate-100 last:border-r-0 ${
                            isLinked
                              ? "bg-emerald-50/90 text-emerald-600 hover:bg-emerald-100/90"
                              : "bg-rose-50/30 text-transparent hover:bg-slate-100"
                          }`}
                        >
                          {isLinked ? (
                            <Check className="w-4 h-4 mx-auto stroke-[2.5]" />
                          ) : (
                            <span className="inline-block w-4 h-4" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* Linha de Cobertura */}
                <tr className="bg-slate-50 font-bold border-t-2 border-slate-200 text-xs">
                  <td className="py-3.5 px-4 text-left font-bold text-slate-600 uppercase text-[11px] tracking-wider border-r border-slate-200">
                    COBERTURA
                  </td>
                  {userStories.map((us) => (
                    <td key={us.id} className="py-3.5 px-4 text-amber-600 font-bold">
                      {getCoverage(us.id)}
                    </td>
                  ))}
                  {stakeholders.map((stk) => (
                    <td key={stk.id} className="py-3.5 px-4 text-emerald-600 font-bold">
                      {getCoverage(stk.id)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Legenda Card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-6 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <span className="font-medium text-slate-700">Vínculo existente (Clique para alterar)</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-rose-50 border border-rose-200" />
            <span className="font-medium text-slate-700">Sem vínculo</span>
          </div>
        </div>
      </div>
    </>
  );
}
