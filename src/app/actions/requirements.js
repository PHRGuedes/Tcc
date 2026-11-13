"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function isMissingColumnError(error) {
  if (!error) return false;
  const msg = (error.message || "").toLowerCase();
  const code = error.code || "";
  return (
    msg.includes("project_id") ||
    msg.includes("schema cache") ||
    code === "PGRST204" ||
    code === "42703"
  );
}

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

    // 1. Checagem prévia contextual de unicidade no banco (com tolerância a ausência da coluna project_id)
    if (scope === "project") {
      try {
        const { data: existingProjectReq, error: checkErr } = await supabase
          .from("requirements")
          .select("id, code, project_id")
          .eq("code", normalizedCode)
          .eq("project_id", projectId)
          .maybeSingle();

        if (!checkErr && existingProjectReq) {
          return {
            success: false,
            error: `Já existe um requisito com o código "${normalizedCode}" neste projeto.`,
          };
        }

        // Fallback se project_id ainda não existir no schema cache
        if (checkErr && isMissingColumnError(checkErr)) {
          const { data: linkedCheck } = await supabase
            .from("project_requirements")
            .select("requirement_id, requirements!inner(id, code)")
            .eq("project_id", projectId)
            .eq("requirements.code", normalizedCode)
            .maybeSingle();

          if (linkedCheck) {
            return {
              success: false,
              error: `Já existe um requisito com o código "${normalizedCode}" neste projeto.`,
            };
          }
        }
      } catch {}
    } else {
      try {
        const { data: existingGlobalReq, error: checkErr } = await supabase
          .from("requirements")
          .select("id, code, created_by")
          .eq("code", normalizedCode)
          .is("project_id", null)
          .eq("created_by", user.id)
          .maybeSingle();

        if (!checkErr && existingGlobalReq) {
          return {
            success: false,
            error: `Você já possui um requisito global com o código "${normalizedCode}".`,
          };
        }

        // Fallback se project_id ainda não existir no schema cache
        if (checkErr && isMissingColumnError(checkErr)) {
          const { data: userReq } = await supabase
            .from("requirements")
            .select("id, code")
            .eq("code", normalizedCode)
            .eq("created_by", user.id)
            .maybeSingle();

          if (userReq) {
            return {
              success: false,
              error: `Você já possui um requisito global com o código "${normalizedCode}".`,
            };
          }
        }
      } catch {}
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

    // 2. Tentar inserção direta com project_id
    let newReq = null;
    let insertError = null;

    const insertRes = await supabase
      .from("requirements")
      .insert(reqData)
      .select()
      .single();

    if (insertRes.error) {
      // Se a coluna project_id ainda não existe no schema cache do Supabase (migração 0007 ainda não executada),
      // faz fallback salvando com os campos padrão e associando via project_requirements.
      if (isMissingColumnError(insertRes.error)) {
        const fallbackData = {
          code: normalizedCode,
          title: title?.trim() || description?.trim().slice(0, 50) || "Sem título",
          description: description?.trim() || title?.trim(),
          type,
          priority,
          status: status || "proposed",
          justification: justification?.trim() || null,
          source: source?.trim() || (scope === "global" ? "Biblioteca Pessoal" : null),
          acceptance_criteria: acceptanceCriteria?.trim() || null,
          responsible_id: responsibleId || null,
          created_by: user.id,
        };

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

    // 3. Se for requisito de projeto, garantir registro associativo em project_requirements
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

    // 4. Registrar Versão Inicial
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
    let globalReqs = [];
    const { data: gData, error: gErr } = await supabase
      .from("requirements")
      .select("*")
      .is("project_id", null)
      .eq("created_by", user.id)
      .order("code", { ascending: true });

    if (!gErr && gData) {
      globalReqs = gData;
    } else {
      // Fallback caso a coluna project_id ainda não exista
      const { data: allUserReqs } = await supabase
        .from("requirements")
        .select("*")
        .eq("created_by", user.id)
        .order("code", { ascending: true });

      if (allUserReqs && allUserReqs.length > 0) {
        const { data: linked } = await supabase.from("project_requirements").select("requirement_id");
        const linkedSet = new Set((linked || []).map((l) => l.requirement_id));
        globalReqs = allUserReqs.filter((r) => !linkedSet.has(r.id) || r.source?.includes("Biblioteca"));
      }
    }

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
    let existingCodes = new Set();
    try {
      const { data: targetExisting, error: targetErr } = await supabase
        .from("requirements")
        .select("code, project_id")
        .eq("project_id", targetProjectId);

      if (!targetErr && targetExisting) {
        existingCodes = new Set(targetExisting.map((r) => r.code?.toUpperCase()));
      } else {
        // Fallback via project_requirements
        const { data: linkedData } = await supabase
          .from("project_requirements")
          .select("requirement:requirements(code)")
          .eq("project_id", targetProjectId);

        if (linkedData) {
          existingCodes = new Set(
            linkedData
              .map((l) => l.requirement?.code?.toUpperCase())
              .filter(Boolean)
          );
        }
      }
    } catch {}

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
        status: "proposed",
        justification: original.justification,
        source: original.source ? `Reutilizado: ${original.source}` : "Importado e reutilizado",
        acceptance_criteria: original.acceptance_criteria,
        responsible_id: null,
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

      if (insertRes.error && isMissingColumnError(insertRes.error)) {
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
