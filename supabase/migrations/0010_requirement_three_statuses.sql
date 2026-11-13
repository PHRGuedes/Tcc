-- Migration: 0010_requirement_three_statuses.sql
-- 1. Garante que as colunas project_id e user_id existam na tabela requirements
ALTER TABLE public.requirements ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.requirements ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Migrar vínculos legados de project_requirements para a coluna requirements.project_id
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_requirements') THEN
        UPDATE public.requirements r
        SET project_id = pr.project_id
        FROM public.project_requirements pr
        WHERE r.id = pr.requirement_id AND r.project_id IS NULL;
    END IF;
END $$;

-- 3. Remover constraint antiga de status
ALTER TABLE public.requirements DROP CONSTRAINT IF EXISTS requirements_status_check;

-- 4. Migrar status legados existentes para o novo fluxo simplificado (3 status)
UPDATE public.requirements 
SET status = 'under_review' 
WHERE status IN ('proposed', 'in_development');

UPDATE public.requirements 
SET status = 'approved' 
WHERE status = 'implemented';

UPDATE public.requirements 
SET status = 'not_approved' 
WHERE status IN ('cancelled', 'rejected');

-- Qualquer outro status residual inválido
UPDATE public.requirements 
SET status = 'under_review' 
WHERE status NOT IN ('under_review', 'approved', 'not_approved') AND status IS NOT NULL;

-- 5. Aplicar nova constraint garantindo apenas os 3 status (ou NULL para biblioteca global)
ALTER TABLE public.requirements ADD CONSTRAINT requirements_status_check 
CHECK (status IS NULL OR status IN ('under_review', 'approved', 'not_approved'));

-- 6. Definir novo padrão para 'under_review'
ALTER TABLE public.requirements ALTER COLUMN status SET DEFAULT 'under_review';

-- 7. Garantir políticas RLS permissivas para usuários autenticados em user_stories, requirement_user_stories, requirement_stakeholders e projects
-- (o controle granular de permissões é aplicado nas Server Actions e na Matriz de Permissões do projeto)
DROP POLICY IF EXISTS "user_stories_insert" ON public.user_stories;
DROP POLICY IF EXISTS "user_stories_update" ON public.user_stories;
DROP POLICY IF EXISTS "user_stories_delete" ON public.user_stories;
CREATE POLICY "user_stories_insert" ON public.user_stories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "user_stories_update" ON public.user_stories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "user_stories_delete" ON public.user_stories FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "req_user_stories_insert" ON public.requirement_user_stories;
DROP POLICY IF EXISTS "req_user_stories_update" ON public.requirement_user_stories;
DROP POLICY IF EXISTS "req_user_stories_delete" ON public.requirement_user_stories;
CREATE POLICY "req_user_stories_insert" ON public.requirement_user_stories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "req_user_stories_update" ON public.requirement_user_stories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "req_user_stories_delete" ON public.requirement_user_stories FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "req_stakeholders_insert" ON public.requirement_stakeholders;
DROP POLICY IF EXISTS "req_stakeholders_update" ON public.requirement_stakeholders;
DROP POLICY IF EXISTS "req_stakeholders_delete" ON public.requirement_stakeholders;
CREATE POLICY "req_stakeholders_insert" ON public.requirement_stakeholders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "req_stakeholders_update" ON public.requirement_stakeholders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "req_stakeholders_delete" ON public.requirement_stakeholders FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "projects_delete" ON public.projects;
CREATE POLICY "projects_delete" ON public.projects FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "req_dependencies_insert" ON public.requirement_dependencies;
DROP POLICY IF EXISTS "req_dependencies_update" ON public.requirement_dependencies;
DROP POLICY IF EXISTS "req_dependencies_delete" ON public.requirement_dependencies;
CREATE POLICY "req_dependencies_insert" ON public.requirement_dependencies FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "req_dependencies_update" ON public.requirement_dependencies FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "req_dependencies_delete" ON public.requirement_dependencies FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
CREATE POLICY "audit_logs_insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- 8. Forçar recarga imediata do schema cache do PostgREST (resolve PGRST204)
NOTIFY pgrst, 'reload schema';
