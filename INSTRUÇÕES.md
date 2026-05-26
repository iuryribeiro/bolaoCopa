# Bolão da Copa do Mundo FIFA 2026

## Como configurar e rodar o projeto

### 1. Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com) (gratuita)
- Conta na [API-Football](https://www.api-football.com) (plano gratuito: 100 req/dia)

---

### 2. Configurar o Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um projeto novo
2. Vá em **SQL Editor** e execute os dois arquivos SQL em ordem:
   - Primeiro: `supabase/schema.sql` (tabelas principais, RLS, funções)
   - Depois: `supabase/cache_schema.sql` (tabelas de cache e contador de API)
3. Vá em **Authentication > Settings** e configure o domínio do seu site
4. Copie as credenciais em **Project Settings > API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`

#### Tornar-se admin:
Após criar sua conta no app, execute no SQL Editor:
```sql
UPDATE user_profiles SET is_admin = true WHERE user_id = 'SEU_USER_ID';
```
Você encontra o `user_id` em Authentication > Users.

---

### 3. Configurar API-Football

1. Crie conta em [api-football.com](https://www.api-football.com)
2. Vá no dashboard e copie sua API Key
3. Para Copa do Mundo 2026: `league_id = 1`, `season = 2026`

---

### 4. Configurar variáveis de ambiente

```bash
cp .env.local.example .env.local
```

Edite `.env.local` e preencha com suas credenciais.

---

### 5. Rodar localmente

```bash
cd bolao-copa
npm install
npm run dev
```

Acesse: http://localhost:3000

---

### 6. Deploy na Vercel

1. Faça push do projeto para um repositório GitHub
2. Acesse [vercel.com](https://vercel.com) e importe o repositório
3. Configure as variáveis de ambiente no painel da Vercel (mesmo conteúdo do `.env.local`)
4. A Vercel detecta automaticamente o Next.js e faz o deploy

---

## Como usar

### Cadastro e Login
- Acesse `/cadastro` para criar uma conta
- Faça login em `/login`

### Sincronizar jogos (admin)
1. Faça login com conta admin
2. Vá em `/admin`
3. Clique em **Sincronizar todos os jogos**
4. Aguarde a confirmação

> ⚠️ O plano gratuito da API-Football tem limite de 100 req/dia. Use com moderação.

### Fazer palpites
- Vá em `/jogos` para ver todos os jogos
- Clique em um jogo para fazer seu palpite
- O palpite fecha automaticamente **1 hora antes** do jogo

### Ranking
- `/ranking` — Classificação geral dos participantes

### Artilheiros
- `/artilheiros` — Veja os artilheiros e escolha o seu favorito

### Classificados dos grupos
- `/classificados` — Preveja os 2 classificados de cada grupo

### Mata-mata
- `/mata-mata` — Monte seu chaveamento quando as oitavas estiverem definidas

---

## Estrutura de pontuação

| Situação | Pontos |
|----------|--------|
| Placar exato | 3 pts |
| Acertou vencedor/empate | 1 pt |
| Errou tudo | 0 pts |
| Classificado do grupo (por time) | 1 pt extra |
| Time avança no mata-mata | 1 pt extra |
| Finalista (por time) | 2 pts extras |
| Campeão | 10 pts extras |
| Artilheiro | 5 pts extras |

---

## Estrutura do projeto

```
bolao-copa/
├── src/
│   ├── app/
│   │   ├── (main)/          # Páginas autenticadas
│   │   │   ├── dashboard/
│   │   │   ├── jogos/
│   │   │   ├── meus-palpites/
│   │   │   ├── ranking/
│   │   │   ├── classificados/
│   │   │   ├── mata-mata/
│   │   │   ├── artilheiros/
│   │   │   └── admin/
│   │   ├── api/             # Rotas API (Next.js)
│   │   │   ├── football/    # Proxy para API-Football
│   │   │   ├── predictions/
│   │   │   ├── ranking/
│   │   │   ├── admin/
│   │   │   └── ...
│   │   ├── login/
│   │   └── cadastro/
│   ├── components/
│   │   ├── ui/              # Componentes base
│   │   ├── layout/          # Header, Navigation
│   │   ├── matches/         # Cards de jogos, formulário de palpite
│   │   └── ranking/         # Tabela de ranking
│   ├── lib/
│   │   ├── supabase/        # Cliente Supabase (client/server)
│   │   ├── api-football/    # Cliente API-Football
│   │   └── utils.ts
│   ├── types/               # TypeScript types
│   └── proxy.ts             # Auth proxy (proteção de rotas)
├── supabase/
│   └── schema.sql           # SQL completo do banco
└── .env.local.example       # Template de variáveis de ambiente
```
