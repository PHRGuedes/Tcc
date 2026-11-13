"use client";

import { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Download,
  Printer,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  FileCode,
  BarChart3,
  Users,
  Layers,
} from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { useProject } from "@/components/layout/project-context";
import { createClient } from "@/lib/supabase/client";
import {
  PRIORITY_LABELS,
  REQUIREMENT_STATUS_LABELS,
  normalizeRequirementStatus,
} from "@/lib/constants/statuses";

export default function ReportsPage() {
  const { activeProject } = useProject();
  const [activeTab, setActiveTab] = useState("srs"); // 'srs' | 'metricas'
  const [requirements, setRequirements] = useState([]);
  const [userStories, setUserStories] = useState([]);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function loadReportData() {
      if (!activeProject?.id) return;
      try {
        // 1. Buscar requisitos do projeto (via project_id direto e fallback via project_requirements)
        let reqList = [];
        try {
          const { data: directReqs, error: directErr } = await supabase
            .from("requirements")
            .select("*, profiles:responsible_id(full_name)")
            .eq("project_id", activeProject.id)
            .order("code", { ascending: true });

          if (!directErr && directReqs && directReqs.length > 0) {
            reqList = directReqs.map((r) => ({
              ...r,
              responsible_name: r.profiles?.full_name || "Não atribuído",
            }));
          }
        } catch {}

        if (reqList.length === 0) {
          const { data: linked } = await supabase
            .from("project_requirements")
            .select("requirement:requirements(*, profiles:responsible_id(full_name))")
            .eq("project_id", activeProject.id);

          reqList = (linked || [])
            .map((l) => l.requirement)
            .filter(Boolean)
            .map((r) => ({
              ...r,
              responsible_name: r.profiles?.full_name || "Não atribuído",
            }))
            .sort((a, b) => (a.code || "").localeCompare(b.code || ""));
        }

        setRequirements(reqList);

        // 2. Buscar User Stories do projeto
        const { data: storiesData } = await supabase
          .from("user_stories")
          .select("*")
          .eq("project_id", activeProject.id)
          .order("code", { ascending: true });

        setUserStories(storiesData || []);
      } catch (err) {
        console.warn("Erro ao carregar dados do relatório:", err);
      }
    }
    loadReportData();
  }, [activeProject?.id, supabase]);

  const projectName = activeProject?.name || "Projeto ReqFlow";
  const safeFileName = projectName.replace(/\s+/g, "_").toLowerCase();

  const handlePrint = () => {
    window.print();
  };

  // Exportar Documento SRS em texto (.txt)
  const handleDownloadSRS = () => {
    const srsElement = document.getElementById("srs-document");
    let content = srsElement?.innerText || "";
    if (!content) {
      content = [
        `ESPECIFICAÇÃO DE REQUISITOS DE SOFTWARE (SRS) - ${projectName}`,
        `Data: ${new Date().toLocaleDateString("pt-BR")}`,
        `Padrão: IEEE Std 830 / ISO/IEC/IEEE 29148`,
        "",
        "REQUISITOS DO PROJETO:",
        ...requirements.map(
          (r) =>
            `[${r.code}] ${r.title} (${r.type} | ${
              REQUIREMENT_STATUS_LABELS[normalizeRequirementStatus(r.status)] || r.status
            } | Prioridade: ${PRIORITY_LABELS[r.priority] || r.priority})\nDescrição: ${
              r.description
            }\nCritério de Aceitação: ${r.acceptance_criteria || "N/A"}\n`
        ),
      ].join("\n");
    }
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `SRS_${safeFileName}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Exportar Planilha CSV real (.csv compatível com Excel)
  const handleDownloadCSV = () => {
    const headers = [
      "Codigo",
      "Titulo",
      "Tipo",
      "Prioridade",
      "Status",
      "Responsavel",
      "Fonte",
      "Justificativa",
      "Criterios_de_Aceitacao",
      "Versao",
    ];

    const escapeCsv = (val) => `"${String(val ?? "").replace(/"/g, '""')}"`;

    const rows = requirements.map((r) => {
      const normStatus = normalizeRequirementStatus(r.status);
      return [
        escapeCsv(r.code),
        escapeCsv(r.title),
        escapeCsv(r.type),
        escapeCsv(PRIORITY_LABELS[r.priority] || r.priority),
        escapeCsv(REQUIREMENT_STATUS_LABELS[normStatus] || normStatus),
        escapeCsv(r.responsible_name || "Não atribuído"),
        escapeCsv(r.source || ""),
        escapeCsv(r.justification || ""),
        escapeCsv(r.acceptance_criteria || ""),
        escapeCsv(`v${r.current_version || 1}`),
      ].join(";");
    });

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `requisitos_${safeFileName}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Exportar JSON estruturado real (.json)
  const handleDownloadJSON = () => {
    const payload = {
      project: {
        id: activeProject?.id,
        name: projectName,
        description: activeProject?.description || "",
        exported_at: new Date().toISOString(),
      },
      summary: {
        total_requirements: requirements.length,
        functional_requirements: requirements.filter((r) => r.type === "RF").length,
        non_functional_requirements: requirements.filter((r) => r.type === "RNF").length,
        total_user_stories: userStories.length,
      },
      requirements: requirements.map((r) => ({
        code: r.code,
        title: r.title,
        description: r.description,
        type: r.type,
        priority: r.priority,
        status: normalizeRequirementStatus(r.status),
        responsible: r.responsible_name,
        source: r.source,
        justification: r.justification,
        acceptance_criteria: r.acceptance_criteria,
        version: r.current_version || 1,
      })),
      user_stories: userStories.map((us) => ({
        code: us.code,
        title: us.title,
        as_a: us.as_a,
        i_want: us.i_want,
        so_that: us.so_that,
        priority: us.priority,
        status: us.status,
      })),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dados_${safeFileName}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Métricas analíticas (RF.40)
  const metrics = useMemo(() => {
    const total = requirements.length;
    const byStatus = {
      approved: requirements.filter((r) => normalizeRequirementStatus(r.status) === "approved")
        .length,
      under_review: requirements.filter(
        (r) => normalizeRequirementStatus(r.status) === "under_review"
      ).length,
      not_approved: requirements.filter(
        (r) => normalizeRequirementStatus(r.status) === "not_approved"
      ).length,
    };

    const byPriority = {
      critical: requirements.filter((r) => r.priority === "critical").length,
      high: requirements.filter((r) => r.priority === "high").length,
      medium: requirements.filter((r) => r.priority === "medium").length,
      low: requirements.filter((r) => r.priority === "low").length,
    };

    const byType = {
      RF: requirements.filter((r) => r.type === "RF").length,
      RNF: requirements.filter((r) => r.type === "RNF").length,
    };

    const completeCount = requirements.filter((r) => !r.is_incomplete).length;

    const byResponsibleMap = {};
    requirements.forEach((r) => {
      const name = r.responsible_name || "Não atribuído";
      byResponsibleMap[name] = (byResponsibleMap[name] || 0) + 1;
    });

    return {
      total,
      byStatus,
      byPriority,
      byType,
      completeCount,
      byResponsible: Object.entries(byResponsibleMap).sort((a, b) => b[1] - a[1]),
    };
  }, [requirements]);

  return (
    <>
      <Topbar title="Relatórios & Documento SRS" />

      <div className="p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-slate-200/80 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-300/60 dark:border-slate-700/60 self-start">
            <button
              onClick={() => setActiveTab("srs")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === "srs"
                  ? "bg-white dark:bg-[#0f172a] text-slate-900 dark:text-slate-100 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              Documento SRS Automático (IEEE 830)
            </button>
            <button
              onClick={() => setActiveTab("metricas")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === "metricas"
                  ? "bg-white dark:bg-[#0f172a] text-slate-900 dark:text-slate-100 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              Exportações & Relatórios Analíticos
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl flex items-center gap-2 transition-colors cursor-pointer bg-white dark:bg-[#0f172a]"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Imprimir / PDF</span>
            </button>
            <button
              onClick={handleDownloadCSV}
              className="px-3.5 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </button>
            <button
              onClick={handleDownloadSRS}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar SRS</span>
            </button>
          </div>
        </div>

        {activeTab === "srs" ? (
          /* SRS Document Preview */
          <div
            id="srs-document"
            className="bg-white dark:bg-[#0f172a] rounded-2xl p-8 md:p-10 border border-slate-200 dark:border-slate-800 shadow-sm max-w-4xl mx-auto space-y-8 print:border-none print:shadow-none print:p-0"
          >
            {/* Header / Capa */}
            <div className="border-b border-slate-200 dark:border-slate-800 pb-6">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-wider mb-2">
                <Sparkles className="w-4 h-4" />
                <span>Documento Oficial Gerado Automaticamente</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Especificação de Requisitos de Software (SRS)
              </h1>
              <p className="text-base text-slate-600 dark:text-slate-400 mt-1 font-medium">
                Projeto:{" "}
                <span className="text-blue-700 dark:text-blue-400 font-semibold">
                  {projectName}
                </span>
              </p>
              <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500 mt-4 flex-wrap">
                <span>Versão 1.0</span>
                <span>•</span>
                <span>Padrão IEEE Std 830-1998 / ISO/IEC/IEEE 29148</span>
                <span>•</span>
                <span>Data: {new Date().toLocaleDateString("pt-BR")}</span>
              </div>
            </div>

            {/* Seção 1: Introdução */}
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800/80 pb-1">
                1. Introdução
              </h2>
              <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed space-y-2">
                <p>
                  <strong>1.1 Propósito:</strong> Este documento especifica formalmente os
                  requisitos funcionais e não-funcionais do projeto <em>{projectName}</em>,
                  servindo como base para validação com stakeholders, derivação de Histórias de
                  Usuário e execução nas Sprints.
                </p>
                <p>
                  <strong>1.2 Escopo:</strong>{" "}
                  {activeProject?.description ||
                    "O sistema abrange os requisitos catalogados, validados e rastreados pela equipe do projeto na plataforma ReqFlow."}
                </p>
              </div>
            </section>

            {/* Seção 2: Requisitos Funcionais */}
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800/80 pb-1">
                2. Requisitos Funcionais (RF)
              </h2>
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {requirements.filter((r) => r.type === "RF").length > 0 ? (
                  requirements
                    .filter((r) => r.type === "RF")
                    .map((rf) => {
                      const normStatus = normalizeRequirementStatus(rf.status);
                      return (
                        <div key={rf.id} className="py-3.5 space-y-1.5">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="font-bold text-blue-700 dark:text-blue-400">
                              [{rf.code}] {rf.title || rf.description?.slice(0, 40)}
                            </span>
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold px-2 py-0.5 rounded">
                              {REQUIREMENT_STATUS_LABELS[normStatus] || normStatus} • Prioridade{" "}
                              {PRIORITY_LABELS[rf.priority] || rf.priority} • v
                              {rf.current_version || 1}
                            </span>
                          </div>
                          <p className="text-slate-700 dark:text-slate-300">{rf.description}</p>
                          {rf.justification && (
                            <p className="text-slate-500 dark:text-slate-400">
                              <strong>Justificativa:</strong> {rf.justification}
                            </p>
                          )}
                          {rf.acceptance_criteria && (
                            <p className="text-slate-500 dark:text-slate-400">
                              <strong>Critério de Aceitação:</strong> {rf.acceptance_criteria}
                            </p>
                          )}
                        </div>
                      );
                    })
                ) : (
                  <p className="py-4 text-slate-400 dark:text-slate-500 italic">
                    Nenhum requisito funcional cadastrado neste projeto ainda.
                  </p>
                )}
              </div>
            </section>

            {/* Seção 3: Requisitos Não-Funcionais */}
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800/80 pb-1">
                3. Requisitos Não-Funcionais (RNF)
              </h2>
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {requirements.filter((r) => r.type === "RNF").length > 0 ? (
                  requirements
                    .filter((r) => r.type === "RNF")
                    .map((rnf) => {
                      const normStatus = normalizeRequirementStatus(rnf.status);
                      return (
                        <div key={rnf.id} className="py-3.5 space-y-1.5">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="font-bold text-indigo-700 dark:text-indigo-400">
                              [{rnf.code}] {rnf.title || rnf.description?.slice(0, 40)}
                            </span>
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold px-2 py-0.5 rounded">
                              {REQUIREMENT_STATUS_LABELS[normStatus] || normStatus} • Prioridade{" "}
                              {PRIORITY_LABELS[rnf.priority] || rnf.priority} • v
                              {rnf.current_version || 1}
                            </span>
                          </div>
                          <p className="text-slate-700 dark:text-slate-300">{rnf.description}</p>
                          {rnf.acceptance_criteria && (
                            <p className="text-slate-500 dark:text-slate-400">
                              <strong>Critério de Aceitação:</strong> {rnf.acceptance_criteria}
                            </p>
                          )}
                        </div>
                      );
                    })
                ) : (
                  <p className="py-4 text-slate-400 dark:text-slate-500 italic">
                    Nenhum requisito não-funcional cadastrado neste projeto ainda.
                  </p>
                )}
              </div>
            </section>

            {/* Seção 4: Histórias de Usuário & Rastreabilidade */}
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800/80 pb-1">
                4. Histórias de Usuário (Execução Ágil)
              </h2>
              {userStories.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                  {userStories.map((us) => (
                    <div key={us.id} className="py-3 space-y-1">
                      <div className="font-bold text-slate-900 dark:text-white">
                        [{us.code}] {us.title}
                      </div>
                      <p className="text-slate-600 dark:text-slate-300">
                        <strong>Como</strong> {us.as_a}, <strong>quero</strong> {us.i_want},{" "}
                        <strong>para</strong> {us.so_that}.
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                  Nenhuma User Story cadastrada neste projeto até o momento.
                </p>
              )}
            </section>
          </div>
        ) : (
          /* Aba 2: Exportações & Relatórios Analíticos (RF.38 e RF.40) */
          <div className="space-y-6">
            {/* Cards de Exportação Real */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                <div>
                  <FileSpreadsheet className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mb-3" />
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    Exportar Planilha CSV / Excel
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Planilha tabular com todos os requisitos ({requirements.length}), status de
                    aprovação, prioridades, responsáveis e critérios de aceitação.
                  </p>
                </div>
                <button
                  onClick={handleDownloadCSV}
                  className="mt-5 w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 font-semibold text-xs rounded-xl border border-emerald-200 dark:border-emerald-800/40 transition-colors cursor-pointer"
                >
                  Baixar Planilha (.csv)
                </button>
              </div>

              <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                <div>
                  <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-3" />
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    Documento SRS (IEEE 830)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Especificação completa formatada pronta para entrega acadêmica e validação com
                    stakeholders.
                  </p>
                </div>
                <button
                  onClick={handleDownloadSRS}
                  className="mt-5 w-full py-2.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 font-semibold text-xs rounded-xl border border-blue-200 dark:border-blue-800/40 transition-colors cursor-pointer"
                >
                  Baixar Documento (.txt)
                </button>
              </div>

              <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                <div>
                  <FileCode className="w-8 h-8 text-purple-600 dark:text-purple-400 mb-3" />
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    Exportar JSON Estruturado
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Arquivo JSON com todos os requisitos, versões e histórias de usuário para
                    interoperabilidade e backup.
                  </p>
                </div>
                <button
                  onClick={handleDownloadJSON}
                  className="mt-5 w-full py-2.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-400 font-semibold text-xs rounded-xl border border-purple-200 dark:border-purple-800/40 transition-colors cursor-pointer"
                >
                  Baixar Dados (.json)
                </button>
              </div>
            </div>

            {/* Relatórios Analíticos por Status, Prioridade, Tipo e Responsável (RF.40) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Por Status e Tipo */}
              <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Relatório por Status e Tipo ({metrics.total} requisitos)
                  </h3>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between mb-1 font-medium">
                      <span className="text-emerald-700 dark:text-emerald-400">Aprovados</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {metrics.byStatus.approved}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{
                          width: `${
                            metrics.total
                              ? Math.round((metrics.byStatus.approved / metrics.total) * 100)
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1 font-medium">
                      <span className="text-amber-700 dark:text-amber-400">Em Análise</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {metrics.byStatus.under_review}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{
                          width: `${
                            metrics.total
                              ? Math.round((metrics.byStatus.under_review / metrics.total) * 100)
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1 font-medium">
                      <span className="text-rose-700 dark:text-rose-400">Não Aprovados</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {metrics.byStatus.not_approved}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-rose-500 rounded-full"
                        style={{
                          width: `${
                            metrics.total
                              ? Math.round((metrics.byStatus.not_approved / metrics.total) * 100)
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900">
                      <div className="text-lg font-extrabold text-blue-600 dark:text-blue-400">
                        {metrics.byType.RF}
                      </div>
                      <div className="text-[11px] text-slate-500">Funcionais (RF)</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900">
                      <div className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400">
                        {metrics.byType.RNF}
                      </div>
                      <div className="text-[11px] text-slate-500">Não-Funcionais</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900">
                      <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                        {metrics.completeCount}/{metrics.total}
                      </div>
                      <div className="text-[11px] text-slate-500">Completos</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Por Prioridade e Responsável */}
              <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Relatório por Prioridade e Responsável
                  </h3>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-red-50/70 dark:bg-red-950/30 border border-red-200/60 dark:border-red-900/40">
                    <div className="text-base font-extrabold text-red-700 dark:text-red-300">
                      {metrics.byPriority.critical}
                    </div>
                    <div className="text-[11px] text-red-600 dark:text-red-400">Crítica</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40">
                    <div className="text-base font-extrabold text-rose-700 dark:text-rose-300">
                      {metrics.byPriority.high}
                    </div>
                    <div className="text-[11px] text-rose-600 dark:text-rose-400">Alta</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40">
                    <div className="text-base font-extrabold text-amber-700 dark:text-amber-300">
                      {metrics.byPriority.medium}
                    </div>
                    <div className="text-[11px] text-amber-600 dark:text-amber-400">Média</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40">
                    <div className="text-base font-extrabold text-emerald-700 dark:text-emerald-300">
                      {metrics.byPriority.low}
                    </div>
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400">Baixa</div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Distribuição por Stakeholder Responsável
                  </div>
                  {metrics.byResponsible.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Nenhum requisito atribuído.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {metrics.byResponsible.map(([respName, count]) => (
                        <div
                          key={respName}
                          className="flex items-center justify-between text-xs py-1.5 px-3 rounded-lg bg-slate-50 dark:bg-slate-900/60"
                        >
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {respName}
                          </span>
                          <span className="font-bold text-blue-600 dark:text-blue-400">
                            {count} requisito(s)
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
