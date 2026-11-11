-- Migration: 0004_fix_rls_insert_policies
-- Fix: FOR ALL with USING() does not cover INSERT rows.
-- INSERT requires WITH CHECK. Split ALL policies into SELECT/INSERT/UPDATE/DELETE.

-- ============================================================
-- SPRINTS
-- ============================================================
DROP POLICY IF EXISTS "Gerenciamento de sprints para Scrum Master, PO e Admin" ON public.sprints;

CREATE POLICY "sprints_insert"
    ON public.sprints FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "sprints_update"
    ON public.sprints FOR UPDATE
    TO authenticated
    USING (get_current_user_role() IN ('admin', 'scrum_master', 'product_owner', 'project_manager'))
    WITH CHECK (get_current_user_role() IN ('admin', 'scrum_master', 'product_owner', 'project_manager'));

CREATE POLICY "sprints_delete"
    ON public.sprints FOR DELETE
    TO authenticated
    USING (get_current_user_role() IN ('admin', 'scrum_master', 'product_owner', 'project_manager'));

-- ============================================================
-- USER STORIES
-- ============================================================
DROP POLICY IF EXISTS "Gerenciamento de user stories" ON public.user_stories;

CREATE POLICY "user_stories_insert"
    ON public.user_stories FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "user_stories_update"
    ON public.user_stories FOR UPDATE
    TO authenticated
    USING (get_current_user_role() IN ('admin', 'product_owner', 'scrum_master', 'requirements_analyst', 'developer'))
    WITH CHECK (get_current_user_role() IN ('admin', 'product_owner', 'scrum_master', 'requirements_analyst', 'developer'));

CREATE POLICY "user_stories_delete"
    ON public.user_stories FOR DELETE
    TO authenticated
    USING (get_current_user_role() IN ('admin', 'product_owner', 'scrum_master', 'requirements_analyst', 'developer'));

-- ============================================================
-- REQUIREMENTS
-- ============================================================
DROP POLICY IF EXISTS "Gerenciamento de requisitos" ON public.requirements;

CREATE POLICY "requirements_insert"
    ON public.requirements FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "requirements_update"
    ON public.requirements FOR UPDATE
    TO authenticated
    USING (get_current_user_role() IN ('admin', 'requirements_analyst', 'product_owner', 'scrum_master', 'project_manager'))
    WITH CHECK (get_current_user_role() IN ('admin', 'requirements_analyst', 'product_owner', 'scrum_master', 'project_manager'));

CREATE POLICY "requirements_delete"
    ON public.requirements FOR DELETE
    TO authenticated
    USING (get_current_user_role() IN ('admin', 'requirements_analyst', 'product_owner', 'scrum_master', 'project_manager'));

-- ============================================================
-- PROJECT_REQUIREMENTS (associative table)
-- ============================================================
DROP POLICY IF EXISTS "Gerenciamento de vinculos projeto-requisito" ON public.project_requirements;

CREATE POLICY "project_requirements_insert"
    ON public.project_requirements FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "project_requirements_delete"
    ON public.project_requirements FOR DELETE
    TO authenticated
    USING (true);

-- ============================================================
-- REQUIREMENT_USER_STORIES (associative table)
-- ============================================================
DROP POLICY IF EXISTS "Gerenciamento de vinculos req-user story" ON public.requirement_user_stories;

CREATE POLICY "req_user_stories_insert"
    ON public.requirement_user_stories FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- ============================================================
-- REQUIREMENT_VERSIONS
-- ============================================================
DROP POLICY IF EXISTS "Gerenciamento de versoes de requisitos" ON public.requirement_versions;

CREATE POLICY "requirement_versions_insert"
    ON public.requirement_versions FOR INSERT
    TO authenticated
    WITH CHECK (true);
