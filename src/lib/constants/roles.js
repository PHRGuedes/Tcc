export const ROLES = {
  ADMIN: "admin",
  REQUIREMENTS_ANALYST: "requirements_analyst",
  PRODUCT_OWNER: "product_owner",
  SCRUM_MASTER: "scrum_master",
  DEVELOPER: "developer",
  PROJECT_MANAGER: "project_manager",
};

export const ROLE_LABELS = {
  [ROLES.ADMIN]: "Administrador",
  [ROLES.REQUIREMENTS_ANALYST]: "Analista de Requisitos",
  [ROLES.PRODUCT_OWNER]: "Product Owner",
  [ROLES.SCRUM_MASTER]: "Scrum Master",
  [ROLES.DEVELOPER]: "Desenvolvedor",
  [ROLES.PROJECT_MANAGER]: "Gerente de Projeto",
};

export const ROLE_BADGE_COLORS = {
  [ROLES.ADMIN]: "bg-purple-100 text-purple-700 border-purple-200",
  [ROLES.REQUIREMENTS_ANALYST]: "bg-blue-100 text-blue-700 border-blue-200",
  [ROLES.PRODUCT_OWNER]: "bg-emerald-100 text-emerald-700 border-emerald-200",
  [ROLES.SCRUM_MASTER]: "bg-amber-100 text-amber-700 border-amber-200",
  [ROLES.DEVELOPER]: "bg-cyan-100 text-cyan-700 border-cyan-200",
  [ROLES.PROJECT_MANAGER]: "bg-indigo-100 text-indigo-700 border-indigo-200",
};
