-- Migration: 0005_project_management_rls
-- Garante permissões completas para projetos e gerenciamento de stakeholders (project_members)
-- para todos os usuários autenticados, eliminando violações de RLS.

-- ============================================================
-- 1. PROJECT_MEMBERS (Stakeholders)
-- ============================================================
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Membros de projeto visíveis para autenticados" ON public.project_members;
DROP POLICY IF EXISTS "Inserção de membros do projeto" ON public.project_members;
DROP POLICY IF EXISTS "Atualização de membros do projeto" ON public.project_members;
DROP POLICY IF EXISTS "Remoção de membros do projeto" ON public.project_members;
DROP POLICY IF EXISTS "project_members_all" ON public.project_members;

-- Permite SELECT, INSERT, UPDATE e DELETE completo para usuários autenticados
CREATE POLICY "project_members_all"
    ON public.project_members
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ============================================================
-- 2. PROJECTS (Edição e Criação)
-- ============================================================
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Edição de projetos para autenticados" ON public.projects;
DROP POLICY IF EXISTS "projects_update" ON public.projects;

CREATE POLICY "projects_update"
    ON public.projects
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Criação de projetos por usuários autenticados" ON public.projects;
DROP POLICY IF EXISTS "projects_insert" ON public.projects;

CREATE POLICY "projects_insert"
    ON public.projects
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
