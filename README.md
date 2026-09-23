# Approve — Terceiro Andar

Sistema simples para montar calendários de conteúdo e enviar aprovação para clientes da Terceiro Andar.

A interface foi reorganizada com base no fluxo visual da referência enviada: navegação lateral por cliente, calendário em grade, abertura de cada peça em detalhe e uma experiência pública semelhante para aprovação. A identidade continua exclusivamente na paleta da Terceiro Andar.

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

O comando `pnpm db:migrate` aplica as migrations já versionadas usando `prisma migrate deploy`. Isso funciona com o usuário MySQL `approve` sem exigir permissão para criar um shadow database.

Use `pnpm db:migrate:dev` somente quando estiver criando uma nova migration a partir de alterações no `schema.prisma`. O `prisma migrate dev` usa um shadow database e, por isso, exige um usuário MySQL com permissão para criar bancos ou uma configuração específica de shadow database.

- Painel: http://localhost:3000
- Login: http://localhost:3000/login
- API: http://localhost:3333/api
- Demo público: http://localhost:3000/p/demo-terceiro-andar

O `pnpm db:seed` cria o designer definido no `.env`:

~~~env
DESIGNER_NAME="Designer Terceiro Andar"
DESIGNER_EMAIL="designer@terceiroandar.com.br"
DESIGNER_PASSWORD="troque-esta-senha"
~~~

Se `DESIGNER_PASSWORD` não estiver configurada, o seed local usa `terceiroandar` como fallback.

## Autenticação

O login do designer usa uma sessão opaca de 7 dias salva no banco. A senha é armazenada com `scrypt`; o navegador recebe somente um cookie HttpOnly com o token da sessão.

As rotas administrativas da API continuam protegidas também por `API_ADMIN_KEY`, usada apenas na comunicação server-to-server do Next com o Nest.

O link do cliente continua independente do login e usa o `shareToken` do calendário.

## Banco

A migration `20260923183000_designer_auth` adiciona:

- `Designer`
- `DesignerSession`

Para uma instalação já existente, basta:

~~~bash
pnpm db:migrate
pnpm db:seed
~~~

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
