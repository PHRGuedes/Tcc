"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Criação de Requisito com suporte a Scope (Project ou Global)
 * - scope === 'global': Biblioteca Pessoal (project_id = null, status = null)
 * - scope === 'project': Requisito ativo do projeto (project_id obrigatório, status obrigatório)
 */
export async function createRequirementAction(payload) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Usuário não autenticado no sistema." };
    }

    const {
      scope = "project",
      projectId,
      code,
      title,
      description,
      type = "RF",
      priority = "medium",
      status = "proposed",
      justification = "",
      source = "",
      acceptanceCriteria = "",
      responsibleId = null,
      userStoryId = null,
    } = payload;

    const normalizedCode = code?.trim().toUpperCase();

    if (!normalizedCode) {
      return { success: false, error: "O código do requisito é obrigatório." };
    }

    if (!description?.trim() && !title?.trim()) {
      return { success: false, error: "Título ou descrição do requisito é obrigatório." };
    }

    if (scope === "project" && !projectId) {
      return { success: false, error: "Projeto de destino não informado para requisito de projeto." };
    }

    // 1. Checagem prévia contextual de unicidade no banco
    if (scope === "project") {
      // Verificar se já existe com o mesmo código no projeto ativo
      const { data: existingProjectReq } = await supabase
        .from("requirements")
        .select("id, code, project_id")
        .eq("code", normalizedCode)
        .eq("project_id", projectId)
        .maybeSingle();

      if (existingProjectReq) {
        return {
          success: false,
          error: `Já existe um requisito com o código "${normalizedCode}" neste projeto.`,
        };
      }
    } else {
      // Verificar se o usuário já possui este código na sua Biblioteca Global
      const { data: existingGlobalReq } = await supabase
        .from("requirements")
        .select("id, code, created_by")
        .eq("code", normalizedCode)
        .is("project_id", null)
        .eq("created_by", user.id)
        .maybeSingle();

      if (existingGlobalReq) {
        return {
          success: false,
          error: `Você já possui um requisito global com o código "${normalizedCode}".`,
        };
      }
    }

    const reqData = {
      code: normalizedCode,
      title: title?.trim() || description?.trim().slice(0, 50) || "Sem título",
      description: description?.trim() || title?.trim(),
      type,
      priority,
      status: scope === "global" ? null : status || "proposed",
      justification: justification?.trim() || null,
      source: source?.trim() || (scope === "global" ? "Biblioteca Pessoal" : null),
      acceptance_criteria: acceptanceCriteria?.trim() || null,
      responsible_id: scope === "global" ? null : (responsibleId || null),
      created_by: user.id,
      user_id: user.id,
      project_id: scope === "global" ? null : projectId,
    };

    // Tentar inserção direta com project_id
    let newReq = null;
    let insertError = null;

    const insertRes = await supabase
      .from("requirements")
      .insert(reqData)
      .select()
      .single();

    if (insertRes.error) {
      // Se a coluna project_id ainda não existir no banco (antes de rodar a migração 0007),
      // faz fallback salvando sem project_id e vinculando via project_requirements
      if (insertRes.error.code === "42703") {
        const fallbackData = { ...reqData };
        delete fallbackData.project_id;
        delete fallbackData.user_id;
        if (scope === "global") fallbackData.status = "proposed";

        const fallbackRes = await supabase
          .from("requirements")
          .insert(fallbackData)
          .select()
          .single();

        if (fallbackRes.error) {
          insertError = fallbackRes.error;
        } else {
          newReq = fallbackRes.data;
        }
      } else {
        insertError = insertRes.error;
      }
    } else {
      newReq = insertRes.data;
    }

    if (insertError) {
      if (insertError.code === "23505") {
        return {
          success: false,
          error:
            scope === "project"
              ? `Já existe um requisito com o código "${normalizedCode}" neste projeto.`
              : `Você já possui um requisito global com o código "${normalizedCode}".`,
        };
      }
      return { success: false, error: `Erro ao criar requisito: ${insertError.message}` };
    }

    // 2. Se for requisito de projeto, garantir registro associativo em project_requirements
    if (scope === "project" && projectId && newReq?.id) {
      try {
        await supabase.from("project_requirements").insert({
          project_id: projectId,
          requirement_id: newReq.id,
        });
      } catch (linkErr) {
        console.warn("Aviso ao vincular project_requirements:", linkErr);
      }

      // Se houver User Story vinculada
      if (userStoryId) {
        try {
          await supabase.from("requirement_user_stories").insert({
            requirement_id: newReq.id,
            user_story_id: userStoryId,
          });
        } catch (usErr) {
          console.warn("Aviso ao vincular requirement_user_stories:", usErr);
        }
      }
    }

    // 3. Registrar Versão Inicial
    try {
      await supabase.from("requirement_versions").insert({
        requirement_id: newReq.id,
        version_number: 1,
        changed_by: user.id,
        change_summary:
          scope === "global"
            ? "Criação de requisito global na biblioteca pessoal."
            : "Criação inicial do requisito no projeto.",
        snapshot: reqData,
      });
    } catch (verErr) {
      console.warn("Aviso ao criar versão inicial:", verErr);
    }

    revalidatePath("/requisitos");
    revalidatePath("/requisitos/globais");
    return { success: true, data: newReq };
  } catch (err) {
    console.error("Erro inesperado em createRequirementAction:", err);
    return { success: false, error: "Erro interno no servidor ao cadastrar requisito." };
  }
}

/**
 * Atualização de Requisito (Project ou Global)
 */
export async function updateRequirementAction(id, payload) {
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
      scope = "project",
      code,
      title,
      description,
      type,
      priority,
      status,
      justification,
      source,
      acceptanceCriteria,
      responsibleId,
      versionComment,
    } = payload;

    const normalizedCode = code?.trim().toUpperCase();

    const updateData = {
      code: normalizedCode,
      title: title?.trim(),
      description: description?.trim(),
      type,
      priority,
      justification: justification?.trim() || null,
      source: source?.trim() || null,
      acceptance_criteria: acceptanceCriteria?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    if (scope === "project") {
      if (status !== undefined) updateData.status = status;
      if (responsibleId !== undefined) updateData.responsible_id = responsibleId || null;
    }

    const { data: updatedReq, error: updateError } = await supabase
      .from("requirements")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      if (updateError.code === "23505") {
        return {
          success: false,
          error:
            scope === "project"
              ? `Já existe um requisito com o código "${normalizedCode}" neste projeto.`
              : `Você já possui um requisito global com o código "${normalizedCode}".`,
        };
      }
      return { success: false, error: updateError.message };
    }

    // Criar nova versão no histórico
    try {
      const currentVersion = (updatedReq.current_version || 1) + 1;
      await supabase.from("requirement_versions").insert({
        requirement_id: id,
        version_number: currentVersion,
        changed_by: user.id,
        change_summary: versionComment || "Atualização dos dados do requisito.",
        snapshot: updateData,
      });

      await supabase
        .from("requirements")
        .update({ current_version: currentVersion })
        .eq("id", id);
    } catch (verErr) {
      console.warn("Aviso ao registrar nova versão:", verErr);
    }

    revalidatePath("/requisitos");
    revalidatePath("/requisitos/globais");
    return { success: true, data: updatedReq };
  } catch (err) {
    console.error("Erro inesperado em updateRequirementAction:", err);
    return { success: false, error: "Erro interno no servidor ao atualizar requisito." };
  }
}

/**
 * Exclusão de Requisito
 */
export async function deleteRequirementAction(id) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Usuário não autenticado." };
    }

    // Remover vínculos associativos primeiro
    try {
      await supabase.from("project_requirements").delete().eq("requirement_id", id);
      await supabase.from("requirement_user_stories").delete().eq("requirement_id", id);
    } catch {}

    const { error: deleteError } = await supabase
      .from("requirements")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }

    revalidatePath("/requisitos");
    revalidatePath("/requisitos/globais");
    return { success: true };
  } catch (err) {
    console.error("Erro inesperado em deleteRequirementAction:", err);
    return { success: false, error: "Erro interno no servidor ao excluir requisito." };
  }
}

/**
 * Busca requisitos disponíveis para importação no projeto atual:
 * 1. Meus Requisitos Globais (project_id IS NULL AND created_by = user.id)
 * 2. De Outros Projetos (onde o usuário é membro, excluindo o projeto atual)
 */
export async function getAvailableRequirementsForImportAction(targetProjectId) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Usuário não autenticado." };
    }

    // 1. Requisitos Globais do Usuário
    const { data: globalReqs, error: globalErr } = await supabase
      .from("requirements")
      .select("*")
      .is("project_id", null)
      .eq("created_by", user.id)
      .order("code", { ascending: true });

    // 2. Requisitos de outros projetos vinculados ao usuário
    let otherProjectReqs = [];
    try {
      const { data: userProjects } = await supabase
        .from("project_members")
        .select("project_id, projects(id, name)")
        .eq("user_id", user.id);

      const otherProjectIds = (userProjects || [])
        .map((p) => p.project_id)
        .filter((pid) => pid && pid !== targetProjectId);

      if (otherProjectIds.length > 0) {
        const { data: linkedReqs } = await supabase
          .from("project_requirements")
          .select(`
            project_id,
            projects:project_id(id, name),
            requirement:requirements(*)
          `)
          .in("project_id", otherProjectIds);

        if (linkedReqs && linkedReqs.length > 0) {
          otherProjectReqs = linkedReqs
            .filter((item) => item.requirement)
            .map((item) => ({
              ...item.requirement,
              project_name: item.projects?.name || "Outro Projeto",
              origin_project_id: item.project_id,
            }));
        }
      }
    } catch (projErr) {
      console.warn("Aviso ao buscar requisitos de outros projetos:", projErr);
    }

    return {
      success: true,
      globals: globalReqs || [],
      otherProjects: otherProjectReqs || [],
    };
  } catch (err) {
    console.error("Erro inesperado em getAvailableRequirementsForImportAction:", err);
    return { success: false, error: "Erro ao buscar requisitos para importação." };
  }
}

/**
 * RF.33 / RF.34 - Importação e Reutilização de Requisitos (Deep Clone / Cópia Profunda)
 * Clona os requisitos selecionados para o targetProjectId com status = 'proposed'.
 */
export async function importRequirementToProjectAction({ targetProjectId, requirementIds = [] }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Usuário não autenticado." };
    }

    if (!targetProjectId || !requirementIds || requirementIds.length === 0) {
      return { success: false, error: "Nenhum requisito selecionado para importação." };
    }

    // 1. Obter os dados originais dos requisitos a serem clonados
    const { data: originals, error: fetchErr } = await supabase
      .from("requirements")
      .select("*")
      .in("id", requirementIds);

    if (fetchErr || !originals || originals.length === 0) {
      return { success: false, error: "Não foi possível carregar os requisitos para clonagem." };
    }

    // 2. Buscar códigos já existentes no projeto de destino para evitar conflito
    const { data: targetExisting } = await supabase
      .from("requirements")
      .select("code")
      .eq("project_id", targetProjectId);

    const existingCodes = new Set((targetExisting || []).map((r) => r.code?.toUpperCase()));

    let importedCount = 0;
    const importedCodes = [];

    // 3. Executar cópia profunda de cada requisito
    for (const original of originals) {
      let codeToUse = original.code?.trim().toUpperCase();

      // Se o código já existir no projeto de destino, gera um sufixo numérico
      if (existingCodes.has(codeToUse)) {
        let counter = 1;
        while (existingCodes.has(`${codeToUse}-${counter}`)) {
          counter++;
        }
        codeToUse = `${codeToUse}-${counter}`;
      }

      existingCodes.add(codeToUse);

      const clonePayload = {
        code: codeToUse,
        title: original.title,
        description: original.description,
        type: original.type,
        priority: original.priority,
        status: "proposed", // Conforme especificação do TCC: importados iniciam como 'proposto'
        justification: original.justification,
        source: original.source ? `Reutilizado: ${original.source}` : "Importado e reutilizado",
        acceptance_criteria: original.acceptance_criteria,
        responsible_id: null, // Deixa aberto para atribuição no novo projeto
        created_by: user.id,
        user_id: user.id,
        project_id: targetProjectId,
        current_version: 1,
      };

      let newReq = null;
      const insertRes = await supabase
        .from("requirements")
        .insert(clonePayload)
        .select()
        .single();

      if (insertRes.error && insertRes.error.code === "42703") {
        // Fallback sem project_id caso a coluna ainda não exista no Postgres
        const fallbackData = { ...clonePayload };
        delete fallbackData.project_id;
        delete fallbackData.user_id;

        const fbRes = await supabase
          .from("requirements")
          .insert(fallbackData)
          .select()
          .single();

        if (!fbRes.error) newReq = fbRes.data;
      } else if (!insertRes.error) {
        newReq = insertRes.data;
      }

      if (newReq?.id) {
        importedCount++;
        importedCodes.push(newReq.code);

        // Vincular ao projeto em project_requirements
        try {
          await supabase.from("project_requirements").insert({
            project_id: targetProjectId,
            requirement_id: newReq.id,
          });
        } catch {}

        // Registrar versão inicial de importação
        try {
          await supabase.from("requirement_versions").insert({
            requirement_id: newReq.id,
            version_number: 1,
            changed_by: user.id,
            change_summary: `Requisito importado e reutilizado (Origem: ${original.code}).`,
            snapshot: clonePayload,
          });
        } catch {}
      }
    }

    revalidatePath("/requisitos");
    return {
      success: true,
      count: importedCount,
      importedCodes,
      message: `${importedCount} requisito(s) importado(s) com sucesso para o projeto!`,
    };
  } catch (err) {
    console.error("Erro inesperado em importRequirementToProjectAction:", err);
    return { success: false, error: "Erro interno ao importar requisitos." };
  }
}
