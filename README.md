# Approve — Terceiro Andar

Sistema de calendário e aprovação de conteúdo para a agência Terceiro Andar.

O time interno cadastra clientes, calendários e peças. Cada calendário recebe um link público exclusivo para o cliente aprovar a peça ou solicitar alteração com comentário.

## Stack

- pnpm workspace / TypeScript
- Next.js (web)
- NestJS (API)
- Prisma ORM
- MySQL
- Docker Compose para o banco em desenvolvimento
- PM2 para executar web + API em produção

## Estrutura

~~~
apps/
  api/        # NestJS
  web/        # Next.js
packages/
  database/   # Prisma schema + client compartilhado
~~~

## Identidade visual

A interface segue a referência da Terceiro Andar:

- rosa: #FF014A
- preto: #000000
- branco: #FFFFFF
- fundo neutro cinza claro
- títulos condensados + corpo em Poppins
- marca reconstruída em CSS para manter o projeto independente de assets externos

## Desenvolvimento local

1. Requisitos: Node 20+, pnpm 10+ e Docker.
2. Copie o ambiente:

~~~
cp .env.example .env
~~~

3. Instale as dependências:

~~~
pnpm install
~~~

4. Suba o MySQL:

~~~
pnpm db:up
~~~

5. Gere o Prisma Client e crie a migration inicial:

~~~
pnpm db:generate
pnpm db:migrate
~~~

Quando o Prisma pedir o nome da migration, use algo como `init`.

6. Carregue os dados de demonstração:

~~~
pnpm db:seed
~~~

7. Rode web e API:

~~~
pnpm dev
~~~

- Painel interno: http://localhost:3000
- API: http://localhost:3333/api
- Healthcheck: http://localhost:3333/api/health
- Link demo do cliente: http://localhost:3000/p/demo-terceiro-andar

## Segurança do MVP

Há duas camadas simples e independentes:

1. O painel Next pode ser protegido com HTTP Basic Auth usando `DASHBOARD_USER` e `DASHBOARD_PASSWORD`.
2. As rotas administrativas do Nest exigem `X-Admin-Key`, configurada por `API_ADMIN_KEY`. O segredo é usado apenas no servidor Next e não é exposto ao navegador.

Os links dos clientes usam token aleatório de 48 caracteres hexadecimais. A agência pode rotacionar o token pelo painel, invalidando o link anterior.

Para produção com múltiplos usuários internos, o próximo passo recomendado é trocar Basic Auth por autenticação de equipe com sessão, usuários e permissões.

## Fluxo do cliente

Cada peça pode ficar em:

- DRAFT
- PENDING_APPROVAL
- APPROVED
- CHANGES_REQUESTED

No link público, o cliente pode:

- aprovar;
- solicitar alteração com comentário obrigatório;
- identificar-se opcionalmente pelo nome.

Cada ação gera um registro em `ReviewHistory`.

## Produção com PM2

Depois de configurar as variáveis de ambiente e o banco de produção:

~~~
pnpm install --frozen-lockfile
pnpm build
pnpm start:pm2
pm2 save
~~~

O arquivo `ecosystem.config.cjs` inicia os dois processos.

## Próximas evoluções

- upload de artes para S3/R2 em vez de URL manual;
- login real para equipe da agência;
- usuários e permissões por cliente;
- edição/reordenação das peças;
- notificações por e-mail/WhatsApp;
- histórico visual de versões da arte;
- comentários por região da imagem;
- status do calendário e aprovação em lote.
