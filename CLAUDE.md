# 1Cup — Development Guidelines

> Rules and conventions for Claude Code and all contributors.  
> When in doubt, read this file first.

---

## 1. Development Methodology — TDD / SDD First

**This project enforces Test-Driven Development (TDD) for all new features and bug fixes.**

### The Rule

> Write the test before writing the implementation.  
> No code ships without a corresponding test.

### Workflow

```
1. RED   — Write a failing test that describes the expected behavior
2. GREEN — Write the minimum code to make the test pass
3. REFACTOR — Clean up, no new behavior, tests still green
```

### What to test

| Layer | Test type | Tool | Location |
|---|---|---|---|
| Backend schema validation | Unit | Vitest | `src/__tests__/*.schema.test.ts` |
| Backend service logic | Unit (mocked DB) | Vitest + vi.mock | `src/__tests__/*.service.test.ts` |
| Backend HTTP routes | Integration (real DB) | Vitest + Fastify inject | `src/__tests__/*.routes.test.ts` |
| Flutter models | Unit | flutter_test | `test/unit/*_test.dart` |
| Flutter widgets | Widget test | flutter_test | `test/widget/*_test.dart` |
| Flutter screens | Widget + golden | flutter_test | `test/screen/*_test.dart` |

### When TDD is mandatory

- Every new API endpoint → write schema test first, then service test, then route test
- Every new Flutter screen → write widget test scaffold first, then implement screen
- Every bug fix → write a test that reproduces the bug first, then fix it
- Every model/schema change → update or add tests before changing the code

### Skipping tests (exceptions)

Only allowed for:
- Pure infrastructure/config changes (docker-compose, CI tweaks, `.gitignore`)
- Purely cosmetic changes (color tokens, icon swaps) — still encouraged to test

Mark any intentionally untested code with `// TODO(test): reason` so it shows up in reviews.

---

## 2. Architecture Decisions

### Backend

- **Fastify** with TypeScript — no Express
- **Zod** for all input validation (API bodies, query params, env vars)
- **Prisma** as the only database access layer — never raw SQL except for `$queryRaw` with full parameterization
- **env.ts** is the single source of truth for environment variables — `process.env` is never accessed directly anywhere else
- Modules follow `routes → service → database` — routes never talk to Prisma directly
- Every route returns `{ data: ... }` on success or `{ error: { code, message } }` on failure

### Flutter

- **Riverpod** (AsyncNotifier / FutureProvider) for all state — no setState except for purely local UI state (form fields, toggles)
- **go_router** for navigation — no Navigator.push directly
- **AppSpacing** tokens for all padding/margin/radius — no hardcoded numbers
- **AppTypography** for all text styles — no hardcoded fontSize/fontWeight
- **AppColors** for all custom colors — the MaterialColorScheme covers most cases

### Database

- All relations use explicit `@map` column names (snake_case)
- All models have `@@map` (snake_case table names)
- FK constraints on `EditSuggestion` always use explicit `map:` to avoid name collisions
- Soft deletes: prefer `isActive: false` over hard delete for `Coffee` and `Roastery`

---

## 3. Code Style

### TypeScript (Backend)

- `async/await` over Promise chains
- Throw plain objects `{ statusCode, message }` from services — routes catch and forward
- No `any` except in Prisma data updates for dynamic payloads (document with a comment)
- Imports: external packages first, then `../../` paths, alphabetically within each group

### Dart (Flutter)

- `const` constructors everywhere possible
- `final` over `var` for all non-reassigned variables
- Widget tree depth: extract to named classes when nesting exceeds ~4 levels
- No logic in `build()` — move to providers or helper methods
- Every public class/method that is part of the shared/ or core/ layer must have a short doc comment

---

## 4. Naming Conventions

| Concept | Convention | Example |
|---|---|---|
| Backend route file | `<module>.routes.ts` | `coffees.routes.ts` |
| Backend service file | `<module>.service.ts` | `coffees.service.ts` |
| Backend schema file | `<module>.schema.ts` | `coffees.schema.ts` |
| Backend test file | `<module>.schema.test.ts` | `coffees.schema.test.ts` |
| Flutter screen | `<feature>_screen.dart` | `checkin_screen.dart` |
| Flutter widget | `<name>_widget.dart` or descriptive | `star_rating.dart` |
| Flutter provider | `<feature>_provider.dart` | `checkin_provider.dart` |
| Flutter repository | `<feature>_repository.dart` | `checkin_repository.dart` |
| Flutter test | `<subject>_test.dart` | `checkin_model_test.dart` |

---

## 5. Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

[optional body]
```

Types: `feat`, `fix`, `test`, `refactor`, `chore`, `docs`, `ci`

Examples:
```
feat(checkins): add photo upload endpoint
fix(flutter): correct KeychainAccessibility enum value
test(auth): add schema validation unit tests
chore(deps): update Node.js 20 → 22, PostgreSQL 16 → 17
```

**Rule: tests come before the feature commit.**  
If a PR contains a new feature, the test commit must appear first in the log.

---

## 6. CI Requirements

All of the following must pass before merging to `main`:

| Job | Command | Notes |
|---|---|---|
| Backend typecheck | `npm run typecheck` | Zero TS errors |
| Backend tests | `SKIP_DB_TESTS=true npm test` | All unit tests green |
| Flutter analyze | `flutter analyze --no-fatal-warnings` | Zero errors |
| Flutter tests | `flutter test` | All tests green |
| Landing build | `npm run build` | Next.js build succeeds |

Integration tests (requiring a real PostgreSQL) are run locally before opening a PR, not in CI.

---

## 7. Environment & Secrets

- `.env` is in `.gitignore` — never commit it
- Use `.env.example` (no real values) as the template
- All env vars are validated by `src/config/env.ts` (Zod) at startup
- Flutter never receives secrets — only public API URLs via `AppConfig`
- S3/R2 credentials, JWT secrets, SMTP passwords: GitHub Secrets for CI, host panel for production

---

## 8. When Adding a New Feature

Checklist before opening a PR:

- [ ] Test written first (TDD), covering happy path and at least one error case
- [ ] Schema validated with Zod (backend) or tested in unit test (Flutter)
- [ ] AppSpacing / AppTypography used — no hardcoded values
- [ ] No `process.env` access outside `env.ts`
- [ ] No raw SQL without full parameterization
- [ ] README updated if a new endpoint or feature was added
- [ ] `SKIP_DB_TESTS=true npm test` passes locally
- [ ] `flutter test` passes locally
- [ ] `flutter analyze --no-fatal-warnings` clean
