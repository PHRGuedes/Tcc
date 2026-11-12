"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Search, Plus, Eye, Pencil, AlertTriangle } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { TypeBadge, PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { RequirementModal } from "@/components/modules/requirements/requirement-modal";
import { useProject } from "@/components/layout/project-context";
import { createClient } from "@/lib/supabase/client";
import {
  PRIORITIES,
  PRIORITY_LABELS,
  REQUIREMENT_STATUSES,
  REQUIREMENT_STATUS_LABELS,
  REQUIREMENT_TYPES,
} from "@/lib/constants/statuses";

export default function RequirementsPage() {
  const { activeProject } = useProject();
  const supabase = useMemo(() => createClient(), []);

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const [requirements, setRequirements] = useState([]);
  const [userStories, setUserStories] = useState([]);
  const [stakeholders, setStakeholders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequirement, setSelectedRequirement] = useState(null);

  // Carregar dados de requisitos e relacionamentos vinculados ao activeProject
  const loadData = useCallback(async () => {
    if (!activeProject?.id) return;
    setLoading(true);
    try {
      // 1. Buscar stakeholders/perfis
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, role, email");

      const defaultStakeholders = [
        { id: "11111111-1111-1111-1111-111111111111", full_name: "Ana Ribeiro" },
        { id: "22222222-2222-2222-2222-222222222222", full_name: "Carlos Mendes" },
        { id: "33333333-3333-3333-3333-333333333333", full_name: "Diego Almeida" },
        { id: "44444444-4444-4444-4444-444444444444", full_name: "Beatriz Souza" },
      ];
      setStakeholders(profilesData?.length ? profilesData : defaultStakeholders);

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

      // 3. Buscar Requisitos vinculados ao PROJETO ATIVO via project_requirements
      const { data: linkedData, error } = await supabase
        .from("project_requirements")
        .select(`
          requirement:requirements (
            id,
            code,
            title,
            description,
            type,
            priority,
            status,
            justification,
            source,
            acceptance_criteria,
            is_incomplete,
            responsible_id,
            created_by,
            current_version,
            created_at,
            updated_at,
            profiles:responsible_id(full_name)
          )
        `)
        .eq("project_id", activeProject.id);

      if (!error && linkedData && linkedData.length > 0) {
        const projectReqs = linkedData
          .map((item) => item.requirement)
          .filter(Boolean)
          .sort((a, b) => a.code.localeCompare(b.code));

        setRequirements(
          projectReqs.map((r) => ({
            ...r,
            responsible_name: r.profiles?.full_name || "Não atribuído",
          }))
        );
      } else if (activeProject.id === "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa") {
        setRequirements([
          {
            id: "1",
            code: "REQ-001",
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
            description: "O tempo de resposta das páginas não deve exceder 2 segundos.",
            type: "RNF",
            priority: "medium",
            status: "proposed",
            responsible_name: "Beatriz Souza",
            is_incomplete: true,
          },
          {
            id: "4",
            code: "REQ-004",
            description: "O sistema deve permitir cadastrar, editar e excluir requisitos.",
            type: "RF",
            priority: "high",
            status: "approved",
            responsible_name: "Ana Ribeiro",
            is_incomplete: false,
          },
          {
            id: "5",
            code: "REQ-005",
            description: "O sistema deve manter histórico de versões de cada requisito.",
            type: "RF",
            priority: "medium",
            status: "in_development",
            responsible_name: "Diego Almeida",
            is_incomplete: false,
          },
          {
            id: "6",
            code: "REQ-006",
            description: "A aplicação deve ser acessível conforme diretrizes WCAG 2.1 AA.",
            type: "RNF",
            priority: "medium",
            status: "proposed",
            responsible_name: "Beatriz Souza",
            is_incomplete: true,
          },
          {
            id: "7",
            code: "REQ-007",
            description: "O sistema deve gerar a matriz de rastreabilidade entre requisitos e user stories.",
            type: "RF",
            priority: "high",
            status: "proposed",
            responsible_name: "Carlos Mendes",
            is_incomplete: true,
          },
          {
            id: "8",
            code: "REQ-008",
            description: "Os dados sensíveis devem ser protegidos com criptografia em repouso.",
            type: "RNF",
            priority: "high",
            status: "approved",
            responsible_name: "Diego Almeida",
            is_incomplete: false,
          },
        ]);
      } else {
        setRequirements([]);
      }
    } catch (err) {
      console.warn("Erro ao buscar requisitos:", err);
      setRequirements([]);
    } finally {
      setLoading(false);
    }
  }, [activeProject?.id, supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtros combinados
  const filteredRequirements = requirements.filter((req) => {
    const matchesSearch =
      req.code.toLowerCase().includes(search.toLowerCase()) ||
      req.description.toLowerCase().includes(search.toLowerCase());

    const matchesType = filterType === "all" || req.type === filterType;
    const matchesPriority =
      filterPriority === "all" || req.priority === filterPriority;
    const matchesStatus = filterStatus === "all" || req.status === filterStatus;

    return matchesSearch && matchesType && matchesPriority && matchesStatus;
  });

  const handleOpenCreateModal = () => {
    setSelectedRequirement(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (req) => {
    setSelectedRequirement(req);
    setIsModalOpen(true);
  };

  const handleSaveSuccess = (savedReq) => {
    setRequirements((prev) => {
      const exists = prev.some((r) => r.id === savedReq.id);
      if (exists) {
        return prev.map((r) => (r.id === savedReq.id ? { ...r, ...savedReq } : r));
      }
      return [savedReq, ...prev];
    });
  };

  return (
    <>
      <Topbar title="Requisitos" />

      <div className="p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Filter & Action Bar Card */}
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por código ou descrição do requisito..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300/80 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleOpenCreateModal}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-xs transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Requisito</span>
              </button>
            </div>
          </div>

          {/* Dropdown Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-200/80 dark:border-slate-800">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                Tipo
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 bg-slate-50/80 dark:bg-slate-950 font-medium focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
              >
                <option value="all">Todos os tipos</option>
                <option value={REQUIREMENT_TYPES.RF}>RF — Requisito Funcional</option>
                <option value={REQUIREMENT_TYPES.RNF}>RNF — Requisito Não-Funcional</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                Prioridade
              </label>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 bg-slate-50/80 dark:bg-slate-950 font-medium focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
              >
                <option value="all">Todas as prioridades</option>
                {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 bg-slate-50/80 dark:bg-slate-950 font-medium focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
              >
                <option value="all">Todos os status</option>
                {Object.entries(REQUIREMENT_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Requirements Table Card */}
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-100/70 dark:bg-[#131c31]">
                  <th className="py-4 px-6 w-28">ID</th>
                  <th className="py-4 px-6">Descrição</th>
                  <th className="py-4 px-6 w-24">Tipo</th>
                  <th className="py-4 px-6 w-32">Prioridade</th>
                  <th className="py-4 px-6 w-36">Status</th>
                  <th className="py-4 px-6 w-44">Responsável</th>
                  <th className="py-4 px-6 text-right w-24">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800 text-xs font-medium">
                {filteredRequirements.map((req) => (
                  <tr
                    key={req.id}
                    className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-4 px-6 font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap font-mono text-xs">
                      {req.code}
                    </td>
                    <td className="py-4 px-6 text-slate-800 dark:text-slate-200 max-w-md">
                      <div className="flex items-center gap-2">
                        {req.is_incomplete && (
                          <span
                            title="Requisito incompleto: faltam justificativa, fonte ou critérios de aceitação."
                            className="text-amber-500 shrink-0 inline-flex items-center"
                          >
                            <AlertTriangle className="w-4 h-4 fill-amber-500/20 text-amber-500" />
                          </span>
                        )}
                        <span className="leading-relaxed">{req.description}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <TypeBadge type={req.type} />
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <PriorityBadge priority={req.priority} />
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="py-4 px-6 text-slate-600 dark:text-slate-400 whitespace-nowrap font-medium">
                      {req.responsible_name}
                    </td>
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1 text-slate-400 dark:text-slate-500">
                        <button
                          onClick={() => handleOpenEditModal(req)}
                          title="Visualizar Detalhes"
                          className="p-1.5 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(req)}
                          title="Editar e Versionar"
                          className="p-1.5 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredRequirements.length === 0 && (
            <div className="py-14 text-center text-slate-500 dark:text-slate-400 text-xs">
              Nenhum requisito encontrado para os filtros selecionados.
            </div>
          )}
        </div>
      </div>

      {/* Modal de Criação / Edição de Requisito */}
      <RequirementModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        requirement={selectedRequirement}
        onSaveSuccess={handleSaveSuccess}
        userStories={userStories}
        stakeholders={stakeholders}
      />
    </>
  );
}
