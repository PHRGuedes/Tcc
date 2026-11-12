-- Migration: 0006_sprints_management_rls
-- Permissões completas para gerenciamento de Sprints para todos os usuários autenticados
-- Permite SELECT, INSERT, UPDATE (arquivar/editar) e DELETE (excluir sprints)

ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sprints_insert" ON public.sprints;
DROP POLICY IF EXISTS "sprints_update" ON public.sprints;
DROP POLICY IF EXISTS "sprints_delete" ON public.sprints;
DROP POLICY IF EXISTS "sprints_all" ON public.sprints;

CREATE POLICY "sprints_all"
    ON public.sprints
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
