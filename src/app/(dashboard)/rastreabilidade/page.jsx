"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Download, Check, Network, CheckCircle2, Loader2 } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { useProject } from "@/components/layout/project-context";
import { usePermissions } from "@/components/layout/permissions-context";
import { createClient } from "@/lib/supabase/client";
import { getProjectMembersAction } from "@/app/actions/projects";
import { toggleTraceabilityLinkAction } from "@/app/actions/user-stories";

export default function TraceabilityPage() {
  const { activeProject } = useProject();
  const { hasPermission, guardAction } = usePermissions();
  const canEditTraceability =
    hasPermission("requirements_create_edit") || hasPermission("user_stories_manage");
  const supabase = useMemo(() => createClient(), []);

  const [requirements, setRequirements] = useState([]);
  const [userStories, setUserStories] = useState([]);
  const [stakeholders, setStakeholders] = useState([]);
  const [links, setLinks] = useState({});
  const [savingCellKey, setSavingCellKey] = useState(null);
  const [saveFeedback, setSaveFeedback] = useState("");

  const loadMatrixData = useCallback(async () => {
    if (!activeProject?.id) return;

    try {
      // 1. Buscar stakeholders membros cadastrados no projeto ativo
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
        projectMembers = [
          { id: "stk1", name: "Ana", fullName: "Ana Ribeiro" },
          { id: "stk2", name: "Carlos", fullName: "Carlos Mendes" },
          { id: "stk3", name: "Beatriz", fullName: "Beatriz Souza" },
          { id: "stk4", name: "Diego", fullName: "Diego Almeida" },
        ];
      }

      setStakeholders(projectMembers);

      // 2. Buscar Requisitos vinculados ao projeto ativo (via project_id direto e fallback via project_requirements)
      let reqList = [];
      try {
        const { data: directReqs, error: directErr } = await supabase
          .from("requirements")
          .select("id, code, title, responsible_id")
          .eq("project_id", activeProject.id)
          .order("code", { ascending: true });

        if (!directErr && directReqs && directReqs.length > 0) {
          reqList = directReqs;
        }
      } catch {}

      if (reqList.length === 0) {
        const { data: linkedReqs } = await supabase
          .from("project_requirements")
          .select("requirement:requirements(id, code, title, responsible_id)")
          .eq("project_id", activeProject.id);

        reqList = (linkedReqs || [])
          .map((l) => l.requirement)
          .filter(Boolean)
          .sort((a, b) => (a.code || "").localeCompare(b.code || ""));
      }

      // 3. Buscar User Stories vinculadas ao projeto ativo
      const { data: storiesData } = await supabase
        .from("user_stories")
        .select("id, code, title")
        .eq("project_id", activeProject.id)
        .order("code", { ascending: true });

      if (reqList.length > 0) {
        setRequirements(reqList);
        setUserStories(storiesData || []);

        const reqIds = reqList.map((r) => r.id);
        const newLinks = {};

        // Buscar vínculos reais de requirement_user_stories
        const { data: usLinks } = await supabase
          .from("requirement_user_stories")
          .select("requirement_id, user_story_id")
          .in("requirement_id", reqIds);

        (usLinks || []).forEach((item) => {
          newLinks[`${item.requirement_id}-${item.user_story_id}`] = true;
        });

        // Buscar vínculos reais de requirement_stakeholders
        const { data: stkLinks } = await supabase
          .from("requirement_stakeholders")
          .select("requirement_id, stakeholder_id")
          .in("requirement_id", reqIds);

        (stkLinks || []).forEach((item) => {
          newLinks[`${item.requirement_id}-${item.stakeholder_id}`] = true;
        });

        // Vincular também o stakeholder responsável cadastrado diretamente no requisito
        reqList.forEach((r) => {
          if (r.responsible_id) {
            newLinks[`${r.id}-${r.responsible_id}`] = true;
          }
        });

        setLinks(newLinks);
      } else {
        setRequirements([]);
        setUserStories(storiesData || []);
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

  const toggleLink = async (reqId, targetId, targetType) => {
    const actionType =
      hasPermission("requirements_create_edit")
        ? "requirements_create_edit"
        : "user_stories_manage";

    guardAction(
      actionType,
      async () => {
        const key = `${reqId}-${targetId}`;
        const currentlyLinked = Boolean(links[key]);
        const shouldLink = !currentlyLinked;

        // Atualização otimista imediata na UI
        setLinks((prev) => {
          const next = { ...prev };
          if (shouldLink) {
            next[key] = true;
          } else {
            delete next[key];
          }
          return next;
        });

        setSavingCellKey(key);
        try {
          const res = await toggleTraceabilityLinkAction({
            projectId: activeProject?.id,
            requirementId: reqId,
            targetId,
            targetType,
            shouldLink,
          });

          if (res.success) {
            setSaveFeedback("Vínculo salvo automaticamente");
            setTimeout(() => setSaveFeedback(""), 2500);
          } else {
            // Reverte em caso de erro
            setLinks((prev) => {
              const reverted = { ...prev };
              if (currentlyLinked) {
                reverted[key] = true;
              } else {
                delete reverted[key];
              }
              return reverted;
            });
          }
        } catch (err) {
          console.error("Erro ao salvar vínculo na matriz:", err);
        } finally {
          setSavingCellKey(null);
        }
      },
      "alterar vínculos na Matriz de Rastreabilidade"
    );
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
      "TITULO",
      ...userStories.map((u) => u.code),
      ...stakeholders.map((s) => s.name),
    ];
    const rows = requirements.map((req) => [
      req.code,
      `"${(req.title || "").replace(/"/g, '""')}"`,
      ...userStories.map((u) => (links[`${req.id}-${u.id}`] ? "SIM" : "NAO")),
      ...stakeholders.map((s) => (links[`${req.id}-${s.id}`] ? "SIM" : "NAO")),
    ]);

    const csvContent =
      "\uFEFF" + [headers.join(";"), ...rows.map((e) => e.join(";"))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `matriz_rastreabilidade_${(activeProject?.name || "projeto").replace(/\s+/g, "_")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Topbar title="Rastreabilidade" />

      <div className="p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Card da Matriz */}
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
          {/* Header do Card */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Matriz de Rastreabilidade Bidirecional
                </h2>
                {saveFeedback && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 animate-in fade-in">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{saveFeedback}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Clique nas células para vincular ou desvincular Requisitos, User Stories e Stakeholders em tempo real.
              </p>
            </div>

            <button
              onClick={handleExportCSV}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Exportar CSV</span>
            </button>
          </div>

          {/* Grid da Matriz */}
          {requirements.length === 0 ? (
            <div className="py-16 text-center text-slate-400 dark:text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
              <Network className="w-8 h-8 text-slate-300 dark:text-slate-600 stroke-1" />
              <p className="font-semibold text-slate-600 dark:text-slate-300">
                Nenhum requisito cadastrado neste projeto ainda.
              </p>
              <p className="text-slate-400 dark:text-slate-500">
                Cadastre requisitos e vincule-os a user stories para visualizar a matriz cruzada.
              </p>
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
                      ID / Título
                    </th>
                    {userStories.length > 0 ? (
                      userStories.map((us) => (
                        <th
                          key={us.id}
                          title={us.title}
                          className="py-2.5 px-4 font-semibold text-slate-700 dark:text-slate-300 min-w-[70px] border-r border-slate-100 dark:border-slate-800 font-mono"
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
                    <tr
                      key={req.id}
                      className="hover:bg-blue-50/30 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Requisito ID */}
                      <td
                        title={req.title}
                        className="py-3 px-4 text-left border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] whitespace-nowrap"
                      >
                        <div className="font-bold text-blue-600 dark:text-blue-400 font-mono text-xs">
                          {req.code}
                        </div>
                        {req.title && (
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[180px]">
                            {req.title}
                          </div>
                        )}
                      </td>

                      {/* Colunas de User Stories */}
                      {userStories.length > 0 ? (
                        userStories.map((us) => {
                          const cellKey = `${req.id}-${us.id}`;
                          const isLinked = links[cellKey];
                          const isSaving = savingCellKey === cellKey;
                          return (
                            <td
                              key={us.id}
                              onClick={() => toggleLink(req.id, us.id, "story")}
                              title={`${req.code} ↔ ${us.code} (${us.title || ""})`}
                              className={`py-3 px-4 transition-colors border-r border-slate-100 dark:border-slate-800 ${
                                canEditTraceability ? "cursor-pointer" : "cursor-not-allowed opacity-75"
                              } ${
                                isLinked
                                  ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                                  : "bg-rose-50/20 dark:bg-slate-900/30 text-transparent hover:bg-slate-100 dark:hover:bg-slate-800"
                              }`}
                            >
                              {isSaving ? (
                                <Loader2 className="w-3.5 h-3.5 mx-auto animate-spin text-blue-500" />
                              ) : isLinked ? (
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
                          const cellKey = `${req.id}-${stk.id}`;
                          const isLinked = links[cellKey];
                          const isSaving = savingCellKey === cellKey;
                          return (
                            <td
                              key={stk.id}
                              onClick={() => toggleLink(req.id, stk.id, "stakeholder")}
                              title={`${req.code} ↔ ${stk.fullName}`}
                              className={`py-3 px-4 transition-colors border-r border-slate-100 dark:border-slate-800 last:border-r-0 ${
                                canEditTraceability ? "cursor-pointer" : "cursor-not-allowed opacity-75"
                              } ${
                                isLinked
                                  ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                                  : "bg-rose-50/20 dark:bg-slate-900/30 text-transparent hover:bg-slate-100 dark:hover:bg-slate-800"
                              }`}
                            >
                              {isSaving ? (
                                <Loader2 className="w-3.5 h-3.5 mx-auto animate-spin text-blue-500" />
                              ) : isLinked ? (
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
                        <td
                          key={us.id}
                          className="py-3.5 px-4 text-amber-600 dark:text-amber-400 font-bold border-r border-slate-200 dark:border-slate-800"
                        >
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
                        <td
                          key={stk.id}
                          className="py-3.5 px-4 text-emerald-600 dark:text-emerald-400 font-bold border-r border-slate-200 dark:border-slate-800 last:border-r-0"
                        >
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
            <span className="font-medium text-slate-700 dark:text-slate-300">
              Vínculo existente (Clique para alterar e salvar no banco)
            </span>
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
