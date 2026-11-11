"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Server Action para cadastrar um novo projeto no Supabase
 * Segue o padrão de Server Actions do Next.js App Router com cookies assíncronos.
 */
export async function createProjectAction({ name, description }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Usuário não autenticado no sistema." };
    }

    if (!name || !name.trim()) {
      return { success: false, error: "O nome do projeto é obrigatório." };
    }

    // 1. Inserir o novo projeto vinculado ao usuário autenticado (created_by)
    const { data: newProject, error: insertError } = await supabase
      .from("projects")
      .insert({
        name: name.trim(),
        description: description?.trim() || "Novo projeto de requisitos",
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Erro ao inserir projeto no Supabase:", insertError);
      return { success: false, error: insertError.message };
    }

    // 2. Vincular o criador como membro admin do projeto
    try {
      await supabase.from("project_members").insert({
        project_id: newProject.id,
        user_id: user.id,
        role_in_project: "admin",
      });
    } catch (memberErr) {
      console.warn("Aviso ao vincular criador como membro:", memberErr);
    }

    // 3. Registrar a ação no audit_logs para o feed de atividades
    try {
      await supabase.from("audit_logs").insert({
        project_id: newProject.id,
        user_id: user.id,
        entity_type: "project",
        entity_id: newProject.id,
        action: "created",
        description: `criou o projeto "${newProject.name}"`,
      });
    } catch (auditErr) {
      console.warn("Aviso ao registrar log de auditoria:", auditErr);
    }

    // 4. Revalidar cache do App Router para atualizar Server Components dependentes
    revalidatePath("/", "layout");

    return { success: true, data: newProject };
  } catch (err) {
    console.error("Exceção na Server Action createProjectAction:", err);
    return {
      success: false,
      error: "Ocorreu um erro interno no servidor ao cadastrar o projeto.",
    };
  }
}

