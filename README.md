# TCU Auditor — Controle de Estudos

> Plataforma completa de controle de ciclos de estudos para o concurso do **Tribunal de Contas da União (TCU)** — Auditor Federal de Controle Externo, banca FGV.

---

## ✨ Funcionalidades

- 📚 **Edital Completo** — 17 disciplinas e 284 aulas do edital oficial (Estratégia Concursos)
- ⏱️ **Ciclo de Estudos** — Cronômetro por matéria com controle de progresso em tempo real
- 📊 **Dashboard** — Estatísticas de horas líquidas, questões e precisão por disciplina
- 🔄 **Revisão Espaçada** — Sistema automático de revisões (24h → 7d → 30d)
- 📝 **Simulados** — Registro e análise de desempenho por matéria
- 📅 **Planejamento Semanal** — Meta de horas e contagem regressiva para a prova
- ☁️ **Sincronização na Nuvem** — Backup automático via Supabase (multi-dispositivo)
- 💾 **Backup Local** — Export/import JSON e integração com GitHub Gist

---

## 🛠️ Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Estilização | Tailwind CSS v4 |
| Banco de dados | Supabase (PostgreSQL + Row Level Security) |
| Autenticação | Supabase Auth |
| Deploy | Vercel |

---

## 🚀 Rodando Localmente

**Pré-requisitos:** Node.js 18+

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais do Supabase

# 3. Iniciar servidor de desenvolvimento
npm run dev
```

Acesse em: `http://localhost:5173`

---

## ⚙️ Configuração do Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. No **SQL Editor**, execute o arquivo [`supabase_schema.sql`](./supabase_schema.sql)
3. Em **Authentication → Providers → Email**, desabilite "Confirm email"
4. Copie a URL e a chave anon para o `.env`:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anon_aqui
```

---

## 🌱 Popular o Banco com Dados de Teste

```bash
npx tsx scripts/seed_supabase.ts
```

O script cria um usuário de teste e insere todas as 17 matérias com 284 aulas, simulados e histórico de sessões. Ao final, exibe as credenciais para login na aplicação.

---

## 📁 Estrutura do Projeto

```
src/
├── components/          # Componentes React por seção
│   ├── DashboardStats   # Painel de estatísticas
│   ├── CicloEstudoSeccao# Cronômetro de ciclos
│   ├── EditalSeccao     # Grade de matérias e aulas
│   ├── SimuladoSeccao   # Registro de simulados
│   ├── RevisaoSeccao    # Revisão espaçada
│   ├── PlanejamentoSemanal
│   ├── DadosEBackup     # Backup e sincronização
│   └── SupabaseAuthModal# Login/cadastro na nuvem
├── lib/
│   └── supabase.ts      # Cliente Supabase
├── data.ts              # 17 matérias, aulas e dados iniciais
├── types.ts             # Interfaces TypeScript
└── App.tsx              # Componente raiz e state global

scripts/
└── seed_supabase.ts     # Script de seed completo

supabase_schema.sql      # Schema do banco (tabela + RLS + triggers)
```

---

## 🗃️ Schema do Banco

A tabela `user_data_sync` armazena todo o progresso do usuário em colunas JSONB com isolamento completo por `user_id` via **Row Level Security**:

| Coluna | Tipo | Descrição |
|---|---|---|
| `user_id` | UUID (PK) | ID do usuário autenticado |
| `updated_at` | TIMESTAMPTZ | Última sincronização |
| `materias` | JSONB | Progresso por matéria e aula |
| `ciclo` | JSONB | Configuração do ciclo ativo |
| `simulados` | JSONB | Histórico de simulados |
| `revisoes` | JSONB | Revisões espaçadas agendadas |
| `historico` | JSONB | Log de todas as sessões de estudo |
| `planejamento_semanal` | JSONB | Metas e data da prova |

---

## 📦 Deploy na Vercel

```bash
# Via CLI
vercel --prod

# Ou conecte o repositório no painel da Vercel
# e configure as variáveis de ambiente:
# VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
```

---

## 📄 Licença

Uso pessoal. Todos os direitos reservados.