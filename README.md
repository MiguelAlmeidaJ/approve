# Approve — Terceiro Andar

Sistema simples para montar calendários de conteúdo e enviar aprovação para clientes da Terceiro Andar.

A interface segue um fluxo direto: login do designer, clientes, calendários mensais, prévia das peças e link público para aprovação.

## Stack

- pnpm workspace + TypeScript
- Next.js
- NestJS
- Prisma
- MySQL
- Docker Compose no desenvolvimento
- PM2 em produção

## Fluxo atual

1. Designer entra em `/login`.
2. Cadastra um cliente.
3. Cria um calendário mensal.
4. Adiciona as peças ao calendário.
5. Abre ou compartilha o link público.
6. Cliente abre cada peça, aprova ou solicita alteração.

## Desenvolvimento

~~~bash
cp .env.example .env
pnpm install
pnpm db:up
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
~~~

Por padrão no desenvolvimento:

- Next: http://localhost:5005
- Login: http://localhost:5005/login
- Nest API: http://localhost:4334/api
- Healthcheck: http://localhost:4334/api/health
- Demo público: http://localhost:5005/p/demo-terceiro-andar

As portas ficam separadas por `WEB_PORT` e `API_PORT`. Não use uma única variável `PORT` para os dois apps durante o desenvolvimento.

A configuração esperada é:

~~~env
API_PORT=4334
WEB_ORIGIN="http://localhost:5005"

WEB_PORT=5005
API_URL="http://localhost:4334"
APP_URL="http://localhost:5005"
~~~

`API_URL` sempre aponta para o Nest. `APP_URL` e `WEB_ORIGIN` apontam para o Next.

O comando `pnpm db:migrate` aplica as migrations já versionadas usando `prisma migrate deploy`. Isso funciona com o usuário MySQL `approve` sem exigir permissão para criar um shadow database.

Use `pnpm db:migrate:dev` somente quando estiver criando uma nova migration a partir de alterações no `schema.prisma`.

O `pnpm db:seed` cria o designer definido no `.env`:

~~~env
DESIGNER_NAME="Designer Terceiro Andar"
DESIGNER_EMAIL="designer@dev.com"
DESIGNER_PASSWORD="senha123"
~~~

## Autenticação

O login do designer usa uma sessão opaca de 7 dias salva no banco. A senha é armazenada com `scrypt`; o navegador recebe somente um cookie HttpOnly com o token da sessão.

As rotas administrativas da API continuam protegidas também por `API_ADMIN_KEY`, usada apenas na comunicação server-to-server do Next com o Nest.

O link do cliente continua independente do login e usa o `shareToken` do calendário.

## Produção

~~~bash
pnpm install --frozen-lockfile
pnpm db:deploy
pnpm build
pnpm start:pm2
pm2 save
~~~

## Próximos passos

- upload real de artes em Cloudflare R2/S3;
- edição e exclusão de clientes/calendários/peças;
- drag-and-drop para ordenar o feed;
- múltiplos designers com convite e recuperação de senha;
- comentários visuais sobre a arte;
- notificações por e-mail ou WhatsApp.


## Migrations no desenvolvimento

O `pnpm dev` executa `prisma migrate deploy` antes de subir a API e o Next. Assim, migrations já versionadas — como a tabela `CalendarPostingDay` — são aplicadas automaticamente no banco local.

Se o banco ainda não estiver rodando:

~~~bash
pnpm db:up
pnpm dev
~~~

Para aplicar manualmente:

~~~bash
pnpm db:migrate
~~~
