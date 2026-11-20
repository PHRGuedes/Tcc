-- Migration: 0012_performance_indexes.sql
-- Descrição: Criação de índices B-tree para otimizar as consultas e filtros mais frequentes do ReqFlow.
-- Abrange filtros (.eq), ordenações (.order), junções de chaves estrangeiras e cláusulas RLS.
-- Observação: colunas já cobertas por constraints UNIQUE (que criam índice automaticamente)
-- ou pela coluna inicial de outro índice composto não recebem índice adicional.

-- ============================================================================
-- 1. REQUISITOS (requirements)
-- ============================================================================

-- Atende: Dashboard (gráficos de distribuição por status), Backlog, Rastreabilidade, Relatórios ERS
-- e listagens por projeto (o índice também serve para filtros apenas por project_id).
-- Acelera: supabase.from('requirements').select(...).eq('project_id', projectId)[.eq('status', status)]
CREATE INDEX IF NOT EXISTS idx_requirements_project_id_status
    ON public.requirements (project_id, status);

-- Atende: Biblioteca Global de Requisitos (/requisitos/globais e src/app/actions/requirements.js).
-- Acelera: Listagem de requisitos globais por autor com ordenação por código.
CREATE INDEX IF NOT EXISTS idx_requirements_global_user_code
    ON public.requirements (created_by, code)
    WHERE project_id IS NULL;


-- ============================================================================
-- 2. HISTÓRIAS DE USUÁRIO (user_stories)
-- ============================================================================
-- Filtros por project_id e ordenação por code já são cobertos pela constraint UNIQUE (project_id, code).

-- Atende: Backlog Scrum e Visualização de Sprint ativa (src/app/actions/sprints.js).
-- Acelera: Filtros de histórias de usuário pertencentes a uma sprint específica.
CREATE INDEX IF NOT EXISTS idx_user_stories_sprint_id
    ON public.user_stories (sprint_id);


-- ============================================================================
-- 3. SPRINTS (sprints)
-- ============================================================================

-- Atende: Backlog Scrum e histórico de Sprints com ordenação cronológica
-- (o índice também serve para filtros apenas por project_id).
-- Acelera: supabase.from('sprints').select(...).eq('project_id', projectId).order('created_at', { ascending: false })
CREATE INDEX IF NOT EXISTS idx_sprints_project_id_created_at
    ON public.sprints (project_id, created_at DESC);


-- ============================================================================
-- 4. LOGS DE AUDITORIA (audit_logs)
-- ============================================================================

-- Atende: Dashboard (Feed "Atividade Recente" do projeto - últimas alterações ordenadas por data).
-- Acelera: supabase.from('audit_logs').select(...).eq('project_id', projectId).order('created_at', { ascending: false })
CREATE INDEX IF NOT EXISTS idx_audit_logs_project_id_created_at
    ON public.audit_logs (project_id, created_at DESC);

-- Atende: Modal de Detalhes do Requisito (Histórico de auditoria específico da entidade).
-- Acelera: supabase.from('audit_logs').select(...).eq('entity_type', entityType).eq('entity_id', entityId).order('created_at', { ascending: false })
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_created_at
    ON public.audit_logs (entity_type, entity_id, created_at DESC);


-- ============================================================================
-- 5. MEMBROS DO PROJETO (project_members)
-- ============================================================================
-- Filtros por project_id já são cobertos pela constraint UNIQUE (project_id, user_id).

-- Atende: Topbar / Contexto de Projetos do Usuário e validação de permissões nas RLS.
-- Acelera: supabase.from('project_members').select(...).eq('user_id', userId)
CREATE INDEX IF NOT EXISTS idx_project_members_user_id
    ON public.project_members (user_id);


-- ============================================================================
-- 6. VÍNCULOS REQUISITOS <-> HISTÓRIAS DE USUÁRIO (requirement_user_stories)
-- ============================================================================
-- Filtros por requirement_id já são cobertos pela constraint UNIQUE (requirement_id, user_story_id).

-- Atende: Tela de Histórias / Backlog (busca de requisitos vinculados à história de usuário).
-- Acelera: supabase.from('requirement_user_stories').select(...).eq('user_story_id', storyId) ou .in('user_story_id', storyIds)
CREATE INDEX IF NOT EXISTS idx_requirement_user_stories_story_id
    ON public.requirement_user_stories (user_story_id);


-- ============================================================================
-- 7. STAKEHOLDERS DE REQUISITOS (requirement_stakeholders)
-- ============================================================================
-- Filtros por requirement_id já são cobertos pela constraint UNIQUE (requirement_id, stakeholder_id).

-- Atende: Análise de Impacto por Stakeholder (requisitos vinculados a um stakeholder específico).
-- Acelera: supabase.from('requirement_stakeholders').select(...).eq('stakeholder_id', stakeholderId)
CREATE INDEX IF NOT EXISTS idx_requirement_stakeholders_stakeholder_id
    ON public.requirement_stakeholders (stakeholder_id);


-- ============================================================================
-- 8. VERSÕES DE REQUISITOS (requirement_versions)
-- ============================================================================

-- Atende: Modal de Histórico de Versões do Requisito (ordenação pela versão mais recente).
-- Acelera: supabase.from('requirement_versions').select(...).eq('requirement_id', reqId).order('version_number', { ascending: false })
CREATE INDEX IF NOT EXISTS idx_requirement_versions_req_version
    ON public.requirement_versions (requirement_id, version_number DESC);


-- ============================================================================
-- 9. CONVITES DE PROJETO (project_invitations)
-- ============================================================================

-- Atende: Topbar / Notificações do Usuário (convites pendentes recebidos pelo usuário).
-- Acelera: supabase.from('project_invitations').select(...).eq('invited_user_id', userId).eq('status', 'pending')
CREATE INDEX IF NOT EXISTS idx_project_invitations_user_status
    ON public.project_invitations (invited_user_id, status);

-- Atende: Modal de Gestão de Membros / Convites Enviados pelo Projeto.
-- Acelera: supabase.from('project_invitations').select(...).eq('project_id', projectId).eq('status', status)
CREATE INDEX IF NOT EXISTS idx_project_invitations_project_status
    ON public.project_invitations (project_id, status);


-- ============================================================================
-- 10. DEPENDÊNCIAS DE REQUISITOS (requirement_dependencies)
-- ============================================================================
-- Filtros por source_req_id já são cobertos pela constraint UNIQUE (source_req_id, target_req_id, dependency_type).

-- Atende: Grafo de Dependências e Matriz de Rastreabilidade (busca por dependências de destino).
-- Acelera: supabase.from('requirement_dependencies').select(...).eq('target_req_id', reqId)
CREATE INDEX IF NOT EXISTS idx_requirement_dependencies_target
    ON public.requirement_dependencies (target_req_id);


-- ============================================================================
-- 11. PROJETOS (projects)
-- ============================================================================

-- Atende: Topbar / Seletor de Projetos e Validação de Propriedade (projetos criados pelo usuário).
-- Acelera: supabase.from('projects').select(...).eq('created_by', userId)
CREATE INDEX IF NOT EXISTS idx_projects_created_by
    ON public.projects (created_by);

-- Observação: project_roles não recebe índice adicional, pois a constraint UNIQUE (project_id, slug)
-- já cobre os filtros por project_id.

-- Recarregar cache de esquema do PostgREST
NOTIFY pgrst, 'reload schema';
