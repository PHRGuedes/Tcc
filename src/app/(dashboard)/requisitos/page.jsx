"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Download, CheckCircle2 } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { RequirementsTable } from "@/components/modules/requirements/requirements-table";
import { RequirementModal } from "@/components/modules/requirements/requirement-modal";
import { ImportRequirementsModal } from "@/components/modules/requirements/import-requirements-modal";
import { useProject } from "@/components/layout/project-context";
import { usePermissions } from "@/components/layout/permissions-context";
import { createClient } from "@/lib/supabase/client";
import { getProjectMembersAction } from "@/app/actions/projects";
import { deleteRequirementAction } from "@/app/actions/requirements";

export default function RequirementsPage() {
  const { activeProject } = useProject();
  const { hasPermission, guardAction } = usePermissions();
  const supabase = useMemo(() => createClient(), []);

  const canCreate = hasPermission("requirements_create_edit");
  const canImport = hasPermission("requirements_import");

  const [requirements, setRequirements] = useState([]);
  const [userStories, setUserStories] = useState([]);
  const [stakeholders, setStakeholders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequirement, setSelectedRequirement] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Carregar dados de requisitos e relacionamentos vinculados ao activeProject
  const loadData = useCallback(async () => {
    if (!activeProject?.id) return;
    setLoading(true);
    try {
      // 1. Buscar stakeholders membros do projeto ativo
      const membersRes = await getProjectMembersAction(activeProject.id);
      let projectMembers = [];

      if (membersRes?.success && membersRes.data?.length > 0) {
        projectMembers = membersRes.data.map((m) => ({
          id: m.profiles?.id || m.user_id,
          full_name: m.profiles?.full_name || "Membro da Equipe",
          role: m.role_in_project || m.profiles?.role,
          email: m.profiles?.email,
        }));
      } else if (activeProject.id === "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa") {
        projectMembers = [
          { id: "11111111-1111-1111-1111-111111111111", full_name: "Ana Ribeiro" },
          { id: "22222222-2222-2222-2222-222222222222", full_name: "Carlos Mendes" },
          { id: "33333333-3333-3333-3333-333333333333", full_name: "Diego Almeida" },
          { id: "44444444-4444-4444-4444-444444444444", full_name: "Beatriz Souza" },
        ];
      }

      setStakeholders(projectMembers);

      // 2. Buscar User Stories DO PROJETO ATIVO
      const { data: usData } = await supabase
        .from("user_stories")
        .select("id, code, title")
        .eq("project_id", activeProject.id)
        .order("code", { ascending: true });

      if (usData && usData.length > 0) {
        setUserStories(usData);
      } else if (activeProject.id === "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa") {
        setUserStories([
          { id: "d0000001", code: "US-01", title: "Autenticação de usuários" },
          { id: "d0000002", code: "US-02", title: "Painel de indicadores" },
          { id: "d0000003", code: "US-03", title: "Gestão de requisitos (CRUD)" },
          { id: "d0000004", code: "US-04", title: "Histórico de versões" },
          { id: "d0000005", code: "US-05", title: "Matriz de rastreabilidade" },
        ]);
      } else {
        setUserStories([]);
      }

      // 3. Buscar Requisitos vinculados ao PROJETO ATIVO
      // Tenta buscar via project_id direto e fallback via project_requirements
      let projectReqs = [];

      try {
        const { data: directReqs, error: directErr } = await supabase
          .from("requirements")
          .select("*, profiles:responsible_id(full_name)")
          .eq("project_id", activeProject.id)
          .order("code", { ascending: true });

        if (!directErr && directReqs && directReqs.length > 0) {
          projectReqs = directReqs.map((r) => ({
            ...r,
            responsible_name: r.profiles?.full_name || "Não atribuído",
          }));
        }
      } catch {}

      // Se não encontrou por project_id direto, consulta via tabela associativa project_requirements
      if (projectReqs.length === 0) {
        const { data: linkedData } = await supabase
          .from("project_requirements")
          .select(`
            requirement:requirements (
              *,
              profiles:responsible_id(full_name)
            )
          `)
          .eq("project_id", activeProject.id);

        if (linkedData && linkedData.length > 0) {
          projectReqs = linkedData
            .map((item) => item.requirement)
            .filter(Boolean)
            .map((r) => ({
              ...r,
              responsible_name: r.profiles?.full_name || "Não atribuído",
            }))
            .sort((a, b) => a.code.localeCompare(b.code));
        }
      }

      if (projectReqs.length > 0) {
        setRequirements(projectReqs);
      } else if (activeProject.id === "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa") {
        setRequirements([
          {
            id: "1",
            code: "REQ-001",
            title: "Autenticação Segura",
            description: "O sistema deve permitir que usuários realizem login com e-mail e senha.",
            type: "RF",
            priority: "high",
            status: "approved",
            responsible_name: "Ana Ribeiro",
            is_incomplete: false,
          },
          {
            id: "2",
            code: "REQ-002",
            title: "Painel de Indicadores",
            description: "O sistema deve exibir um painel com indicadores de status dos requisitos.",
            type: "RF",
            priority: "high",
            status: "in_development",
            responsible_name: "Carlos Mendes",
            is_incomplete: false,
          },
          {
            id: "3",
            code: "REQ-003",
            title: "Desempenho de Resposta",
            description: "O tempo de resposta das páginas não deve exceder 2 segundos.",
            type: "RNF",
            priority: "medium",
            status: "proposed",
            responsible_name: "Beatriz Souza",
            is_incomplete: true,
          },
        ]);
      } else {
        setRequirements([]);
      }
    } catch (err) {
      console.warn("Aviso ao carregar requisitos do projeto:", err);
      setRequirements([]);
    } finally {
      setLoading(false);
    }
  }, [activeProject?.id, supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Exclusão de requisito
  const handleDeleteRequirement = async (req) => {
    guardAction(
      "requirements_delete",
      async () => {
        const confirmDelete = window.confirm(
          `Deseja realmente excluir o requisito "${req.code}" deste projeto?`
        );
        if (!confirmDelete) return;

        setRequirements((prev) => prev.filter((r) => r.id !== req.id));
        await deleteRequirementAction(req.id);
        loadData();
      },
      "excluir requisitos deste projeto"
    );
  };

  return (
    <>
      <Topbar title="Requisitos do Projeto" />

      {/* Modal de Criação / Edição de Requisito do Projeto */}
      {isModalOpen && (
        <RequirementModal
          scope="project"
          isOpen={isModalOpen}
          requirement={selectedRequirement}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedRequirement(null);
          }}
          onSaveSuccess={() => {
            loadData();
            setToastMessage("Requisito salvo com sucesso no projeto!");
            setTimeout(() => setToastMessage(""), 4000);
          }}
          userStories={userStories}
          stakeholders={stakeholders}
        />
      )}

      {/* Modal de Importação e Reutilização (RF.33 / RF.34) */}
      {isImportModalOpen && (
        <ImportRequirementsModal
          isOpen={isImportModalOpen}
          activeProject={activeProject}
          onClose={() => setIsImportModalOpen(false)}
          onImportSuccess={(count, codes) => {
            loadData();
            setToastMessage(
              `${count} requisito(s) (${codes.join(", ")}) importado(s) e reutilizado(s) no projeto com sucesso!`
            );
            setTimeout(() => setToastMessage(""), 5000);
          }}
        />
      )}

      <div className="p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Banner de Feedback / Toast */}
        {toastMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <button
              onClick={() => setToastMessage("")}
              className="text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Top Control Bar com Botões de Ação */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#0f172a] rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Requisitos do Projeto
              </h2>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-mono">
                {activeProject?.name || "Projeto Ativo"}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Especificação ativa, prioridades e ciclo de vida dos requisitos deste projeto.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Botão Importar / Reutilizar (RF.33 / RF.34) */}
            <button
              onClick={() =>
                guardAction(
                  "requirements_import",
                  () => setIsImportModalOpen(true),
                  "importar requisitos"
                )
              }
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl transition-all shadow-2xs ${
                canImport
                  ? "hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  : "opacity-60 hover:opacity-85 cursor-not-allowed"
              }`}
              title={
                canImport
                  ? "Importar requisitos da sua biblioteca pessoal ou de outros projetos"
                  : "Seu perfil atual não tem permissão para importar requisitos neste projeto (clique para detalhes)"
              }
            >
              <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Importar / Reutilizar</span>
            </button>

            {/* Botão Novo Requisito */}
            <button
              onClick={() =>
                guardAction(
                  "requirements_create_edit",
                  () => {
                    setSelectedRequirement(null);
                    setIsModalOpen(true);
                  },
                  "criar novos requisitos"
                )
              }
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-xs transition-all ${
                canCreate
                  ? "bg-blue-600 hover:bg-blue-700 cursor-pointer"
                  : "bg-blue-600/70 opacity-60 hover:opacity-85 cursor-not-allowed"
              }`}
              title={
                canCreate
                  ? "Cadastrar novo requisito neste projeto"
                  : "Seu perfil atual não tem permissão para criar requisitos neste projeto (clique para detalhes)"
              }
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Requisito</span>
            </button>
          </div>
        </div>

        {/* Tabela de Requisitos do Projeto */}
        <RequirementsTable
          scope="project"
          requirements={requirements}
          loading={loading}
          onSelectRequirement={(req) => {
            setSelectedRequirement(req);
            setIsModalOpen(true);
          }}
          onDeleteRequirement={handleDeleteRequirement}
        />
      </div>
    </>
  );
}
