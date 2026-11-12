"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Server Action para criar uma nova sprint
 */
export async function createSprintAction({ projectId, name, goal, startDate, endDate }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Usuário não autenticado." };
    }

    if (!projectId || !name?.trim()) {
      return { success: false, error: "Projeto e nome da sprint são obrigatórios." };
    }

    const { data, error } = await supabase
      .from("sprints")
      .insert({
        project_id: projectId,
        name: name.trim(),
        goal: goal?.trim() || null,
        start_date: startDate || null,
        end_date: endDate || null,
        status: "active",
      })
      .select()
      .single();

    if (error) {
      console.error("Erro ao inserir sprint:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/backlog");
    return { success: true, data };
  } catch (err) {
    console.error("Erro inesperado em createSprintAction:", err);
    return { success: false, error: "Erro interno no servidor." };
  }
}

/**
 * Server Action para arquivar ou reativar uma sprint
 */
export async function archiveSprintAction(sprintId, archive = true) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Usuário não autenticado." };
    }

    const targetStatus = archive ? "completed" : "active";

    const { data, error } = await supabase
      .from("sprints")
      .update({ status: targetStatus })
      .eq("id", sprintId)
      .select()
      .single();

    if (error) {
      console.error("Erro ao arquivar/reativar sprint:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/backlog");
    return { success: true, data };
  } catch (err) {
    console.error("Erro inesperado em archiveSprintAction:", err);
    return { success: false, error: "Erro interno no servidor." };
  }
}

/**
 * Server Action para excluir uma sprint com segurança
 * As histórias vinculadas são desassociadas (sprint_id = null, status = 'backlog')
 * para que nenhuma história seja perdida.
 */
export async function deleteSprintAction(sprintId) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Usuário não autenticado." };
    }

    // 1. Desvincular histórias associadas para não perder dados
    await supabase
      .from("user_stories")
      .update({ sprint_id: null, status: "backlog" })
      .eq("sprint_id", sprintId);

    // 2. Excluir a sprint
    const { error: deleteError } = await supabase
      .from("sprints")
      .delete()
      .eq("id", sprintId);

    if (deleteError) {
      console.error("Erro ao deletar sprint:", deleteError);
      return { success: false, error: deleteError.message };
    }

    revalidatePath("/backlog");
    return { success: true };
  } catch (err) {
    console.error("Erro inesperado em deleteSprintAction:", err);
    return { success: false, error: "Erro interno no servidor." };
  }
}

/**
 * Server Action para mover/atualizar uma história (status e/ou sprint_id)
 */
export async function updateStoryPlacementAction(storyId, { status, sprintId }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Usuário não autenticado." };
    }

    const updatePayload = {};
    if (status !== undefined) updatePayload.status = status;
    if (sprintId !== undefined) updatePayload.sprint_id = sprintId;

    const { data, error } = await supabase
      .from("user_stories")
      .update(updatePayload)
      .eq("id", storyId)
      .select()
      .single();

    if (error) {
      console.error("Erro ao atualizar história:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/backlog");
    return { success: true, data };
  } catch (err) {
    console.error("Erro inesperado em updateStoryPlacementAction:", err);
    return { success: false, error: "Erro interno no servidor." };
  }
}

