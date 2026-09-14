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

// Cores para Prioridades (conforme gestao de requisitos.jpg)
export const PRIORITY_COLORS = {
  [PRIORITIES.LOW]: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
    border: "border-emerald-200",
  },
  [PRIORITIES.MEDIUM]: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-500",
    border: "border-amber-200",
  },
  [PRIORITIES.HIGH]: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    dot: "bg-rose-500",
    border: "border-rose-200",
  },
  [PRIORITIES.CRITICAL]: {
    bg: "bg-red-100",
    text: "text-red-800",
    dot: "bg-red-600",
    border: "border-red-300",
  },
};

// Status de Requisitos (conforme gestao de requisitos.jpg e dashboard.jpg)
export const REQUIREMENT_STATUSES = {
  PROPOSED: "proposed",
  UNDER_REVIEW: "under_review",
  APPROVED: "approved",
  IN_DEVELOPMENT: "in_development",
  IMPLEMENTED: "implemented",
  CANCELLED: "cancelled",
};

export const REQUIREMENT_STATUS_LABELS = {
  [REQUIREMENT_STATUSES.PROPOSED]: "Pendente",
  [REQUIREMENT_STATUSES.UNDER_REVIEW]: "Em Análise",
  [REQUIREMENT_STATUSES.APPROVED]: "Aprovado",
  [REQUIREMENT_STATUSES.IN_DEVELOPMENT]: "Em Desenvolvimento",
  [REQUIREMENT_STATUSES.IMPLEMENTED]: "Implementado",
  [REQUIREMENT_STATUSES.CANCELLED]: "Cancelado",
};

export const REQUIREMENT_STATUS_COLORS = {
  [REQUIREMENT_STATUSES.PROPOSED]: "bg-amber-50 text-amber-700 border-amber-200",
  [REQUIREMENT_STATUSES.UNDER_REVIEW]: "bg-purple-50 text-purple-700 border-purple-200",
  [REQUIREMENT_STATUSES.APPROVED]: "bg-emerald-50 text-emerald-700 border-emerald-200",
  [REQUIREMENT_STATUSES.IN_DEVELOPMENT]: "bg-blue-50 text-blue-700 border-blue-200",
  [REQUIREMENT_STATUSES.IMPLEMENTED]: "bg-slate-100 text-slate-800 border-slate-200",
  [REQUIREMENT_STATUSES.CANCELLED]: "bg-rose-50 text-rose-700 border-rose-200",
};

// Status de User Stories no Kanban (conforme bacdklog e sprints.jpg)
export const STORY_STATUSES = {
  BACKLOG: "backlog",
  TODO: "todo",
  IN_PROGRESS: "in_progress",
  DONE: "done",
};

export const STORY_STATUS_COLUMNS = [
  { id: STORY_STATUSES.BACKLOG, title: "Product Backlog", colorDot: "bg-slate-400" },
  { id: STORY_STATUSES.TODO, title: "A Fazer", colorDot: "bg-amber-500" },
  { id: STORY_STATUSES.IN_PROGRESS, title: "Em Progresso", colorDot: "bg-blue-600" },
  { id: STORY_STATUSES.DONE, title: "Concluído", colorDot: "bg-emerald-500" },
];
