"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, History, Send, AlertTriangle, Globe, FolderKanban, Check, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProject } from "@/components/layout/project-context";
import { usePermissions } from "@/components/layout/permissions-context";
import {
  PRIORITIES,
  PRIORITY_LABELS,
  REQUIREMENT_STATUSES,
  REQUIREMENT_STATUS_LABELS,
  REQUIREMENT_TYPES,
  normalizeRequirementStatus,
} from "@/lib/constants/statuses";
import {
  createRequirementAction,
  updateRequirementAction,
} from "@/app/actions/requirements";

const EMPTY_ARRAY = [];

export function RequirementModal({
  isOpen,
  onClose,
  requirement = null,
  onSaveSuccess,
  userStories = EMPTY_ARRAY,
  stakeholders = EMPTY_ARRAY,
  scope = "project", // 'project' | 'global'
}) {
  const { profile } = useAuth();
  const { activeProject } = useProject();
  const supabase = useMemo(() => createClient(), []);

  const isEditing = Boolean(requirement?.id);
  const requirementId = requirement?.id;
  const profileName = profile?.full_name;

  const [formData, setFormData] = useState({
    code: "REQ-001",
    title: "",
    type: REQUIREMENT_TYPES.RF,
    description: "",
    justification: "",
    priority: PRIORITIES.MEDIUM,
    status: REQUIREMENT_STATUSES.UNDER_REVIEW,
    source: "",
    acceptance_criteria: "",
    user_story_id: "",
    responsible_id: "",
  });

  const [versions, setVersions] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    if (requirement) {
      setFormData({
        code: requirement.code || "REQ-001",
        title: requirement.title || "",
        type: requirement.type || REQUIREMENT_TYPES.RF,
        description: requirement.description || "",
        justification: requirement.justification || "",
        priority: requirement.priority || PRIORITIES.MEDIUM,
        status: normalizeRequirementStatus(requirement.status),
        source: requirement.source || "",
        acceptance_criteria: requirement.acceptance_criteria || "",
        user_story_id: requirement.user_story_id || "",
        responsible_id: requirement.responsible_id || "",
      });

      // Carregar histórico de versões
      if (requirement.id) {
        supabase
          .from("requirement_versions")
          .select("*, profiles(full_name)")
          .eq("requirement_id", requirement.id)
          .order("version_number", { ascending: false })
          .then(({ data }) => {
            if (data && data.length > 0) {
              setVersions(
                data.map((v) => ({
                  version: `v${v.version_number}`,
                  author: v.profiles?.full_name || "Membro da equipe",
                  date: new Date(v.created_at).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                  comment: v.change_summary,
                }))
              );
            } else {
              setVersions([
                {
                  version: "v1",
                  author: requirement.responsible_name || "Membro da equipe",
                  date: "Criação inicial",
                  comment: "Criação inicial do requisito.",
                },
              ]);
            }
          });
      }
    } else {
      // Novo requisito
      const defaultPrefix = scope === "global" ? "RF-G" : "REQ-";
      setFormData({
        code: `${defaultPrefix}${Math.floor(100 + Math.random() * 900)}`,
        title: "",
        type: REQUIREMENT_TYPES.RF,
        description: "",
        justification: "",
        priority: PRIORITIES.MEDIUM,
        status: REQUIREMENT_STATUSES.UNDER_REVIEW,
        source: scope === "global" ? "Biblioteca Pessoal" : "",
        acceptance_criteria: "",
        user_story_id: userStories[0]?.id || "",
        responsible_id: stakeholders[0]?.id || "",
      });

      setVersions([
        {
          version: "v1",
          author: profileName || "Você",
          date: "Agora mesmo",
          comment:
            scope === "global"
              ? "Criação de requisito global na biblioteca pessoal."
              : "Criação inicial do requisito no projeto.",
        },
      ]);
    }
    setErrorMsg("");
  }, [isOpen, requirementId, scope]);

  if (!isOpen) return null;

  const handleSubmit = async (e, sendToApproval = false) => {
    e.preventDefault();
    setErrorMsg("");
    setIsSubmitting(true);

    try {
      const normalizedCode = formData.code.trim().toUpperCase();

      const finalStatus = sendToApproval
        ? REQUIREMENT_STATUSES.UNDER_REVIEW
        : formData.status;

      let res;
      if (isEditing) {
        res = await updateRequirementAction(requirement.id, {
          scope,
          code: normalizedCode,
          title: formData.title || formData.description.slice(0, 40) || "Sem título",
          description: formData.description,
          type: formData.type,
          priority: formData.priority,
          status: finalStatus,
          justification: formData.justification,
          source: formData.source,
          acceptanceCriteria: formData.acceptance_criteria,
          responsibleId: formData.responsible_id,
          versionComment: sendToApproval
            ? "Requisito enviado para aprovação."
            : "Atualização dos dados do requisito.",
        });
      } else {
        res = await createRequirementAction({
          scope,
          projectId: scope === "project" ? activeProject?.id : null,
          code: normalizedCode,
          title: formData.title || formData.description.slice(0, 40) || "Sem título",
          description: formData.description,
          type: formData.type,
          priority: formData.priority,
          status: finalStatus,
          justification: formData.justification,
          source: formData.source,
          acceptanceCriteria: formData.acceptance_criteria,
          responsibleId: formData.responsible_id,
          userStoryId: formData.user_story_id,
        });
      }

      if (!res.success) {
        setErrorMsg(res.error || "Ocorreu um erro ao salvar o requisito.");
        setIsSubmitting(false);
        return;
      }

      onSaveSuccess?.(res.data);
      onClose();
    } catch (err) {
      console.error("Erro inesperado ao salvar requisito:", err);
      setErrorMsg("Ocorreu um erro inesperado ao salvar o requisito. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center z-[100] p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8 animate-in zoom-in-95">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-[#0f172a]">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                scope === "global"
                  ? "bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400"
                  : "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"
              }`}
            >
              {scope === "global" ? (
                <Globe className="w-5 h-5" />
              ) : (
                <FolderKanban className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {isEditing
                    ? scope === "global"
                      ? "Editar Requisito Global"
                      : "Editar Requisito do Projeto"
                    : scope === "global"
                    ? "Novo Requisito Global (Biblioteca Pessoal)"
                    : "Novo Requisito do Projeto"}
                </h2>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    scope === "global"
                      ? "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300"
                      : "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300"
                  }`}
                >
                  {scope === "global" ? "Biblioteca" : "Projeto"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {scope === "global"
                  ? "Este requisito ficará salvo no seu repositório pessoal e poderá ser reutilizado em qualquer projeto."
                  : `Especificação e rastreabilidade para o projeto atual (${activeProject?.name || "Projeto"}).`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: 2 Columns */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form (8 cols) */}
          <form id="req-form" onSubmit={(e) => handleSubmit(e, false)} className="lg:col-span-8 space-y-4">
            {/* Banner de erro */}
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* ID & Tipo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                  Código / ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value.toUpperCase() })
                  }
                  placeholder={scope === "global" ? "Ex: RF-G01" : "Ex: REQ-001"}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-semibold text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                  Tipo
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value={REQUIREMENT_TYPES.RF}>RF — Requisito Funcional</option>
                  <option value={REQUIREMENT_TYPES.RNF}>RNF — Requisito Não-Funcional</option>
                </select>
              </div>
            </div>

            {/* Título Resumido */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                Título do Requisito
              </label>
              <input
                type="text"
                placeholder="Ex: Autenticação de Usuários com MFA"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Descrição Detalhada */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                Descrição <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                placeholder="O sistema deve permitir que..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Prioridade & Status (Status oculto quando scope === 'global') */}
            <div className={`grid grid-cols-1 ${scope === "project" ? "sm:grid-cols-2" : ""} gap-4`}>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                  Prioridade
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              {scope === "project" && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {Object.entries(REQUIREMENT_STATUS_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Justificativa */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                Justificativa
              </label>
              <textarea
                rows={2}
                placeholder="Por que este requisito é necessário?"
                value={formData.justification}
                onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Fonte */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                Fonte / Origem
              </label>
              <input
                type="text"
                placeholder={scope === "global" ? "Ex: Padrão arquitetural ou ISO/IEC 25010" : "Ex: Entrevista com stakeholder"}
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Critério de Aceitação */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                Critério de Aceitação
              </label>
              <textarea
                rows={2}
                placeholder="Condições para o requisito ser considerado atendido."
                value={formData.acceptance_criteria}
                onChange={(e) =>
                  setFormData({ ...formData, acceptance_criteria: e.target.value })
                }
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* User Story Vinculada & Stakeholder (apenas quando scope === 'project') */}
            {scope === "project" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                    User Story vinculada
                  </label>
                  <select
                    value={formData.user_story_id}
                    onChange={(e) =>
                      setFormData({ ...formData, user_story_id: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="">Nenhuma vinculada</option>
                    {userStories.map((us) => (
                      <option key={us.id} value={us.id}>
                        {us.code} — {us.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                    Stakeholder responsável
                  </label>
                  <select
                    value={formData.responsible_id}
                    onChange={(e) =>
                      setFormData({ ...formData, responsible_id: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="">Selecione o responsável</option>
                    {stakeholders.map((stk) => (
                      <option key={stk.id} value={stk.id}>
                        {stk.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </form>

          {/* Right Column: Version History Timeline (4 cols) */}
          <div className="lg:col-span-4 bg-slate-50/80 dark:bg-slate-950/60 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <History className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Histórico de Versões
              </h3>
            </div>

            <div className="space-y-4 relative before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-blue-200/60 dark:before:bg-blue-900/60">
              {versions.map((ver, idx) => (
                <div key={idx} className="relative pl-8">
                  <span className="absolute left-1 top-0.5 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold ring-4 ring-white dark:ring-slate-900">
                    {ver.version.replace("v", "")}
                  </span>
                  <div>
                    <span className="text-xs font-bold text-blue-700 dark:text-blue-400 block">
                      {ver.version}
                    </span>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-tight mt-0.5">
                      {ver.author} • {ver.date}
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-snug">
                      {ver.comment}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-2">
            {scope === "project" && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={(e) => handleSubmit(e, true)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Enviar para Aprovação</span>
              </button>
            )}

            <button
              type="submit"
              form="req-form"
              disabled={isSubmitting}
              className={`px-5 py-2 text-xs font-semibold text-white rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 ${
                scope === "global"
                  ? "bg-purple-600 hover:bg-purple-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {isSubmitting
                ? "Salvando..."
                : isEditing
                ? "Salvar Alterações"
                : scope === "global"
                ? "Salvar na Biblioteca"
                : "Cadastrar Requisito"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return mounted ? createPortal(modalContent, document.body) : null;
}
