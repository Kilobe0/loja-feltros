# Loja de Feltros

Fundação inicial de uma loja virtual de produtos artesanais de feltro (chaveiros,
bonecos, enfeites e outros itens variados). "Loja de Feltros" é um nome
placeholder — a marca/identidade visual definitiva ainda precisa ser definida.

## Relação com o projeto andrevendas

Este é um **repositório totalmente separado** do projeto `andrevendas` (a
galeria de arte do André). A infraestrutura genérica do backend foi
reaproveitada como ponto de partida (autenticação admin, upload de imagens,
pagamento via Mercado Pago, cotação/etiqueta de frete via Melhor Envio,
carrinho com múltiplos itens), mas:

- Não há nenhuma dependência de código entre os dois repositórios.
- Esta loja precisa das **próprias contas** de MongoDB Atlas, Cloudinary,
  Mercado Pago e Melhor Envio — nada é compartilhado com a conta do André.
  A mãe do usuário (dona da loja) vai precisar criar essas contas.
- O modelo de dados foi adaptado: em vez de "obra única" (peça de arte
  irrepetível), o produto de feltro tem **estoque por unidades** — o mesmo
  produto pode ter várias unidades à venda, e cada variação (ex.: cor) tem
  seu próprio estoque.

## Estrutura

```
loja-feltros/
├── backend/     NestJS + MongoDB (Mongoose)
└── frontend/    Next.js 16 (App Router) + CSS Modules
```

### Backend — módulos

- `auth` — login do admin (usuário único) via JWT.
- `upload` — upload de imagens para o Cloudinary.
- `payments` — Checkout Pro do Mercado Pago (criação de preference, consulta
  de pagamento).
- `categories` — categorias de produto (ex.: Chaveiros, Bonecos, Enfeites).
- `products` — catálogo de produtos, com variantes e estoque por unidades
  (status `AVAILABLE`/`OUT_OF_STOCK` derivado automaticamente da quantidade).
- `shipping` — cotação e compra de etiqueta via Melhor Envio.
- `orders` — pedidos com carrinho de múltiplos itens/quantidades, reserva
  otimista de estoque, webhook do Mercado Pago e do Melhor Envio.
- `seed` — cria o admin inicial (a partir das envs `ADMIN_EMAIL`/
  `ADMIN_PASSWORD`), categorias básicas e um produto de exemplo.

### Frontend — páginas

- `/` — grade de produtos com preço visível, com abas de categoria no topo.
  Não tem hero nem seção institucional — é a vitrine da loja.
- `/produto/[slug]` — detalhe do produto: galeria de imagens, seleção de
  variação (se houver) e quantidade, adicionar ao carrinho.
- `/checkout` — dados do cliente, endereço (com autopreenchimento por CEP via
  ViaCEP), cotação de frete e redirecionamento para o Checkout Pro do
  Mercado Pago.
- `/checkout/retorno` — página de retorno do pagamento (aprovado/pendente/
  recusado), com polling do status enquanto pendente (Pix/boleto).
- `/admin/*` — painel administrativo (login, dashboard, CRUD de produtos com
  upload de imagem e variantes, lista de pedidos com compra de etiqueta).

Não existem páginas de `/artista`, `/eventos` ou `/contato` dedicada — o
contato é só um link de WhatsApp no rodapé.

## Como rodar em desenvolvimento

### Backend

```bash
cd backend
npm install
cp .env.example .env   # preencha com as credenciais da conta da loja
npm run start:dev
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

O frontend espera o backend em `http://localhost:3001` por padrão
(configurável via `NEXT_PUBLIC_API_URL`).

> Este frontend usa Next.js 16, uma versão com breaking changes em relação a
> versões anteriores. Antes de alterar rotas do App Router, layouts ou
> `next.config.ts`, consulte `frontend/node_modules/next/dist/docs/` — a API
> pode ser diferente do que modelos de linguagem "sabem" de treino.

## O que falta

- **Nome e identidade visual da loja** — "Loja de Feltros" e a paleta usada
  no frontend são placeholders. A paleta é neutra e amigável (terracota
  sobre bege) para ser fácil de trocar depois.
- **Contas reais** — MongoDB Atlas, Cloudinary, Mercado Pago (Checkout Pro) e
  Melhor Envio precisam ser criadas pela dona da loja; sem isso, upload de
  imagem, pagamento e frete não funcionam (o catálogo e o carrinho funcionam
  normalmente sem essas integrações).
- **Deploy** — `Dockerfile`/`fly.toml` (backend) e o frontend Next.js ainda
  não foram publicados em nenhum provedor; são só a base para quando isso for
  decidido (ex.: Fly.io + Cloudflare Pages, como no andrevendas, ou outra
  combinação).
- **Seed de conteúdo** — o seed cria só 3 categorias de exemplo e 1 produto
  de exemplo; o catálogo real precisa ser cadastrado pelo admin.
