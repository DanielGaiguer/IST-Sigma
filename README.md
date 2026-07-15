# IST Sigma — Sistema Integrado de Gestão de Manutenção de Ativos

Sistema web para gestão de manutenção preventiva de equipamentos laboratoriais. Construído com Next.js 16, TypeScript, Drizzle ORM (NeonDB) e shadcn/ui.

## Pré-requisitos

- Node.js 20+
- npm 10+
- Conta no [NeonDB](https://neon.tech) (ou outro PostgreSQL)
- Azure AD App Registration (para notificações por e-mail via Microsoft Graph)

## Configuração

### 1. Variáveis de ambiente

Copie o `.env.example` para `.env` e preencha:

```bash
cp .env.example .env
```

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | Connection string do NeonDB (PostgreSQL) |
| `AUTH_SECRET` | Segredo para JWT do NextAuth. Gere com: `openssl rand -base64 32` |
| `AUTH_URL` | URL base da aplicação (ex: `http://localhost:3000`) |
| `MS_GRAPH_CLIENT_ID` | Client ID do Azure AD App Registration |
| `MS_GRAPH_CLIENT_SECRET` | Client Secret do Azure AD |
| `MS_GRAPH_TENANT_ID` | Tenant ID do Azure AD |
| `MS_GRAPH_SENDER_EMAIL` | E-mail do remetente (deve ser um usuário válido no tenant) |

### 2. Instalação e migrations

```bash
# Instalar dependências
npm install

# Push do schema para o banco (cria/atualiza tabelas)
npm run db:push

# (Opcional) Gerar migrations para controle de versão
npm run db:generate
```

### 3. Seed dos dados iniciais

```bash
npm run db:seed
```

O seed é idempotente — pode ser executado múltiplas vezes sem duplicar dados. Cria:
- 2 usuários (admin e técnico)
- Unidades, laboratórios, fabricantes, tipos, classificações e modelos de equipamento
- Planos de manutenção com herança em 3 níveis
- Equipamentos com manutenções programadas e histórico

### 4. Iniciar em desenvolvimento

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:3000`.

**Credenciais padrão do seed:**
- Admin: `admin@labcare.com` / `senha123`
- Técnico: `carlos@labcare.com` / `senha123`

## Arquitetura

### Hierarquia de dados

```
Unidade
  └── Laboratório
        └── Equipamento
              ├── Fabricante
              ├── Modelo
              │     ├── Classificação
              │     │     └── Tipo de Equipamento
              │     └── (herda Classificação)
              └── Plano de Manutenção (via herança)
```

### Herança de Planos de Manutenção

Os planos seguem uma hierarquia de 3 níveis. Um equipamento recebe itens de **todos** os planos cujo nível se aplica:

```
┌──────────────────────────────────────────────────────────┐
│ Nível BASE          │ classificacaoId=NULL, modeloId=NULL │
│                     │ Aplica-se a TODOS os equipamentos.  │
├─────────────────────┼────────────────────────────────────┤
│ Nível CLASSIFICAÇÃO │ classificacaoId=PK, modeloId=NULL   │
│                     │ Herda itens do Base + próprios.     │
├─────────────────────┼────────────────────────────────────┤
│ Nível MODELO        │ classificacaoId=PK, modeloId=PK    │
│                     │ Herda dos 2 anteriores + próprios.  │
└──────────────────────────────────────────────────────────┘
```

**Exemplo:** Um equipamento do tipo "Multímetro" / classificação "Portátil" / modelo "MT-4090" recebe:
1. Itens do plano **base** (tipo Multímetro)
2. Itens do plano de **classificação** (Portátil)
3. Itens do plano de **modelo** (MT-4090), se existir

### Ciclo de vida de uma manutenção

```
PlanoItem (ativo)
  ↓ ao cadastrar equipamento
ManutencaoProgramada (status: programada)
  ↓ quando data prevista vence
ManutencaoProgramada (status: pendente)
  ↓ ao concluir
HistoricoManutencao (status: concluida) + nova ManutencaoProgramada (próximo ciclo)
```

### Perfis de acesso

| Recurso | Admin | Técnico |
|---|---|---|
| Dashboard | Leitura | Leitura |
| Agenda do Dia | Leitura + Concluir | Leitura + Concluir |
| Equipamentos | CRUD completo | Leitura + Visualizar |
| Planos de Manutenção | CRUD completo | Leitura + Simular |
| Cadastros | CRUD completo | Leitura |
| Manutenções | Leitura | Leitura |
| Histórico | Leitura + CSV | Leitura + CSV |
| Auditoria | Leitura | — |
| Usuários | CRUD completo | — |
| Notificações | Enviar | — |

### Notificações por e-mail

Integração com Microsoft Graph API (Outlook corporativo):
- Notificação 7 dias antes do vencimento
- Notificação no dia do vencimento
- Reenvio periódico para pendências atrasadas (a cada 3 dias)
- E-mails consolidados por laboratório
- Rota `POST /api/notificacoes/enviar` para disparo manual ou via cron

Para configurar um cron job (Vercel Cron), adicione ao `vercel.json`:

```json
{
  "crons": [{ "path": "/api/notificacoes/enviar", "schedule": "0 8 * * *" }]
}
```

## Estrutura do projeto

```
src/
├── app/
│   ├── (authenticated)/     # Rotas protegidas (requer login)
│   │   ├── dashboard/       # Dashboard com KPIs, gráficos e alertas
│   │   ├── agenda/          # Agenda do dia (manutenções do dia)
│   │   ├── equipamentos/    # CRUD de equipamentos
│   │   ├── planos-manutencao/ # Gestão de planos (admin)
│   │   ├── manutencoes/     # Lista de manutenções programadas
│   │   ├── historico/       # Histórico com exportação CSV
│   │   ├── cadastros/       # 6 páginas CRUD genéricas
│   │   └── admin/           # Auditoria e gestão de usuários
│   ├── api/                 # Rotas de API REST
│   └── login/               # Página de login
├── components/
│   ├── layout/              # Shell, Sidebar, Header
│   ├── dashboard/           # KPI cards, gráficos, alertas
│   ├── agenda/              # Lista da agenda do dia
│   ├── cadastros/           # Componente CRUD genérico
│   └── ui/                  # Componentes shadcn/ui
├── db/
│   ├── schema.ts            # Schema Drizzle (14 tabelas)
│   ├── seed.ts              # Dados iniciais
│   └── index.ts             # Conexão com NeonDB
├── hooks/
│   └── use-crud-resource.ts # Hooks reutilizáveis para CRUD
├── lib/
│   ├── auth.ts              # NextAuth + helpers de sessão
│   ├── queries.ts           # Queries do dashboard
│   ├── validations.ts       # Schemas Zod
│   └── audit.ts             # Helper de auditoria
└── server/
    ├── maintenance-engine.ts # Lógica de negócio (planos, ciclos)
    └── notifications.ts     # Notificações via Microsoft Graph
```

## Comandos disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia o servidor de desenvolvimento |
| `npm run build` | Gera build de produção |
| `npm run start` | Inicia o servidor de produção |
| `npm run lint` | Executa ESLint |
| `npm run db:push` | Push do schema para o banco |
| `npm run db:generate` | Gera migrations do Drizzle |
| `npm run db:studio` | Abre o Drizzle Studio (UI do banco) |
| `npm run db:seed` | Popula o banco com dados iniciais |

## Tecnologias

- **Framework:** Next.js 16 (App Router)
- **Linguagem:** TypeScript 5
- **Estilo:** Tailwind CSS v4
- **UI:** shadcn/ui (base-nova, neutral theme)
- **Banco:** PostgreSQL via NeonDB
- **ORM:** Drizzle ORM 0.45
- **Auth:** NextAuth v5 (Auth.js) com Credentials Provider
- **Gráficos:** Recharts
- **Validação:** Zod
- **E-mail:** Microsoft Graph API (OAuth2 client credentials)
