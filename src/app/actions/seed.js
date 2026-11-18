"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Server Action para popular um projeto com dados completos de demonstração (Banca de TCC).
 * Insere:
 * - 8 Requisitos (6 RFs e 2 RNFs com critérios de aceitação, justificativas e status variados)
 * - 1 Sprint ativa ("Sprint 1 - Fundação do Sistema")
 * - 4 User Stories estruturadas ("Como..., Quero..., Para que...")
 * - Vínculos de rastreabilidade (requirement_user_stories)
 * - Registros de auditoria no audit_logs para alimentar o feed de atividades do Dashboard
 */
export async function seedDemoDataAction(projectId) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Usuário não autenticado no sistema." };
    }

    if (!projectId) {
      return { success: false, error: "ID do projeto não informado." };
    }

    // 1. Criar ou obter uma Sprint de Demonstração ativa
    let sprintId = null;
    try {
      const { data: existingSprint } = await supabase
        .from("sprints")
        .select("id")
        .eq("project_id", projectId)
        .eq("status", "active")
        .maybeSingle();

      if (existingSprint) {
        sprintId = existingSprint.id;
      } else {
        const { data: newSprint, error: sprintErr } = await supabase
          .from("sprints")
          .insert({
            project_id: projectId,
            name: "Sprint 1 - Fundação do Sistema",
            goal: "Entrega do fluxo de autenticação e governança centralizada de requisitos",
            start_date: new Date().toISOString().split("T")[0],
            end_date: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
            status: "active",
          })
          .select()
          .single();

        if (!sprintErr && newSprint) {
          sprintId = newSprint.id;
        }
      }
    } catch (err) {
      console.warn("Aviso ao criar sprint de demonstração:", err);
    }

    // 2. Definir 8 Requisitos Profissionais para Demonstração Acadêmica
    const demoReqs = [
      {
        code: "RF-01",
        title: "Autenticação Multi-Fator (MFA)",
        description: "O sistema deve permitir que os usuários configurem e utilizem autenticação em duas etapas via aplicativo autenticador ou código temporário por e-mail.",
        type: "RF",
        priority: "high",
        status: "approved",
        justification: "Requisito primordial de segurança para proteção de dados sensíveis corporativos.",
        source: "Documento de Segurança & Governança v1.2",
        acceptance_criteria: "1. O usuário deve conseguir ler o QR Code no app autenticador.\n2. O código de 6 dígitos deve ser validado em menos de 1 segundo.\n3. Códigos de recuperação de emergência devem ser gerados na ativação.",
      },
      {
        code: "RF-02",
        title: "Matriz de Rastreabilidade Bidirecional",
        description: "O sistema deve disponibilizar uma matriz interativa que relacione requisitos com histórias de usuário e partes interessadas (stakeholders).",
        type: "RF",
        priority: "high",
        status: "approved",
        justification: "Garantir aderência às boas práticas de Engenharia de Requisitos e normas CMMI/IEEE 830.",
        source: "Guia PMBOK / IEEE 830",
        acceptance_criteria: "1. A matriz deve exibir requisitos nas linhas e histórias/stakeholders nas colunas.\n2. O cruzamento deve permitir ativar/desativar vínculos com 1 clique.\n3. Células vinculadas devem persistir no banco de dados com feedback visual imediato.",
      },
      {
        code: "RF-03",
        title: "Versionamento e Histórico de Mudanças",
        description: "O sistema deve registrar cada alteração em requisitos e histórias de usuário, permitindo comparar versões e reverter mudanças indesejadas.",
        type: "RF",
        priority: "medium",
        status: "approved",
        justification: "Auditoria contínua e conformidade com processos de homologação formal.",
        source: "Comitê de Arquitetura",
        acceptance_criteria: "1. Todo salvamento gera uma versão imutável.\n2. Usuários podem visualizar o diff com destaque de inserções e remoções.\n3. Ação de restauração de versão anterior disponível para administradores.",
      },
      {
        code: "RF-04",
        title: "Geração Automatizada de Documento SRS (IEEE 830)",
        description: "O sistema deve compilar todos os requisitos aprovados e suas histórias em um documento de especificação formal (SRS) diagramado em PDF.",
        type: "RF",
        priority: "high",
        status: "under_review",
        justification: "Eliminar a necessidade de redação manual de relatórios para os clientes e auditores.",
        source: "Equipe de Qualidade de Software",
        acceptance_criteria: "1. O PDF gerado deve conter sumário executivo, tabela de requisitos e matriz.\n2. O layout deve respeitar paginação A4 com cabeçalho e rodapé profissionais.",
      },
      {
        code: "RF-05",
        title: "Notificações de Impacto e Menções de Equipe",
        description: "O sistema deve alertar membros responsáveis quando um requisito dependente sofrer alterações de escopo ou status.",
        type: "RF",
        priority: "low",
        status: "under_review",
        justification: "Prevenir desalinhamento entre equipes ágeis que consom requisitos vinculados.",
        source: "Reunião de Retrospectiva da Equipe",
        acceptance_criteria: "1. Sino de notificações na topbar com contador de avisos não lidos.\n2. Feed de atividades atualizado em tempo real.",
      },
      {
        code: "RF-06",
        title: "Integração Bidirecional com Jira e Azure DevOps",
        description: "O sistema deve sincronizar automaticamente as histórias de usuário com projetos externos via webhooks.",
        type: "RF",
        priority: "medium",
        status: "not_approved",
        justification: "Fora do escopo do MVP acordado na sprint de planejamento arquitetural.",
        source: "Solicitação de Stakeholder Externo",
        acceptance_criteria: "1. Webhook configurável com chave de API segura.\n2. Log de sincronização com status de sucesso ou falha.",
      },
      {
        code: "RNF-01",
        title: "Tempo de Resposta de Consulta Inferior a 1.5 Segundos",
        description: "Todas as consultas e trocas de visão no dashboard devem responder em menos de 1500ms sob conexão estável.",
        type: "RNF",
        priority: "high",
        status: "approved",
        justification: "Experiência de uso fluida para grandes bases de requisitos corporativos.",
        source: "Diretrizes de Qualidade e SLA da Aplicação",
        acceptance_criteria: "1. Tempo médio de resposta medido no DevTools < 1.5s.\n2. Otimização com consultas assíncronas concorrentes (Promise.all).",
      },
      {
        code: "RNF-02",
        title: "Conformidade com LGPD e Criptografia em Trânsito",
        description: "Todas as comunicações com a API e banco de dados devem utilizar criptografia TLS 1.3 e armazenar credenciais com hash seguro.",
        type: "RNF",
        priority: "high",
        status: "approved",
        justification: "Exigência legal obrigatória para sistemas corporativos no Brasil.",
        source: "Lei Geral de Proteção de Dados (Lei 13.709/2018)",
        acceptance_criteria: "1. Conexões HTTPS forçadas em produção.\n2. Isolamento de dados entre projetos com políticas RLS (Row Level Security).",
      },
    ];

    // Inserir ou obter os requisitos
    const insertedReqs = [];
    for (const req of demoReqs) {
      try {
        const { data: existing } = await supabase
          .from("requirements")
          .select("id, code")
          .eq("project_id", projectId)
          .eq("code", req.code)
          .maybeSingle();

        if (existing) {
          insertedReqs.push(existing);
          continue;
        }

        const { data: createdReq } = await supabase
          .from("requirements")
          .insert({
            ...req,
            project_id: projectId,
            created_by: user.id,
            user_id: user.id,
          })
          .select("id, code")
          .maybeSingle();

        if (createdReq) {
          insertedReqs.push(createdReq);
        }
      } catch (reqErr) {
        console.warn(`Aviso ao inserir requisito ${req.code}:`, reqErr);
      }
    }

    // 3. Definir 4 User Stories estruturadas com metodologia ágil
    const demoStories = [
      {
        code: "US-01",
        title: "Login Seguro com Dois Fatores",
        as_a: "Usuário do Sistema",
        i_want: "Realizar login informando e-mail, senha e código de autenticação de 6 dígitos",
        so_that: "Minha conta e meus projetos corporativos fiquem protegidos contra acessos não autorizados",
        priority: "high",
        status: "done",
        sprint_id: sprintId,
        reqCodes: ["RF-01"],
      },
      {
        code: "US-02",
        title: "Governança e Aprovação Formal de Requisitos",
        as_a: "Product Owner",
        i_want: "Aprovar ou reprovar requisitos com justificativa documentada",
        so_that: "O time de desenvolvimento apenas implemente itens validados e priorizados",
        priority: "high",
        status: "in_progress",
        sprint_id: sprintId,
        reqCodes: ["RF-03"],
      },
      {
        code: "US-03",
        title: "Cruzamento na Matriz de Rastreabilidade",
        as_a: "Analista de Requisitos",
        i_want: "Conectar histórias de usuário a requisitos de negócio em uma grade interativa",
        so_that: "Seja possível verificar a cobertura de requisitos e identificar itens sem implementação",
        priority: "medium",
        status: "todo",
        sprint_id: sprintId,
        reqCodes: ["RF-02"],
      },
      {
        code: "US-04",
        title: "Exportação Oficial de Especificação em PDF",
        as_a: "Gerente de Projetos",
        i_want: "Gerar um relatório consolidado com os requisitos aprovados do projeto em PDF diagramado",
        so_that: "Eu possa apresentar à banca avaliadora com sumário executivo e layout profissional",
        priority: "medium",
        status: "backlog",
        sprint_id: null,
        reqCodes: ["RF-04", "RNF-01"],
      },
    ];

    for (const story of demoStories) {
      try {
        const { reqCodes, ...storyData } = story;

        const { data: existingStory } = await supabase
          .from("user_stories")
          .select("id")
          .eq("project_id", projectId)
          .eq("code", story.code)
          .maybeSingle();

        let storyId = existingStory?.id;
        if (!storyId) {
          const { data: newStory } = await supabase
            .from("user_stories")
            .insert({
              ...storyData,
              project_id: projectId,
            })
            .select("id")
            .maybeSingle();

          storyId = newStory?.id;
        }

        // Vincular a história aos requisitos selecionados (requirement_user_stories)
        if (storyId && reqCodes?.length > 0) {
          for (const rCode of reqCodes) {
            const matchingReq = insertedReqs.find((r) => r.code === rCode);
            if (matchingReq?.id) {
              try {
                await supabase
                  .from("requirement_user_stories")
                  .upsert(
                    { requirement_id: matchingReq.id, user_story_id: storyId },
                    { onConflict: "requirement_id,user_story_id" }
                  );
              } catch {}
            }
          }
        }
      } catch (storyErr) {
        console.warn(`Aviso ao criar user story ${story.code}:`, storyErr);
      }
    }

    // 4. Inserir logs de auditoria no audit_logs para alimentar o Activity Feed do Dashboard
    try {
      await supabase.from("audit_logs").insert([
        {
          project_id: projectId,
          user_id: user.id,
          entity_type: "project",
          entity_id: projectId,
          action: "seed_demo",
          description: "Projeto preenchido com dados de demonstração (8 requisitos, 4 histórias e Sprint 1)",
        },
        {
          project_id: projectId,
          user_id: user.id,
          entity_type: "requirement",
          action: "approve",
          description: "Requisitos RF-01, RF-02 e RF-03 aprovados pelo Product Owner",
        },
        {
          project_id: projectId,
          user_id: user.id,
          entity_type: "sprint",
          action: "create",
          description: "Sprint 1 - Fundação do Sistema iniciada com 3 histórias ativas",
        },
      ]);
    } catch (auditErr) {
      console.warn("Aviso ao inserir audit_logs de demonstração:", auditErr);
    }

    revalidatePath("/");
    revalidatePath("/requisitos");
    revalidatePath("/user-stories");
    revalidatePath("/rastreabilidade");
    revalidatePath("/relatorios");
    revalidatePath("/backlog");

    return {
      success: true,
      message: "Projeto populado com sucesso com 8 requisitos, 4 histórias de usuário, 1 sprint e vínculos de rastreabilidade!",
    };
  } catch (err) {
    console.error("Erro inesperado em seedDemoDataAction:", err);
    return {
      success: false,
      error: err.message || "Erro interno ao popular projeto de demonstração.",
    };
  }
}
