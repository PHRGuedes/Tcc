-- ==============================================================================
-- REQFLOW: DATABASE SCHEMA & ROW LEVEL SECURITY (RLS)
-- Plataforma de Engenharia de Requisitos
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS & CONSTANTS
-- Perfis: admin, requirements_analyst, product_owner, scrum_master, developer, project_manager
-- Tipos de Requisito: RF (Funcional), RNF (Não-Funcional)
-- Prioridades: low (Baixa), medium (Média), high (Alta), critical (Crítica)
-- Status Requisito: proposed (Proposto), under_review (Em Análise), approved (Aprovado), 
--                   in_development (Em Desenvolvimento), implemented (Implementado), cancelled (Cancelado)

-- 3. TABELA DE PERFIS DE USUÁRIOS (Vinculada a auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'requirements_analyst' CHECK (
        role IN ('admin', 'requirements_analyst', 'product_owner', 'scrum_master', 'developer', 'project_manager')
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Trigger para atualizar profiles automaticamente no signup do Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Se o e-mail já existe no profiles (ex: vindo do seed mock), atualiza o ID do perfil para o novo UUID do auth.users
    IF EXISTS (SELECT 1 FROM public.profiles WHERE email = NEW.email) THEN
        UPDATE public.profiles
        SET id = NEW.id,
            full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', full_name),
            role = COALESCE(NEW.raw_user_meta_data->>'role', role),
            avatar_url = COALESCE(NEW.raw_user_meta_data->>'avatar_url', avatar_url),
            updated_at = timezone('utc'::text, now())
        WHERE email = NEW.email;
    ELSE
        INSERT INTO public.profiles (id, full_name, email, role, avatar_url)
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'role', 'requirements_analyst'),
            COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL)
        )
        ON CONFLICT (id) DO UPDATE
        SET full_name = EXCLUDED.full_name,
            email = EXCLUDED.email,
            role = EXCLUDED.role,
            updated_at = timezone('utc'::text, now());
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Proteção defensiva para nunca bloquear a criação de conta no auth.users
        RAISE WARNING 'Erro ao registrar profile no trigger handle_new_user: %', SQLERRM;
        RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. PROJETOS & MEMBROS
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_in_project TEXT NOT NULL DEFAULT 'requirements_analyst' CHECK (
        role_in_project IN ('admin', 'requirements_analyst', 'product_owner', 'scrum_master', 'developer', 'project_manager')
    ),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE (project_id, user_id)
);

-- 5. REQUISITOS (Repositório Central)
CREATE TABLE IF NOT EXISTS public.requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE, -- Ex: REQ-001, RF001, RNF001
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'RF' CHECK (type IN ('RF', 'RNF')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL DEFAULT 'proposed' CHECK (
        status IN ('proposed', 'under_review', 'approved', 'in_development', 'implemented', 'cancelled')
    ),
    justification TEXT,
    source TEXT,
    acceptance_criteria TEXT,
    is_incomplete BOOLEAN NOT NULL DEFAULT false,
    responsible_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    current_version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Trigger de Incompletude (Critério Pedagógico: alerta requisitos sem critérios, fonte ou justificativa)
CREATE OR REPLACE FUNCTION public.check_requirement_completeness()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.acceptance_criteria IS NULL OR TRIM(NEW.acceptance_criteria) = '')
       OR (NEW.justification IS NULL OR TRIM(NEW.justification) = '')
       OR (NEW.source IS NULL OR TRIM(NEW.source) = '') THEN
        NEW.is_incomplete := true;
    ELSE
        NEW.is_incomplete := false;
    END IF;
    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_requirement_completeness ON public.requirements;
CREATE TRIGGER trg_check_requirement_completeness
    BEFORE INSERT OR UPDATE ON public.requirements
    FOR EACH ROW EXECUTE FUNCTION public.check_requirement_completeness();

-- 6. VÍNCULO DE REQUISITOS A PROJETOS (Permite cadastrar requisitos e vinculá-los a projetos)
CREATE TABLE IF NOT EXISTS public.project_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    requirement_id UUID NOT NULL REFERENCES public.requirements(id) ON DELETE CASCADE,
    linked_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE (project_id, requirement_id)
);

-- 7. HISTÓRICO DE VERSÕES DOS REQUISITOS
CREATE TABLE IF NOT EXISTS public.requirement_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requirement_id UUID NOT NULL REFERENCES public.requirements(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    change_summary TEXT NOT NULL,
    snapshot JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. SPRINTS
CREATE TABLE IF NOT EXISTS public.sprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    goal TEXT,
    start_date DATE,
    end_date DATE,
    status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. USER STORIES
CREATE TABLE IF NOT EXISTS public.user_stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    code TEXT NOT NULL, -- Ex: US-01, US-02
    title TEXT NOT NULL,
    as_a TEXT,
    i_want TEXT,
    so_that TEXT,
    status TEXT NOT NULL DEFAULT 'backlog' CHECK (status IN ('backlog', 'todo', 'in_progress', 'done')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    sprint_id UUID REFERENCES public.sprints(id) ON DELETE SET NULL,
    responsible_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE (project_id, code)
);

-- 10. RASTREABILIDADE (Cruzamentos N:N)
-- Requisito <-> User Story
CREATE TABLE IF NOT EXISTS public.requirement_user_stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requirement_id UUID NOT NULL REFERENCES public.requirements(id) ON DELETE CASCADE,
    user_story_id UUID NOT NULL REFERENCES public.user_stories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE (requirement_id, user_story_id)
);

-- Requisito <-> Stakeholder Envolvido
CREATE TABLE IF NOT EXISTS public.requirement_stakeholders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requirement_id UUID NOT NULL REFERENCES public.requirements(id) ON DELETE CASCADE,
    stakeholder_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE (requirement_id, stakeholder_id)
);

-- Requisito <-> Dependência com outro Requisito (Conflito, Complemento, Refinamento, Dependência)
CREATE TABLE IF NOT EXISTS public.requirement_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_req_id UUID NOT NULL REFERENCES public.requirements(id) ON DELETE CASCADE,
    target_req_id UUID NOT NULL REFERENCES public.requirements(id) ON DELETE CASCADE,
    dependency_type TEXT NOT NULL DEFAULT 'complements' CHECK (
        dependency_type IN ('conflict', 'complements', 'refines', 'depends_on')
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CHECK (source_req_id <> target_req_id),
    UNIQUE (source_req_id, target_req_id, dependency_type)
);

-- 11. AUDITORIA & FEED DE ATIVIDADES
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    entity_type TEXT NOT NULL, -- requirement, user_story, sprint, project
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,      -- created, updated, approved, status_changed, commented, linked
    description TEXT NOT NULL, -- Ex: "aprovou o requisito REQ-004"
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 12. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirement_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirement_user_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirement_stakeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirement_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper Function para obter o Perfil do usuário atual
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- POLÍTICAS PARA PROFILES
CREATE POLICY "Perfis visíveis para todos os usuários autenticados"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Usuários podem atualizar seu próprio perfil"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Permitir inserção de perfil"
    ON public.profiles FOR INSERT
    TO authenticated, anon, service_role
    WITH CHECK (true);

-- POLÍTICAS PARA PROJETOS E MEMBROS
CREATE POLICY "Visualização de projetos permitida para membros ou admin"
    ON public.projects FOR SELECT
    TO authenticated
    USING (
        get_current_user_role() = 'admin' 
        OR created_by = auth.uid()
        OR id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Criação de projetos por usuários autenticados"
    ON public.projects FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by OR get_current_user_role() IN ('admin', 'project_manager', 'product_owner'));

CREATE POLICY "Membros de projeto visíveis para autenticados"
    ON public.project_members FOR SELECT
    TO authenticated
    USING (true);

-- POLÍTICAS PARA REQUISITOS
CREATE POLICY "Leitura de requisitos permitida para usuários autenticados"
    ON public.requirements FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Inserção de requisitos para analistas, POs e admins"
    ON public.requirements FOR INSERT
    TO authenticated
    WITH CHECK (
        get_current_user_role() IN ('admin', 'requirements_analyst', 'product_owner', 'project_manager')
    );

CREATE POLICY "Edição de requisitos permitida com RLS"
    ON public.requirements FOR UPDATE
    TO authenticated
    USING (
        get_current_user_role() IN ('admin', 'requirements_analyst', 'product_owner', 'project_manager', 'developer')
    );

-- POLÍTICAS PARA PROJECT_REQUIREMENTS
CREATE POLICY "Visualização de vínculos projeto-requisito"
    ON public.project_requirements FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Criação de vínculos projeto-requisito"
    ON public.project_requirements FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- POLÍTICAS PARA VERSÕES
CREATE POLICY "Histórico de versões visível para autenticados"
    ON public.requirement_versions FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Inserção de versão permitida para autenticados"
    ON public.requirement_versions FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- POLÍTICAS PARA SPRINTS E USER STORIES
CREATE POLICY "Visualização de sprints para autenticados"
    ON public.sprints FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Gerenciamento de sprints para Scrum Master, PO e Admin"
    ON public.sprints FOR ALL
    TO authenticated
    USING (get_current_user_role() IN ('admin', 'scrum_master', 'product_owner', 'project_manager'));

CREATE POLICY "Visualização de user stories para autenticados"
    ON public.user_stories FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Gerenciamento de user stories"
    ON public.user_stories FOR ALL
    TO authenticated
    USING (get_current_user_role() IN ('admin', 'product_owner', 'scrum_master', 'requirements_analyst', 'developer'));

-- POLÍTICAS PARA RASTREABILIDADE
CREATE POLICY "Visualização de rastreabilidade para autenticados"
    ON public.requirement_user_stories FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Modificação de rastreabilidade US"
    ON public.requirement_user_stories FOR ALL
    TO authenticated
    USING (true);

CREATE POLICY "Visualização de rastreabilidade Stakeholders"
    ON public.requirement_stakeholders FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Modificação de rastreabilidade Stakeholders"
    ON public.requirement_stakeholders FOR ALL
    TO authenticated
    USING (true);

CREATE POLICY "Visualização de dependências entre requisitos"
    ON public.requirement_dependencies FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Modificação de dependências"
    ON public.requirement_dependencies FOR ALL
    TO authenticated
    USING (true);

-- POLÍTICAS PARA AUDIT LOGS
CREATE POLICY "Visualização de logs de auditoria"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Inserção de logs de auditoria"
    ON public.audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (true);
