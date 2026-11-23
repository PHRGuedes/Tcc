-- Migration: 0013_add_is_archived_to_projects.sql
-- Adiciona suporte nativo para arquivamento e restauração de projetos no ReqFlow

ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL;

-- Índice para consultas otimizadas de projetos ativos e arquivados
CREATE INDEX IF NOT EXISTS idx_projects_is_archived ON public.projects(is_archived);

-- Notificar recarga de schema cache no PostgREST
NOTIFY pgrst, 'reload schema';
