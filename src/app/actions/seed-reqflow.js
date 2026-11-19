"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function seedAllReqflowRequirementsAction({ projectId }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Usuário não autenticado." };
    }

    if (!projectId) {
      return { success: false, error: "ID do projeto não informado." };
    }

    // Obter o perfil do usuário atual (Pedro 22)
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("id", user.id)
      .maybeSingle();

    const responsibleId = profile?.id || user.id;

    // Catálogo Oficial dos 55 Requisitos do Sistema ReqFlow (44 RFs + 11 RNFs)
    const allRequirements = [
      // ==========================================
      // REQUISITOS FUNCIONAIS (RF.01 - RF.44)
      // ==========================================
      {
        code: "RF-01",
        title: "Permitir o cadastro de usuários",
        description: "O sistema deve permitir o cadastro de usuários na plataforma, solicitando nome completo, e-mail institucional e senha de acesso segura.",
        type: "RF",
        priority: "high",
        status: "approved",
        justification: "Necessário para identificação e atribuição de responsabilidades em projetos de software.",
        source: "Documento de Visão do Produto",
        acceptance_criteria: "1. Validação de formato de e-mail e força de senha.\n2. Criação automática de perfil no banco de dados.\n3. Redirecionamento após confirmação de cadastro.",
      },
      {
        code: "RF-02",
        title: "Permitir login e logout",
        description: "O sistema deve permitir autenticação segura de usuários com e-mail e senha, além de encerramento de sessão com invalidação de cookies e tokens.",
        type: "RF",
        priority: "high",
        status: "approved",
        justification: "Controle de acesso e proteção das especificações confidenciais dos projetos.",
        source: "Política de Segurança da Informação",
        acceptance_criteria: "1. Emissão de token JWT via Supabase Auth.\n2. Bloqueio de rotas protegidas para usuários não autenticados.\n3. Botão de logout acessível na barra lateral e superior.",
      },
      {
        code: "RF-03",
        title: "Permitir a edição de perfil do usuário",
        description: "O sistema deve permitir que o usuário atualize suas informações pessoais, como nome de exibição, foto/avatar e redefinição de senha.",
        type: "RF",
        priority: "medium",
        status: "approved",
        justification: "Manter os dados cadastrais atualizados e permitir personalização da conta.",
        source: "Entrevista com Stakeholders",
        acceptance_criteria: "1. Modal dedicado para edição de perfil.\n2. Atualização imediata do nome nos cabeçalhos e comentários.\n3. Opção de alteração de senha com confirmação.",
      },
      {
        code: "RF-04",
        title: "Permitir definir perfis de acesso",
        description: "O sistema deve permitir definir papéis de acesso no projeto, incluindo Administrador, Analista de Requisitos, Product Owner, Scrum Master, Desenvolvedor e Stakeholder.",
        type: "RF",
        priority: "high",
        status: "approved",
        justification: "Segregação de funções em equipes multidisciplinares de Engenharia de Software.",
        source: "Metodologia Scrum / Guia PMBOK",
        acceptance_criteria: "1. 6 perfis padrão pré-configurados.\n2. Atribuição de perfil por projeto.\n3. Possibilidade de criação de perfis customizados.",
      },
      {
        code: "RF-05",
        title: "Controlar permissões conforme o perfil do usuário",
        description: "O sistema deve restringir ações no projeto (criar, editar, excluir, aprovar, exportar) de acordo com a matriz de permissões associada ao perfil do membro.",
        type: "RF",
        priority: "high",
        status: "approved",
        justification: "Governança corporativa e proteção contra alterações indevidas por membros não autorizados.",
        source: "Norma ISO/IEC 25010 (Segurança e Integridade)",
        acceptance_criteria: "1. Verificação de permissão no frontend e backend (Server Actions).\n2. Feedback visual em botões desabilitados ou protegidos por toast informativo.",
      },
      {
        code: "RF-06",
        title: "Gerenciar projetos de software",
        description: "O sistema deve permitir cadastrar, editar dados gerais, excluir e arquivar projetos de software.",
        type: "RF",
        priority: "high",
        status: "approved",
        justification: "Unidade central de organização dos requisitos e artefatos de engenharia.",
        source: "Documento de Requisitos do ReqFlow",
        acceptance_criteria: "1. Cadastro com nome e descrição obrigatórios.\n2. Edição de dados por administradores.\n3. Zona de perigo para exclusão permanente.",
      },
      {
        code: "RF-07",
        title: "Listar os projetos vinculados ao usuário",
        description: "O sistema deve exibir apenas os projetos criados pelo usuário ou nos quais ele foi aceito como membro colaborador.",
        type: "RF",
        priority: "high",
        status: "approved",
        justification: "Isolamento seguro de dados entre equipes e organizações distintas (Multi-tenancy).",
        source: "Política de Privacidade e RLS",
        acceptance_criteria: "1. Dropdown na barra superior listando apenas projetos autorizados.\n2. Bloqueio de acesso a projetos de terceiros por URL.",
      },
      {
        code: "RF-08",
        title: "Gerenciamento de projeto por múltiplos usuários",
        description: "O sistema deve permitir que mais de um usuário colabore no mesmo projeto mediante convite formal por e-mail com aceite e recusa.",
        type: "RF",
        priority: "high",
        status: "approved",
        justification: "Suportar trabalho colaborativo entre analistas, desenvolvedores e clientes.",
        source: "Reunião com Equipe de Desenvolvimento",
        acceptance_criteria: "1. Envio de convites por e-mail.\n2. Notificação no sino do usuário convidado.\n3. Opção de aceitar, recusar ou sair do projeto.",
      },
      {
        code: "RF-09",
        title: "Gerenciar histórias de usuário no formato ágil",
        description: "O sistema deve permitir cadastrar, editar, excluir e visualizar histórias de usuário no padrão: Como [perfil], quero [ação], para [benefício].",
        type: "RF",
        priority: "high",
        status: "approved",
        justification: "Articulação entre necessidades de negócio e desenvolvimento técnico ágil.",
        source: "Manifesto Ágil / Scrum Guide",
        acceptance_criteria: "1. Campos específicos para Quem, O Quê e Por Quê.\n2. Definição de prioridade e status do backlog.\n3. Vinculação com requisitos formais.",
      },
      {
        code: "RF-10",
        title: "Gerenciar requisitos vinculados a um projeto",
        description: "O sistema deve permitir cadastrar, editar, excluir e visualizar requisitos funcionais e não-funcionais associados a um projeto de software.",
        type: "RF",
        priority: "high",
        status: "approved",
        justification: "Atividade nuclear da plataforma de Engenharia de Requisitos.",
        source: "Guia SWEBOK (Software Engineering Body of Knowledge)",
        acceptance_criteria: "1. Tabela com paginação, filtros e ordenação.\n2. Modal completo de criação e edição.\n3. Exclusão com confirmação e validação de dependências.",
      },
      {
        code: "RF-11",
        title: "Classificar requisitos por tipo",
        description: "O sistema deve permitir classificar requisitos por tipo (funcional, não funcional, regra de negócio, restrição técnica ou requisito de interface).",
        type: "RF",
        priority: "medium",
        status: "under_review",
        justification: "Permitir a categorização multidimensional dos requisitos do projeto para facilitar a organização, filtragem e divisão de escopo entre equipes.",
        source: "Guia de Elicitação e Engenharia de Requisitos",
        acceptance_criteria: "1. Seleção do tipo de requisito no formulário de cadastro.\n2. Filtros dinâmicos no catálogo de requisitos pela classificação atribuída.\n3. Identificação visual imediata do tipo por meio de tags padronizadas.",
      },
      {
        code: "RF-12",
        title: "Gerar identificador único para cada requisito",
        description: "O sistema deve gerar um identificador único e sequencial para cada requisito (ex: RF-001, RNF-001).",
        type: "RF",
        priority: "high",
        status: "approved",
        justification: "Rastreabilidade inequívoca e referência rápida na documentação.",
        source: "Norma IEEE 830 (Especificação de Requisitos de Software)",
        acceptance_criteria: "1. Prefixo baseado no tipo (RF ou RNF).\n2. Validação contra duplicidades no mesmo projeto.",
      },
      {
        code: "RF-13",
        title: "Definir a prioridade de cada requisito",
        description: "O sistema deve permitir definir a prioridade de cada requisito (baixa, média, alta ou crítica).",
        type: "RF",
        priority: "high",
        status: "approved",
        justification: "Apoiar o planejamento de sprints e a entrega de valor contínuo.",
        source: "Método MoSCoW / Engenharia de Requisitos",
        acceptance_criteria: "1. Badges visuais coloridos para cada nível de prioridade.\n2. Filtro rápido por prioridade na tabela.",
      },
      {
        code: "RF-14",
        title: "Acompanhar o status de cada requisito",
        description: "O sistema deve permitir acompanhar o status de cada requisito (proposto, em análise, aprovado, em desenvolvimento, implementado, testado ou cancelado).",
        type: "RF",
        priority: "medium",
        status: "under_review",
        justification: "Garantir visibilidade contínua do ciclo de vida e estágio de maturação de cada requisito ao longo do desenvolvimento do projeto.",
        source: "Processo de Gestão do Ciclo de Vida de Software",
        acceptance_criteria: "1. Registro das transições de status com data e autor responsável.\n2. Visualização e filtragem rápida do status atual na listagem.\n3. Histórico de auditoria para cada mudança de status.",
      },
      {
        code: "RF-15",
        title: "Registrar descrição detalhada do requisito",
        description: "O sistema deve permitir registrar descrição detalhada do requisito, incluindo justificativa, objetivo, fonte e observações.",
        type: "RF",
        priority: "high",
        status: "approved",
        justification: "Eliminação de ambiguidades e alinhamento conceitual entre negócio e engenharia.",
        source: "IEEE Std 830-1998 / ISO/IEC/IEEE 29148",
        acceptance_criteria: "1. Campos dedicados para Descrição, Justificativa e Observações.\n2. Exibição estruturada na exportação do SRS.",
      },
      {
        code: "RF-16",
        title: "Associar requisitos às histórias de usuário",
        description: "O sistema deve permitir associar requisitos funcionais e não funcionais às histórias de usuário cadastradas no projeto.",
        type: "RF",
        priority: "high",
        status: "approved",
        justification: "Rastreabilidade vertical entre documentação formal e itens do backlog ágil.",
        source: "Engenharia de Requisitos Ágil",
        acceptance_criteria: "1. Seleção múltipla de User Stories no cadastro do requisito.\n2. Atualização automática dos vínculos na Matriz de Rastreabilidade.",
      },
      {
        code: "RF-17",
        title: "Associar requisitos a stakeholders responsáveis",
        description: "O sistema deve permitir associar requisitos a stakeholders ou membros da equipe responsáveis por sua solicitação e validação.",
        type: "RF",
        priority: "medium",
        status: "approved",
        justification: "Rastreabilidade de autoria e facilitação de esclarecimento de dúvidas.",
        source: "Guia PMBOK (Gerenciamento das Partes Interessadas)",
        acceptance_criteria: "1. Campo de seleção de stakeholder responsável.\n2. Exibição do avatar/nome na tabela e no documento SRS.",
      },
      {
        code: "RF-18",
        title: "Registrar a fonte do requisito",
        description: "O sistema deve permitir registrar a fonte do requisito (entrevista, reunião, documento, legislação, sistema legado ou observação).",
        type: "RF",
        priority: "medium",
        status: "approved",
        justification: "Auditoria e rastreabilidade para trás (backward traceability).",
        source: "CMMI-DEV / IEEE 830",
        acceptance_criteria: "1. Campo de texto ou seleção de fonte.\n2. Validação para alertar requisitos sem fonte informada.",
      },
      {
        code: "RF-19",
        title: "Refinar requisitos antes da aprovação",
        description: "O sistema deve permitir refinar requisitos antes de sua aprovação final, sendo vedada a alteração após aprovação.",
        type: "RF",
        priority: "high",
        status: "under_review",
        justification: "Garantir o congelamento formal da linha de base (baseline) do escopo após aprovação pelo cliente, prevenindo desvios não planejados de escopo e custo.",
        source: "Procedimento Padrão de Gestão de Mudanças e Baseline",
        acceptance_criteria: "1. Edição de dados liberada enquanto o requisito estiver com status Em Análise.\n2. Bloqueio de edição para usuários operacionais quando o requisito atingir status Aprovado.\n3. Identificação visual clara de requisito homologado.",
      },
      {
        code: "RF-20",
        title: "Registrar dependências entre requisitos",
        description: "O sistema deve permitir registrar dependências entre requisitos (conflito, complemento ou refinamento).",
        type: "RF",
        priority: "medium",
        status: "approved",
        justification: "Prevenir incoerências arquiteturais e identificar gargalos de desenvolvimento.",
        source: "Engenharia de Requisitos (Gotel & Finkelstein)",
        acceptance_criteria: "1. Aba de Impacto no modal de requisito.\n2. Vínculo entre requisitos com tipificação (depende de, complementa, conflita).",
      },
      {
        code: "RF-21",
        title: "Realizar análise de impacto",
        description: "O sistema deve permitir realizar análise de impacto, identificando requisitos e artefatos afetados por uma alteração.",
        type: "RF",
        priority: "high",
        status: "approved",
        justification: "Avaliar o custo e o risco antes de homologar mudanças de escopo.",
        source: "Software Change Impact Analysis (Bohner & Arnold)",
        acceptance_criteria: "1. Exibição dos requisitos dependentes e User Stories impactadas.\n2. Alerta preventivo na tela de edição do requisito.",
      },
      {
        code: "RF-22",
        title: "Manter histórico de alterações de cada requisito",
        description: "O sistema deve manter histórico de alterações de cada requisito, registrando data, hora e usuário responsável.",
        type: "RF",
        priority: "high",
        status: "approved",
        justification: "Rastreabilidade cronológica e responsabilização pelas alterações no projeto.",
        source: "CMMI Nível 2 / ISO 9001",
        acceptance_criteria: "1. Gravação imutável a cada salvamento na tabela requirement_versions.\n2. Exibição na linha do tempo do requisito.",
      },
      {
        code: "RF-23",
        title: "Controlar versões e comparar histórico",
        description: "O sistema deve permitir controlar versões dos requisitos, possibilitando comparar versões anteriores e atuais (diff) e restaurar versões passadas.",
        type: "RF",
        priority: "high",
        status: "approved",
        justification: "Capacidade de auditoria visual de diferenças e reversão de alterações equivocadas.",
        source: "Práticas Modernas de Gerência de Configuração",
        acceptance_criteria: "1. Comparador de versões com destaque de adições e remoções.\n2. Botão de restauração com permissão de administrador.",
      },
      {
        code: "RF-24",
        title: "Registrar decisões e comentários vinculados aos requisitos",
        description: "O sistema deve permitir registrar decisões e comentários técnicos vinculados aos requisitos.",
        type: "RF",
        priority: "medium",
        status: "approved",
        justification: "Preservação do rationale arquitetural e discussões de equipe.",
        source: "Architecture Decision Records (ADR)",
        acceptance_criteria: "1. Aba de Decisões no modal do requisito.\n2. Diferenciação visual entre comentário informal e decisão formal homologada.",
      },
      {
        code: "RF-25",
        title: "Validar requisitos por stakeholders ou responsáveis técnicos",
        description: "O sistema deve permitir validar e homologar requisitos por stakeholders ou perfis autorizados (ex: Product Owner).",
        type: "RF",
        priority: "high",
        status: "approved",
        justification: "Governança do escopo e separação entre proposta técnica e aceitação de negócio.",
        source: "IEEE 830 (Validação de Requisitos)",
        acceptance_criteria: "1. Botões de ação rápida (Aprovar / Não Aprovar).\n2. Registro do validador e data no banco de dados.",
      },
      {
        code: "RF-26",
        title: "Gerenciar stakeholders do projeto",
        description: "O sistema deve permitir gerenciar stakeholders do projeto (cadastrar, convidar, editar papel e consultar).",
        type: "RF",
        priority: "high",
        status: "approved",
        justification: "Identificação de todas as pessoas com interesse ou autoridade sobre os requisitos.",
        source: "Guia PMBOK / BABOK",
        acceptance_criteria: "1. Aba de Stakeholders no gerenciador do projeto.\n2. Associação a requisitos e colunas na matriz de rastreabilidade.",
      },
      {
        code: "RF-27",
        title: "Organizar requisitos e histórias em backlog priorizado",
        description: "O sistema deve permitir organizar requisitos e histórias de usuário em um backlog priorizado.",
        type: "RF",
        priority: "high",
        status: "approved",
        justification: "Transição entre Engenharia de Requisitos e execução de sprints ágeis.",
        source: "Metodologia Scrum",
        acceptance_criteria: "1. Tela de Backlog com colunas A Fazer, Em Progresso e Concluído.\n2. Ordenação por valor de negócio.",
      },
      {
        code: "RF-28",
        title: "Vincular requisitos ou histórias a sprints",
        description: "O sistema deve permitir vincular requisitos ou histórias de usuário a sprints de desenvolvimento com metas e prazos.",
        type: "RF",
        priority: "high",
        status: "approved",
        justification: "Planejamento temporal das entregas e medição de velocidade do time.",
        source: "Scrum Guide",
        acceptance_criteria: "1. Criação e ativação de sprints.\n2. Alocação de cards com contadores de progresso.",
      },
      {
        code: "RF-29",
        title: "Cadastrar casos de uso com atores e fluxos",
        description: "O sistema deve permitir cadastrar casos de uso com atores, fluxos principais, fluxos alternativos, pré-condições e pós-condições.",
        type: "RF",
        priority: "medium",
        status: "under_review",
        justification: "Detalhar o comportamento dinâmico do sistema e os cenários de interação entre os atores e a aplicação segundo a notação clássica da UML.",
        source: "Documento de Especificação de Casos de Uso (RUP)",
        acceptance_criteria: "1. Cadastro estruturado contendo ator primário, pré-condições e pós-condições.\n2. Registro do fluxo principal passo a passo e fluxos de exceção associados.\n3. Consulta e visualização dos casos de uso vinculados ao projeto.",
      },
      {
        code: "RF-30",
        title: "Vincular requisitos funcionais a casos de uso",
        description: "O sistema deve permitir vincular requisitos funcionais aos casos de uso correspondentes.",
        type: "RF",
        priority: "medium",
        status: "under_review",
        justification: "Assegurar a rastreabilidade direta entre os requisitos textuais declarados e os fluxos de processo modelados nos casos de uso.",
        source: "Matriz de Rastreabilidade de Requisitos (IEEE Std 830)",
        acceptance_criteria: "1. Associação de um ou múltiplos requisitos funcionais a um caso de uso.\n2. Visualização bidirecional do vínculo no caso de uso e na ficha do requisito.\n3. Relatório de cobertura de casos de uso por requisito.",
      },
      {
        code: "RF-31",
        title: "Gerar matriz de rastreabilidade",
        description: "O sistema deve gerar matriz de rastreabilidade bidirecional relacionando requisitos, stakeholders e histórias de usuário.",
        type: "RF",
        priority: "high",
        status: "approved",
        justification: "Garantir a rastreabilidade bidirecional entre artefatos de engenharia de software conforme preconizado pelo modelo CMMI e norma IEEE 830.",
        source: "Diretrizes CMMI-DEV / IEEE Std 830",
        acceptance_criteria: "1. Grade matricial interativa com persistência por clique.\n2. Exportação em formato CSV compatível com planilhas.",
      },
      {
        code: "RF-32",
        title: "Consultar e filtrar requisitos",
        description: "O sistema deve permitir consultar e filtrar requisitos por código, tipo, prioridade, status, projeto ou palavra-chave em tempo real.",
        type: "RF",
        priority: "high",
        status: "approved",
        justification: "Usabilidade e facilidade de localização em projetos com dezenas ou centenas de requisitos.",
        source: "Diretrizes de Usabilidade Nielsen",
        acceptance_criteria: "1. Campo de busca por texto com resposta instantânea.\n2. Filtros combinados por chips ou seletores.",
      },
      {
        code: "RF-33",
        title: "Reutilizar requisitos de outros projetos",
        description: "O sistema deve permitir reutilizar requisitos de outros projetos através de clonagem estruturada e personalização.",
        type: "RF",
        priority: "medium",
        status: "approved",
        justification: "Aumento de produtividade e padronização de requisitos em múltiplos sistemas.",
        source: "Software Product Line / Reuso de Software",
        acceptance_criteria: "1. Modal de Importação com seleção de projeto de origem.\n2. Cópias profundas de critérios de aceitação e justificativas.",
      },
      {
        code: "RF-34",
        title: "Manter biblioteca de requisitos genéricos e reutilizáveis",
        description: "O sistema deve manter uma biblioteca de requisitos genéricos e reutilizáveis (biblioteca global) independente de projetos específicos.",
        type: "RF",
        priority: "medium",
        status: "approved",
        justification: "Catálogo centralizado de requisitos recorrentes (como autenticação, auditoria e LGPD).",
        source: "Engenharia de Requisitos Baseada em Componentes",
        acceptance_criteria: "1. Página de Requisitos Globais (/requisitos/globais).\n2. Importação direta para qualquer projeto ativo.",
      },
      {
        code: "RF-35",
        title: "Anexar documentos, imagens e arquivos aos requisitos",
        description: "O sistema deve permitir anexar documentos, imagens e arquivos binários aos requisitos cadastrados.",
        type: "RF",
        priority: "low",
        status: "under_review",
        justification: "Permitir anexar evidências documentais, atas de reunião com clientes, diagramas de arquitetura e protótipos visuais diretamente na especificação do requisito.",
        source: "Levantamento de Necessidades com Equipe de Engenharia",
        acceptance_criteria: "1. Suporte a upload de arquivos PDF, imagens (PNG/JPG) e documentos.\n2. Listagem clara dos anexos vinculados com link para visualização ou download.\n3. Registro do autor e data de envio do anexo.",
      },
      {
        code: "RF-36",
        title: "Alertar quando um requisito estiver incompleto",
        description: "O sistema deve alertar quando um requisito estiver incompleto (sem descrição, prioridade, tipo, fonte ou critério de aceitação).",
        type: "RF",
        priority: "high",
        status: "approved",
        justification: "Garantia da qualidade e completude dos requisitos de acordo com as normas de Engenharia de Software (IEEE 830).",
        source: "Critérios de Qualidade IEEE 830",
        acceptance_criteria: "1. Cálculo automático de incompletude via trigger de banco de dados.\n2. Indicador de alerta visual (ícone amarelo) na tabela e relatórios.",
      },
      {
        code: "RF-37",
        title: "Gerar automaticamente documento de especificação (SRS)",
        description: "O sistema deve permitir gerar automaticamente um documento formal de especificação de requisitos de software (SRS) nos padrões IEEE 830 / ISO 29148.",
        type: "RF",
        priority: "high",
        status: "approved",
        justification: "Produção do artefato formal de engenharia de software para entrega e validação com o cliente e stakeholders do projeto.",
        source: "IEEE Std 830-1998",
        acceptance_criteria: "1. Visualização estruturada com seções numeradas, escopo e tabelas.\n2. Opção de exportação para PDF diagramado e TXT.",
      },
      {
        code: "RF-38",
        title: "Exportar requisitos em múltiplos formatos",
        description: "O sistema deve permitir exportar requisitos em PDF diagramado, CSV com codificação UTF-8 BOM, JSON e TXT estruturado.",
        type: "RF",
        priority: "high",
        status: "approved",
        justification: "Interoperabilidade com outras ferramentas de engenharia de software e planilhas.",
        source: "Diretrizes de Abertura de Dados e Relatórios",
        acceptance_criteria: "1. Botões de exportação na página de relatórios.\n2. Arquivos gerados respeitando acentuação em português e delimitadores corretos.",
      },
      {
        code: "RF-39",
        title: "Apresentar dashboard com indicadores do projeto",
        description: "O sistema deve apresentar um dashboard com indicadores consolidados do projeto (total de requisitos, pendentes, aprovados e não aprovados).",
        type: "RF",
        priority: "high",
        status: "approved",
        justification: "Visibilidade executiva e monitoramento rápido do progresso da especificação.",
        source: "Práticas de Gestão Visual / Dashboards Executivos",
        acceptance_criteria: "1. Cards de KPI com contagens exatas.\n2. Gráfico Donut Chart com distribuição de status.\n3. Feed de atividades recentes.",
      },
      {
        code: "RF-40",
        title: "Gerar relatórios analíticos",
        description: "O sistema deve gerar relatórios analíticos agrupados por tipo, status, prioridade, responsável e completude.",
        type: "RF",
        priority: "medium",
        status: "approved",
        justification: "Tomada de decisão baseada em métricas de qualidade e cobertura de requisitos.",
        source: "Métricas de Qualidade de Software",
        acceptance_criteria: "1. Painel com gráficos e tabelas discriminadas por dimensão.\n2. Totalizadores de cobertura de critérios de aceitação.",
      },
      {
        code: "RF-41",
        title: "Notificar usuários sobre alterações e convites",
        description: "O sistema deve notificar usuários sobre convites de projetos, alterações em requisitos vinculados e decisões homologadas.",
        type: "RF",
        priority: "medium",
        status: "approved",
        justification: "Engajamento da equipe e comunicação assíncrona eficaz.",
        source: "Reunião de Planejamento de UX",
        acceptance_criteria: "1. Ícone de sino na Topbar com contador dinâmico de avisos.\n2. Ações de responder convites diretamente no popover.",
      },
      {
        code: "RF-42",
        title: "Manter trilha de auditoria",
        description: "O sistema deve manter trilha de auditoria registrando as principais ações dos usuários (criação, edição, exclusão, aprovação, convites e decisões).",
        type: "RF",
        priority: "high",
        status: "approved",
        justification: "Segurança da informação, conformidade regulatória e responsabilização das ações.",
        source: "Normas de Auditoria e Governança",
        acceptance_criteria: "1. Inserção automática na tabela audit_logs via triggers e Server Actions.\n2. Exibição cronológica no Activity Feed do Dashboard.",
      },
      {
        code: "RF-43",
        title: "Pesquisar requisitos semelhantes",
        description: "O sistema deve permitir pesquisar requisitos semelhantes para evitar duplicidades e incentivar o reuso.",
        type: "RF",
        priority: "medium",
        status: "approved",
        justification: "Evitar redundância textual e inconsistências conceituais no catálogo de requisitos.",
        source: "Engenharia de Requisitos Baseada em IA / Similaridade",
        acceptance_criteria: "1. Comparação léxica e semântica no modal ao digitar título e descrição.\n2. Alerta com link para o requisito similar encontrado.",
      },
      {
        code: "RF-44",
        title: "Apresentar a linha do tempo de evolução do requisito",
        description: "O sistema deve apresentar a linha do tempo vertical de evolução de cada requisito, desde sua concepção até sua situação atual.",
        type: "RF",
        priority: "medium",
        status: "approved",
        justification: "Visualização intuitiva da trajetória e maturação do requisito ao longo do tempo.",
        source: "Design de Interação / UX ReqFlow",
        acceptance_criteria: "1. Linha do tempo visual na coluna lateral do modal do requisito.\n2. Nós clicáveis com detalhes de cada evento e autor.",
      },

      // ==========================================
      // REQUISITOS NÃO-FUNCIONAIS (RNF.01 - RNF.11)
      // ==========================================
      {
        code: "RNF-01",
        title: "Interface simples e intuitiva (Usabilidade)",
        description: "O sistema deve possuir interface simples, intuitiva e moderna, com suporte a modo claro e escuro, acessível a estudantes e profissionais.",
        type: "RNF",
        priority: "high",
        status: "approved",
        justification: "Reduzir a curva de aprendizado e facilitar a adoção da plataforma.",
        source: "Heurísticas de Usabilidade de Nielsen",
        acceptance_criteria: "1. Conformidade com paleta de cores Tailwind v4 e ícones Lucide.\n2. Alternador de tema Claro/Escuro funcional e persistente.",
      },
      {
        code: "RNF-02",
        title: "Acessibilidade via navegador web (Portabilidade)",
        description: "O sistema deve ser acessível via navegador web moderno (Chrome, Edge, Firefox, Safari) sem necessidade de instalação de plugins ou extensões.",
        type: "RNF",
        priority: "high",
        status: "approved",
        justification: "Garantir acesso universal independente do sistema operacional do cliente.",
        source: "W3C / Diretrizes de Aplicações Web",
        acceptance_criteria: "1. Compatibilidade com padrões HTML5, CSS3 e ECMAScript 2024.\n2. Execução fluida em ambientes desktop e móveis.",
      },
      {
        code: "RNF-03",
        title: "Autenticação segura de usuários (Segurança)",
        description: "O sistema deve garantir autenticação segura de usuários com senhas criptografadas e tokens JWT assinados via cookies HTTP-Only.",
        type: "RNF",
        priority: "high",
        status: "approved",
        justification: "Proteção contra ataques de sequestro de sessão e vazamento de credenciais.",
        source: "OWASP Top 10 (A01 - Broken Access Control)",
        acceptance_criteria: "1. Hashing seguro via Supabase Auth.\n2. Validação rigorosa em SSR Middleware e Server Actions.",
      },
      {
        code: "RNF-04",
        title: "Proteção de dados contra acesso não autorizado",
        description: "O sistema deve proteger os dados contra acesso não autorizado aplicando políticas RLS (Row Level Security) no nível do banco de dados.",
        type: "RNF",
        priority: "high",
        status: "approved",
        justification: "Isolamento estrito entre projetos de diferentes usuários e conformidade com a LGPD.",
        source: "Lei Geral de Proteção de Dados (Lei 13.709/2018)",
        acceptance_criteria: "1. Políticas RLS ativas em todas as tabelas públicas do Supabase.\n2. Bloqueio de consultas SQL diretas que não pertençam ao usuário autenticado.",
      },
      {
        code: "RNF-05",
        title: "Arquitetura como aplicação web moderna",
        description: "O sistema deve ser desenvolvido com arquitetura full-stack web moderna utilizando React 19 e Next.js 16 (App Router).",
        type: "RNF",
        priority: "high",
        status: "approved",
        justification: "Alta escalabilidade, renderização híbrida rápida e facilidade de deploy contínuo em infraestrutura de nuvem.",
        source: "Arquitetura de Referência Web",
        acceptance_criteria: "1. Build de produção com Turbopack sem erros de tipagem.\n2. Separação de camadas entre apresentação, regras de negócio e dados.",
      },
      {
        code: "RNF-06",
        title: "Banco de dados relacional para persistência",
        description: "O sistema deve utilizar banco de dados relacional PostgreSQL hospedado na nuvem (Supabase) para persistência íntegra das informações.",
        type: "RNF",
        priority: "high",
        status: "approved",
        justification: "Garantia das propriedades ACID e suporte a consultas relacionais complexas para matriz de rastreabilidade.",
        source: "Diretrizes de Arquitetura de Dados",
        acceptance_criteria: "1. 14 tabelas normalizadas com chaves primárias UUID e estrangeiras.\n2. Triggers automatizados de auditoria e incompletude.",
      },
      {
        code: "RNF-07",
        title: "Responsividade em diferentes dispositivos e telas",
        description: "O sistema deve estar disponível e adaptado para acesso em diferentes dispositivos e resoluções de tela (desktop, tablet e mobile).",
        type: "RNF",
        priority: "medium",
        status: "approved",
        justification: "Permitir acompanhamento e aprovação de requisitos em trânsito por smartphones.",
        source: "Princípios de Design Mobile-First",
        acceptance_criteria: "1. Sidebar retrátil com gaveta flutuante (drawer) em telas menores que 768px.\n2. Tabelas com rolagem horizontal fluida e quebra responsiva de grids.",
      },
      {
        code: "RNF-08",
        title: "Tempo de resposta adequado (Desempenho)",
        description: "O sistema deve responder às requisições do usuário em tempo adequado (< 1500ms para consultas e trocas de tela sob conexão estável).",
        type: "RNF",
        priority: "high",
        status: "approved",
        justification: "Eficiência operacional e aderência às diretrizes Core Web Vitals.",
        source: "Normas de Desempenho e SLA",
        acceptance_criteria: "1. Consultas concorrentes via Promise.all.\n2. Lazy loading dinâmico de bibliotecas pesadas (jsPDF).",
      },
      {
        code: "RNF-09",
        title: "Fácil manutenção e expansão (Manutenibilidade)",
        description: "O sistema deve ser de fácil manutenção e expansão, estruturado com código limpo, componentes reutilizáveis e ausência de acoplamento excessivo.",
        type: "RNF",
        priority: "medium",
        status: "approved",
        justification: "Sustentabilidade do software para futuras versões e projetos acadêmicos derivados. Código modularizado.",
        source: "Clean Code / Princípios SOLID",
        acceptance_criteria: "1. Padrão Server Actions para mutações.\n2. Constantes e labels centralizadas em arquivos de domínio.",
      },
      {
        code: "RNF-10",
        title: "Registro de logs e auditoria para rastreamento",
        description: "O sistema deve registrar logs detalhados e trilha de auditoria para facilitar a identificação de falhas e rastreamento de operações críticas.",
        type: "RNF",
        priority: "high",
        status: "approved",
        justification: "Diagnóstico preventivo de erros e governança de dados.",
        source: "Boas Práticas DevOps / SRE",
        acceptance_criteria: "1. Tratamento defensivo try/catch em todas as Server Actions.\n2. Histórico persistido de eventos em audit_logs.",
      },
      {
        code: "RNF-11",
        title: "Garantia da integridade dos dados armazenados",
        description: "O sistema deve garantir a integridade dos dados armazenados por meio de chaves estrangeiras, constraints de unicidade e integridade referencial em cascata.",
        type: "RNF",
        priority: "high",
        status: "approved",
        justification: "Evitar registros órfãos e corrupção estrutural da matriz de rastreabilidade.",
        source: "Teoria Relacional de Bancos de Dados (Codd)",
        acceptance_criteria: "1. Exclusão de requisitos remove vínculos de rastreabilidade e histórico sem corromper o banco.\n2. Chaves estrangeiras com ON DELETE CASCADE ou SET NULL.",
      },
    ];

    let insertedCount = 0;
    let updatedCount = 0;

    for (const req of allRequirements) {
      try {
        // Verificar se já existe requisito com o mesmo código no projeto
        const { data: existing } = await supabase
          .from("requirements")
          .select("id, current_version")
          .eq("project_id", projectId)
          .eq("code", req.code)
          .maybeSingle();

        if (existing) {
          // Atualiza os dados para o padrão completo
          const updatePayload = {
            title: req.title,
            description: req.description,
            type: req.type,
            priority: req.priority,
            status: req.status,
            justification: req.justification,
            source: req.source,
            acceptance_criteria: req.acceptance_criteria,
            responsible_id: responsibleId,
            user_id: user.id,
          };
          if (req.rejection_reason !== undefined) {
            updatePayload.rejection_reason = req.rejection_reason;
          }

          let { error: updErr } = await supabase
            .from("requirements")
            .update(updatePayload)
            .eq("id", existing.id);

          if (updErr && updErr.message?.includes("rejection_reason")) {
            delete updatePayload.rejection_reason;
            await supabase
              .from("requirements")
              .update(updatePayload)
              .eq("id", existing.id);
          }

          updatedCount++;
        } else {
          // Insere novo requisito
          const insertPayload = {
            ...req,
            project_id: projectId,
            responsible_id: responsibleId,
            created_by: user.id,
            user_id: user.id,
            current_version: 1,
          };

          let { data: createdReq, error: insErr } = await supabase
            .from("requirements")
            .insert(insertPayload)
            .select("id")
            .maybeSingle();

          if (insErr && insErr.message?.includes("rejection_reason")) {
            delete insertPayload.rejection_reason;
            const retryRes = await supabase
              .from("requirements")
              .insert(insertPayload)
              .select("id")
              .maybeSingle();
            createdReq = retryRes.data;
            insErr = retryRes.error;
          }

          if (!insErr && createdReq) {
            insertedCount++;

            // Cria snapshot inicial da versão 1
            try {
              await supabase.from("requirement_versions").insert({
                requirement_id: createdReq.id,
                version_number: 1,
                changed_by: user.id,
                change_summary: "Versão inicial cadastrada no projeto ReqFlow",
                snapshot: {
                  code: req.code,
                  title: req.title,
                  description: req.description,
                  type: req.type,
                  priority: req.priority,
                  status: req.status,
                  justification: req.justification,
                  source: req.source,
                  acceptance_criteria: req.acceptance_criteria,
                },
              });
            } catch {}

            // Garante vínculo em project_requirements se a tabela existir
            try {
              await supabase
                .from("project_requirements")
                .upsert(
                  { project_id: projectId, requirement_id: createdReq.id },
                  { onConflict: "project_id,requirement_id" }
                );
            } catch {}
          }
        }
      } catch (err) {
        console.warn(`Aviso ao processar ${req.code}:`, err);
      }
    }

    // Registrar no audit_logs
    try {
      await supabase.from("audit_logs").insert({
        project_id: projectId,
        user_id: user.id,
        entity_type: "project",
        entity_id: projectId,
        action: "seed_reqflow_full",
        description: `Carga oficial dos 55 requisitos do sistema ReqFlow concluída (${insertedCount} novos, ${updatedCount} atualizados).`,
      });
    } catch {}

    revalidatePath("/");
    revalidatePath("/requisitos");
    revalidatePath("/rastreabilidade");
    revalidatePath("/relatorios");

    return {
      success: true,
      message: `Sucesso! 55 requisitos do ReqFlow foram processados (${insertedCount} inseridos, ${updatedCount} atualizados) no projeto!`,
      total: allRequirements.length,
      inserted: insertedCount,
      updated: updatedCount,
    };
  } catch (err) {
    console.error("Erro em seedAllReqflowRequirementsAction:", err);
    return { success: false, error: err.message || "Erro interno ao processar requisitos." };
  }
}
