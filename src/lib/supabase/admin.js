import { createClient } from "@supabase/supabase-js";

/**
 * Cria um cliente Supabase com permissões de administrador (Service Role).
 * Utilizado apenas no lado do servidor em Server Actions que já validaram permissões do usuário
 * para operações que exigem bypass de restrições de RLS (como exclusão em cascata de projetos).
 */
export function createAdminClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !serviceKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
