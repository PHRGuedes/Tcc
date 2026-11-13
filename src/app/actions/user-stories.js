"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Cadastra uma nova User Story no projeto e vincula aos requisitos selecionados.
 */
export async function createUserStoryAction(payload) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Usuário não autenticado." };
    }

    const {
      projectId,
      code,
      title,
      as_a,
      i_want,
      so_that,
      priority = "medium",
      status = "backlog",
      sprintId = null,
      responsibleId = null,
      requirementIds = [],
    } = payload;

    const normalizedCode = code?.trim().toUpperCase();
    if (!projectId || !normalizedCode || !title?.trim()) {
      return {
        success: false,
        error: "Projeto, código e título da história são obrigatórios.",
      };
    }

    // Verificar duplicidade de código no mesmo projeto
    const { data: existing } = await supabase
      .from("user_stories")
      .select("id")
      .eq("project_id", projectId)
      .eq("code", normalizedCode)
      .maybeSingle();

    if (existing) {
      return {
        success: false,
        error: `Já existe uma User Story com o código "${normalizedCode}" neste projeto.`,
      };
    }

    const insertData = {
      project_id: projectId,
      code: normalizedCode,
      title: title.trim(),
      as_a: as_a?.trim() || "",
      i_want: i_want?.trim() || "",
      so_that: so_that?.trim() || "",
      priority,
      status: sprintId && status === "backlog" ? "todo" : status,
      sprint_id: sprintId || null,
      responsible_id: responsibleId || null,
    };

    const { data: newStory, error: insertErr } = await supabase
      .from("user_stories")
      .insert(insertData)
      .select()
      .single();

    if (insertErr) {
      return { success: false, error: `Erro ao criar história: ${insertErr.message}` };
    }

    // Vincular aos requisitos selecionados
    if (Array.isArray(requirementIds) && requirementIds.length > 0 && newStory?.id) {
      const linksToInsert = requirementIds.map((reqId) => ({
        requirement_id: reqId,
        user_story_id: newStory.id,
      }));
      try {
        await supabase
          .from("requirement_user_stories")
          .upsert(linksToInsert, { onConflict: "requirement_id,user_story_id" });
      } catch (linkErr) {
        console.warn("Aviso ao vincular requisitos à história:", linkErr);
      }
    }

    // Registrar na trilha de auditoria
    try {
      await supabase.from("audit_logs").insert({
        project_id: projectId,
        user_id: user.id,
        entity_type: "user_story",
        entity_id: newStory.id,
        action: "created",
        description: `criou a história de usuário ${normalizedCode} ("${title.trim()}")`,
      });
    } catch {}

    revalidatePath("/", "layout");
    revalidatePath("/user-stories");
    revalidatePath("/backlog");
    revalidatePath("/rastreabilidade");
    return { success: true, data: newStory };
  } catch (err) {
    console.error("Erro inesperado em createUserStoryAction:", err);
    return { success: false, error: "Erro interno ao criar User Story." };
  }
}

/**
 * Atualiza uma User Story existente e sincroniza seus vínculos com requisitos.
 */
export async function updateUserStoryAction(storyId, payload) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Usuário não autenticado." };
    }

    if (!storyId) {
      return { success: false, error: "ID da história não informado." };
    }

    const {
      projectId,
      code,
      title,
      as_a,
      i_want,
      so_that,
      priority,
      status,
      sprintId,
      responsibleId,
      requirementIds,
    } = payload;

    const normalizedCode = code?.trim().toUpperCase();

    const updateData = {
      code: normalizedCode,
      title: title?.trim(),
      as_a: as_a?.trim() || "",
      i_want: i_want?.trim() || "",
      so_that: so_that?.trim() || "",
      priority,
      status: sprintId && status === "backlog" ? "todo" : !sprintId && status !== "backlog" ? status : status,
      sprint_id: sprintId || null,
      responsible_id: responsibleId || null,
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error: updateErr } = await supabase
      .from("user_stories")
      .update(updateData)
      .eq("id", storyId)
      .select()
      .single();

    if (updateErr) {
      return { success: false, error: `Erro ao atualizar história: ${updateErr.message}` };
    }

    // Sincronizar requisitos vinculados caso requirementIds tenha sido enviado
    if (Array.isArray(requirementIds)) {
      try {
        await supabase
          .from("requirement_user_stories")
          .delete()
          .eq("user_story_id", storyId);

        if (requirementIds.length > 0) {
          const linksToInsert = requirementIds.map((reqId) => ({
            requirement_id: reqId,
            user_story_id: storyId,
          }));
          await supabase
            .from("requirement_user_stories")
            .upsert(linksToInsert, { onConflict: "requirement_id,user_story_id" });
        }
      } catch (syncErr) {
        console.warn("Aviso ao sincronizar vínculos da história:", syncErr);
      }
    }

    if (projectId) {
      try {
        await supabase.from("audit_logs").insert({
          project_id: projectId,
          user_id: user.id,
          entity_type: "user_story",
          entity_id: storyId,
          action: "updated",
          description: `atualizou a história de usuário ${normalizedCode}`,
        });
      } catch {}
    }

    revalidatePath("/", "layout");
    revalidatePath("/user-stories");
    revalidatePath("/backlog");
    revalidatePath("/rastreabilidade");
    return { success: true, data: updated };
  } catch (err) {
    console.error("Erro inesperado em updateUserStoryAction:", err);
    return { success: false, error: "Erro interno ao atualizar User Story." };
  }
}

/**
 * Exclui uma User Story do projeto.
 */
export async function deleteUserStoryAction(storyId, projectId) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Usuário não autenticado." };
    }

    const { data: existing } = await supabase
      .from("user_stories")
      .select("code, title")
      .eq("id", storyId)
      .maybeSingle();

    const { error: delErr } = await supabase
      .from("user_stories")
      .delete()
      .eq("id", storyId);

    if (delErr) {
      return { success: false, error: `Erro ao excluir história: ${delErr.message}` };
    }

    if (projectId) {
      try {
        await supabase.from("audit_logs").insert({
          project_id: projectId,
          user_id: user.id,
          entity_type: "user_story",
          entity_id: storyId,
          action: "deleted",
          description: `excluiu a história de usuário ${existing?.code || ""}`,
        });
      } catch {}
    }

    revalidatePath("/", "layout");
    revalidatePath("/user-stories");
    revalidatePath("/backlog");
    revalidatePath("/rastreabilidade");
    return { success: true };
  } catch (err) {
    console.error("Erro inesperado em deleteUserStoryAction:", err);
    return { success: false, error: "Erro interno ao excluir User Story." };
  }
}

/**
 * Alterna (cria ou remove) um vínculo na Matriz de Rastreabilidade
 * Suporta tanto vínculo Requisito <-> User Story quanto Requisito <-> Stakeholder
 */
export async function toggleTraceabilityLinkAction({
  projectId,
  requirementId,
  targetId,
  targetType, // 'story' | 'stakeholder'
  shouldLink,
}) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Usuário não autenticado." };
    }

    if (!requirementId || !targetId || !targetType) {
      return { success: false, error: "Parâmetros de vínculo incompletos." };
    }

    if (targetType === "story") {
      if (shouldLink) {
        const { error } = await supabase
          .from("requirement_user_stories")
          .upsert(
            { requirement_id: requirementId, user_story_id: targetId },
            { onConflict: "requirement_id,user_story_id" }
          );
        if (error) return { success: false, error: error.message };
      } else {
        const { error } = await supabase
          .from("requirement_user_stories")
          .delete()
          .eq("requirement_id", requirementId)
          .eq("user_story_id", targetId);
        if (error) return { success: false, error: error.message };
      }
    } else if (targetType === "stakeholder") {
      if (shouldLink) {
        const { error } = await supabase
          .from("requirement_stakeholders")
          .upsert(
            { requirement_id: requirementId, stakeholder_id: targetId },
            { onConflict: "requirement_id,stakeholder_id" }
          );
        if (error) return { success: false, error: error.message };
      } else {
        const { error } = await supabase
          .from("requirement_stakeholders")
          .delete()
          .eq("requirement_id", requirementId)
          .eq("stakeholder_id", targetId);

        // Caso o stakeholder desmarcado também estivesse como responsible_id direto no requisito, limpa para não reativar ao dar F5
        await supabase
          .from("requirements")
          .update({ responsible_id: null })
          .eq("id", requirementId)
          .eq("responsible_id", targetId);

        if (error) return { success: false, error: error.message };
      }
    }

    revalidatePath("/rastreabilidade");
    revalidatePath("/user-stories");
    revalidatePath("/requisitos");
    return { success: true };
  } catch (err) {
    console.error("Erro em toggleTraceabilityLinkAction:", err);
    return { success: false, error: "Erro interno ao salvar vínculo na matriz." };
  }
}
