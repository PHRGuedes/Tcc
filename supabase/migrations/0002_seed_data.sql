-- ==============================================================================
-- REQFLOW: SEED DATA (Baseado nos Mockups do Protótipo v0.dev)
-- ==============================================================================

-- 1. DESACOPLAR CONSTRAINT RÍGIDA DE PROFILES PARA PERMITIR SEED SUAVE
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 2. DADOS DE DEMONSTRAÇÃO DO SISTEMA
DO $$
DECLARE
    v_user_ana UUID := '11111111-1111-1111-1111-111111111111';
    v_user_carlos UUID := '22222222-2222-2222-2222-222222222222';
    v_user_diego UUID := '33333333-3333-3333-3333-333333333333';
    v_user_beatriz UUID := '44444444-4444-4444-4444-444444444444';
    
    v_project_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    v_sprint_id UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    
    v_req1 UUID := 'c0000001-0000-0000-0000-000000000001';
    v_req2 UUID := 'c0000002-0000-0000-0000-000000000002';
    v_req3 UUID := 'c0000003-0000-0000-0000-000000000003';
    v_req4 UUID := 'c0000004-0000-0000-0000-000000000004';
    v_req5 UUID := 'c0000005-0000-0000-0000-000000000005';
    v_req6 UUID := 'c0000006-0000-0000-0000-000000000006';
    v_req7 UUID := 'c0000007-0000-0000-0000-000000000007';
    v_req8 UUID := 'c0000008-0000-0000-0000-000000000008';
    v_req9 UUID := 'c0000009-0000-0000-0000-000000000009';
    v_req10 UUID := 'c0000010-0000-0000-0000-000000000010';
    v_req11 UUID := 'c0000011-0000-0000-0000-000000000011';
    v_req12 UUID := 'c0000012-0000-0000-0000-000000000012';

    v_us1 UUID := 'd0000001-0000-0000-0000-000000000001';
    v_us2 UUID := 'd0000002-0000-0000-0000-000000000002';
    v_us3 UUID := 'd0000003-0000-0000-0000-000000000003';
    v_us4 UUID := 'd0000004-0000-0000-0000-000000000004';
    v_us5 UUID := 'd0000005-0000-0000-0000-000000000005';
    v_us6 UUID := 'd0000006-0000-0000-0000-000000000006';
    v_us7 UUID := 'd0000007-0000-0000-0000-000000000007';
    v_us8 UUID := 'd0000008-0000-0000-0000-000000000008';
BEGIN
    -- 1. PERFIS DEMO EM PUBLIC.PROFILES
    INSERT INTO public.profiles (id, full_name, email, role)
    VALUES 
        (v_user_ana, 'Ana Ribeiro', 'ana.ribeiro@reqflow.com', 'requirements_analyst'),
        (v_user_carlos, 'Carlos Mendes', 'carlos.mendes@reqflow.com', 'product_owner'),
        (v_user_diego, 'Diego Almeida', 'diego.almeida@reqflow.com', 'developer'),
        (v_user_beatriz, 'Beatriz Souza', 'beatriz.souza@reqflow.com', 'scrum_master')
    ON CONFLICT (id) DO UPDATE 
    SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

    -- 2. PROJETO DEMO
    INSERT INTO public.projects (id, name, description, created_by)
    VALUES (
        v_project_id, 
        'Sistema de Gestão Acadêmica', 
        'Sistema acadêmico modular de gestão de matrículas, cursos e notas para instituições de ensino superior.',
        v_user_ana
    ) ON CONFLICT (id) DO NOTHING;

    -- Membros do Projeto
    INSERT INTO public.project_members (project_id, user_id, role_in_project)
    VALUES 
        (v_project_id, v_user_ana, 'requirements_analyst'),
        (v_project_id, v_user_carlos, 'product_owner'),
        (v_project_id, v_user_diego, 'developer'),
        (v_project_id, v_user_beatriz, 'scrum_master')
    ON CONFLICT (project_id, user_id) DO NOTHING;

    -- 3. REQUISITOS (Conforme telas de gestão e criação de requisitos)
    INSERT INTO public.requirements (id, code, title, description, type, priority, status, justification, source, acceptance_criteria, responsible_id, current_version)
    VALUES 
        (v_req1, 'REQ-001', 'Autenticação de Usuários', 'O sistema deve permitir que usuários realizem login com e-mail e senha.', 'RF', 'high', 'approved', 'Garantir segurança e identificação única na plataforma.', 'Entrevista com Stakeholders Acadêmicos', 'O usuário deve conseguir autenticar com e-mail válido e senha criptografada em até 2 segundos.', v_user_ana, 1),
        (v_req2, 'REQ-002', 'Painel de Indicadores', 'O sistema deve exibir um painel com indicadores de status dos requisitos.', 'RF', 'high', 'in_development', 'Permitir visualização rápida da saúde do projeto para os gestores.', 'Reunião de Alinhamento com Coordenação', 'O dashboard deve exibir métricas de Total, Pendentes, Aprovados e Em Desenvolvimento com gráfico.', v_user_carlos, 1),
        (v_req3, 'REQ-003', 'Tempo de Resposta', 'O tempo de resposta das páginas não deve exceder 2 segundos.', 'RNF', 'medium', 'proposed', 'Garantir usabilidade e retenção do usuário em conexões instáveis.', 'Diretrizes de Qualidade ISO/IEC 25010', '95% das requisições devem responder em tempo inferior a 2000ms sob carga de 100 usuários simultâneos.', v_user_beatriz, 1),
        (v_req4, 'REQ-004', 'CRUD de Requisitos', 'O sistema deve permitir cadastrar, editar e excluir requisitos.', 'RF', 'high', 'approved', 'Operação central do fluxo de trabalho de engenharia de requisitos.', 'Manual de Práticas de Requisitos', 'Deve permitir preenchimento completo de descrição, justificativa, critérios de aceitação e fonte.', v_user_ana, 1),
        (v_req5, 'REQ-005', 'Histórico de Versões', 'O sistema deve manter histórico de versões de cada requisito.', 'RF', 'medium', 'in_development', 'Rastrear evolução dos requisitos e auditoria de mudanças.', 'Reunião de Governança', 'Cada modificação deve gerar um snapshot com autor, data/hora e resumo da alteração.', v_user_diego, 1),
        (v_req6, 'REQ-006', 'Acessibilidade Web', 'A aplicação deve ser acessível conforme diretrizes WCAG 2.1 AA.', 'RNF', 'medium', 'proposed', 'Inclusão de usuários com deficiências e conformidade legal.', 'Legislação e Diretrizes W3C', 'Contraste mínimo 4.5:1, navegação por teclado e compatibilidade com leitores de tela.', v_user_beatriz, 1),
        (v_req7, 'REQ-007', 'Geração de Matriz', 'O sistema deve gerar a matriz de rastreabilidade entre requisitos e user stories.', 'RF', 'high', 'proposed', 'Garantir que nenhum requisito fique órfão sem desenvolvimento.', 'Plano de Ensino de Engenharia de Software', 'Exibição de matriz cruzada com indicador de cobertura por coluna.', v_user_carlos, 1),
        (v_req8, 'REQ-008', 'Criptografia de Dados', 'Os dados sensíveis devem ser protegidos com criptografia em repouso.', 'RNF', 'high', 'approved', 'Conformidade com a LGPD e proteção de dados cadastrais.', 'Comitê de Segurança da Informação', 'AES-256 para dados armazenados e TLS 1.3 para dados em trânsito.', v_user_diego, 1),
        (v_req9, 'REQ-009', 'Vinculação de Histórias', 'O sistema deve permitir vincular requisitos a User Stories.', 'RF', 'medium', 'approved', 'Conectar requisitos à execução ágil.', 'Metodologia Scrum do time', 'Seleção de uma ou mais US a partir do modal de requisitos.', v_user_ana, 1),
        (v_req10, 'REQ-010', 'Exportação de Relatórios', 'O sistema deve permitir a exportação de relatórios em PDF, CSV e DOCX.', 'RF', 'medium', 'proposed', 'Compartilhamento formal com clientes e avaliadores.', 'Requisitos de Entrega da Disciplina', 'Download de arquivos formatados com listagem completa e status.', v_user_beatriz, 1),
        (v_req11, 'REQ-011', 'Notificação de Alterações', 'O sistema deve notificar membros quando um requisito for aprovado.', 'RF', 'medium', 'in_development', 'Alinhar time de desenvolvimento em tempo real.', 'Feedback dos desenvolvedores', 'Ícone de notificação na barra superior indicando a ação.', v_user_diego, 1),
        (v_req12, 'REQ-012', 'Alerta de Incompletude', 'O sistema deve exibir alertas para requisitos sem critérios ou fonte.', 'RF', 'high', 'proposed', 'Propósito pedagógico: guiar o aluno a preencher requisitos completos.', 'Professores de Engenharia de Requisitos', 'Ícone amarelo de alerta exibido na tabela se faltar critério ou justificativa.', v_user_carlos, 1)
    ON CONFLICT (code) DO NOTHING;

    -- Vínculo de Requisitos ao Projeto
    INSERT INTO public.project_requirements (project_id, requirement_id)
    SELECT v_project_id, id FROM public.requirements
    ON CONFLICT (project_id, requirement_id) DO NOTHING;

    -- 4. SPRINT DEMO
    INSERT INTO public.sprints (id, project_id, name, goal, start_date, end_date, status)
    VALUES (
        v_sprint_id,
        v_project_id,
        'Sprint 4 — Rastreabilidade & Qualidade',
        'Fechar matriz de rastreabilidade automática e validações de qualidade dos requisitos.',
        '2026-08-01',
        '2026-08-15',
        'active'
    ) ON CONFLICT (id) DO NOTHING;

    -- 5. USER STORIES DEMO (Conforme bacdklog e sprints.jpg)
    INSERT INTO public.user_stories (id, project_id, code, title, as_a, i_want, so_that, status, priority, sprint_id, responsible_id)
    VALUES 
        (v_us1, v_project_id, 'US-01', 'Autenticação de usuários', 'usuário do sistema', 'fazer login com credenciais seguras', 'acessar meu painel de projetos', 'done', 'high', v_sprint_id, v_user_ana),
        (v_us2, v_project_id, 'US-02', 'Painel de indicadores', 'analista de requisitos', 'visualizar os KPIs do projeto em gráficos', 'acompanhar o progresso da especificação', 'in_progress', 'high', v_sprint_id, v_user_carlos),
        (v_us3, v_project_id, 'US-03', 'Gestão de requisitos (CRUD)', 'analista de requisitos', 'cadastrar e editar RFs e RNFs', 'manter o catálogo atualizado', 'in_progress', 'high', v_sprint_id, v_user_ana),
        (v_us4, v_project_id, 'US-04', 'Histórico de versões', 'usuário da equipe', 'consultar as versões anteriores de um requisito', 'entender o motivo das alterações', 'todo', 'medium', v_sprint_id, v_user_diego),
        (v_us5, v_project_id, 'US-05', 'Matriz de rastreabilidade', 'gerente de projeto', 'ver a relação entre requisitos e histórias', 'evitar requisitos não implementados', 'todo', 'high', v_sprint_id, v_user_carlos),
        (v_us6, v_project_id, 'US-06', 'Criptografia de dados', 'especialista de segurança', 'garantir sigilo de dados sensíveis', 'cumprir requisitos regulatórios', 'backlog', 'high', NULL, v_user_diego),
        (v_us7, v_project_id, 'US-07', 'Exportação de relatórios', 'analista de requisitos', 'gerar PDFs e planilhas com os requisitos', 'apresentar nas reuniões com clientes', 'backlog', 'low', NULL, v_user_beatriz),
        (v_us8, v_project_id, 'US-08', 'Experiência responsiva', 'usuário mobile', 'navegar na plataforma pelo tablet ou celular', 'consultar requisitos em campo', 'backlog', 'medium', NULL, v_user_beatriz)
    ON CONFLICT (project_id, code) DO NOTHING;

    -- 6. RASTREABILIDADE DEMO (Conforme matriz de rastreabilidade.jpg)
    INSERT INTO public.requirement_user_stories (requirement_id, user_story_id)
    VALUES 
        (v_req1, v_us1),
        (v_req2, v_us2),
        (v_req4, v_us3),
        (v_req5, v_us4),
        (v_req7, v_us5)
    ON CONFLICT (requirement_id, user_story_id) DO NOTHING;

    INSERT INTO public.requirement_stakeholders (requirement_id, stakeholder_id)
    VALUES 
        (v_req1, v_user_ana),
        (v_req2, v_user_carlos),
        (v_req3, v_user_beatriz),
        (v_req4, v_user_ana),
        (v_req5, v_user_diego),
        (v_req6, v_user_beatriz),
        (v_req7, v_user_carlos),
        (v_req8, v_user_diego),
        (v_req9, v_user_ana),
        (v_req10, v_user_beatriz)
    ON CONFLICT (requirement_id, stakeholder_id) DO NOTHING;

    -- 7. AUDIT LOGS DEMO (Conforme dashboard.jpg: Atividade Recente)
    INSERT INTO public.audit_logs (project_id, user_id, entity_type, entity_id, action, description, created_at)
    VALUES 
        (v_project_id, v_user_ana, 'requirement', v_req4::text, 'approved', 'aprovou o requisito REQ-004', now() - interval '12 minutes'),
        (v_project_id, v_user_carlos, 'requirement', v_req12::text, 'created', 'criou o requisito REQ-012', now() - interval '1 hour'),
        (v_project_id, v_user_diego, 'requirement', v_req11::text, 'status_changed', 'atualizou o status de REQ-011 para Em Desenvolvimento', now() - interval '3 hours'),
        (v_project_id, v_user_beatriz, 'requirement', v_req6::text, 'commented', 'comentou no requisito REQ-006', now() - interval '1 day'),
        (v_project_id, v_user_ana, 'requirement', v_req9::text, 'linked', 'vinculou REQ-009 à user story US-07', now() - interval '1 day 8 hours');

END $$;
