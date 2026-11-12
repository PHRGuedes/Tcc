"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  SlidersHorizontal,
  Users,
  Check,
  Loader2,
  AlertTriangle,
  UserPlus,
  Trash2,
  Shield,
  Code2,
  Copy,
} from "lucide-react";
import { useProject } from "@/components/layout/project-context";
import {
  getProjectMembersAction,
  getAvailableProfilesAction,
  addProjectMemberAction,
  updateProjectMemberRoleAction,
  removeProjectMemberAction,
} from "@/app/actions/projects";
import { getInitials } from "@/lib/utils/formatters";

// Apenas os dois perfis solicitados nesta fase
export const ALLOWED_PROJECT_ROLES = [
  {
    id: "admin",
    label: "Administrador",
    description: "Acesso total à gestão de requisitos, sprints e membros do projeto.",
    icon: Shield,
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    id: "developer",
    label: "Desenvolvedor",
    description: "Implementação, movimentação no backlog e visualização dos requisitos.",
    icon: Code2,
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
];

export function ManageProjectModal({ isOpen, onClose }) {
  const { activeProject, updateProject } = useProject();

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("general"); // "general" | "stakeholders"

  useEffect(() => {
    setMounted(true);
  }, []);

  // Estado da aba Geral - inicializado diretamente a partir do activeProject
  const [projectName, setProjectName] = useState(activeProject?.name || "");
  const [projectDesc, setProjectDesc] = useState(activeProject?.description || "");
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);
  const [generalError, setGeneralError] = useState("");
  const [generalSuccess, setGeneralSuccess] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Estado da aba Stakeholders
  const [members, setMembers] = useState([]);
  const [availableProfiles, setAvailableProfiles] = useState([]);
  const [creatorId, setCreatorId] = useState(activeProject?.created_by || null);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [selectedRole, setSelectedRole] = useState("developer");
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [stakeholderError, setStakeholderError] = useState("");
  const [stakeholderSuccess, setStakeholderSuccess] = useState("");
  const [actionInProgressId, setActionInProgressId] = useState(null);

  // Carrega membros e perfis de forma assíncrona desacoplada do ciclo síncrono do effect
  useEffect(() => {
    let ignore = false;
    if (!isOpen || activeTab !== "stakeholders" || !activeProject?.id) return;

    Promise.resolve().then(async () => {
      if (ignore) return;
      setIsLoadingMembers(true);
      setStakeholderError("");

      try {
        const [membersRes, profilesRes] = await Promise.all([
          getProjectMembersAction(activeProject.id),
          getAvailableProfilesAction(),
        ]);

        if (!ignore) {
          if (membersRes.success) {
            setMembers(membersRes.data);
            if (membersRes.projectCreatorId) {
              setCreatorId(membersRes.projectCreatorId);
            }
          } else {
            setStakeholderError(membersRes.error || "Não foi possível carregar os membros.");
          }

          if (profilesRes.success) {
            setAvailableProfiles(profilesRes.data);
          }
        }
      } catch (err) {
        if (!ignore) {
          console.error("Erro ao carregar dados de stakeholders:", err);
          setStakeholderError("Falha na comunicação com o servidor.");
        }
      } finally {
        if (!ignore) setIsLoadingMembers(false);
      }
    });

    return () => {
      ignore = true;
    };
  }, [isOpen, activeTab, activeProject?.id]);

  if (!isOpen) return null;

  // Handler para salvar informações gerais do projeto
  const handleSaveGeneral = async (e) => {
    e.preventDefault();
    if (!projectName.trim()) {
      setGeneralError("O nome do projeto é obrigatório.");
      return;
    }

    setIsSavingGeneral(true);
    setGeneralError("");
    setGeneralSuccess(false);

    try {
      await updateProject({
        id: activeProject.id,
        name: projectName.trim(),
        description: projectDesc.trim(),
      });
      setGeneralSuccess(true);
      setTimeout(() => setGeneralSuccess(false), 3000);
    } catch (err) {
      console.error("Erro ao atualizar projeto:", err);
      setGeneralError(err.message || "Não foi possível salvar as alterações do projeto.");
    } finally {
      setIsSavingGeneral(false);
    }
  };

  // Handler para copiar o UUID do projeto
  const handleCopyId = () => {
    if (activeProject?.id) {
      navigator.clipboard.writeText(activeProject.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  // Handler para adicionar novo stakeholder
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!selectedProfileId) {
      setStakeholderError("Selecione um usuário para vincular ao projeto.");
      return;
    }

    setIsAddingMember(true);
    setStakeholderError("");
    setStakeholderSuccess("");

    try {
      const res = await addProjectMemberAction({
        projectId: activeProject.id,
        userId: selectedProfileId,
        roleInProject: selectedRole,
      });

      if (!res.success) {
        setStakeholderError(res.error || "Falha ao adicionar stakeholder.");
        return;
      }

      setMembers((prev) => [...prev, res.data]);
      setSelectedProfileId("");
      setSelectedRole("developer");
      setStakeholderSuccess("Stakeholder adicionado com sucesso!");
      setTimeout(() => setStakeholderSuccess(""), 3000);
    } catch (err) {
      console.error("Erro ao adicionar stakeholder:", err);
      setStakeholderError("Erro inesperado ao adicionar o usuário.");
    } finally {
      setIsAddingMember(false);
    }
  };

  // Handler para alterar a função (role) de um stakeholder
  const handleRoleChange = async (memberId, newRole) => {
    setActionInProgressId(memberId);
    setStakeholderError("");

    try {
      const res = await updateProjectMemberRoleAction({
        memberId,
        roleInProject: newRole,
        projectId: activeProject.id,
      });

      if (!res.success) {
        setStakeholderError(res.error || "Não foi possível alterar a função.");
        return;
      }

      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role_in_project: newRole } : m))
      );
    } catch (err) {
      console.error("Erro ao atualizar função:", err);
      setStakeholderError("Erro ao alterar o perfil do membro.");
    } finally {
      setActionInProgressId(null);
    }
  };

  // Handler para remover stakeholder
  const handleRemoveMember = async (member) => {
    const memberName = member.profiles?.full_name || "este membro";
    if (!window.confirm(`Tem certeza que deseja remover ${memberName} deste projeto?`)) {
      return;
    }

    setActionInProgressId(member.id);
    setStakeholderError("");

    try {
      const res = await removeProjectMemberAction({
        memberId: member.id,
        projectId: activeProject.id,
      });

      if (!res.success) {
        setStakeholderError(res.error || "Falha ao remover stakeholder.");
        return;
      }

      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      setStakeholderSuccess("Stakeholder removido do projeto.");
      setTimeout(() => setStakeholderSuccess(""), 3000);
    } catch (err) {
      console.error("Erro ao remover stakeholder:", err);
      setStakeholderError("Erro ao remover o membro do projeto.");
    } finally {
      setActionInProgressId(null);
    }
  };

  // Usuários disponíveis que ainda NÃO são membros do projeto atual
  const unassignedProfiles = availableProfiles.filter(
    (profile) => !members.some((m) => m.user_id === profile.id)
  );

  const modalContent = (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center z-[100] p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8 flex flex-col text-slate-900 dark:text-slate-100">
        {/* Header do Modal */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-[#0f172a]">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Gerenciar Projeto</h2>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {activeProject?.name || "Projeto"}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Configure as informações gerais e controle os stakeholders com acesso ao projeto.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Segmented Control de Abas */}
        <div className="px-6 pt-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === "general"
                ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-[#0f172a] rounded-t-lg shadow-2xs"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 rounded-t-lg"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Dados Gerais</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("stakeholders")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === "stakeholders"
                ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-[#0f172a] rounded-t-lg shadow-2xs"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 rounded-t-lg"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Stakeholders do Projeto</span>
            {members.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
                {members.length}
              </span>
            )}
          </button>
        </div>

        {/* Conteúdo da Aba */}
        <div className="p-6">
          {/* ======================================================== */}
          {/* ABA 1: DADOS GERAIS                                      */}
          {/* ======================================================== */}
          {activeTab === "general" && (
            <form onSubmit={handleSaveGeneral} className="space-y-5">
              {generalError && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 text-xs font-medium flex items-start gap-2 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{generalError}</span>
                </div>
              )}

              {generalSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-medium flex items-center gap-2 animate-in fade-in">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>Informações do projeto atualizadas com sucesso!</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nome do Projeto <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Ex: Sistema de Gestão Acadêmica"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#131c31] transition-all shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Descrição do Projeto
                </label>
                <textarea
                  rows={3}
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  placeholder="Descreva o escopo, objetivos ou contexto deste projeto..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#131c31] resize-none transition-all shadow-2xs"
                />
              </div>

              {/* Informações de identificação técnica */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-medium">Identificador Único (UUID):</span>
                  <div className="flex items-center gap-1.5">
                    <code className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded font-mono text-[11px] border border-slate-200 dark:border-slate-700">
                      {activeProject?.id || "--"}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyId}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded transition-colors cursor-pointer"
                      title="Copiar UUID"
                    >
                      {copiedId ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Ações da aba Geral */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  disabled={isSavingGeneral}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs flex items-center gap-2 transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {isSavingGeneral ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Salvar Alterações</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ======================================================== */}
          {/* ABA 2: STAKEHOLDERS DO PROJETO                           */}
          {/* ======================================================== */}
          {activeTab === "stakeholders" && (
            <div className="space-y-6">
              {/* Notificação de Sucesso ou Erro */}
              {stakeholderError && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 text-xs font-medium flex items-start gap-2 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{stakeholderError}</span>
                </div>
              )}

              {stakeholderSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-medium flex items-center gap-2 animate-in fade-in">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{stakeholderSuccess}</span>
                </div>
              )}

              {/* Box explicativo das permissões iniciais (Admin e Desenvolvedor) */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">Controle de Perfis no Projeto:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-white dark:bg-[#131c31] border border-slate-200 dark:border-slate-800">
                    <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block text-[11px]">Administrador (adm)</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Gestão integral de requisitos, sprints e membros do projeto.
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-white dark:bg-[#131c31] border border-slate-200 dark:border-slate-800">
                    <Code2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block text-[11px]">Desenvolvedor</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Implementação, movimentação de status no backlog e consulta.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Formulário: Vincular Novo Stakeholder */}
              <form
                onSubmit={handleAddMember}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 space-y-3"
              >
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Adicionar Stakeholder ao Projeto</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  {/* Selecionar Usuário */}
                  <div className="sm:col-span-6">
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Usuário do Sistema
                    </label>
                    <select
                      value={selectedProfileId}
                      onChange={(e) => setSelectedProfileId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 bg-white dark:bg-[#131c31] focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                    >
                      <option value="">Selecione um usuário...</option>
                      {unassignedProfiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.full_name} ({p.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Selecionar Função / Perfil (Apenas adm ou desenvolvedor) */}
                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Perfil no Projeto
                    </label>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 bg-white dark:bg-[#131c31] focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                    >
                      {ALLOWED_PROJECT_ROLES.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Botão Adicionar */}
                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      disabled={isAddingMember || !selectedProfileId}
                      className="w-full py-2 px-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      {isAddingMember ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Adicionar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>

              {/* Lista dos Stakeholders Atuais do Projeto */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Stakeholders Vinculados ({members.length})
                  </h4>
                  {isLoadingMembers && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                      <span>Atualizando...</span>
                    </div>
                  )}
                </div>

                {isLoadingMembers && members.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    <span>Carregando stakeholders do projeto...</span>
                  </div>
                ) : members.length === 0 ? (
                  <div className="py-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-400 dark:text-slate-500">
                    Nenhum stakeholder vinculado a este projeto. Utilize o formulário acima para adicionar.
                  </div>
                ) : (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden bg-white dark:bg-[#0f172a] shadow-2xs">
                    {members.map((member) => {
                      const profile = member.profiles || {};
                      const isActing = actionInProgressId === member.id;
                      const isCreator =
                        member.user_id === (creatorId || activeProject?.created_by);
                      const roleConfig =
                        ALLOWED_PROJECT_ROLES.find((r) => r.id === member.role_in_project) || {
                          id: member.role_in_project,
                          label:
                            member.role_in_project === "admin"
                              ? "Administrador"
                              : "Desenvolvedor",
                          badgeClass:
                            member.role_in_project === "admin"
                              ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/50"
                              : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50",
                        };

                      return (
                        <div
                          key={member.id}
                          className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          {/* Info do Usuário */}
                          <div className="flex items-center gap-3">
                            {profile.avatar_url ? (
                              <img
                                src={profile.avatar_url}
                                alt={profile.full_name || "Membro"}
                                className="w-9 h-9 rounded-full object-cover border border-slate-300 dark:border-slate-700 shadow-2xs shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-[#13233f] text-white flex items-center justify-center font-bold text-xs tracking-wider shadow-2xs shrink-0 border border-slate-700">
                                {getInitials(profile.full_name)}
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                                  {profile.full_name || "Membro da Equipe"}
                                </span>
                                {isCreator ? (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold border bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/50">
                                    Criador • Administrador
                                  </span>
                                ) : (
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${roleConfig.badgeClass}`}
                                  >
                                    {roleConfig.label}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-none">
                                {profile.email || "Sem e-mail cadastrado"}
                              </span>
                            </div>
                          </div>

                          {/* Controles: Alterar Perfil & Remover */}
                          <div className="flex items-center gap-2 self-end sm:self-center">
                            {/* Seletor Rápido de Perfil */}
                            <select
                              disabled={isActing || isCreator}
                              value={
                                member.role_in_project === "admin"
                                  ? "admin"
                                  : "developer"
                              }
                              onChange={(e) => handleRoleChange(member.id, e.target.value)}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-[#131c31] hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs transition-all cursor-pointer disabled:opacity-60 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                              title={
                                isCreator
                                  ? "O criador do projeto deve permanecer como Administrador"
                                  : "Alterar perfil do stakeholder no projeto"
                              }
                            >
                              <option value="admin">Administrador</option>
                              <option value="developer">Desenvolvedor</option>
                            </select>

                            {/* Botão Remover (Desabilitado para o criador do projeto) */}
                            {!isCreator && (
                              <button
                                type="button"
                                disabled={isActing}
                                onClick={() => handleRemoveMember(member)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                title="Remover stakeholder do projeto"
                              >
                                {isActing ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Botão de Fechar no rodapé */}
              <div className="pt-4 flex items-center justify-end border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors cursor-pointer"
                >
                  Concluir
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (mounted && typeof document !== "undefined") {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
}
