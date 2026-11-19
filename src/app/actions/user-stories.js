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

/**
 * Catálogo Oficial das 25 User Stories do ReqFlow extraídas do Google Drive (Modelagem Oficial)
 */
const REQFLOW_OFFICIAL_USER_STORIES = [
  {
    code: "US-01",
    title: "Autenticação e perfil do usuário",
    as_a: "Como usuário",
    i_want: "eu quero me cadastrar, fazer login e logout e editar meu perfil",
    so_that: "para que eu possa acessar a plataforma de forma segura e personalizada.",
    priority: "high",
    related_reqs: ["RF-01", "RF-02", "RF-03"],
  },
  {
    code: "US-02",
    title: "Perfis de acesso e controle de permissões",
    as_a: "Como administrador",
    i_want: "eu quero definir perfis de acesso e controlar permissões dos usuários",
    so_that: "para que cada pessoa tenha acesso apenas às funcionalidades compatíveis com seu papel no projeto.",
    priority: "high",
    related_reqs: ["RF-04", "RF-05"],
  },
  {
    code: "US-03",
    title: "Gerenciamento e listagem de projetos",
    as_a: "Como analista de requisitos",
    i_want: "eu quero gerenciar projetos de software e listá-los",
    so_that: "para que eu possa organizar os requisitos de cada sistema separadamente.",
    priority: "high",
    related_reqs: ["RF-06", "RF-07"],
  },
  {
    code: "US-04",
    title: "Colaboração multiusuário em projetos",
    as_a: "Como analista de requisitos",
    i_want: "eu quero permitir que mais de um usuário gerencie o mesmo projeto",
    so_that: "para que a equipe possa colaborar na especificação dos requisitos.",
    priority: "high",
    related_reqs: ["RF-08"],
  },
  {
    code: "US-05",
    title: "Gestão de histórias de usuário no padrão Scrum",
    as_a: "Como Product Owner",
    i_want: "eu quero gerenciar histórias de usuário no formato padrão Scrum",
    so_that: "para que as necessidades do sistema sejam representadas de forma orientada ao valor do usuário.",
    priority: "high",
    related_reqs: ["RF-09"],
  },
  {
    code: "US-06",
    title: "Gestão centralizada de requisitos funcionais e não-funcionais",
    as_a: "Como analista de requisitos",
    i_want: "eu quero gerenciar requisitos funcionais e não funcionais vinculados a um projeto",
    so_that: "para que toda a documentação de requisitos esteja centralizada e organizada.",
    priority: "high",
    related_reqs: ["RF-10", "RF-11", "RF-12"],
  },
  {
    code: "US-07",
    title: "Especificação detalhada, prioridade, status e fontes",
    as_a: "Como analista de requisitos",
    i_want: "eu quero registrar descrição detalhada, prioridade, status e fonte de cada requisito",
    so_that: "para que os requisitos sejam claros, completos e rastreáveis.",
    priority: "high",
    related_reqs: ["RF-13", "RF-14", "RF-15", "RF-18"],
  },
  {
    code: "US-08",
    title: "Associação de requisitos a histórias e stakeholders",
    as_a: "Como analista de requisitos",
    i_want: "eu quero associar requisitos às histórias de usuário e aos stakeholders responsáveis",
    so_that: "para que a rastreabilidade entre necessidades e especificações seja mantida.",
    priority: "high",
    related_reqs: ["RF-16", "RF-17"],
  },
  {
    code: "US-09",
    title: "Gestão de stakeholders do projeto",
    as_a: "Como analista de requisitos",
    i_want: "eu quero gerenciar stakeholders do projeto",
    so_that: "para que eu possa relacioná-los aos requisitos e às decisões tomadas ao longo do desenvolvimento.",
    priority: "medium",
    related_reqs: ["RF-26"],
  },
  {
    code: "US-10",
    title: "Refinamento e dependências entre requisitos",
    as_a: "Como analista de requisitos",
    i_want: "eu quero refinar requisitos antes de sua aprovação final e registrar dependências entre eles",
    so_that: "para que inconsistências e conflitos sejam identificados e resolvidos antes da implementação.",
    priority: "high",
    related_reqs: ["RF-19", "RF-20"],
  },
  {
    code: "US-11",
    title: "Análise de impacto em alterações de requisitos",
    as_a: "Como gerente de projeto",
    i_want: "eu quero realizar análise de impacto quando um requisito for alterado",
    so_that: "para que eu possa identificar quais outros requisitos e artefatos serão afetados pela mudança.",
    priority: "high",
    related_reqs: ["RF-21"],
  },
  {
    code: "US-12",
    title: "Histórico de alterações e controle de versões",
    as_a: "Como analista de requisitos",
    i_want: "eu quero manter histórico de alterações e controlar versões dos requisitos",
    so_that: "para que eu possa acompanhar sua evolução e recuperar informações anteriores quando necessário.",
    priority: "high",
    related_reqs: ["RF-22", "RF-23"],
  },
  {
    code: "US-13",
    title: "Decisões, comentários e validações nos requisitos",
    as_a: "Como usuário da plataforma",
    i_want: "eu quero registrar decisões, comentários e validações vinculados aos requisitos",
    so_that: "para que o conhecimento gerado nas reuniões e revisões fique documentado e acessível.",
    priority: "medium",
    related_reqs: ["RF-24", "RF-25"],
  },
  {
    code: "US-14",
    title: "Organização do backlog priorizado e associação a sprints",
    as_a: "Como Product Owner",
    i_want: "eu quero organizar requisitos e histórias de usuário em um backlog priorizado e associá-los a sprints",
    so_that: "para que o planejamento das iterações de desenvolvimento seja claro e estruturado.",
    priority: "high",
    related_reqs: ["RF-27", "RF-28"],
  },
  {
    code: "US-15",
    title: "Casos de uso e vínculo com requisitos funcionais",
    as_a: "Como analista de requisitos",
    i_want: "eu quero cadastrar casos de uso e vinculá-los aos requisitos funcionais correspondentes",
    so_that: "para que as interações entre atores e sistema sejam detalhadas e rastreáveis.",
    priority: "medium",
    related_reqs: ["RF-29", "RF-30"],
  },
  {
    code: "US-16",
    title: "Matriz de rastreabilidade bidirecional",
    as_a: "Como gerente de projeto",
    i_want: "eu quero gerar uma matriz de rastreabilidade",
    so_that: "para que eu possa visualizar as relações entre requisitos, stakeholders, casos de uso e histórias de usuário.",
    priority: "high",
    related_reqs: ["RF-31"],
  },
  {
    code: "US-17",
    title: "Consulta e filtragem avançada de requisitos",
    as_a: "Como usuário da plataforma",
    i_want: "eu quero consultar e filtrar requisitos por diferentes critérios",
    so_that: "para que eu possa localizar informações específicas com rapidez e facilidade.",
    priority: "high",
    related_reqs: ["RF-32"],
  },
  {
    code: "US-18",
    title: "Reutilização de requisitos e biblioteca genérica",
    as_a: "Como analista de requisitos",
    i_want: "eu quero reutilizar requisitos de outros projetos e acessar uma biblioteca de requisitos genéricos",
    so_that: "para que o tempo de especificação de novos projetos seja reduzido.",
    priority: "medium",
    related_reqs: ["RF-33", "RF-34"],
  },
  {
    code: "US-19",
    title: "Anexos de documentos e imagens aos requisitos",
    as_a: "Como analista de requisitos",
    i_want: "eu quero anexar documentos, imagens e arquivos aos requisitos",
    so_that: "para que a especificação seja complementada com evidências e materiais de apoio.",
    priority: "low",
    related_reqs: ["RF-35"],
  },
  {
    code: "US-20",
    title: "Alerta inteligente de requisitos incompletos",
    as_a: "Como analista de requisitos",
    i_want: "eu quero ser alertado quando um requisito estiver incompleto",
    so_that: "para que lacunas sejam corrigidas antes da aprovação.",
    priority: "high",
    related_reqs: ["RF-36"],
  },
  {
    code: "US-21",
    title: "Geração de SRS e exportação multiformato",
    as_a: "Como analista de requisitos",
    i_want: "eu quero gerar automaticamente um documento de especificação de requisitos e exportá-los em diferentes formatos",
    so_that: "para que a documentação formal do projeto possa ser compartilhada e arquivada.",
    priority: "medium",
    related_reqs: ["RF-37"],
  },
  {
    code: "US-22",
    title: "Dashboard de indicadores e relatórios analíticos",
    as_a: "Como gerente de projeto",
    i_want: "eu quero visualizar um dashboard com indicadores e gerar relatórios sobre os requisitos",
    so_that: "para que o acompanhamento do progresso do projeto seja feito de forma rápida e visual.",
    priority: "medium",
    related_reqs: ["RF-38", "RF-39"],
  },
  {
    code: "US-23",
    title: "Central de notificações e alertas de mudanças",
    as_a: "Como usuário da plataforma",
    i_want: "eu quero receber notificações sobre alterações, comentários e aprovações",
    so_that: "para que eu seja informado de mudanças importantes sem precisar verificar manualmente.",
    priority: "medium",
    related_reqs: ["RF-40"],
  },
  {
    code: "US-24",
    title: "Trilha de auditoria das ações dos usuários",
    as_a: "Como administrador",
    i_want: "eu quero manter uma trilha de auditoria das ações dos usuários",
    so_that: "para que seja possível rastrear criações, edições, exclusões e aprovações realizadas na plataforma.",
    priority: "medium",
    related_reqs: ["RF-41"],
  },
  {
    code: "US-25",
    title: "Pesquisa de similaridade e linha do tempo do requisito",
    as_a: "Como analista de requisitos",
    i_want: "eu quero pesquisar requisitos semelhantes e visualizar a linha do tempo de evolução de cada requisito",
    so_that: "para que duplicidades sejam evitadas e o histórico completo do requisito seja acessível.",
    priority: "medium",
    related_reqs: ["RF-42", "RF-43"],
  },
];

/**
 * Função direta para semear as 25 User Stories do ReqFlow no banco
 */
export async function ensureReqflowUserStoriesDirectly(supabase, userId, projectId) {
  if (!supabase || !userId || !projectId) return { success: false, error: "Dados incompletos." };

  try {
    // 1. Buscar requisitos existentes do projeto para mapear código -> id
    let reqCodeToId = {};
    try {
      const { data: projReqs } = await supabase
        .from("requirements")
        .select("id, code")
        .eq("project_id", projectId);

      if (projReqs && projReqs.length > 0) {
        projReqs.forEach((r) => {
          if (r.code) reqCodeToId[r.code.toUpperCase()] = r.id;
        });
      }
    } catch {}

    // 2. Inserir/Atualizar cada uma das 25 User Stories
    let insertedCount = 0;
    for (const story of REQFLOW_OFFICIAL_USER_STORIES) {
      try {
        const { data: upsertedStory } = await supabase
          .from("user_stories")
          .upsert(
            {
              project_id: projectId,
              code: story.code,
              title: story.title,
              as_a: story.as_a,
              i_want: story.i_want,
              so_that: story.so_that,
              priority: story.priority,
              status: "backlog",
              responsible_id: userId,
            },
            { onConflict: "project_id,code" }
          )
          .select("id")
          .maybeSingle();

        if (upsertedStory?.id) {
          insertedCount++;

          // 3. Vincular aos requisitos relacionados
          const matchedReqIds = (story.related_reqs || [])
            .map((c) => reqCodeToId[c.toUpperCase()])
            .filter(Boolean);

          if (matchedReqIds.length > 0) {
            const links = matchedReqIds.map((rId) => ({
              requirement_id: rId,
              user_story_id: upsertedStory.id,
            }));

            try {
              await supabase
                .from("requirement_user_stories")
                .upsert(links, { onConflict: "requirement_id,user_story_id" });
            } catch (linkErr) {
              console.warn(`Aviso ao vincular links da story ${story.code}:`, linkErr);
            }
          }
        }
      } catch (stErr) {
        console.warn(`Aviso ao inserir story ${story.code}:`, stErr);
      }
    }

    // 4. Registrar na auditoria
    try {
      await supabase.from("audit_logs").insert({
        project_id: projectId,
        user_id: userId,
        entity_type: "project",
        entity_id: projectId,
        action: "seed_user_stories",
        description: `Carga direta de ${insertedCount} User Stories oficiais do ReqFlow (Modelagem).`,
      });
    } catch {}

    return { success: true, count: insertedCount };
  } catch (err) {
    console.error("Erro em ensureReqflowUserStoriesDirectly:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Server Action para lançar diretamente as 25 User Stories no projeto ReqFlow
 */
export async function seedAllReqflowUserStoriesAction({ projectId }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Usuário não autenticado." };
    }

    let targetProjectId = projectId;

    // Se projectId não foi informado, buscar o projeto do usuário com nome 'ReqFlow'
    if (!targetProjectId) {
      const { data: userProjects } = await supabase
        .from("projects")
        .select("id, name")
        .order("created_at", { ascending: false });

      const reqflowProj = (userProjects || []).find((p) =>
        p.name?.toLowerCase().includes("reqflow")
      );
      targetProjectId = reqflowProj ? reqflowProj.id : userProjects?.[0]?.id;
    }

    if (!targetProjectId) {
      return { success: false, error: "Projeto ReqFlow não localizado para este usuário." };
    }

    const result = await ensureReqflowUserStoriesDirectly(supabase, user.id, targetProjectId);

    revalidatePath("/");
    revalidatePath("/user-stories");
    revalidatePath("/backlog");
    revalidatePath("/rastreabilidade");
    revalidatePath("/requisitos");

    return result;
  } catch (err) {
    console.error("Erro em seedAllReqflowUserStoriesAction:", err);
    return { success: false, error: err.message || "Erro interno ao lançar user stories." };
  }
}


