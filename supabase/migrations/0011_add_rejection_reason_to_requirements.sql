-- Migration: 0011_add_rejection_reason_to_requirements.sql
-- Campo formal para registrar o motivo de não aprovação / justificativa de corte de escopo do requisito
ALTER TABLE public.requirements ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Notificar recarga de schema cache
NOTIFY pgrst, 'reload schema';
