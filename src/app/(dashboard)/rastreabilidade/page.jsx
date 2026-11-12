"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Download, Check, Network, ArrowRight } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { useProject } from "@/components/layout/project-context";
import { createClient } from "@/lib/supabase/client";
import { getProjectMembersAction } from "@/app/actions/projects";

export default function TraceabilityPage() {
  const { activeProject } = useProject();
  const supabase = useMemo(() => createClient(), []);

  const [requirements, setRequirements] = useState([]);
  const [userStories, setUserStories] = useState([]);
  const [stakeholders, setStakeholders] = useState([]);
  const [links, setLinks] = useState({});

  const loadMatrixData = useCallback(async () => {
    if (!activeProject?.id) return;

    try {
      // 1. Buscar APENAS stakeholders membros cadastrados no projeto ativo
      const membersRes = await getProjectMembersAction(activeProject.id);
      let projectMembers = [];

      if (membersRes?.success && membersRes.data?.length > 0) {
        projectMembers = membersRes.data
          .map((m) => {
            const prof = m.profiles || {};
            const id = prof.id || m.user_id;
            const fullName = prof.full_name || "Membro";
            return {
              id,
              name: fullName.length > 15 ? fullName.split(" ")[0] : fullName,
              fullName,
              role: m.role_in_project,
            };
          })
          .filter((s) => Boolean(s.id));
      } else if (activeProject.id === "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa") {
        // Fallback demo apenas para o projeto mock inicial
        projectMembers = [
          { id: "stk1", name: "Ana", fullName: "Ana Ribeiro" },
          { id: "stk2", name: "Carlos", fullName: "Carlos Mendes" },
          { id: "stk3", name: "Beatriz", fullName: "Beatriz Souza" },
          { id: "stk4", name: "Diego", fullName: "Diego Almeida" },
        ];
      }

      setStakeholders(projectMembers);

      // 2. Buscar Requisitos vinculados ao projeto ativo (incluindo o responsible_id)
      const { data: linkedReqs } = await supabase
        .from("project_requirements")
        .select("requirement:requirements(id, code, responsible_id)")
        .eq("project_id", activeProject.id);

      const reqList = (linkedReqs || [])
        .map((l) => l.requirement)
        .filter(Boolean)
        .sort((a, b) => a.code.localeCompare(b.code));

      // 3. Buscar User Stories vinculadas ao projeto ativo
      const { data: storiesData } = await supabase
        .from("user_stories")
        .select("id, code")
        .eq("project_id", activeProject.id)
        .order("code", { ascending: true });

      if (reqList.length > 0) {
        setRequirements(reqList);
        setUserStories(storiesData || []);

        // Buscar vínculos reais de requirement_user_stories
        const reqIds = reqList.map((r) => r.id);
        const { data: linkData } = await supabase
          .from("requirement_user_stories")
          .select("requirement_id, user_story_id")
          .in("requirement_id", reqIds);

        const newLinks = {};
        (linkData || []).forEach((item) => {
          newLinks[`${item.requirement_id}-${item.user_story_id}`] = true;
        });

        // Vincular automaticamente o stakeholder responsável cadastrado no requisito
        reqList.forEach((r) => {
          if (r.responsible_id) {
            newLinks[`${r.id}-${r.responsible_id}`] = true;
          }
        });

        setLinks(newLinks);
      } else if (activeProject.id === "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa") {
        // Fallback demo apenas para o projeto mock
        setRequirements([
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
        setUserStories([
          { id: "us1", code: "US-01" },
          { id: "us2", code: "US-02" },
          { id: "us3", code: "US-03" },
          { id: "us4", code: "US-04" },
          { id: "us5", code: "US-05" },
        ]);
        setLinks({
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
      } else {
        setRequirements([]);
        setUserStories([]);
        setLinks({});
      }
    } catch (err) {
      console.warn("Erro ao buscar dados da matriz:", err);
      setRequirements([]);
      setUserStories([]);
    }
  }, [activeProject?.id, supabase]);

  useEffect(() => {
    loadMatrixData();
  }, [loadMatrixData]);

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

      <div className="p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Card da Matriz */}
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
          {/* Header do Card */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Matriz de Rastreabilidade
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Cruzamento entre requisitos, user stories e stakeholders.
              </p>
            </div>

            <button
              onClick={handleExportCSV}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Exportar</span>
            </button>
          </div>

          {/* Grid da Matriz */}
          {requirements.length === 0 ? (
            <div className="py-16 text-center text-slate-400 dark:text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
              <Network className="w-8 h-8 text-slate-300 dark:text-slate-600 stroke-1" />
              <p className="font-semibold text-slate-600 dark:text-slate-300">Nenhum requisito cadastrado neste projeto ainda.</p>
              <p className="text-slate-400 dark:text-slate-500">Cadastre requisitos e vincule-os a user stories para visualizar a matriz cruzada.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-center border-collapse">
              <thead>
                {/* Super Header */}
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-blue-600 dark:text-blue-400 bg-slate-50 dark:bg-slate-900/90">
                  <th className="py-3 px-4 text-left border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                    REQUISITO
                  </th>
                  <th
                    colSpan={userStories.length || 1}
                    className="py-3 px-4 border-r border-slate-200 dark:border-slate-800 text-blue-700 dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/40"
                  >
                    User Stories {userStories.length > 0 && `(${userStories.length})`}
                  </th>
                  <th
                    colSpan={stakeholders.length || 1}
                    className="py-3 px-4 text-slate-700 dark:text-slate-300"
                  >
                    Stakeholders do Projeto {stakeholders.length > 0 && `(${stakeholders.length})`}
                  </th>
                </tr>

                {/* Sub Headers */}
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-[#0f172a]">
                  <th className="py-2.5 px-4 text-left border-r border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                    ID
                  </th>
                  {userStories.length > 0 ? (
                    userStories.map((us) => (
                      <th
                        key={us.id}
                        className="py-2.5 px-4 font-semibold text-slate-700 dark:text-slate-300 min-w-[70px] border-r border-slate-100 dark:border-slate-800"
                      >
                        {us.code}
                      </th>
                    ))
                  ) : (
                    <th className="py-2.5 px-4 font-normal text-slate-400 dark:text-slate-500 text-[11px] italic min-w-[100px] border-r border-slate-100 dark:border-slate-800">
                      Nenhuma User Story
                    </th>
                  )}

                  {stakeholders.length > 0 ? (
                    stakeholders.map((stk) => (
                      <th
                        key={stk.id}
                        title={stk.fullName}
                        className="py-2.5 px-4 font-semibold text-slate-700 dark:text-slate-300 min-w-[80px] border-r border-slate-100 dark:border-slate-800 last:border-r-0"
                      >
                        {stk.name}
                      </th>
                    ))
                  ) : (
                    <th className="py-2.5 px-4 font-normal text-slate-400 dark:text-slate-500 text-[11px] italic min-w-[120px]">
                      Nenhum stakeholder vinculado
                    </th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800 text-xs">
                {requirements.map((req) => (
                  <tr key={req.id} className="hover:bg-blue-50/30 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Requisito ID */}
                    <td className="py-3 px-4 text-left font-bold text-blue-600 dark:text-blue-400 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] whitespace-nowrap font-mono text-xs">
                      {req.code}
                    </td>

                    {/* Colunas de User Stories */}
                    {userStories.length > 0 ? (
                      userStories.map((us) => {
                        const isLinked = links[`${req.id}-${us.id}`];
                        return (
                          <td
                            key={us.id}
                            onClick={() => toggleLink(req.id, us.id)}
                            className={`py-3 px-4 cursor-pointer transition-colors border-r border-slate-100 dark:border-slate-800 ${
                              isLinked
                                ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                                : "bg-rose-50/20 dark:bg-slate-900/30 text-transparent hover:bg-slate-100 dark:hover:bg-slate-800"
                            }`}
                          >
                            {isLinked ? (
                              <Check className="w-4 h-4 mx-auto stroke-[2.5]" />
                            ) : (
                              <span className="inline-block w-4 h-4" />
                            )}
                          </td>
                        );
                      })
                    ) : (
                      <td className="py-3 px-4 text-slate-400 dark:text-slate-600 text-xs border-r border-slate-100 dark:border-slate-800">
                        -
                      </td>
                    )}

                    {/* Colunas de Stakeholders */}
                    {stakeholders.length > 0 ? (
                      stakeholders.map((stk) => {
                        const isLinked = links[`${req.id}-${stk.id}`];
                        return (
                          <td
                            key={stk.id}
                            onClick={() => toggleLink(req.id, stk.id)}
                            className={`py-3 px-4 cursor-pointer transition-colors border-r border-slate-100 dark:border-slate-800 last:border-r-0 ${
                              isLinked
                                ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                                : "bg-rose-50/20 dark:bg-slate-900/30 text-transparent hover:bg-slate-100 dark:hover:bg-slate-800"
                            }`}
                          >
                            {isLinked ? (
                              <Check className="w-4 h-4 mx-auto stroke-[2.5]" />
                            ) : (
                              <span className="inline-block w-4 h-4" />
                            )}
                          </td>
                        );
                      })
                    ) : (
                      <td className="py-3 px-4 text-slate-400 dark:text-slate-600 text-xs">
                        -
                      </td>
                    )}
                  </tr>
                ))}

                {/* Linha de Cobertura */}
                <tr className="bg-slate-100/80 dark:bg-[#131c31] font-bold border-t-2 border-slate-300 dark:border-slate-700 text-xs">
                  <td className="py-3.5 px-4 text-left font-bold text-slate-700 dark:text-slate-300 uppercase text-[11px] tracking-wider border-r border-slate-200 dark:border-slate-800">
                    COBERTURA
                  </td>
                  {userStories.length > 0 ? (
                    userStories.map((us) => (
                      <td key={us.id} className="py-3.5 px-4 text-amber-600 dark:text-amber-400 font-bold border-r border-slate-200 dark:border-slate-800">
                        {getCoverage(us.id)}
                      </td>
                    ))
                  ) : (
                    <td className="py-3.5 px-4 text-slate-400 dark:text-slate-600 text-xs border-r border-slate-200 dark:border-slate-800">
                      -
                    </td>
                  )}

                  {stakeholders.length > 0 ? (
                    stakeholders.map((stk) => (
                      <td key={stk.id} className="py-3.5 px-4 text-emerald-600 dark:text-emerald-400 font-bold border-r border-slate-200 dark:border-slate-800 last:border-r-0">
                        {getCoverage(stk.id)}
                      </td>
                    ))
                  ) : (
                    <td className="py-3.5 px-4 text-slate-400 dark:text-slate-600 text-xs">
                      -
                    </td>
                  )}
                </tr>
              </tbody>
            </table>
          </div>
          )}
        </div>

        {/* Legenda Card */}
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-6 text-xs text-slate-600 dark:text-slate-400 transition-colors">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center">
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <span className="font-medium text-slate-700 dark:text-slate-300">Vínculo existente (Clique para alterar)</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-rose-50/50 dark:bg-slate-900 border border-rose-200 dark:border-slate-700" />
            <span className="font-medium text-slate-700 dark:text-slate-300">Sem vínculo</span>
          </div>
        </div>
      </div>
    </>
  );
}
