-- Migration: 0009_project_roles_and_permissions.sql
-- 1. Remove constraints rígidas de enum estático para permitir criação de novas funções no projeto
-- 2. Cria a tabela project_roles com permissions JSONB por projeto
-- 3. Habilita RLS e políticas de acesso para project_roles

-- 1. Remover restrições de enum rígidas
ALTER TABLE public.project_members DROP CONSTRAINT IF EXISTS project_members_role_in_project_check;
ALTER TABLE public.project_invitations DROP CONSTRAINT IF EXISTS project_invitations_role_in_project_check;

-- 2. Tabela de Funções por Projeto
CREATE TABLE IF NOT EXISTS public.project_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT false,
    permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(project_id, slug)
);

-- Habilitar RLS
ALTER TABLE public.project_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_roles_select" ON public.project_roles;
DROP POLICY IF EXISTS "project_roles_insert" ON public.project_roles;
DROP POLICY IF EXISTS "project_roles_update" ON public.project_roles;
DROP POLICY IF EXISTS "project_roles_delete" ON public.project_roles;

-- Qualquer membro autenticado pode consultar as funções e permissões
CREATE POLICY "project_roles_select"
    ON public.project_roles FOR SELECT
    TO authenticated
    USING (true);

-- Apenas admins do projeto ou criador podem inserir funções
CREATE POLICY "project_roles_insert"
    ON public.project_roles FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_roles.project_id
            AND p.created_by = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = project_roles.project_id
            AND pm.user_id = auth.uid()
            AND pm.role_in_project = 'admin'
        )
    );

-- Apenas admins do projeto ou criador podem atualizar funções e permissões
CREATE POLICY "project_roles_update"
    ON public.project_roles FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_roles.project_id
            AND p.created_by = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = project_roles.project_id
            AND pm.user_id = auth.uid()
            AND pm.role_in_project = 'admin'
        )
    )
    WITH CHECK (true);

-- Apenas admins do projeto ou criador podem excluir funções customizadas (is_system = false)
CREATE POLICY "project_roles_delete"
    ON public.project_roles FOR DELETE
    TO authenticated
    USING (
        is_system = false
        AND (
            EXISTS (
                SELECT 1 FROM public.projects p
                WHERE p.id = project_roles.project_id
                AND p.created_by = auth.uid()
            )
            OR
            EXISTS (
                SELECT 1 FROM public.project_members pm
                WHERE pm.project_id = project_roles.project_id
                AND pm.user_id = auth.uid()
                AND pm.role_in_project = 'admin'
            )
        )
    );

NOTIFY pgrst, 'reload schema';

