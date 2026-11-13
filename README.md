# ReqFlow — Plataforma de Apoio à Engenharia de Requisitos

O **ReqFlow** é uma plataforma web completa desenvolvida como Trabalho de Conclusão de Curso (TCC) para apoiar estudantes, analistas e equipes de desenvolvimento na aplicação prática dos princípios da Engenharia de Requisitos combinada a metodologias ágeis. O sistema unifica especificação de requisitos (RF/RNF), biblioteca pessoal reutilizável, histórias de usuário (Scrum), gestão de sprints (Kanban), matriz de rastreabilidade bidirecional, controle de versões com análise de impacto e geração automática de documentação SRS (padrão IEEE 830 / ISO/IEC/IEEE 29148).

---

## 🚀 Tecnologias

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router, React 19, Server Actions)
- **Estilização:** [Tailwind CSS v4](https://tailwindcss.com/) (Suporte nativo a Modo Claro e Modo Escuro)
- **Ícones:** [lucide-react](https://lucide.dev/)
- **Gráficos:** [Recharts](https://recharts.org/)
- **Backend & Auth:** [Supabase](https://supabase.com/) (PostgreSQL com Row Level Security e Auth JWT)
- **Hospedagem & CI/CD:** [Vercel](https://vercel.com/)

---

## 👥 Controle de Acesso por Projeto (RBAC Granular & Funções Customizáveis)

O perfil de acesso é atribuído **no contexto de cada projeto** (o criador do projeto é sempre o Administrador, e novos membros ingressam mediante **convite por e-mail com aceite**):

1. **Administrador (`admin`)**: Gestão integral do projeto, convites de stakeholders, matriz de permissões e exclusão do projeto.
2. **Analista de Requisitos (`requirements_analyst`)**: Levantamento, especificação, versionamento, dependências, análise de impacto e importação/reuso.
3. **Product Owner (`product_owner`)**: Aprovação/reprovação rápida de requisitos (`Em Análise`, `Aprovado`, `Não Aprovado`), priorização do backlog e User Stories.
4. **Scrum Master (`scrum_master`)**: Planejamento, ativação e arquivamento de Sprints e facilitação do fluxo Kanban.
5. **Desenvolvedor (`developer`)**: Visualização de especificações e movimentação das User Stories nas Sprints.
6. **Gerente de Projeto (`project_manager`)**: Acompanhamento de KPIs no Dashboard, matriz de rastreabilidade e exportação de relatórios SRS/CSV/JSON.
7. **Funções Customizadas**: Cada projeto permite criar funções extras e personalizar 12 permissões granulares por checkbox.

---

## ✨ Principais Funcionalidades Implementadas

- **Fluxo de Aprovação Simplificado (3 Status):** Requisitos possuem foco exclusivo em especificação e homologação (`Em Análise`, `Aprovado`, `Não Aprovado`), com botões de aprovação/reprovação em 1 clique na tabela.
- **Biblioteca Global Pessoal & Reutilização (`RF.33` / `RF.34`):** Repositório isolado por usuário (`/requisitos/globais`) e importação por cópia profunda (*Deep Clone*) de requisitos de outros projetos ou de templates de mercado.
- **Versionamento, Decisões, Dependências e Análise de Impacto (`RF.20` – `RF.24`, `RF.43`):**
  - Comparador visual de versões anteriores com restauração em 1 clique.
  - Aba de comentários técnicos e decisões formais vinculadas ao requisito.
  - Registro de dependências (`Depende de`, `Complementa`, `Refina`, `Conflita com`) e alerta automático de **Análise de Impacto** e **Prevenção de Duplicidade**.
- **User Stories & Sprints (`RF.09`, `RF.27`, `RF.28`):** CRUD completo de histórias no padrão Connextra (*Como / Quero / Para*), vínculo multi-requisitos e quadro Kanban interativo por Sprint.
- **Matriz de Rastreabilidade Bidirecional (`RF.16`, `RF.17`, `RF.31`):** Cruzamento interativo em tempo real (*Requisitos × User Stories* e *Requisitos × Stakeholders*) com persistência automática no Supabase e exportação CSV.
- **Gerador SRS IEEE 830 & Relatórios Analíticos (`RF.37` – `RF.40`):** Geração automática da Especificação de Requisitos de Software para impressão/PDF, exportações em `.CSV` (Excel), `.JSON` e `.TXT`, e métricas detalhadas por status, tipo, completude, prioridade e responsável.

---

## 📁 Estrutura Modular

```text
src/
├── app/
│   ├── actions/                   # Server Actions (projects, requirements, user-stories)
│   ├── (auth)/
│   │   ├── login/page.jsx         # Autenticação com e-mail e senha
│   │   ├── register/page.jsx      # Cadastro de conta
│   │   └── layout.jsx
│   ├── (dashboard)/
│   │   ├── layout.jsx             # Shell do sistema (Sidebar responsiva + Providers)
│   │   ├── page.jsx               # Dashboard principal (KPIs de Requisitos e Sprints + Donut Chart)
│   │   ├── requisitos/
│   │   │   ├── page.jsx           # Requisitos do Projeto (tabela, aprovação 1-click, reuso e modal)
│   │   │   └── globais/page.jsx   # Biblioteca Global Pessoal do usuário
│   │   ├── user-stories/page.jsx  # Gestão de User Stories (CRUD + vínculo com Requisitos e Sprints)
│   │   ├── backlog/page.jsx       # Backlog & Sprints (Quadro Kanban e gestão de Sprints)
│   │   ├── rastreabilidade/page.jsx # Matriz interativa Requisitos × US × Stakeholders
│   │   └── relatorios/page.jsx    # Gerador automático SRS IEEE 830 e exportações CSV/JSON/PDF
│   ├── globals.css
│   └── layout.js
├── components/
│   ├── ui/                        # Badges, botões e componentes atômicos
│   ├── layout/                    # Sidebar, Topbar, ProjectContext, PermissionsContext, ThemeProvider
│   └── modules/                   # Modais e componentes de domínio (Requisitos, Projetos, Perfil, Dashboard)
├── lib/
│   ├── supabase/                  # Clientes @supabase/ssr (client, server, middleware)
│   ├── constants/                 # Permissões granulares, perfis, status e prioridades
│   └── utils/                     # Formatadores e utilitários
└── hooks/
    └── use-auth.js                # Sessão e perfil do usuário autenticado
```

---

## ⚙️ Configuração do Banco de Dados (Supabase)

1. Acesse o painel do seu projeto no [Supabase](https://supabase.com) > **SQL Editor**.
2. Execute as migrations localizadas em `supabase/migrations/` na ordem numérica (de `0001_initial_schema.sql` até `0010_requirement_three_statuses.sql`).

---

## 💻 Executando Localmente

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Configure o arquivo `.env.local` com as credenciais do projeto Supabase:
   ```env
   NEXT_PUBLIC_SUPABASE_URL="https://seu-projeto.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="sua-chave-anon"
   ```

3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
   Acesse [http://localhost:3000](http://localhost:3000).

4. Para validar o build de produção:
   ```bash
   npm run build
   ```
