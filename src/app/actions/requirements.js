"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function isMissingColumnError(error) {
  if (!error) return false;
  const msg = (error.message || "").toLowerCase();
  const details = (error.details || "").toLowerCase();
  const hint = (error.hint || "").toLowerCase();
  const code = error.code || "";
  return (
    msg.includes("project_id") ||
    msg.includes("user_id") ||
    msg.includes("schema cache") ||
    msg.includes("column") ||
    details.includes("project_id") ||
    details.includes("user_id") ||
    hint.includes("project_id") ||
    code === "PGRST204" ||
    code === "42703"
  );
}

/**
 * Busca os Requisitos Globais da Biblioteca Pessoal do usuário autenticado.
 * Garante estritamente que APENAS os requisitos criados pelo usuário atual sejam retornados.
 */
export async function getGlobalRequirementsAction() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Usuário não autenticado.", data: [] };
    }

    // 1. Tentar buscar requisitos onde project_id IS NULL pertencentes estritamente ao user.id
    try {
      const { data: globalReqs, error: globalErr } = await supabase
        .from("requirements")
        .select("*")
        .is("project_id", null)
        .or(`created_by.eq.${user.id},user_id.eq.${user.id}`)
        .order("code", { ascending: true });

      if (!globalErr && globalReqs) {
        return { success: true, data: globalReqs };
      }
    } catch {}

    // 2. Fallback caso a coluna project_id ou user_id ainda não exista no schema cache do Supabase
    try {
      const { data: allUserReqs, error: userErr } = await supabase
        .from("requirements")
        .select("*")
        .eq("created_by", user.id)
        .order("code", { ascending: true });

      if (!userErr && allUserReqs && allUserReqs.length > 0) {
        const { data: linked } = await supabase
          .from("project_requirements")
          .select("requirement_id");
        const linkedSet = new Set((linked || []).map((l) => l.requirement_id));
        const filtered = allUserReqs.filter(
          (r) => !linkedSet.has(r.id) || r.source?.includes("Biblioteca")
        );
        return { success: true, data: filtered };
      }
    } catch {}

    return { success: true, data: [] };
  } catch (err) {
    console.error("Erro inesperado em getGlobalRequirementsAction:", err);
    return { success: false, error: "Erro interno ao buscar requisitos globais.", data: [] };
  }
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
      status = "under_review",
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
          status: status || "under_review",
          justification: justification?.trim() || null,
          source: source?.trim() || (scope === "global" ? "Biblioteca Pessoal" : null),
          acceptance_criteria: acceptanceCriteria?.trim() || null,
          responsible_id: responsibleId || null,
          created_by: user.id,
        };

        let fallbackRes = await supabase
          .from("requirements")
          .insert(fallbackData)
          .select()
          .single();

        // Se falhar pela constraint de status antiga que não aceita 'not_approved'
        if (
          fallbackRes.error &&
          fallbackRes.error.message?.includes("requirements_status_check") &&
          fallbackData.status === "not_approved"
        ) {
          fallbackData.status = "cancelled";
          fallbackRes = await supabase
            .from("requirements")
            .insert(fallbackData)
            .select()
            .single();
        }

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
      userStoryId,
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

    // Atualizar vínculo com User Story caso informada
    if (scope === "project" && userStoryId !== undefined) {
      try {
        if (userStoryId) {
          await supabase.from("requirement_user_stories").upsert(
            {
              requirement_id: id,
              user_story_id: userStoryId,
            },
            { onConflict: "requirement_id,user_story_id" }
          );
        }
      } catch (usErr) {
        console.warn("Aviso ao atualizar vínculo de User Story:", usErr);
      }
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
        status: "under_review",
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

/**
 * Server Action para aprovação rápida ou alteração direta de status do requisito.
 * Suporta os 3 status simplificados: 'under_review' (Em Análise), 'approved' (Aprovado), 'not_approved' (Não Aprovado).
 */
export async function updateRequirementStatusAction({ id, status, projectId }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Usuário não autenticado." };
    }

    if (!id || !status) {
      return { success: false, error: "ID e status são obrigatórios." };
    }

    const validStatuses = ["under_review", "approved", "not_approved"];
    if (!validStatuses.includes(status)) {
      return { success: false, error: "Status do requisito inválido." };
    }

    // 1. Obter dados do requisito
    let targetProjId = projectId;
    let reqCode = "REQ";

    try {
      const { data: req } = await supabase
        .from("requirements")
        .select("id, code, title")
        .eq("id", id)
        .maybeSingle();

      if (req) {
        reqCode = req.code;
      }
    } catch {}

    // 2. Atualizar status no banco
    let { data: updated, error: updateErr } = await supabase
      .from("requirements")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    // Fallback se constraint antiga não aceitar 'not_approved'
    if (
      updateErr &&
      updateErr.message?.includes("requirements_status_check") &&
      status === "not_approved"
    ) {
      const retryRes = await supabase
        .from("requirements")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (!retryRes.error) {
        updated = { ...retryRes.data, status: "not_approved" };
        updateErr = null;
      }
    }

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    // 3. Registrar na auditoria
    if (targetProjId) {
      const statusActionText =
        status === "approved"
          ? "aprovou o requisito"
          : status === "not_approved"
          ? "reprovou (marcou como Não Aprovado) o requisito"
          : "colocou o requisito em análise";

      try {
        await supabase.from("audit_logs").insert({
          project_id: targetProjId,
          user_id: user.id,
          entity_type: "requirement",
          entity_id: id,
          action: "updated",
          description: `${statusActionText} ${reqCode}`,
        });
      } catch (auditErr) {
        console.warn("Aviso ao registrar auditoria de status:", auditErr);
      }
    }

    revalidatePath("/", "layout");
    revalidatePath("/requisitos");
    return { success: true, data: updated };
  } catch (err) {
    console.error("Exceção em updateRequirementStatusAction:", err);
    return { success: false, error: "Erro interno ao atualizar status do requisito." };
  }
}

/**
 * RF.24 - Buscar comentários e decisões vinculados a um requisito
 */
export async function getRequirementCommentsAction(requirementId) {
  try {
    if (!requirementId) return { success: true, data: [] };
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("audit_logs")
      .select("id, user_id, action, description, details, created_at, profiles(full_name, email)")
      .eq("entity_type", "requirement_comment")
      .eq("entity_id", String(requirementId))
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: error.message, data: [] };
    }

    const formatted = (data || []).map((row) => ({
      id: row.id,
      author: row.profiles?.full_name || "Membro do Projeto",
      commentType: row.details?.commentType || (row.action === "decision" ? "decision" : "comment"),
      content: row.details?.content || row.description,
      createdAt: row.created_at,
    }));

    return { success: true, data: formatted };
  } catch (err) {
    console.error("Exceção em getRequirementCommentsAction:", err);
    return { success: false, data: [] };
  }
}

/**
 * RF.24 - Registrar novo comentário ou decisão técnica/negócio em um requisito
 */
export async function addRequirementCommentAction({
  requirementId,
  requirementCode,
  projectId,
  content,
  commentType = "comment", // 'comment' | 'decision'
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

    if (!requirementId || !content?.trim()) {
      return { success: false, error: "O texto do comentário/decisão é obrigatório." };
    }

    const trimmed = content.trim();
    const isDecision = commentType === "decision";

    const { data: inserted, error: insertErr } = await supabase
      .from("audit_logs")
      .insert({
        project_id: projectId || null,
        user_id: user.id,
        entity_type: "requirement_comment",
        entity_id: String(requirementId),
        action: isDecision ? "decision" : "commented",
        description: `${isDecision ? "registrou uma decisão em" : "comentou no requisito"} ${requirementCode || "REQ"}: "${trimmed.slice(0, 80)}${trimmed.length > 80 ? "..." : ""}"`,
        details: {
          content: trimmed,
          commentType: isDecision ? "decision" : "comment",
          requirementCode: requirementCode || "REQ",
        },
      })
      .select("id, user_id, action, description, details, created_at, profiles(full_name)")
      .single();

    if (insertErr) {
      return { success: false, error: insertErr.message };
    }

    revalidatePath("/", "layout");
    return {
      success: true,
      data: {
        id: inserted.id,
        author: inserted.profiles?.full_name || "Você",
        commentType: isDecision ? "decision" : "comment",
        content: trimmed,
        createdAt: inserted.created_at,
      },
    };
  } catch (err) {
    console.error("Exceção em addRequirementCommentAction:", err);
    return { success: false, error: "Erro ao registrar comentário." };
  }
}

/**
 * RF.20 & RF.21 - Buscar dependências entre requisitos e artefatos impactados (Análise de Impacto)
 */
export async function getRequirementDependenciesAction(requirementId) {
  try {
    if (!requirementId) {
      return { success: true, dependencies: [], impactedStories: [] };
    }
    const supabase = await createClient();

    // 1. Buscar dependências onde este requisito é origem ou destino
    const [outgoingRes, incomingRes, storiesRes] = await Promise.all([
      supabase
        .from("requirement_dependencies")
        .select(
          "id, source_req_id, target_req_id, dependency_type, target:target_req_id(id, code, title, status, priority)"
        )
        .eq("source_req_id", requirementId),
      supabase
        .from("requirement_dependencies")
        .select(
          "id, source_req_id, target_req_id, dependency_type, source:source_req_id(id, code, title, status, priority)"
        )
        .eq("target_req_id", requirementId),
      supabase
        .from("requirement_user_stories")
        .select("user_story_id, user_stories(id, code, title, status, priority)")
        .eq("requirement_id", requirementId),
    ]);

    const outgoing = (outgoingRes.data || []).map((d) => ({
      id: d.id,
      direction: "outgoing",
      dependencyType: d.dependency_type,
      relatedReq: d.target,
    }));

    const incoming = (incomingRes.data || []).map((d) => ({
      id: d.id,
      direction: "incoming",
      dependencyType: d.dependency_type,
      relatedReq: d.source,
    }));

    const impactedStories = (storiesRes.data || [])
      .map((s) => s.user_stories)
      .filter(Boolean);

    return {
      success: true,
      dependencies: [...outgoing, ...incoming].filter((d) => d.relatedReq),
      impactedStories,
    };
  } catch (err) {
    console.error("Exceção em getRequirementDependenciesAction:", err);
    return { success: false, dependencies: [], impactedStories: [] };
  }
}

/**
 * RF.20 - Adicionar dependência entre requisitos (conflito, complemento, refinamento, dependência)
 */
export async function addRequirementDependencyAction({
  projectId,
  sourceReqId,
  targetReqId,
  dependencyType = "depends_on",
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

    if (!sourceReqId || !targetReqId) {
      return { success: false, error: "Selecione o requisito relacionado." };
    }

    if (sourceReqId === targetReqId) {
      return {
        success: false,
        error: "Um requisito não pode depender de si mesmo.",
      };
    }

    const validTypes = ["depends_on", "complements", "refines", "conflict"];
    const finalType = validTypes.includes(dependencyType)
      ? dependencyType
      : "depends_on";

    const { data: inserted, error: insertErr } = await supabase
      .from("requirement_dependencies")
      .insert({
        source_req_id: sourceReqId,
        target_req_id: targetReqId,
        dependency_type: finalType,
      })
      .select(
        "id, source_req_id, target_req_id, dependency_type, target:target_req_id(id, code, title, status, priority)"
      )
      .single();

    if (insertErr) {
      if (insertErr.code === "23505") {
        return {
          success: false,
          error: "Esta relação de dependência já está registrada.",
        };
      }
      return { success: false, error: insertErr.message };
    }

    if (projectId) {
      try {
        await supabase.from("audit_logs").insert({
          project_id: projectId,
          user_id: user.id,
          entity_type: "requirement",
          entity_id: sourceReqId,
          action: "linked",
          description: `registrou dependência (${finalType}) com o requisito ${inserted?.target?.code || ""}`,
        });
      } catch {}
    }

    return {
      success: true,
      data: {
        id: inserted.id,
        direction: "outgoing",
        dependencyType: inserted.dependency_type,
        relatedReq: inserted.target,
      },
    };
  } catch (err) {
    console.error("Exceção em addRequirementDependencyAction:", err);
    return { success: false, error: "Erro interno ao registrar dependência." };
  }
}

/**
 * RF.20 - Remover dependência entre requisitos
 */
export async function removeRequirementDependencyAction({ dependencyId }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Usuário não autenticado." };
    }

    const { error } = await supabase
      .from("requirement_dependencies")
      .delete()
      .eq("id", dependencyId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("Exceção em removeRequirementDependencyAction:", err);
    return { success: false, error: "Erro ao remover dependência." };
  }
}
