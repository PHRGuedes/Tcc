# ReqFlow — Plataforma de Apoio à Engenharia de Requisitos

O **ReqFlow** é uma plataforma web completa desenvolvida para apoiar estudantes e desenvolvedores iniciantes no aprendizado e na aplicação prática dos princípios da Engenharia de Requisitos. O projeto unifica catalogação de requisitos (RF/RNF), histórias de usuário ágeis, gestão de sprints (Kanban), rastreabilidade bidirecional e geração automática de documentação SRS (padrão IEEE 830 / ISO/IEC/IEEE 29148).

---

## 🚀 Tecnologias

- **Framework:** [Next.js](https://nextjs.org/) (App Router, React, JavaScript)
- **Estilização:** [Tailwind CSS](https://tailwindcss.com/)
- **Ícones:** [lucide-react](https://lucide.dev/)
- **Gráficos:** [Recharts](https://recharts.org/)
- **Backend & Auth:** [Supabase](https://supabase.com/) (PostgreSQL com Row Level Security estrito e Auth JWT)
- **Hospedagem & CI/CD:** [Vercel](https://vercel.com/)

---

## 👥 Perfis de Usuário (RBAC com RLS)

1. **Administrador (`admin`)**: Gestão integral de usuários e configurações.
2. **Analista de Requisitos (`requirements_analyst`)** *(Ator Central)*: Criação, edição, versionamento e análise de impacto.
3. **Product Owner (`product_owner`)**: Aprovação de requisitos, priorização de backlog e metas de entrega.
4. **Scrum Master (`scrum_master`)**: Facilitação e monitoramento das sprints e fluxos de trabalho.
5. **Desenvolvedor (`developer`)**: Visualização de especificações e atualização de status de implementação.
6. **Gerente de Projeto (`project_manager`)**: Acompanhamento de KPIs, matriz de rastreabilidade e relatórios.

---

## 📁 Estrutura Modular

```text
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.jsx         # Tela de autenticação com e-mail e senha
│   │   ├── register/page.jsx      # Cadastro com seleção dos 6 perfis
│   │   └── layout.jsx
│   ├── (dashboard)/
│   │   ├── layout.jsx             # Shell do sistema (Sidebar navy blue + Topbar de contexto)
│   │   ├── page.jsx               # Dashboard principal (KPIs, Donut Chart e Feed Recente)
│   │   ├── requisitos/page.jsx    # Tabela com busca, filtros, alerta de completude e modal
│   │   ├── user-stories/page.jsx  # Gestão de histórias de usuário (Como/Quero/Para)
│   │   ├── backlog/page.jsx       # Backlog & Sprints (Quadro Kanban com 4 colunas)
│   │   ├── rastreabilidade/page.jsx # Matriz dinâmica de cruzamento Requisitos x US x Stakeholders
│   │   └── relatorios/page.jsx    # Gerador automático de documento SRS e exportações
│   ├── globals.css
│   └── layout.js
├── components/
│   ├── ui/                        # Badges, botões, modais e componentes atômicos
│   ├── layout/                    # Sidebar, Topbar e ProjectContext (alternador de projetos)
│   └── modules/                   # Componentes específicos de cada domínio
├── lib/
│   ├── supabase/                  # Clientes @supabase/ssr (client, server, middleware)
│   ├── constants/                 # Perfis, status e prioridades
│   └── utils/                     # Validador pedagógico de completude e formatadores
└── hooks/
    ├── use-auth.js                # Sessão e perfil do usuário logado
    └── use-project.js             # Projeto ativo e múltiplos projetos
```

---

## ⚙️ Configuração do Banco de Dados (Supabase)

1. Acesse o dashboard do seu projeto no [Supabase](https://supabase.com).
2. Vá em **SQL Editor** > **New query**.
3. Execute o script contido em:
   - `supabase/migrations/0001_initial_schema.sql` (cria tabelas, triggers de completude e políticas de RLS).
4. *(Opcional)* Para popular dados de demonstração idênticos ao protótipo visual, execute:
   - `supabase/migrations/0002_seed_data.sql`.

---

## 💻 Executando Localmente

1. Clone o repositório e instale as dependências:
   ```bash
   npm install
   ```

2. Certifique-se de que o arquivo `.env.local` contém as credenciais do Supabase:
   ```env
   NEXT_PUBLIC_SUPABASE_URL="https://bnfowswxiyqmxgjnssif.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsIn..."
   ```

3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
   Acesse [http://localhost:3000](http://localhost:3000).

4. Para testar o build de produção:
   ```bash
   npm run build
   ```

---

## 🌐 Deploy na Vercel

1. Faça o commit e push do repositório para o GitHub / GitLab:
   ```bash
   git add .
   git commit -m "feat: implementacao completa do ReqFlow"
   git push origin main
   ```
2. Importe o repositório na [Vercel](https://vercel.com/new).
3. Adicione as variáveis de ambiente:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Clique em **Deploy**.
