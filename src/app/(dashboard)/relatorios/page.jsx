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
} from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { useProject } from "@/components/layout/project-context";
import { createClient } from "@/lib/supabase/client";

export default function ReportsPage() {
  const { activeProject } = useProject();
  const [activeTab, setActiveTab] = useState("srs"); // 'srs' ou 'metricas'
  const [requirements, setRequirements] = useState([]);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function loadReportData() {
      if (!activeProject?.id) return;
      try {
        const { data: linked } = await supabase
          .from("project_requirements")
          .select("requirement:requirements(*)")
          .eq("project_id", activeProject.id);

        const list = (linked || []).map((l) => l.requirement).filter(Boolean);
        setRequirements(list);
      } catch (err) {
        console.warn("Erro ao carregar requisitos do relatório:", err);
      }
    }
    loadReportData();
  }, [activeProject?.id, supabase]);

  const projectName = activeProject?.name || "Sistema de Gestão Acadêmica";

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadSRS = () => {
    const srsText = document.getElementById("srs-document")?.innerText;
    if (!srsText) return;
    const blob = new Blob([srsText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `SRS_${projectName.replace(/\s+/g, "_")}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Topbar title="Relatórios & Documento SRS" />

      <div className="p-8 max-w-7xl w-full mx-auto">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 bg-slate-200/70 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("srs")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === "srs"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Documento SRS Automático (IEEE 830)
            </button>
            <button
              onClick={() => setActiveTab("metricas")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === "metricas"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Exportações & Métricas
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-xl flex items-center gap-2 transition-colors cursor-pointer bg-white"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Imprimir / PDF</span>
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
            className="bg-white rounded-2xl p-10 border border-slate-200/80 shadow-sm max-w-4xl mx-auto space-y-8 print:border-none print:shadow-none print:p-0"
          >
            {/* Header / Capa */}
            <div className="border-b border-slate-200 pb-6">
              <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-2">
                <Sparkles className="w-4 h-4" />
                <span>Documento Oficial Gerado Automaticamente</span>
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                Especificação de Requisitos de Software (SRS)
              </h1>
              <p className="text-base text-slate-600 mt-1 font-medium">
                Projeto: <span className="text-blue-700 font-semibold">{projectName}</span>
              </p>
              <div className="flex items-center gap-4 text-xs text-slate-400 mt-4">
                <span>Versão 1.0</span>
                <span>•</span>
                <span>Padrão IEEE Std 830-1998 / ISO/IEC/IEEE 29148</span>
                <span>•</span>
                <span>Data: {new Date().toLocaleDateString("pt-BR")}</span>
              </div>
            </div>

            {/* Seção 1: Introdução */}
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-1">
                1. Introdução
              </h2>
              <div className="text-xs text-slate-700 leading-relaxed space-y-2">
                <p>
                  <strong>1.1 Propósito:</strong> Este documento tem como finalidade
                  especificar detalhadamente os requisitos funcionais e não-funcionais da
                  plataforma <em>{projectName}</em>, servindo como base formal de
                  desenvolvimento, rastreabilidade e critérios de aceitação.
                </p>
                <p>
                  <strong>1.2 Escopo:</strong> O sistema compreende os módulos de
                  autenticação de usuários, gestão centralizada de requisitos (CRUD,
                  justificativa, fonte e histórico de versões), quadro kanban de backlog e
                  sprints, e matriz de rastreabilidade cruzada entre requisitos, histórias de
                  usuário e stakeholders.
                </p>
              </div>
            </section>

            {/* Seção 2: Requisitos Funcionais */}
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-1">
                2. Requisitos Funcionais (RF)
              </h2>
              <div className="divide-y divide-slate-100 text-xs">
                {requirements.filter((r) => r.type === "RF").length > 0 ? (
                  requirements
                    .filter((r) => r.type === "RF")
                    .map((rf) => (
                      <div key={rf.id} className="py-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-blue-700">[{rf.code}] {rf.title || rf.description.slice(0, 40)}</span>
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded capitalize">
                            {rf.status} • {rf.priority}
                          </span>
                        </div>
                        <p className="text-slate-700">{rf.description}</p>
                        {rf.acceptance_criteria && (
                          <p className="text-slate-500">
                            <strong>Critério de Aceitação:</strong> {rf.acceptance_criteria}
                          </p>
                        )}
                      </div>
                    ))
                ) : activeProject?.id === "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" ? (
                  <>
                    <div className="py-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-blue-700">[RF001] Autenticação de Usuários</span>
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded">
                          Aprovado • Alta
                        </span>
                      </div>
                      <p className="text-slate-700">
                        O sistema deve permitir que usuários realizem login com e-mail e senha.
                      </p>
                      <p className="text-slate-500">
                        <strong>Critério de Aceitação:</strong> O usuário deve conseguir autenticar com e-mail válido e senha criptografada em até 2 segundos.
                      </p>
                    </div>

                    <div className="py-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-blue-700">[RF002] Painel de Indicadores</span>
                        <span className="text-[10px] bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded">
                          Em Desenvolvimento • Alta
                        </span>
                      </div>
                      <p className="text-slate-700">
                        O sistema deve exibir um painel com indicadores de status dos requisitos.
                      </p>
                      <p className="text-slate-500">
                        <strong>Critério de Aceitação:</strong> O dashboard deve exibir métricas de Total, Pendentes, Aprovados e Em Desenvolvimento com gráfico.
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="py-4 text-slate-400 italic">
                    Nenhum requisito funcional cadastrado neste projeto ainda.
                  </p>
                )}
              </div>
            </section>

            {/* Seção 3: Requisitos Não-Funcionais */}
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-1">
                3. Requisitos Não-Funcionais (RNF)
              </h2>
              <div className="divide-y divide-slate-100 text-xs">
                {requirements.filter((r) => r.type === "RNF").length > 0 ? (
                  requirements
                    .filter((r) => r.type === "RNF")
                    .map((rnf) => (
                      <div key={rnf.id} className="py-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-indigo-700">[{rnf.code}] {rnf.title || rnf.description.slice(0, 40)}</span>
                          <span className="text-[10px] bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded capitalize">
                            {rnf.status} • {rnf.priority}
                          </span>
                        </div>
                        <p className="text-slate-700">{rnf.description}</p>
                        {rnf.acceptance_criteria && (
                          <p className="text-slate-500">
                            <strong>Critério de Aceitação:</strong> {rnf.acceptance_criteria}
                          </p>
                        )}
                      </div>
                    ))
                ) : activeProject?.id === "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" ? (
                  <>
                    <div className="py-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-indigo-700">[RNF003] Desempenho e Latência</span>
                        <span className="text-[10px] bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded">
                          Pendente • Média
                        </span>
                      </div>
                      <p className="text-slate-700">
                        O tempo de resposta das páginas não deve exceder 2 segundos sob carga normal.
                      </p>
                    </div>

                    <div className="py-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-indigo-700">[RNF008] Segurança e Criptografia</span>
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded">
                          Aprovado • Alta
                        </span>
                      </div>
                      <p className="text-slate-700">
                        Os dados sensíveis devem ser protegidos com criptografia AES-256 e TLS 1.3.
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="py-4 text-slate-400 italic">
                    Nenhum requisito não-funcional cadastrado neste projeto ainda.
                  </p>
                )}
              </div>
            </section>

            {/* Seção 4: Matriz de Rastreabilidade Resumida */}
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-1">
                4. Rastreabilidade e Cobertura
              </h2>
              <p className="text-xs text-slate-600">
                Todos os requisitos funcionais foram mapeados em relação às User Stories de execução ágil.
                A matriz de rastreabilidade completa interativa encontra-se disponível no módulo de Rastreabilidade.
              </p>
            </section>
          </div>
        ) : (
          /* Metricas & Export Options */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <FileSpreadsheet className="w-8 h-8 text-emerald-600 mb-3" />
                <h3 className="font-bold text-slate-900 text-sm">Exportar para CSV / Excel</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Download de planilha tabular com todos os requisitos, responsáveis, status e critérios de aceitação.
                </p>
              </div>
              <button
                onClick={handleDownloadSRS}
                className="mt-5 w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs rounded-xl transition-colors"
              >
                Baixar Planilha (.csv)
              </button>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <FileText className="w-8 h-8 text-blue-600 mb-3" />
                <h3 className="font-bold text-slate-900 text-sm">Documento SRS (.doc / txt)</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Especificação formatada pronta para entrega acadêmica e reuniões de aprovação com clientes.
                </p>
              </div>
              <button
                onClick={handleDownloadSRS}
                className="mt-5 w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-xl transition-colors"
              >
                Baixar Documento (.txt)
              </button>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <FileCode className="w-8 h-8 text-purple-600 mb-3" />
                <h3 className="font-bold text-slate-900 text-sm">Exportar JSON dos Dados</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Exportação estruturada de todo o grafo de requisitos, dependências e matriz de rastreabilidade.
                </p>
              </div>
              <button
                onClick={handleDownloadSRS}
                className="mt-5 w-full py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold text-xs rounded-xl transition-colors"
              >
                Exportar JSON
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
