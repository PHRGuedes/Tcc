-- ==============================================================================
-- 0003_FIX_AUTH_TRIGGER.SQL
-- Correção para o erro "Database error saving new user" no Supabase Auth
-- ==============================================================================

-- 1. Habilitar ON UPDATE CASCADE nas FKs que apontam para profiles(id)
DO $$
BEGIN
    ALTER TABLE IF EXISTS public.projects DROP CONSTRAINT IF EXISTS projects_created_by_fkey;
    ALTER TABLE IF EXISTS public.projects ADD CONSTRAINT projects_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL ON UPDATE CASCADE;

    ALTER TABLE IF EXISTS public.project_members DROP CONSTRAINT IF EXISTS project_members_user_id_fkey;
    ALTER TABLE IF EXISTS public.project_members ADD CONSTRAINT project_members_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE ON UPDATE CASCADE;

    ALTER TABLE IF EXISTS public.requirements DROP CONSTRAINT IF EXISTS requirements_responsible_id_fkey;
    ALTER TABLE IF EXISTS public.requirements ADD CONSTRAINT requirements_responsible_id_fkey 
        FOREIGN KEY (responsible_id) REFERENCES public.profiles(id) ON DELETE SET NULL ON UPDATE CASCADE;

    ALTER TABLE IF EXISTS public.requirements DROP CONSTRAINT IF EXISTS requirements_created_by_fkey;
    ALTER TABLE IF EXISTS public.requirements ADD CONSTRAINT requirements_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL ON UPDATE CASCADE;

    ALTER TABLE IF EXISTS public.requirement_versions DROP CONSTRAINT IF EXISTS requirement_versions_changed_by_fkey;
    ALTER TABLE IF EXISTS public.requirement_versions ADD CONSTRAINT requirement_versions_changed_by_fkey 
        FOREIGN KEY (changed_by) REFERENCES public.profiles(id) ON DELETE SET NULL ON UPDATE CASCADE;

    ALTER TABLE IF EXISTS public.user_stories DROP CONSTRAINT IF EXISTS user_stories_responsible_id_fkey;
    ALTER TABLE IF EXISTS public.user_stories ADD CONSTRAINT user_stories_responsible_id_fkey 
        FOREIGN KEY (responsible_id) REFERENCES public.profiles(id) ON DELETE SET NULL ON UPDATE CASCADE;

    ALTER TABLE IF EXISTS public.requirement_stakeholders DROP CONSTRAINT IF EXISTS requirement_stakeholders_stakeholder_id_fkey;
    ALTER TABLE IF EXISTS public.requirement_stakeholders ADD CONSTRAINT requirement_stakeholders_stakeholder_id_fkey 
        FOREIGN KEY (stakeholder_id) REFERENCES public.profiles(id) ON DELETE CASCADE ON UPDATE CASCADE;

    ALTER TABLE IF EXISTS public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;
    ALTER TABLE IF EXISTS public.audit_logs ADD CONSTRAINT audit_logs_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL ON UPDATE CASCADE;
END $$;

-- 2. Garantir políticas RLS de INSERT e permissões
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir inserção de perfil" ON public.profiles;
CREATE POLICY "Permitir inserção de perfil"
    ON public.profiles FOR INSERT
    TO authenticated, anon, service_role
    WITH CHECK (true);

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.profiles TO postgres, service_role;

-- 3. Função do Trigger segura com search_path e tratamento defensivo
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
        -- Proteção para nunca abortar a transação do auth.users
        RAISE WARNING 'Erro ao registrar profile no trigger handle_new_user: %', SQLERRM;
        RETURN NEW;
END;
$$;

-- 4. Recriar Trigger em auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Garantir permissões e políticas RLS para criação de projetos
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Criação de projetos por usuários autenticados" ON public.projects;
CREATE POLICY "Criação de projetos por usuários autenticados"
    ON public.projects FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by OR get_current_user_role() IN ('admin', 'project_manager', 'product_owner', 'requirements_analyst'));

DROP POLICY IF EXISTS "Atualização de projetos pelo criador ou admin" ON public.projects;
CREATE POLICY "Atualização de projetos pelo criador ou admin"
    ON public.projects FOR UPDATE
    TO authenticated
    USING (created_by = auth.uid() OR get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Inserção de membros de projeto" ON public.project_members;
CREATE POLICY "Inserção de membros de projeto"
    ON public.project_members FOR INSERT
    TO authenticated
    WITH CHECK (true);

GRANT ALL ON TABLE public.projects TO authenticated, service_role;
GRANT ALL ON TABLE public.project_members TO authenticated, service_role;

