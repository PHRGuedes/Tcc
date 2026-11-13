-- Migration: 0007_requirements_global_and_project_scope
-- 1. Permite requisitos de projeto e requisitos globais (biblioteca pessoal)
-- 2. Corrige a constraint global UNIQUE por índices únicos parciais (para projeto e para globais)
-- 3. Atualiza políticas de RLS para isolar requisitos globais por usuário e requisitos de projeto por membros

-- 1. Adicionar colunas project_id e user_id (caso não existam)
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

-- 3. Sincronizar user_id com created_by
UPDATE public.requirements
SET user_id = created_by
WHERE user_id IS NULL AND created_by IS NOT NULL;

-- 4. Permitir que status seja opcional/NULL para requisitos globais
ALTER TABLE public.requirements ALTER COLUMN status DROP NOT NULL;

-- Atualizar CHECK de status para permitir NULL
ALTER TABLE public.requirements DROP CONSTRAINT IF EXISTS requirements_status_check;
ALTER TABLE public.requirements ADD CONSTRAINT requirements_status_check 
    CHECK (status IS NULL OR status IN ('proposed', 'under_review', 'approved', 'in_development', 'implemented', 'cancelled'));

-- 5. Remover a constraint global antiga de código único (requirements_code_key)
ALTER TABLE public.requirements DROP CONSTRAINT IF EXISTS requirements_code_key;
ALTER TABLE public.requirements DROP CONSTRAINT IF EXISTS requirements_code_unique;

-- 6. Criar os dois índices únicos parciais:
-- Índice para Projetos: Garante unicidade do código dentro do mesmo projeto, permitindo repeti-lo em outros projetos
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_project_requirement 
ON public.requirements (project_id, code) 
WHERE project_id IS NOT NULL;

-- Índice para Globais: Garante que o User não duplique seu código global, mas outro User pode criar o mesmo código
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_global_requirement 
ON public.requirements (COALESCE(user_id, created_by), code) 
WHERE project_id IS NULL;

-- 7. Atualizar Políticas de RLS
ALTER TABLE public.requirements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "requirements_select" ON public.requirements;
DROP POLICY IF EXISTS "requirements_insert" ON public.requirements;
DROP POLICY IF EXISTS "requirements_update" ON public.requirements;
DROP POLICY IF EXISTS "requirements_delete" ON public.requirements;
DROP POLICY IF EXISTS "Gerenciamento de requisitos" ON public.requirements;
DROP POLICY IF EXISTS "requirements_all" ON public.requirements;

-- Leitura:
-- Requisitos de projeto: visíveis para todos os autenticados (ou membros do projeto)
-- Requisitos globais: visíveis estritamente para o criador
CREATE POLICY "requirements_select"
    ON public.requirements FOR SELECT
    TO authenticated
    USING (
        (project_id IS NOT NULL)
        OR
        (project_id IS NULL AND (COALESCE(user_id, created_by) = auth.uid() OR created_by IS NULL))
    );

-- Inserção:
CREATE POLICY "requirements_insert"
    ON public.requirements FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Atualização:
CREATE POLICY "requirements_update"
    ON public.requirements FOR UPDATE
    TO authenticated
    USING (
        (project_id IS NOT NULL)
        OR
        (project_id IS NULL AND COALESCE(user_id, created_by) = auth.uid())
    )
    WITH CHECK (true);

-- Exclusão:
CREATE POLICY "requirements_delete"
    ON public.requirements FOR DELETE
    TO authenticated
    USING (
        (project_id IS NOT NULL)
        OR
        (project_id IS NULL AND COALESCE(user_id, created_by) = auth.uid())
    );

