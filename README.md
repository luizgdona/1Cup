# ☕ 1Cup

> **Rede social gamificada de consumo de café especial**  
> Registre cada xícara, colecione badges, descubra novos cafés e compartilhe com quem também vive pelo café.

<p align="center">
  <img src="https://img.shields.io/badge/Flutter-3.22-02569B?style=for-the-badge&logo=flutter&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-20_LTS-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Fastify-4-000000?style=for-the-badge&logo=fastify&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Prisma-5-2D3748?style=for-the-badge&logo=prisma&logoColor=white" />
  <img src="https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis&logoColor=white" />
  <img src="https://img.shields.io/github/actions/workflow/status/luizgdona/1Cup/ci.yml?style=for-the-badge&label=CI" />
</p>

---

## Demonstração

### Feed Principal

O coração do 1Cup. Veja em tempo real o que seus amigos estão bebendo — cada card traz o café, a torrefação, a nota em estrelas, a descrição sensorial e até onde o check-in foi feito.

```
╔══════════════════════════════════════╗
║  ☕ 1Cup              🔔  👤         ║
╠══════════════════════════════════════╣
║                                      ║
║  ┌──────────────────────────────┐    ║
║  │ 🧑 Lucas Andrade  • 12min    │    ║
║  │                              │    ║
║  │  [📷 foto do café]           │    ║
║  │                              │    ║
║  │  Fazenda Santa Inês          │    ║
║  │  Amarelo Bourbon Natural     │    ║
║  │  Torr. Mínimo Café           │    ║
║  │                              │    ║
║  │  ★★★★½  4.5                  │    ║
║  │                              │    ║
║  │  "Muito frutado, lembra      │    ║
║  │  ameixa e tâmara. Acidez     │    ║
║  │  vibrante e final longo."    │    ║
║  │                              │    ║
║  │  📍 Coffee Lab, SP  · V60    │    ║
║  └──────────────────────────────┘    ║
║                                      ║
║  ┌──────────────────────────────┐    ║
║  │ 👩 Ana Paula  • 1h           │    ║
║  │  Gesha Village · Washed      │    ║
║  │  ★★★★★  5.0                  │    ║
║  └──────────────────────────────┘    ║
║                                      ║
╠══════════════════════════════════════╣
║  🏠 Feed   🔍 Buscar  ✚  👤 Perfil  ║
╚══════════════════════════════════════╝
```

---

### Fluxo de Check-in

Três passos simples: escolha o café, avalie, compartilhe.

```
PASSO 1 — Escolha o café        PASSO 2 — Avalie
╔══════════════════════╗        ╔══════════════════════╗
║  ← Novo Check-in     ║        ║  ← Avaliação         ║
╠══════════════════════╣        ╠══════════════════════╣
║                      ║        ║                      ║
║  🔍 Buscar café...   ║        ║  Fazenda Santa Inês  ║
║                      ║        ║  Amarelo Bourbon     ║
║  ┌────────────────┐  ║        ║                      ║
║  │ Fazenda S. Inês│  ║        ║  Sua nota:           ║
║  │ Bourbon Natural│  ║        ║  ★ ★ ★ ★ ☆           ║
║  │ Mínimo Café    │  ║        ║                      ║
║  └────────────────┘  ║        ║  Como foi?           ║
║  ┌────────────────┐  ║        ║  ┌──────────────┐    ║
║  │ Gesha Village  │  ║        ║  │ Muito frutado│    ║
║  │ Washed         │  ║        ║  │ e encorpado..│    ║
║  │ Onze Café      │  ║        ║  └──────────────┘    ║
║  └────────────────┘  ║        ║                      ║
║                      ║        ║  Método:  [V60  ▼]   ║
║  + Cadastrar novo    ║        ║                      ║
║                      ║        ║  📍 Adicionar local  ║
╠══════════════════════╣        ║  📷 Adicionar fotos  ║
║  🏠  🔍  ✚  👤       ║        ╠══════════════════════╣
╚══════════════════════╝        ║   [ Fazer Check-in ] ║
                                ╚══════════════════════╝
```

---

### Perfil & Badges

Cada usuário acumula uma história de xícaras. O perfil público exibe estatísticas, o diário de check-ins e os badges conquistados.

```
╔══════════════════════════════════════╗
║  ← @lucasandrade              ⚙️     ║
╠══════════════════════════════════════╣
║                                      ║
║         [  🧑  ]                     ║
║      Lucas Andrade                   ║
║   "Barista apaixonado por naturals"  ║
║                                      ║
║   ┌────────┬────────┬────────┐       ║
║   │  142   │   38   │   12   │       ║
║   │Check-in│ Cafés  │ Badges │       ║
║   └────────┴────────┴────────┘       ║
║                                      ║
║  ─── Brewing Journal ─── Badges ─── ║
║                                      ║
║  Badges Conquistados                 ║
║  ┌─────────────────────────────┐     ║
║  │ 🏆 Primeira Xícara         │     ║
║  │ ⚡ Viciado em Cafeína       │     ║
║  │ 🌍 Viajante de Xícara      │     ║
║  │ 🌅 Coruja Matinal           │     ║
║  │ 🔬 Mestre dos Métodos      │     ║
║  └─────────────────────────────┘     ║
║                                      ║
║  Bloqueados                          ║
║  ┌─────────────────────────────┐     ║
║  │ 🌑 Alma Escura  (7/10)      │     ║
║  │ 🌿 Raro e Delicado  (3/10)  │     ║
║  └─────────────────────────────┘     ║
╚══════════════════════════════════════╝
```

---

### Catálogo de Cafés

Pesquise por nome, torrefação, variedade ou método. Cada café tem ficha completa com histórico de check-ins e média de avaliações da comunidade.

```
╔══════════════════════════════════════╗
║  🔍 Descobrir cafés                  ║
╠══════════════════════════════════════╣
║                                      ║
║  [ 🔍 Bourbon, Gesha, Mínimo...  ]   ║
║                                      ║
║  Filtros:  [Torra ▼]  [Método ▼]    ║
║                                      ║
║  ┌──────────────────────────────┐    ║
║  │ [📷]  Amarelo Bourbon        │    ║
║  │       Fazenda Santa Inês     │    ║
║  │       Mínimo Café · SP       │    ║
║  │       ★ 4.3  (28 check-ins)  │    ║
║  │       🏷 Natural · Médio     │    ║
║  └──────────────────────────────┘    ║
║  ┌──────────────────────────────┐    ║
║  │ [📷]  Gesha Village          │    ║
║  │       Guji Origin            │    ║
║  │       Onze Café · SP         │    ║
║  │       ★ 4.8  (14 check-ins)  │    ║
║  │       🏷 Washed · Claro      │    ║
║  └──────────────────────────────┘    ║
╠══════════════════════════════════════╣
║  🏠  🔍  ✚  👤                       ║
╚══════════════════════════════════════╝
```

---

### Design System — Paleta de Cores

| Token | Light | Dark | Uso |
|---|---|---|---|
| `primary` | `#26170C` ■ | `#DEC1AF` ■ | Botões, ações principais |
| `secondary` | `#7D562D` ■ | `#F0BD8B` ■ | Elementos secundários |
| `surface` | `#FDF8F5` ■ | `#1C1A18` ■ | Cards e superfícies |
| `background` | `#FDF8F5` ■ | `#141210` ■ | Fundo da tela |
| `roastedGold` | `#FFC000` ■ | `#FFD54F` ■ | Estrelas, badges premium |
| `latteBeige` | `#E9EDC9` ■ | `#2A2E1A` ■ | Chips de tags |

**Tipografia:** `Source Serif 4` para headlines (editorial, premium) + `Hanken Grotesk` para corpo (legível, moderno).

---

## Arquitetura

```
┌──────────────────────────────────────────────────────────┐
│                        CLIENTES                          │
│   App Mobile (Flutter)          Landing (Next.js)        │
└───────────────────────┬──────────────────────────────────┘
                        │ HTTPS / REST API
                        ▼
┌──────────────────────────────────────────────────────────┐
│              API GATEWAY / NGINX                         │
│          Rate limiting  ·  SSL termination               │
└───────────────────────┬──────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────┐
│              BACKEND  (Node.js + Fastify)                │
│  Auth (JWT)  ·  REST Routes  ·  Gamification  ·  Feed   │
└──────────┬───────────────────────┬───────────────────────┘
           │                       │
    ┌──────▼──────┐   ┌────────────▼───────────┐
    │ PostgreSQL  │   │ Redis (cache + sessões) │
    └─────────────┘   └────────────────────────┘
                              │
                    ┌─────────▼──────┐
                    │  Cloudflare R2 │
                    │   (imagens)    │
                    └────────────────┘
```

---

## Stack

| Camada | Tecnologia | Motivo |
|---|---|---|
| Mobile | Flutter 3.22 | Cross-platform, performance nativa |
| Backend | Node.js 20 + Fastify | Baixo overhead, schema validation nativo |
| Banco | PostgreSQL 16 | Relacional robusto, suporte a JSON |
| Cache | Redis 7 | Sessões, rate limiting, feed cache |
| Storage | Cloudflare R2 | Egress gratuito, compatível com S3 SDK |
| Auth | JWT (access 15min + refresh 30d) | Stateless + rotação segura |
| Landing | Next.js 14 App Router | SEO, deploy simples na Vercel |

---

## Estrutura do Monorepo

```
1cup/
├── .github/workflows/      # CI (lint, typecheck, flutter analyze)
├── apps/
│   ├── mobile/             # Flutter app
│   │   └── lib/
│   │       ├── core/constants/   # Design system (4 token files)
│   │       └── features/         # Auth, feed, checkin, profile...
│   ├── backend/            # Fastify API + Prisma
│   │   ├── prisma/schema.prisma
│   │   └── src/
│   │       ├── config/     # env.ts (Zod), database.ts, redis.ts
│   │       └── modules/    # auth, users, coffees, checkins...
│   └── landing/            # Next.js 14 (Fase 6)
├── docker-compose.yml      # PostgreSQL 16 + Redis 7
├── .env.example
└── README.md
```

---

## Começando

### Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Node.js 20+](https://nodejs.org/)
- [Flutter SDK 3.22+](https://flutter.dev/docs/get-started/install)

### 1. Suba o banco e o Redis

```bash
docker-compose up -d
```

### 2. Configure o backend

```bash
cd apps/backend
cp .env.example .env
# Edite .env com seus valores (JWT secrets, etc.)
npm install
npm run db:migrate
npm run dev
```

A API estará em `http://localhost:3000`  
Documentação Swagger: `http://localhost:3000/docs`

### 3. Rode o app Flutter

```bash
cd apps/mobile
flutter pub get
flutter run
```

---

## Banco de Dados — Principais Entidades

```
User ──< CheckIn >── Coffee ──> Roastery
                         └──> Producer
User ──< Friendship >── User
User ──< UserBadge >── Badge
User ──< EditSuggestion
```

Migrações versionadas com Prisma. Para gerar após alterações no schema:

```bash
cd apps/backend
npm run db:migrate   # dev (cria migration + aplica)
```

---

## Gamificação — Badges

| Badge | Regra |
|---|---|
| ☕ Primeira Xícara | 1º check-in |
| ⚡ Viciado em Cafeína | 50 check-ins |
| 🌍 Viajante de Xícara | Cafés de 5 países |
| 🌅 Coruja Matinal | 5 check-ins antes das 8h |
| 🔬 Mestre dos Métodos | 5 métodos de preparo diferentes |
| 🌑 Alma Escura | 10 torras escuras |
| 🌿 Raro e Delicado | 10 torras claras |
| 👥 Companhia de Café | 5 amigos seguidos |

---

## Roadmap

| Fase | Objetivo | Status |
|---|---|---|
| **0 — Fundação** | Monorepo, Docker, Fastify, Design System | ✅ Concluída |
| **1 — Auth** | Login, registro, perfil, tokens JWT | ✅ Concluída |
| **2 — Catálogo** | CRUD cafés, torrefações, produtores | ✅ Concluída |
| **3 — Check-in & Feed** | Fluxo core + badges + feed paginado | ✅ Concluída |
| **4 — Social** | Amizades, feed filtrado, perfis públicos | 🔜 Próxima |
| **5 — Admin** | Sugestões de edição, painel admin | ⬜ |
| **6 — Landing & Polimento** | Next.js, dark mode, animações, stores | ⬜ |

---

## Segurança

- **JWT** com access token de 15min + refresh token rotacionado (30 dias)
- **Tokens** armazenados no Keychain (iOS) / Android Keystore via `flutter_secure_storage`
- **Rate limiting** por IP via Redis (100 req/min global, 5 tentativas/15min no login)
- **Helmet** com CSP configurado
- **Prisma ORM** previne SQL injection por padrão (queries parametrizadas)
- **Zod** valida todas as variáveis de ambiente na inicialização
- **Upload**: validação de mime type + limite de 5MB + renomeação com UUID

---

## Licença

MIT © 2025 [luizgdona](https://github.com/luizgdona)
