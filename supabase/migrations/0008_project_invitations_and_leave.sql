-- Migration: 0008_project_invitations_and_leave
-- 1. Criação da tabela de convites de projeto com status (pending, accepted, rejected)
-- 2. Permite que membros não sejam inseridos compulsoriamente, mas recebam notificação/convite e aceitem
-- 3. Políticas de RLS para convites e controle de saída de projetos

CREATE TABLE IF NOT EXISTS public.project_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    invited_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_in_project TEXT NOT NULL DEFAULT 'developer' CHECK (
        role_in_project IN ('admin', 'requirements_analyst', 'product_owner', 'scrum_master', 'developer', 'project_manager')
    ),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Garantir que não existam múltiplos convites PENDENTES para o mesmo usuário no mesmo projeto
CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_project_invite 
ON public.project_invitations (project_id, invited_user_id) 
WHERE status = 'pending';

-- Habilitar RLS
ALTER TABLE public.project_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invitations_select" ON public.project_invitations;
DROP POLICY IF EXISTS "invitations_insert" ON public.project_invitations;
DROP POLICY IF EXISTS "invitations_update" ON public.project_invitations;
DROP POLICY IF EXISTS "invitations_delete" ON public.project_invitations;

-- SELECT: Convidado pode ver seus convites; Administradores e Criadores do projeto podem ver os convites do projeto
CREATE POLICY "invitations_select"
    ON public.project_invitations FOR SELECT
    TO authenticated
    USING (
        invited_user_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = project_invitations.project_id
            AND pm.user_id = auth.uid()
            AND pm.role_in_project = 'admin'
        )
        OR
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_invitations.project_id
            AND p.created_by = auth.uid()
        )
    );

-- INSERT: Apenas admin do projeto ou criador pode convidar
CREATE POLICY "invitations_insert"
    ON public.project_invitations FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = project_invitations.project_id
            AND pm.user_id = auth.uid()
            AND pm.role_in_project = 'admin'
        )
        OR
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_invitations.project_id
            AND p.created_by = auth.uid()
        )
    );

-- UPDATE: O convidado pode aceitar ou rejeitar seu convite; admin pode atualizar
CREATE POLICY "invitations_update"
    ON public.project_invitations FOR UPDATE
    TO authenticated
    USING (
        invited_user_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_invitations.project_id
            AND p.created_by = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = project_invitations.project_id
            AND pm.user_id = auth.uid()
            AND pm.role_in_project = 'admin'
        )
    )
    WITH CHECK (true);

-- DELETE: O convidado pode remover convite recusado; admin/criador pode cancelar convite pendente
CREATE POLICY "invitations_delete"
    ON public.project_invitations FOR DELETE
    TO authenticated
    USING (
        invited_user_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_invitations.project_id
            AND p.created_by = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = project_invitations.project_id
            AND pm.user_id = auth.uid()
            AND pm.role_in_project = 'admin'
        )
    );

NOTIFY pgrst, 'reload schema';
