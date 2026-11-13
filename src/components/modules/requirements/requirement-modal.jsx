"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  X,
  History,
  Send,
  AlertTriangle,
  Globe,
  FolderKanban,
  Check,
  MessageSquare,
  GitBranch,
  RotateCcw,
  Plus,
  Trash2,
  Loader2,
  Sparkles,
  Eye,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProject } from "@/components/layout/project-context";
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
  getRequirementCommentsAction,
  addRequirementCommentAction,
  getRequirementDependenciesAction,
  addRequirementDependencyAction,
  removeRequirementDependencyAction,
} from "@/app/actions/requirements";

const EMPTY_ARRAY = [];

const DEPENDENCY_TYPE_LABELS = {
  depends_on: "Depende de",
  complements: "Complementa",
  refines: "Refina",
  conflict: "Conflita com",
};

const DEPENDENCY_TYPE_COLORS = {
  depends_on:
    "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/60",
  complements:
    "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60",
  refines:
    "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800/60",
  conflict:
    "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/60",
};

export function RequirementModal({
  isOpen,
  onClose,
  requirement = null,
  onSaveSuccess,
  userStories = EMPTY_ARRAY,
  stakeholders = EMPTY_ARRAY,
  existingRequirements = EMPTY_ARRAY,
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

  // Abas do painel lateral direito: 'versions' | 'comments' | 'dependencies'
  const [rightTab, setRightTab] = useState("versions");

  // Estado de Versões (RF.22, RF.23, RF.44)
  const [versions, setVersions] = useState([]);
  const [selectedVersionForDiff, setSelectedVersionForDiff] = useState(null);
  const [restoredNotice, setRestoredNotice] = useState("");

  // Estado de Comentários e Decisões (RF.24)
  const [comments, setComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [newCommentType, setNewCommentType] = useState("comment"); // 'comment' | 'decision'
  const [isSavingComment, setIsSavingComment] = useState(false);

  // Estado de Dependências e Análise de Impacto (RF.20, RF.21)
  const [dependencies, setDependencies] = useState([]);
  const [impactedStories, setImpactedStories] = useState([]);
  const [targetDepReqId, setTargetDepReqId] = useState("");
  const [depType, setDepType] = useState("depends_on");
  const [isAddingDep, setIsAddingDep] = useState(false);
  const [depError, setDepError] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    setSelectedVersionForDiff(null);
    setRestoredNotice("");
    setRightTab("versions");
    setDepError("");

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

      if (requirement.id) {
        // 1. Carregar User Story vinculada
        supabase
          .from("requirement_user_stories")
          .select("user_story_id")
          .eq("requirement_id", requirement.id)
          .limit(1)
          .maybeSingle()
          .then(({ data: linkRow }) => {
            if (linkRow?.user_story_id) {
              setFormData((prev) => ({ ...prev, user_story_id: linkRow.user_story_id }));
            }
          });

        // 2. Carregar histórico de versões com snapshot para comparação (RF.22, RF.23)
        supabase
          .from("requirement_versions")
          .select("*, profiles(full_name)")
          .eq("requirement_id", requirement.id)
          .order("version_number", { ascending: false })
          .then(({ data }) => {
            if (data && data.length > 0) {
              setVersions(
                data.map((v) => ({
                  id: v.id,
                  versionNumber: v.version_number,
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
                  snapshot: v.snapshot || null,
                }))
              );
            } else {
              setVersions([
                {
                  id: "v1-default",
                  versionNumber: 1,
                  version: "v1",
                  author: requirement.responsible_name || "Membro da equipe",
                  date: "Criação inicial",
                  comment: "Criação inicial do requisito.",
                  snapshot: {
                    title: requirement.title,
                    description: requirement.description,
                    priority: requirement.priority,
                    status: requirement.status,
                    justification: requirement.justification,
                    source: requirement.source,
                    acceptance_criteria: requirement.acceptance_criteria,
                  },
                },
              ]);
            }
          });

        // 3. Carregar comentários e decisões (RF.24)
        getRequirementCommentsAction(requirement.id).then((res) => {
          if (res.success) {
            setComments(res.data || []);
          }
        });

        // 4. Carregar dependências e análise de impacto (RF.20, RF.21)
        getRequirementDependenciesAction(requirement.id).then((res) => {
          if (res.success) {
            setDependencies(res.dependencies || []);
            setImpactedStories(res.impactedStories || []);
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
          id: "v1-new",
          versionNumber: 1,
          version: "v1",
          author: profileName || "Você",
          date: "Agora mesmo",
          comment:
            scope === "global"
              ? "Criação de requisito global na biblioteca pessoal."
              : "Criação inicial do requisito no projeto.",
          snapshot: null,
        },
      ]);
      setComments([]);
      setDependencies([]);
      setImpactedStories([]);
    }
    setErrorMsg("");
  }, [isOpen, requirementId, scope]);

  // RF.43 — Detecção automática de requisitos semelhantes para evitar duplicidades
  const similarRequirements = useMemo(() => {
    const queryText = `${formData.title || ""} ${formData.description || ""}`.trim().toLowerCase();
    if (queryText.length < 10 || !existingRequirements || existingRequirements.length === 0) {
      return [];
    }

    const stopWords = new Set([
      "para",
      "como",
      "deve",
      "sistema",
      "permitir",
      "usuario",
      "usuário",
      "dados",
      "pelo",
      "pela",
      "com",
      "que",
      "uma",
      "dos",
      "das",
      "nos",
      "nas",
      "por",
      "mais",
    ]);

    const tokens = queryText
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 4 && !stopWords.has(w));

    if (tokens.length === 0) return [];

    return existingRequirements
      .filter((r) => r.id !== requirementId)
      .map((r) => {
        const targetText = `${r.title || ""} ${r.description || ""}`
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");

        const matchedTokens = tokens.filter((t) => targetText.includes(t));
        const ratio = matchedTokens.length / tokens.length;

        const titleDirectMatch =
          formData.title?.trim().length >= 6 &&
          r.title?.toLowerCase().includes(formData.title.trim().toLowerCase());

        return {
          req: r,
          score: titleDirectMatch ? 1 : ratio,
          matchedCount: matchedTokens.length,
        };
      })
      .filter((item) => item.score >= 0.55 && item.matchedCount >= 2)
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map((item) => item.req);
  }, [formData.title, formData.description, existingRequirements, requirementId]);

  if (!isOpen) return null;

  // RF.23 — Restaurar versão anterior para o formulário
  const handleRestoreVersion = (ver) => {
    if (!ver?.snapshot) return;
    const snap = ver.snapshot;
    setFormData((prev) => ({
      ...prev,
      title: snap.title ?? prev.title,
      description: snap.description ?? prev.description,
      type: snap.type ?? prev.type,
      priority: snap.priority ?? prev.priority,
      status: snap.status ? normalizeRequirementStatus(snap.status) : prev.status,
      justification: snap.justification ?? prev.justification,
      source: snap.source ?? prev.source,
      acceptance_criteria: snap.acceptance_criteria ?? prev.acceptance_criteria,
    }));
    setRestoredNotice(`Dados da versão ${ver.version} carregados no formulário. Clique em "Salvar Alterações" para efetivar.`);
    setSelectedVersionForDiff(null);
    setTimeout(() => setRestoredNotice(""), 5000);
  };

  // RF.24 — Adicionar comentário ou decisão ao requisito
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim() || !requirementId) return;

    setIsSavingComment(true);
    try {
      const res = await addRequirementCommentAction({
        requirementId,
        requirementCode: formData.code,
        projectId: scope === "project" ? activeProject?.id : null,
        content: newCommentText.trim(),
        commentType: newCommentType,
      });

      if (res.success && res.data) {
        setComments((prev) => [res.data, ...prev]);
        setNewCommentText("");
      }
    } finally {
      setIsSavingComment(false);
    }
  };

  // RF.20 — Adicionar dependência entre requisitos
  const handleAddDependency = async (e) => {
    e.preventDefault();
    if (!targetDepReqId || !requirementId) return;

    setIsAddingDep(true);
    setDepError("");
    try {
      const res = await addRequirementDependencyAction({
        projectId: activeProject?.id,
        sourceReqId: requirementId,
        targetReqId: targetDepReqId,
        dependencyType: depType,
      });

      if (!res.success) {
        setDepError(res.error || "Não foi possível vincular dependência.");
        return;
      }

      if (res.data) {
        setDependencies((prev) => [...prev, res.data]);
        setTargetDepReqId("");
      }
    } finally {
      setIsAddingDep(false);
    }
  };

  // RF.20 — Remover dependência
  const handleRemoveDependency = async (depId) => {
    const res = await removeRequirementDependencyAction({ dependencyId: depId });
    if (res.success) {
      setDependencies((prev) => prev.filter((d) => d.id !== depId));
    }
  };

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
          userStoryId: formData.user_story_id,
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

  const availableOtherRequirements = existingRequirements.filter(
    (r) => r.id !== requirementId
  );

  const modalContent = (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center z-[100] p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8 animate-in zoom-in-95">
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
                  : `Especificação, versionamento, decisões e análise de impacto para o projeto (${activeProject?.name || "Projeto"}).`}
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
          {/* Left Column: Form (7 cols) */}
          <form
            id="req-form"
            onSubmit={(e) => handleSubmit(e, false)}
            className="lg:col-span-7 space-y-4"
          >
            {/* Banner de erro */}
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Notificação de Versão Restaurada (RF.23) */}
            {restoredNotice && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{restoredNotice}</span>
              </div>
            )}

            {/* RF.21 — Painel Automático de Análise de Impacto ao Editar */}
            {isEditing &&
              scope === "project" &&
              (dependencies.length > 0 || impactedStories.length > 0) && (
                <div className="p-3.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      Análise de Impacto (RF.21): Artefatos Afetados por Alterações
                    </span>
                    <button
                      type="button"
                      onClick={() => setRightTab("dependencies")}
                      className="text-[11px] font-bold underline hover:text-amber-950 dark:hover:text-amber-200 cursor-pointer"
                    >
                      Ver detalhes →
                    </button>
                  </div>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300/90 leading-relaxed">
                    Alterar este requisito impactará diretamente{" "}
                    {dependencies.length > 0 && (
                      <strong>
                        {dependencies.length} requisito(s) dependente(s) (
                        {dependencies.map((d) => d.relatedReq?.code).join(", ")})
                      </strong>
                    )}
                    {dependencies.length > 0 && impactedStories.length > 0 && " e "}
                    {impactedStories.length > 0 && (
                      <strong>
                        {impactedStories.length} User Story(ies) (
                        {impactedStories.map((s) => s.code).join(", ")})
                      </strong>
                    )}
                    . Revise a consistência após salvar.
                  </p>
                </div>
              )}

            {/* RF.43 — Alerta de Requisitos Semelhantes (Prevenção de Duplicidade) */}
            {similarRequirements.length > 0 && (
              <div className="p-3.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 text-blue-800 dark:text-blue-300 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>Possível Duplicidade Detectada (RF.43 — Requisitos Semelhantes):</span>
                </div>
                <div className="space-y-1 pl-5">
                  {similarRequirements.map((sim) => (
                    <div key={sim.id} className="text-[11px] leading-snug">
                      • <strong className="font-mono">[{sim.code}]</strong>{" "}
                      <span className="font-semibold">{sim.title}</span>:{" "}
                      <span className="text-slate-600 dark:text-slate-400">
                        {(sim.description || "").slice(0, 90)}...
                      </span>
                    </div>
                  ))}
                </div>
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

            {/* Prioridade & Status */}
            <div
              className={`grid grid-cols-1 ${
                scope === "project" ? "sm:grid-cols-2" : ""
              } gap-4`}
            >
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
                onChange={(e) =>
                  setFormData({ ...formData, justification: e.target.value })
                }
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
                placeholder={
                  scope === "global"
                    ? "Ex: Padrão arquitetural ou ISO/IEC 25010"
                    : "Ex: Entrevista com stakeholder"
                }
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

            {/* User Story Vinculada & Stakeholder */}
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

          {/* Right Column: Interactive Collaboration, Versioning & Impact Hub (5 cols) */}
          <div className="lg:col-span-5 bg-slate-50/80 dark:bg-slate-950/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 flex flex-col max-h-[640px]">
            {/* Segmented Tabs Header */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-200/70 dark:bg-slate-900 rounded-xl mb-4 shrink-0">
              <button
                type="button"
                onClick={() => setRightTab("versions")}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  rightTab === "versions"
                    ? "bg-white dark:bg-[#0f172a] text-blue-600 dark:text-blue-400 shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <History className="w-3.5 h-3.5 shrink-0" />
                <span>Versões ({versions.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setRightTab("comments")}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  rightTab === "comments"
                    ? "bg-white dark:bg-[#0f172a] text-blue-600 dark:text-blue-400 shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                <span>Decisões ({comments.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setRightTab("dependencies")}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  rightTab === "dependencies"
                    ? "bg-white dark:bg-[#0f172a] text-blue-600 dark:text-blue-400 shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <GitBranch className="w-3.5 h-3.5 shrink-0" />
                <span>Impacto ({dependencies.length})</span>
              </button>
            </div>

            {/* ============================================================== */}
            {/* ABA 1: HISTÓRICO DE VERSÕES & COMPARAÇÃO (RF.22, RF.23, RF.44) */}
            {/* ============================================================== */}
            {rightTab === "versions" && (
              <div className="flex-1 overflow-y-auto pr-1 space-y-4">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Acompanhe a evolução do requisito. Clique em uma versão anterior para comparar os campos ou restaurá-la.
                </p>

                {/* Comparador de Versão Selecionada (RF.23) */}
                {selectedVersionForDiff && selectedVersionForDiff.snapshot && (
                  <div className="p-3.5 rounded-xl bg-white dark:bg-[#0f172a] border border-blue-200 dark:border-blue-800/80 shadow-xs space-y-2.5 animate-in fade-in">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                      <div>
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                          Inspeção da Versão {selectedVersionForDiff.version}
                        </span>
                        <p className="text-[10px] text-slate-400">
                          {selectedVersionForDiff.author} • {selectedVersionForDiff.date}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedVersionForDiff(null)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-2 text-[11px]">
                      <div>
                        <span className="font-bold text-slate-500 dark:text-slate-400 block">
                          Título na {selectedVersionForDiff.version}:
                        </span>
                        <span className="text-slate-800 dark:text-slate-200">
                          {selectedVersionForDiff.snapshot.title || "—"}
                        </span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-500 dark:text-slate-400 block">
                          Descrição na {selectedVersionForDiff.version}:
                        </span>
                        <p className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-200/70 dark:border-slate-800">
                          {selectedVersionForDiff.snapshot.description || "—"}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="font-bold text-slate-500 dark:text-slate-400 block">
                            Prioridade:
                          </span>
                          <span className="text-slate-800 dark:text-slate-200">
                            {PRIORITY_LABELS[selectedVersionForDiff.snapshot.priority] ||
                              selectedVersionForDiff.snapshot.priority ||
                              "—"}
                          </span>
                        </div>
                        <div>
                          <span className="font-bold text-slate-500 dark:text-slate-400 block">
                            Fonte:
                          </span>
                          <span className="text-slate-800 dark:text-slate-200">
                            {selectedVersionForDiff.snapshot.source || "—"}
                          </span>
                        </div>
                      </div>
                      {selectedVersionForDiff.snapshot.acceptance_criteria && (
                        <div>
                          <span className="font-bold text-slate-500 dark:text-slate-400 block">
                            Critério de Aceitação:
                          </span>
                          <span className="text-slate-700 dark:text-slate-300">
                            {selectedVersionForDiff.snapshot.acceptance_criteria}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleRestoreVersion(selectedVersionForDiff)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restaurar esta Versão no Formulário</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Linha do Tempo Vertical */}
                <div className="space-y-4 relative before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-blue-200/60 dark:before:bg-blue-900/60">
                  {versions.map((ver, idx) => {
                    const isSelected = selectedVersionForDiff?.version === ver.version;
                    return (
                      <div key={ver.id || idx} className="relative pl-8">
                        <span className="absolute left-1 top-0.5 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold ring-4 ring-white dark:ring-slate-900">
                          {ver.version.replace("v", "")}
                        </span>
                        <div
                          onClick={() =>
                            ver.snapshot &&
                            setSelectedVersionForDiff(isSelected ? null : ver)
                          }
                          className={`p-2.5 rounded-xl border transition-all ${
                            ver.snapshot ? "cursor-pointer" : ""
                          } ${
                            isSelected
                              ? "bg-blue-50/70 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700"
                              : "bg-white dark:bg-[#0f172a] border-slate-200/80 dark:border-slate-800 hover:border-blue-200 dark:hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-blue-700 dark:text-blue-400">
                              {ver.version}
                            </span>
                            {ver.snapshot && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400">
                                <Eye className="w-3 h-3" />
                                {isSelected ? "Ocultar" : "Comparar"}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-tight mt-0.5">
                            {ver.author} • {ver.date}
                          </div>
                          <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-snug">
                            {ver.comment}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* ABA 2: COMENTÁRIOS E DECISÕES VINCULADAS (RF.24)               */}
            {/* ============================================================== */}
            {rightTab === "comments" && (
              <div className="flex-1 flex flex-col min-h-0">
                {!isEditing ? (
                  <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-slate-800">
                    Salve o requisito primeiro para registrar comentários ou decisões da equipe.
                  </div>
                ) : (
                  <>
                    {/* Form de Novo Comentário / Decisão */}
                    <div className="mb-3 space-y-2 shrink-0 bg-white dark:bg-[#0f172a] p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          Novo Registro (RF.24)
                        </span>
                        <select
                          value={newCommentType}
                          onChange={(e) => setNewCommentType(e.target.value)}
                          className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-[11px] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                        >
                          <option value="comment">💬 Comentário Técnico</option>
                          <option value="decision">⚖️ Decisão de Requisito</option>
                        </select>
                      </div>

                      <textarea
                        rows={2}
                        placeholder={
                          newCommentType === "decision"
                            ? "Registre uma decisão de escopo ou aprovação sobre este requisito..."
                            : "Adicione uma observação ou dúvida sobre este requisito..."
                        }
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />

                      <div className="flex justify-end">
                        <button
                          type="button"
                          disabled={isSavingComment || !newCommentText.trim()}
                          onClick={handleAddComment}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {isSavingComment ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Plus className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {newCommentType === "decision"
                              ? "Registrar Decisão"
                              : "Publicar Comentário"}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Lista de Comentários / Decisões */}
                    <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                      {comments.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400 dark:text-slate-500">
                          Nenhum comentário ou decisão registrada neste requisito ainda.
                        </div>
                      ) : (
                        comments.map((c) => (
                          <div
                            key={c.id}
                            className={`p-3 rounded-xl border text-xs space-y-1 ${
                              c.commentType === "decision"
                                ? "bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60"
                                : "bg-white dark:bg-[#0f172a] border-slate-200 dark:border-slate-800"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-slate-900 dark:text-white">
                                {c.author}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  c.commentType === "decision"
                                    ? "bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                                }`}
                              >
                                {c.commentType === "decision" ? "Decisão" : "Comentário"}
                              </span>
                            </div>
                            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                              {c.content}
                            </p>
                            <span className="block text-[10px] text-slate-400">
                              {new Date(c.createdAt).toLocaleString("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ============================================================== */}
            {/* ABA 3: DEPENDÊNCIAS E ANÁLISE DE IMPACTO (RF.20, RF.21)        */}
            {/* ============================================================== */}
            {rightTab === "dependencies" && (
              <div className="flex-1 flex flex-col min-h-0 space-y-3 overflow-y-auto pr-1">
                {!isEditing || scope !== "project" ? (
                  <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-slate-800">
                    Salve o requisito no projeto para gerenciar dependências e visualizar a análise de impacto.
                  </div>
                ) : (
                  <>
                    {/* Adicionar Nova Dependência (RF.20) */}
                    <div className="bg-white dark:bg-[#0f172a] p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5 shrink-0">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                        Vincular Dependência entre Requisitos (RF.20)
                      </span>

                      {depError && (
                        <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                          {depError}
                        </p>
                      )}

                      <div className="grid grid-cols-1 gap-2">
                        <select
                          value={depType}
                          onChange={(e) => setDepType(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 cursor-pointer"
                        >
                          <option value="depends_on">Depende de (depends_on)</option>
                          <option value="complements">Complementa (complements)</option>
                          <option value="refines">Refina / Detalha (refines)</option>
                          <option value="conflict">Conflita com (conflict)</option>
                        </select>

                        <select
                          value={targetDepReqId}
                          onChange={(e) => setTargetDepReqId(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 cursor-pointer"
                        >
                          <option value="">Selecione o requisito relacionado...</option>
                          {availableOtherRequirements.map((r) => (
                            <option key={r.id} value={r.id}>
                              [{r.code}] {r.title || (r.description || "").slice(0, 35)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          disabled={isAddingDep || !targetDepReqId}
                          onClick={handleAddDependency}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {isAddingDep ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Plus className="w-3.5 h-3.5" />
                          )}
                          <span>Adicionar Relação</span>
                        </button>
                      </div>
                    </div>

                    {/* Lista de Requisitos Relacionados */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                        Requisitos Relacionados ({dependencies.length})
                      </span>

                      {dependencies.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400 dark:text-slate-500 bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-slate-800">
                          Nenhuma dependência registrada para este requisito.
                        </div>
                      ) : (
                        dependencies.map((dep) => (
                          <div
                            key={dep.id}
                            className="p-2.5 rounded-xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                    DEPENDENCY_TYPE_COLORS[dep.dependencyType] ||
                                    DEPENDENCY_TYPE_COLORS.depends_on
                                  }`}
                                >
                                  {DEPENDENCY_TYPE_LABELS[dep.dependencyType] ||
                                    dep.dependencyType}
                                </span>
                                <span className="text-xs font-bold font-mono text-slate-900 dark:text-white">
                                  {dep.relatedReq?.code}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate mt-0.5">
                                {dep.relatedReq?.title}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveDependency(dep.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer shrink-0"
                              title="Remover dependência"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    {/* User Stories Afetadas (Análise de Impacto RF.21) */}
                    <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                        User Stories Impactadas ({impactedStories.length})
                      </span>
                      {impactedStories.length === 0 ? (
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                          Nenhuma User Story vinculada a este requisito no momento.
                        </p>
                      ) : (
                        impactedStories.map((us) => (
                          <div
                            key={us.id}
                            className="p-2.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/50 text-xs"
                          >
                            <span className="font-bold font-mono text-blue-700 dark:text-blue-400">
                              [{us.code}]
                            </span>{" "}
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {us.title}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
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
