// Constantes e catálogo de permissões por módulo no ReqFlow

export const PERMISSION_GROUPS = [
  {
    id: "requirements",
    name: "Módulo de Requisitos",
    description: "Permissões de especificação, validação e importação de requisitos.",
    permissions: [
      {
        id: "requirements_create_edit",
        label: "Criar e editar requisitos",
        description: "Permite cadastrar novos requisitos e alterar títulos, descrições e propriedades.",
      },
      {
        id: "requirements_approve",
        label: "Aprovar e mudar status",
        description: "Permite transicionar requisitos (Proposto, Aprovado, Implementado, etc.).",
      },
      {
        id: "requirements_import",
        label: "Importar da biblioteca / outros projetos",
        description: "Permite reutilizar requisitos globais ou importar de outros projetos.",
      },
      {
        id: "requirements_delete",
        label: "Excluir requisitos",
        description: "Permite deletar permanentemente requisitos pertencentes ao projeto.",
      },
    ],
  },
  {
    id: "user_stories",
    name: "User Stories & Rastreabilidade",
    description: "Permissões de backlog ágil e amarração com a matriz de requisitos.",
    permissions: [
      {
        id: "user_stories_manage",
        label: "Criar e editar histórias de usuário",
        description: "Permite cadastrar US, critérios de aceite e estimativa em Story Points.",
      },
      {
        id: "traceability_manage",
        label: "Gerenciar matriz de rastreabilidade",
        description: "Permite vincular ou desvincular requisitos funcionais às histórias.",
      },
      {
        id: "user_stories_delete",
        label: "Excluir histórias de usuário",
        description: "Permite remover histórias de usuário cadastradas no projeto.",
      },
    ],
  },
  {
    id: "sprints_backlog",
    name: "Backlog & Sprints (Scrum)",
    description: "Permissões do quadro Kanban e gestão do ciclo de vida das sprints.",
    permissions: [
      {
        id: "sprints_manage",
        label: "Criar, planejar e reordenar sprints",
        description: "Permite criar novas iterações, definir datas, metas e reordenar o backlog.",
      },
      {
        id: "kanban_move_cards",
        label: "Mover histórias no quadro Kanban",
        description: "Permite transicionar cards entre A Fazer, Em Progresso e Concluído.",
      },
      {
        id: "sprints_delete",
        label: "Arquivar e excluir sprints",
        description: "Permite arquivar iterações concluídas ou excluir sprints vazias.",
      },
    ],
  },
  {
    id: "administration",
    name: "Administração do Projeto",
    description: "Permissões de governança, membros e controle de acesso.",
    permissions: [
      {
        id: "project_settings_manage",
        label: "Editar dados gerais do projeto",
        description: "Permite alterar nome, escopo e descrição do projeto.",
      },
      {
        id: "project_members_manage",
        label: "Convidar e gerenciar stakeholders",
        description: "Permite convidar membros por e-mail, alterar papéis e remover participantes.",
      },
      {
        id: "project_roles_manage",
        label: "Configurar funções e permissões",
        description: "Permite criar funções e customizar as caixas de permissões do projeto.",
      },
    ],
  },
];

// Lista de todas as chaves de permissão
export const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap((g) =>
  g.permissions.map((p) => p.id)
);

// Pacote padrão de permissões atribuído a cada uma das 6 funções nativas do sistema
export const DEFAULT_PROJECT_ROLES = [
  {
    slug: "admin",
    name: "Administrador",
    description: "Gestão integral de requisitos, sprints, stakeholders e configurações do projeto.",
    is_system: true,
    badgeClass: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/50",
    permissions: {
      requirements_create_edit: true,
      requirements_approve: true,
      requirements_import: true,
      requirements_delete: true,
      user_stories_manage: true,
      traceability_manage: true,
      user_stories_delete: true,
      sprints_manage: true,
      kanban_move_cards: true,
      sprints_delete: true,
      project_settings_manage: true,
      project_members_manage: true,
      project_roles_manage: true,
    },
  },
  {
    slug: "requirements_analyst",
    name: "Analista de Requisitos",
    description: "Levantamento, especificação, detalhamento e validação dos requisitos.",
    is_system: true,
    badgeClass: "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/50",
    permissions: {
      requirements_create_edit: true,
      requirements_approve: true,
      requirements_import: true,
      requirements_delete: false,
      user_stories_manage: true,
      traceability_manage: true,
      user_stories_delete: false,
      sprints_manage: false,
      kanban_move_cards: true,
      sprints_delete: false,
      project_settings_manage: false,
      project_members_manage: false,
      project_roles_manage: false,
    },
  },
  {
    slug: "product_owner",
    name: "Product Owner",
    description: "Priorização do backlog, aprovação de requisitos e alinhamento com os objetivos de negócio.",
    is_system: true,
    badgeClass: "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800/50",
    permissions: {
      requirements_create_edit: true,
      requirements_approve: true,
      requirements_import: true,
      requirements_delete: true,
      user_stories_manage: true,
      traceability_manage: true,
      user_stories_delete: true,
      sprints_manage: true,
      kanban_move_cards: true,
      sprints_delete: false,
      project_settings_manage: false,
      project_members_manage: false,
      project_roles_manage: false,
    },
  },
  {
    slug: "scrum_master",
    name: "Scrum Master",
    description: "Facilitação de sprints, acompanhamento de impedimentos e métricas do time.",
    is_system: true,
    badgeClass: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50",
    permissions: {
      requirements_create_edit: false,
      requirements_approve: false,
      requirements_import: false,
      requirements_delete: false,
      user_stories_manage: true,
      traceability_manage: true,
      user_stories_delete: false,
      sprints_manage: true,
      kanban_move_cards: true,
      sprints_delete: true,
      project_settings_manage: false,
      project_members_manage: false,
      project_roles_manage: false,
    },
  },
  {
    slug: "developer",
    name: "Desenvolvedor",
    description: "Implementação técnica, estimativas e movimentação de status no backlog das sprints.",
    is_system: true,
    badgeClass: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50",
    permissions: {
      requirements_create_edit: false,
      requirements_approve: false,
      requirements_import: false,
      requirements_delete: false,
      user_stories_manage: false,
      traceability_manage: false,
      user_stories_delete: false,
      sprints_manage: false,
      kanban_move_cards: true,
      sprints_delete: false,
      project_settings_manage: false,
      project_members_manage: false,
      project_roles_manage: false,
    },
  },
  {
    slug: "project_manager",
    name: "Gerente de Projeto",
    description: "Supervisão do cronograma, alocação de recursos e relatórios executivos.",
    is_system: true,
    badgeClass: "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800/50",
    permissions: {
      requirements_create_edit: true,
      requirements_approve: true,
      requirements_import: true,
      requirements_delete: false,
      user_stories_manage: true,
      traceability_manage: true,
      user_stories_delete: false,
      sprints_manage: true,
      kanban_move_cards: true,
      sprints_delete: false,
      project_settings_manage: false,
      project_members_manage: true,
      project_roles_manage: false,
    },
  },
];

// Helper para obter estilo de badge com base no slug ou fallback para customizadas
export function getRoleBadgeClass(slug) {
  const found = DEFAULT_PROJECT_ROLES.find((r) => r.slug === slug);
  if (found) return found.badgeClass;
  return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
}
