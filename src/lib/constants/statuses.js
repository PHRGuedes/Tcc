// Tipos de Requisito
export const REQUIREMENT_TYPES = {
  RF: "RF",
  RNF: "RNF",
};

export const REQUIREMENT_TYPE_LABELS = {
  [REQUIREMENT_TYPES.RF]: "Requisito Funcional",
  [REQUIREMENT_TYPES.RNF]: "Requisito Não-Funcional",
};

// Prioridades
export const PRIORITIES = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
};

export const PRIORITY_LABELS = {
  [PRIORITIES.LOW]: "Baixa",
  [PRIORITIES.MEDIUM]: "Média",
  [PRIORITIES.HIGH]: "Alta",
  [PRIORITIES.CRITICAL]: "Crítica",
};

// Cores para Prioridades com suporte a Dark Mode
export const PRIORITY_COLORS = {
  [PRIORITIES.LOW]: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500 dark:bg-emerald-400",
    border: "border-emerald-200 dark:border-emerald-800/60",
  },
  [PRIORITIES.MEDIUM]: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500 dark:bg-amber-400",
    border: "border-amber-200 dark:border-amber-800/60",
  },
  [PRIORITIES.HIGH]: {
    bg: "bg-rose-50 dark:bg-rose-950/40",
    text: "text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500 dark:bg-rose-400",
    border: "border-rose-200 dark:border-rose-800/60",
  },
  [PRIORITIES.CRITICAL]: {
    bg: "bg-red-100 dark:bg-red-950/60",
    text: "text-red-800 dark:text-red-200",
    dot: "bg-red-600 dark:bg-red-400",
    border: "border-red-300 dark:border-red-800",
  },
};

// Status de Requisitos (Ciclo de Vida: Em Análise, Aprovado, Não Aprovado)
export const REQUIREMENT_STATUSES = {
  UNDER_REVIEW: "under_review",
  APPROVED: "approved",
  NOT_APPROVED: "not_approved",
  // Aliases de compatibilidade
  PROPOSED: "under_review",
  IN_DEVELOPMENT: "under_review",
  IMPLEMENTED: "approved",
  CANCELLED: "not_approved",
};

export const REQUIREMENT_STATUS_LABELS = {
  [REQUIREMENT_STATUSES.UNDER_REVIEW]: "Em Análise",
  [REQUIREMENT_STATUSES.APPROVED]: "Aprovado",
  [REQUIREMENT_STATUSES.NOT_APPROVED]: "Não Aprovado",
};

export const REQUIREMENT_STATUS_COLORS = {
  [REQUIREMENT_STATUSES.UNDER_REVIEW]:
    "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60",
  [REQUIREMENT_STATUSES.APPROVED]:
    "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60",
  [REQUIREMENT_STATUSES.NOT_APPROVED]:
    "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60",
};

export function normalizeRequirementStatus(status) {
  if (!status) return REQUIREMENT_STATUSES.UNDER_REVIEW;
  const s = String(status).toLowerCase();
  if (s === "proposed" || s === "in_development" || s === "under_review") {
    return REQUIREMENT_STATUSES.UNDER_REVIEW;
  }
  if (s === "implemented" || s === "approved") {
    return REQUIREMENT_STATUSES.APPROVED;
  }
  if (s === "cancelled" || s === "rejected" || s === "not_approved") {
    return REQUIREMENT_STATUSES.NOT_APPROVED;
  }
  return REQUIREMENT_STATUSES.UNDER_REVIEW;
}

// Status de User Stories no Kanban
export const STORY_STATUSES = {
  BACKLOG: "backlog",
  TODO: "todo",
  IN_PROGRESS: "in_progress",
  DONE: "done",
};

export const STORY_STATUS_COLUMNS = [
  { id: STORY_STATUSES.BACKLOG, title: "Product Backlog", colorDot: "bg-slate-400 dark:bg-slate-500" },
  { id: STORY_STATUSES.TODO, title: "A Fazer", colorDot: "bg-amber-500 dark:bg-amber-400" },
  { id: STORY_STATUSES.IN_PROGRESS, title: "Em Progresso", colorDot: "bg-blue-600 dark:bg-blue-400" },
  { id: STORY_STATUSES.DONE, title: "Concluído", colorDot: "bg-emerald-500 dark:bg-emerald-400" },
];
