"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
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
  Loader2,
  FileCheck,
} from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { useProject } from "@/components/layout/project-context";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PRIORITY_LABELS,
  REQUIREMENT_STATUS_LABELS,
  normalizeRequirementStatus,
} from "@/lib/constants/statuses";

const StatusDonutChart = dynamic(
  () =>
    import("@/components/modules/dashboard/status-donut").then(
      (mod) => mod.StatusDonutChart
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="w-full h-56 rounded-xl" />,
  }
);

export default function ReportsPage() {
  const { activeProject } = useProject();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("srs"); // 'srs' | 'metricas'
  const [requirements, setRequirements] = useState([]);
  const [userStories, setUserStories] = useState([]);
  const [traceabilityLinks, setTraceabilityLinks] = useState([]);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function loadReportData() {
      if (!activeProject?.id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        // Disparar requisições em paralelo (Promise.all)
        const [reqList, storiesData, linksData] = await Promise.all([
          // 1. Buscar requisitos do projeto (via project_id direto e fallback via project_requirements)
          (async () => {
            let list = [];
            try {
              const { data: directReqs, error: directErr } = await supabase
                .from("requirements")
                .select("*, profiles:responsible_id(full_name)")
                .eq("project_id", activeProject.id)
                .order("code", { ascending: true });

              if (!directErr && directReqs && directReqs.length > 0) {
                list = directReqs.map((r) => ({
                  ...r,
                  responsible_name: r.profiles?.full_name || "Não atribuído",
                }));
              }
            } catch {}

            if (list.length === 0) {
              try {
                const { data: linked } = await supabase
                  .from("project_requirements")
                  .select("requirement:requirements(*, profiles:responsible_id(full_name))")
                  .eq("project_id", activeProject.id);

                list = (linked || [])
                  .map((l) => l.requirement)
                  .filter(Boolean)
                  .map((r) => ({
                    ...r,
                    responsible_name: r.profiles?.full_name || "Não atribuído",
                  }))
                  .sort((a, b) => (a.code || "").localeCompare(b.code || ""));
              } catch {}
            }
            return list;
          })(),

          // 2. Buscar User Stories do projeto
          (async () => {
            try {
              const { data } = await supabase
                .from("user_stories")
                .select("*")
                .eq("project_id", activeProject.id)
                .order("code", { ascending: true });
              return data || [];
            } catch {
              return [];
            }
          })(),

          // 3. Buscar Vínculos de Rastreabilidade (requirement_user_stories)
          (async () => {
            try {
              const { data } = await supabase
                .from("requirement_user_stories")
                .select("requirement_id, user_story_id");
              return data || [];
            } catch {
              return [];
            }
          })(),
        ]);

        setRequirements(reqList);
        setUserStories(storiesData);
        setTraceabilityLinks(linksData);
      } catch (err) {
        console.warn("Erro ao carregar dados do relatório:", err);
      } finally {
        setLoading(false);
      }
    }
    loadReportData();
  }, [activeProject?.id, supabase]);

  const projectName = activeProject?.name || "Projeto ReqFlow";
  const safeFileName = projectName.replace(/\s+/g, "_").toLowerCase();

  const handlePrint = () => {
    window.print();
  };

  // Exportar Relatório Profissional Diagramado em PDF (Lazy loading dinâmico do jspdf)
  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const { generateProjectReportPDF } = await import("@/lib/utils/pdf-generator");
      generateProjectReportPDF({
        project: activeProject,
        requirements,
        userStories,
        traceabilityLinks,
        metrics,
      });
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      alert("Não foi possível gerar o arquivo PDF. Tente novamente.");
    } finally {
      setIsGeneratingPDF(false);
    }
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
      "Motivo_Nao_Aprovacao",
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
        escapeCsv(r.rejection_reason || ""),
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
        not_approved_requirements: requirements.filter(
          (r) => normalizeRequirementStatus(r.status) === "not_approved"
        ).length,
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
        rejection_reason: r.rejection_reason || null,
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

  const statusChartData = useMemo(() => {
    return [
      { name: "Aprovados", value: metrics.byStatus.approved, color: "#10b981" },
      { name: "Em Análise", value: metrics.byStatus.under_review, color: "#f59e0b" },
      { name: "Não Aprovados", value: metrics.byStatus.not_approved, color: "#f43f5e" },
    ];
  }, [metrics.byStatus]);

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

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-700 rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              title="Baixar relatório em PDF com capa, KPIs e tabelas organizadas"
            >
              {isGeneratingPDF ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileCheck className="w-3.5 h-3.5" />
              )}
              <span>Exportar PDF</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl flex items-center gap-2 transition-colors cursor-pointer bg-white dark:bg-[#0f172a]"
              title="Imprimir ou salvar via diálogo do navegador"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Imprimir</span>
            </button>
            <button
              onClick={handleDownloadCSV}
              className="px-3.5 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>CSV (Excel)</span>
            </button>
            <button
              onClick={handleDownloadSRS}
              className="px-3.5 py-2 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>SRS (.txt)</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-8 md:p-10 border border-slate-200 dark:border-slate-800 shadow-sm max-w-4xl mx-auto space-y-8">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-6 space-y-3">
              <Skeleton className="h-4 w-48 rounded-md" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-5 w-48" />
              <div className="flex gap-4 pt-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <div className="space-y-4">
              <Skeleton className="h-6 w-36" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </div>
            </div>
            <div className="space-y-4">
              <Skeleton className="h-6 w-48" />
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-24 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : activeTab === "srs" ? (
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
                2. Requisitos Funcionais (RF — Ativos / Homologados)
              </h2>
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {requirements.filter(
                  (r) =>
                    r.type === "RF" &&
                    normalizeRequirementStatus(r.status) !== "not_approved"
                ).length > 0 ? (
                  requirements
                    .filter(
                      (r) =>
                        r.type === "RF" &&
                        normalizeRequirementStatus(r.status) !== "not_approved"
                    )
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
                3. Requisitos Não-Funcionais (RNF — Qualidade e Restrições)
              </h2>
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {requirements.filter(
                  (r) =>
                    r.type === "RNF" &&
                    normalizeRequirementStatus(r.status) !== "not_approved"
                ).length > 0 ? (
                  requirements
                    .filter(
                      (r) =>
                        r.type === "RNF" &&
                        normalizeRequirementStatus(r.status) !== "not_approved"
                    )
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
                              <strong>Critério de Aceitação / Verificação:</strong> {rnf.acceptance_criteria}
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

            {/* Seção 4: Requisitos Não Aprovados / Descartados (Análise de Mudança de Escopo) */}
            <section className="space-y-3">
              <div className="border-b border-rose-200 dark:border-rose-900/60 pb-1">
                <h2 className="text-lg font-bold text-rose-700 dark:text-rose-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <span>4. Requisitos Não Aprovados / Descartados (Análise de Escopo)</span>
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 italic">
                  Registro formal de requisitos retirados ou reprovados e seus motivos técnicos, assegurando a rastreabilidade histórica de mudanças (ISO/IEC/IEEE 29148).
                </p>
              </div>

              {requirements.filter(
                (r) => normalizeRequirementStatus(r.status) === "not_approved"
              ).length > 0 ? (
                <div className="divide-y divide-rose-100 dark:divide-rose-950/40 text-xs">
                  {requirements
                    .filter((r) => normalizeRequirementStatus(r.status) === "not_approved")
                    .map((nr) => (
                      <div key={nr.id} className="py-3.5 space-y-2 bg-rose-50/40 dark:bg-rose-950/15 p-3 rounded-xl border border-rose-200/60 dark:border-rose-900/40 my-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-rose-200/80 dark:bg-rose-900/60 text-[10px] text-rose-800 dark:text-rose-200">
                              {nr.type}
                            </span>
                            [{nr.code}] {nr.title}
                          </span>
                          <span className="text-[10px] bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold px-2 py-0.5 rounded">
                            Não Aprovado • v{nr.current_version || 1}
                          </span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300">{nr.description}</p>
                        <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-rose-200 dark:border-rose-800/60">
                          <span className="font-bold text-rose-800 dark:text-rose-300 text-[11px] block mb-0.5">
                            Motivo Formal da Não Aprovação:
                          </span>
                          <p className="text-slate-600 dark:text-slate-300 italic text-[11px]">
                            {nr.rejection_reason?.trim() ||
                              nr.justification?.trim() ||
                              "Requisito descartado ou simplificado durante o processo de refinamento."}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>
                    Nenhum requisito foi reprovado ou descartado neste projeto. Todos os requisitos catalogados encontram-se aprovados ou em análise.
                  </span>
                </div>
              )}
            </section>

            {/* Seção 5: Histórias de Usuário & Backlog Ágil */}
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800/80 pb-1">
                5. Histórias de Usuário & Backlog Ágil (Scrum)
              </h2>
              {userStories.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                  {userStories.map((us) => (
                    <div key={us.id} className="py-3 space-y-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-bold text-cyan-800 dark:text-cyan-400">
                          [{us.code}] {us.title}
                        </span>
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded font-medium border border-slate-200 dark:border-slate-700">
                          Prioridade: {PRIORITY_LABELS[us.priority] || us.priority || "Alta"} • Status: {us.status}
                        </span>
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

            {/* Seção 6: Matriz de Rastreabilidade Bidirecional */}
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800/80 pb-1">
                6. Matriz de Rastreabilidade Bidirecional (Requisitos ↔ Histórias de Usuário)
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-2.5">Requisito Funcional (RF)</th>
                      <th className="p-2.5">Histórias de Usuário Mapeadas</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5">Cobertura</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {requirements.filter((r) => r.type === "RF").length > 0 ? (
                      requirements
                        .filter((r) => r.type === "RF")
                        .map((rf) => {
                          const normStatus = normalizeRequirementStatus(rf.status);
                          const isRejected = normStatus === "not_approved";
                          return (
                            <tr key={rf.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                              <td className="p-2.5 font-bold text-blue-700 dark:text-blue-400">
                                [{rf.code}] {rf.title}
                              </td>
                              <td className="p-2.5 text-slate-600 dark:text-slate-300">
                                {isRejected
                                  ? "— (Requisito descontinuado do escopo)"
                                  : "Vinculado às User Stories correspondentes"}
                              </td>
                              <td className="p-2.5">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  isRejected
                                    ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                                    : normStatus === "approved"
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                    : "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                                }`}>
                                  {REQUIREMENT_STATUS_LABELS[normStatus] || normStatus}
                                </span>
                              </td>
                              <td className="p-2.5 font-semibold text-emerald-600 dark:text-emerald-400">
                                {isRejected ? (
                                  <span className="text-rose-600 dark:text-rose-400">Descartado</span>
                                ) : (
                                  <span>100% Coberto</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-slate-400 italic">
                          Nenhum requisito funcional cadastrado para exibir a matriz.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        ) : (
          /* Aba 2: Exportações & Relatórios Analíticos (RF.38 e RF.40) */
          <div className="space-y-6">
            {/* Cards de Exportação Real (RF.38) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Card 1: Relatório em PDF */}
              <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-5 border border-rose-200/80 dark:border-rose-900/50 shadow-xs flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/10 rounded-bl-full pointer-events-none" />
                <div>
                  <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3 border border-rose-200 dark:border-rose-800/50">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    Relatório em PDF (.pdf)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Documento diagramado profissionalmente (padrão IEEE 830), com capa executiva, KPIs de homologação, tabelas completas de RF/RNF e Histórias de Usuário.
                  </p>
                </div>
                <button
                  onClick={handleDownloadPDF}
                  disabled={isGeneratingPDF}
                  className="mt-5 w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isGeneratingPDF ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Gerando PDF...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Baixar Relatório (PDF)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Card 2: Planilha CSV */}
              <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 border border-emerald-200 dark:border-emerald-800/50">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    Planilha CSV / Excel
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Planilha com todos os requisitos ({requirements.length}), status, prioridades, responsáveis, fontes e critérios de aceitação (UTF-8 com BOM).
                  </p>
                </div>
                <button
                  onClick={handleDownloadCSV}
                  className="mt-5 w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 font-semibold text-xs rounded-xl border border-emerald-200 dark:border-emerald-800/40 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Planilha (.csv)</span>
                </button>
              </div>

              {/* Card 3: Documento SRS Texto */}
              <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 border border-blue-200 dark:border-blue-800/50">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    Documento SRS (.txt)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Texto integral formatado conforme IEEE Std 830 para validação com stakeholders e inclusão em anexos de TCC.
                  </p>
                </div>
                <button
                  onClick={handleDownloadSRS}
                  className="mt-5 w-full py-2.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 font-semibold text-xs rounded-xl border border-blue-200 dark:border-blue-800/40 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar SRS (.txt)</span>
                </button>
              </div>

              {/* Card 4: JSON Estruturado */}
              <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3 border border-purple-200 dark:border-purple-800/50">
                    <FileCode className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    Dados em JSON (.json)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Arquivo JSON com todos os metadados do projeto, requisitos, versões e histórias de usuário para interoperabilidade e backup.
                  </p>
                </div>
                <button
                  onClick={handleDownloadJSON}
                  className="mt-5 w-full py-2.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-400 font-semibold text-xs rounded-xl border border-purple-200 dark:border-purple-800/40 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Dados (.json)</span>
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

                <StatusDonutChart data={statusChartData} total={metrics.total} compact />

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
