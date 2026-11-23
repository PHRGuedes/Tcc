/**
 * Serviço de Carga Direta das 25 User Stories Oficiais do ReqFlow (Modelagem)
 * Este arquivo NÃO é uma Server Action ("use server"), portanto pode exportar
 * objetos, constantes e funções normais livremente.
 */

export const REQFLOW_OFFICIAL_USER_STORIES = [
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
    related_reqs: ["RF-25"],
  },
  {
    code: "US-10",
    title: "Refinamento e dependências entre requisitos",
    as_a: "Como analista de requisitos",
    i_want: "eu quero refinar requisitos antes de sua aprovação final e registrar dependências entre eles",
    so_that: "para que inconsistências e conflitos sejam identificados e resolvidos antes da implementação.",
    priority: "high",
    related_reqs: ["RF-19"],
  },
  {
    code: "US-11",
    title: "Análise de impacto em alterações de requisitos",
    as_a: "Como gerente de projeto",
    i_want: "eu quero realizar análise de impacto quando um requisito for alterado",
    so_that: "para que eu possa identificar quais outros requisitos e artefatos serão afetados pela mudança.",
    priority: "high",
    related_reqs: ["RF-20"],
  },
  {
    code: "US-12",
    title: "Histórico de alterações e controle de versões",
    as_a: "Como analista de requisitos",
    i_want: "eu quero manter histórico de alterações e controlar versões dos requisitos",
    so_that: "para que eu possa acompanhar sua evolução e recuperar informações anteriores quando necessário.",
    priority: "high",
    related_reqs: ["RF-21", "RF-22"],
  },
  {
    code: "US-13",
    title: "Decisões, comentários e validações nos requisitos",
    as_a: "Como usuário da plataforma",
    i_want: "eu quero registrar decisões, comentários e validações vinculados aos requisitos",
    so_that: "para que o conhecimento gerado nas reuniões e revisões fique documentado e acessível.",
    priority: "medium",
    related_reqs: ["RF-23", "RF-24"],
  },
  {
    code: "US-14",
    title: "Organização do backlog priorizado e associação a sprints",
    as_a: "Como Product Owner",
    i_want: "eu quero organizar requisitos e histórias de usuário em um backlog priorizado e associá-los a sprints",
    so_that: "para que o planejamento das iterações de desenvolvimento seja claro e estruturado.",
    priority: "high",
    related_reqs: ["RF-26", "RF-27"],
  },
  {
    code: "US-15",
    title: "Casos de uso e vínculo com requisitos funcionais",
    as_a: "Como analista de requisitos",
    i_want: "eu quero cadastrar casos de uso e vinculá-los aos requisitos funcionais correspondentes",
    so_that: "para que as interações entre atores e sistema sejam detalhadas e rastreáveis.",
    priority: "medium",
    related_reqs: ["RF-28"],
  },
  {
    code: "US-16",
    title: "Matriz de rastreabilidade bidirecional",
    as_a: "Como gerente de projeto",
    i_want: "eu quero gerar uma matriz de rastreabilidade",
    so_that: "para que eu possa visualizar as relações entre requisitos, stakeholders, casos de uso e histórias de usuário.",
    priority: "high",
    related_reqs: ["RF-29"],
  },
  {
    code: "US-17",
    title: "Consulta e filtragem avançada de requisitos",
    as_a: "Como usuário da plataforma",
    i_want: "eu quero consultar e filtrar requisitos por diferentes critérios",
    so_that: "para que eu possa localizar informações específicas com rapidez e facilidade.",
    priority: "high",
    related_reqs: ["RF-30", "RF-31"],
  },
  {
    code: "US-18",
    title: "Reutilização de requisitos e biblioteca genérica",
    as_a: "Como analista de requisitos",
    i_want: "eu quero reutilizar requisitos de outros projetos e acessar uma biblioteca de requisitos genéricos",
    so_that: "para que o tempo de especificação de novos projetos seja reduzido.",
    priority: "medium",
    related_reqs: ["RF-32"],
  },
  {
    code: "US-19",
    title: "Anexos de documentos e imagens aos requisitos",
    as_a: "Como analista de requisitos",
    i_want: "eu quero anexar documentos, imagens e arquivos aos requisitos",
    so_that: "para que a especificação seja complementada com evidências e materiais de apoio.",
    priority: "low",
    related_reqs: ["RF-33", "RF-34"],
  },
  {
    code: "US-20",
    title: "Alerta inteligente de requisitos incompletos",
    as_a: "Como analista de requisitos",
    i_want: "eu quero ser alertado quando um requisito estiver incompleto",
    so_that: "para que lacunas sejam corrigidas antes da aprovação.",
    priority: "high",
    related_reqs: ["RF-35", "RF-36"],
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
    related_reqs: ["RF-38"],
  },
  {
    code: "US-23",
    title: "Central de notificações e alertas de mudanças",
    as_a: "Como usuário da plataforma",
    i_want: "eu quero receber notificações sobre alterações, comentários e aprovações",
    so_that: "para que eu seja informado de mudanças importantes sem precisar verificar manualmente.",
    priority: "medium",
    related_reqs: ["RF-39", "RF-40"],
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
 * Função direta para semear as 25 User Stories do ReqFlow no banco de dados.
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

    // 2. Inserir/Atualizar em lote todas as 25 User Stories
    let insertedCount = 0;
    const storiesToUpsert = REQFLOW_OFFICIAL_USER_STORIES.map((story) => ({
      project_id: projectId,
      code: story.code,
      title: story.title,
      as_a: story.as_a,
      i_want: story.i_want,
      so_that: story.so_that,
      priority: story.priority,
      status: "backlog",
      responsible_id: userId,
    }));

    const { data: upsertedStories, error: storyErr } = await supabase
      .from("user_stories")
      .upsert(storiesToUpsert, { onConflict: "project_id,code" })
      .select("id, code");

    if (storyErr) {
      console.warn("Aviso ao realizar upsert em lote de user stories:", storyErr);
    }

    if (upsertedStories && upsertedStories.length > 0) {
      insertedCount = upsertedStories.length;
      const storyCodeToId = new Map(
        upsertedStories.map((s) => [s.code?.toUpperCase(), s.id])
      );

      // 3. Montar vínculos com requisitos em lote
      const allLinks = [];
      for (const story of REQFLOW_OFFICIAL_USER_STORIES) {
        const storyId = storyCodeToId.get(story.code?.toUpperCase());
        if (!storyId) continue;

        const matchedReqIds = (story.related_reqs || [])
          .map((c) => reqCodeToId[c.toUpperCase()])
          .filter(Boolean);

        for (const rId of matchedReqIds) {
          allLinks.push({
            requirement_id: rId,
            user_story_id: storyId,
          });
        }
      }

      if (allLinks.length > 0) {
        try {
          await supabase
            .from("requirement_user_stories")
            .upsert(allLinks, { onConflict: "requirement_id,user_story_id" });
        } catch (linkErr) {
          console.warn("Aviso ao vincular links de User Stories em lote:", linkErr);
        }
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
