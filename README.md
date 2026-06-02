# ☕ 1Cup

> **Gamified specialty coffee social network**  
> Log every cup, collect badges, discover new coffees and share with fellow coffee lovers.

<p align="center">
  <img src="https://img.shields.io/badge/Flutter-3.24-02569B?style=for-the-badge&logo=flutter&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-22_LTS-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Fastify-4-000000?style=for-the-badge&logo=fastify&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-17-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Prisma-5-2D3748?style=for-the-badge&logo=prisma&logoColor=white" />
  <img src="https://img.shields.io/badge/Redis-7.4-DC382D?style=for-the-badge&logo=redis&logoColor=white" />
  <img src="https://img.shields.io/github/actions/workflow/status/luizgdona/1Cup/ci.yml?style=for-the-badge&label=CI" />
</p>

---

## Screenshots

<p align="center">
  <img src="docs/screenshots/mockups.png" alt="1Cup — Feed · Check-in · Coffee Detail · Profile" width="100%" />
</p>

| Feed | Check-in | Coffee Detail | Profile & Badges |
|:---:|:---:|:---:|:---:|
| See what friends are drinking in real time — photo, rating, tasting notes | Pick a coffee, rate with half-stars, describe the sensory experience | Full card: community rating, tasting notes, brew methods and SCA score | Cup history, stats and a collection of gold badges |

<p align="center">
  <img src="docs/screenshots/feed.png" alt="Feed" width="22%" />
  <img src="docs/screenshots/check-in.png" alt="Check-in" width="22%" />
  <img src="docs/screenshots/detalhe_do_cafe.png" alt="Coffee Detail" width="22%" />
  <img src="docs/screenshots/perfil.png" alt="Profile" width="22%" />
</p>

---

### Design System — Color Palette

| Token | Light | Dark | Usage |
|---|---|---|---|
| `primary` | `#26170C` ■ | `#DEC1AF` ■ | Buttons, primary actions |
| `secondary` | `#7D562D` ■ | `#F0BD8B` ■ | Secondary elements |
| `surface` | `#FDF8F5` ■ | `#1C1A18` ■ | Cards and surfaces |
| `background` | `#FDF8F5` ■ | `#141210` ■ | Screen background |
| `roastedGold` | `#FFC000` ■ | `#FFD54F` ■ | Stars, premium badges |
| `latteBeige` | `#E9EDC9` ■ | `#2A2E1A` ■ | Tag chips |

**Typography:** `Source Serif 4` for headlines (editorial, premium) + `Hanken Grotesk` for body (readable, modern).

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                        CLIENTS                           │
│   Mobile App (Flutter)          Landing Page (Next.js)   │
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
│              BACKEND  (Node.js 22 + Fastify 4)           │
│  Auth (JWT)  ·  REST Routes  ·  Badge Engine  ·  Feed   │
└──────────┬───────────────────────┬───────────────────────┘
           │                       │
    ┌──────▼──────┐   ┌────────────▼───────────┐
    │ PostgreSQL  │   │ Redis (cache + sessions)│
    │     17      │   │         7.4             │
    └─────────────┘   └────────────────────────┘
                              │
                    ┌─────────▼──────┐
                    │  Cloudflare R2 │
                    │   (images)     │
                    └────────────────┘
```

---

## Stack

| Layer | Technology | Reason |
|---|---|---|
| Mobile | Flutter 3.24 | Cross-platform, native performance |
| Backend | Node.js 22 LTS + Fastify 4 | Low overhead, native schema validation |
| Database | PostgreSQL 17 | Robust relational DB, JSON support |
| Cache | Redis 7.4 | Sessions, rate limiting, feed cache |
| Storage | Cloudflare R2 | Zero egress cost, S3-compatible SDK |
| Auth | JWT (access 15min + refresh 30d) | Stateless + secure rotation |
| Landing | Next.js 14 App Router | SEO, simple Vercel deploy |

---

## Monorepo Structure

```
1cup/
├── .github/workflows/      # CI: typecheck, flutter analyze, next build
├── apps/
│   ├── mobile/             # Flutter app
│   │   ├── lib/core/       # Design system, network, router, storage
│   │   ├── lib/features/   # auth, feed, checkin, discover, social, admin
│   │   ├── lib/shared/     # models, widgets
│   │   └── test/           # unit + widget tests
│   ├── backend/            # Fastify API + Prisma
│   │   ├── prisma/         # schema.prisma + migrations
│   │   └── src/
│   │       ├── config/     # env.ts (Zod), database.ts, redis.ts
│   │       ├── modules/    # auth, users, coffees, checkins, feed, friends, badges, admin, waitlist
│   │       └── __tests__/  # vitest unit tests
│   └── landing/            # Next.js 14 landing page
├── docs/screenshots/       # App mockups
├── docker-compose.yml      # PostgreSQL 17 + Redis 7.4
├── CLAUDE.md               # Development guidelines (TDD/SDD)
└── .env.example
```

---

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Node.js 22 LTS](https://nodejs.org/)
- [Flutter SDK 3.24+](https://flutter.dev/docs/get-started/install)

### 1. Start database and Redis

```bash
docker-compose up -d
```

### 2. Configure and run the backend

```bash
cd apps/backend
cp .env.example .env
# Fill in your values (JWT secrets, S3 credentials, etc.)
npm install
npm run db:migrate
npm run dev
```

API running at `http://localhost:3000`  
Swagger docs: `http://localhost:3000/docs`

### 3. Run the Flutter app

```bash
cd apps/mobile
flutter pub get
flutter run
```

### 4. Run the landing page

```bash
cd apps/landing
cp .env.local.example .env.local
npm install
npm run dev   # http://localhost:3001
```

### 5. Run tests

```bash
# Backend (unit tests, no DB required)
cd apps/backend && npm test

# Flutter
cd apps/mobile && flutter test
```

---

## Database — Key Entities

```
User ──< CheckIn >── Coffee ──> Roastery
                         └──> Producer
User ──< Friendship >── User
User ──< UserBadge  >── Badge
User ──< EditSuggestion
Waitlist (landing page sign-ups)
```

Versioned migrations with Prisma. After schema changes:

```bash
cd apps/backend
npm run db:migrate   # dev: creates and applies migration
```

---

## Gamification — Badges

| Badge | Rule |
|---|---|
| ☕ First Cup | 1st check-in |
| ⚡ Caffeine Addict | 50 check-ins |
| 🌍 Cup Traveler | Coffees from 5 different countries |
| 🌅 Early Bird | 5 check-ins before 8 AM |
| 🔬 Method Master | 5 different brew methods used |
| 🌑 Dark Soul | 10 dark roast check-ins |
| 🌿 Rare & Delicate | 10 light roast check-ins |
| 👥 Coffee Company | 5 friends connected |

---

## Roadmap

| Phase | Goal | Status |
|---|---|---|
| **0 — Foundation** | Monorepo, Docker, Fastify, Design System | ✅ Done |
| **1 — Auth** | Login, register, profile, JWT tokens | ✅ Done |
| **2 — Catalog** | CRUD coffees, roasteries, producers | ✅ Done |
| **3 — Check-in & Feed** | Core flow + badge engine + cursor-paginated feed | ✅ Done |
| **4 — Social** | Friendships, filtered feed, public profiles | ✅ Done |
| **5 — Admin** | Edit suggestions, admin panel | ✅ Done |
| **6 — Landing & Polish** | Next.js, dark mode, animations, tests | ✅ Done |
| **7 — Stores** | Production build Android/iOS, submission | 🔜 Next |

---

## Security

- **JWT** access token (15 min) + rotated refresh token (30 days, stored as SHA-256 hash)
- **Tokens** stored in Keychain (iOS) / Android Keystore via `flutter_secure_storage`
- **Rate limiting** per IP via Redis (100 req/min global, 5 attempts/15min on login)
- **Helmet** with CSP configured
- **Prisma ORM** prevents SQL injection by default (parameterized queries)
- **Zod** validates all environment variables at startup — app won't start with missing vars
- **Upload**: mime type validation + 5 MB limit + UUID rename before storage

---

## Testing

This project follows **Test-Driven Development (TDD)**. See [`CLAUDE.md`](CLAUDE.md) for the full guidelines.

```
apps/backend/src/__tests__/   → Vitest unit tests (schema + service logic)
apps/mobile/test/unit/        → Dart unit tests (models, utils)
apps/mobile/test/widget/      → Flutter widget tests
```

CI runs all tests on every push. Integration tests (requiring DB) are run locally with a real Docker environment.

---

## License

MIT © 2025 [luizgdona](https://github.com/luizgdona)
