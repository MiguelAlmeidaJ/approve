# Approve — Terceiro Andar

Sistema simples para montar calendários de conteúdo e enviar aprovação para clientes da Terceiro Andar.

A interface segue um fluxo direto: login da equipe, clientes, calendários mensais, formatos padronizados e uma prévia de aprovação inspirada no feed do Instagram.

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
5. Define Post, Carrossel, Reels ou Stories e escolhe Feed, Stories ou ambos.
6. Cliente entra com seu próprio login e aprova as peças na prévia do perfil.

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
- Área do cliente: http://localhost:5005/cliente/login

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

As rotas administrativas exigem a `API_ADMIN_KEY` e também uma sessão interna válida. O Nest aplica o escopo do usuário: designers só consultam e alteram clientes/calendários atribuídos a eles.

Os links de aprovação usam `shareToken`, mas não são anônimos: também exigem a sessão do cliente e o calendário precisa pertencer à conta autenticada.

## Produção

~~~bash
pnpm install --frozen-lockfile
pnpm db:deploy
pnpm build
pnpm start:pm2
pm2 save
~~~

## Próximos passos

- edição/exclusão de peças e histórico de versões;
- comentários visuais sobre a arte;
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


## Acesso do cliente

Cada cliente possui dados de perfil e credenciais próprias:

- nicho/segmento;
- telefone;
- e-mail de acesso;
- senha armazenada somente como hash com `scrypt`.

A migration `20260924101500_client_profile_access` cria as tabelas `ClientCredential` e `ClientSession` e adiciona os campos de perfil ao cliente.

A área do cliente fica em:

~~~text
http://localhost:5005/cliente/login
~~~

O seed cria a conta de demonstração:

~~~text
cliente@dev.com
senha123
~~~

Ao entrar, o cliente visualiza somente os calendários da própria conta e pode abrir o fluxo de aprovação correspondente.


## Formatos de conteúdo

A migration `20260924114500_content_formats_and_placements` adiciona formatos padronizados e os destinos da peça.

O seed cria formatos iniciais para Post vertical, Post quadrado, Carrossel, Reels e Stories. Admin e dev podem cadastrar/editar formatos em `/formats`.

Cada conteúdo registra:

- tipo: Post, Carrossel, Reels ou Stories;
- formato/dimensões;
- destino: Feed, Stories ou ambos;
- um dos dias de publicação definidos previamente no calendário.

## Permissões

- `DEV`: visão geral, formatos e configurações técnicas;
- `ADMIN`: visão geral, equipe, formatos e gestão de clientes;
- `DESIGNER`: somente clientes atribuídos a ele e calendários desses clientes;
- `CLIENTE`: somente os calendários da própria conta.

O escopo é validado novamente na API; não depende apenas das telas do Next.


## Nextcloud

As artes ficam armazenadas somente no Nextcloud. O Approve guarda apenas a
referência do arquivo e faz o streaming de mídia com validação de permissão.

Configure no `.env`:

~~~env
NEXTCLOUD_URL="https://fileserver.terceiroandar.com.br"
NEXTCLOUD_USERNAME="approve-integration"
NEXTCLOUD_APP_PASSWORD="app-password-gerada-no-nextcloud"
NEXTCLOUD_ROOT_PATH="/Clientes"
~~~

A conta técnica não precisa ser administradora. Ela precisa somente ter acesso
WebDAV à pasta configurada em `NEXTCLOUD_ROOT_PATH`.

Por padrão, o Approve procura os arquivos de cada cliente em:

~~~text
/Clientes/<slug-do-cliente>
~~~

Exemplo para o cliente com slug `cliente-demo`:

~~~text
/Clientes/cliente-demo
~~~

No cadastro da peça, o designer navega por essa pasta dentro do próprio
Approve. Post, Reels e Stories aceitam uma arte; Carrossel aceita até dez
arquivos, na ordem em que forem selecionados.

As credenciais do Nextcloud ficam somente no backend Nest e nunca são enviadas
ao navegador. Designers continuam limitados aos clientes atribuídos a eles e o
cliente final só consegue carregar assets dos próprios calendários.

## Edição e arquivamento de calendários

Calendários podem ser editados pela tela do planejamento. É possível alterar
título, mês e dias de postagem. Um dia que já possui conteúdo não pode ser
removido até a peça correspondente ser ajustada.

Arquivar um calendário:

- remove o planejamento das listas ativas;
- impede novas peças e alterações operacionais;
- remove o calendário da área do cliente;
- invalida o acesso de aprovação enquanto estiver arquivado;
- mantém todo o histórico para uma restauração futura.

A listagem de calendários possui filtro para visualizar os arquivados.


### Pasta por cliente

`NEXTCLOUD_ROOT_PATH` aponta somente para a pasta raiz compartilhada com a
conta técnica, por exemplo:

~~~env
NEXTCLOUD_ROOT_PATH="/ARQUIVOS CLIENTES"
~~~

Cada cliente pode definir sua própria pasta relativa a essa raiz no cadastro ou
na edição do cliente, no campo **Pasta do cliente no Nextcloud**.

Exemplos:

~~~text
NEXTCLOUD_ROOT_PATH=/ARQUIVOS CLIENTES
Pasta do cliente=/CLIENTE ACME

Resultado:
/ARQUIVOS CLIENTES/CLIENTE ACME
~~~

Se o campo do cliente ficar vazio, o sistema mantém compatibilidade com a regra
anterior e usa `/<slug-do-cliente>`. O valor `/` aponta diretamente para a
raiz configurada, mas só deve ser usado quando aquele cliente realmente puder
navegar por toda a pasta raiz.
