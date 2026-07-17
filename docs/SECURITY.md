# 1Cup — Revisão de Segurança

> Auditoria de segurança do backend (Fastify + Prisma), app Flutter e landing (Next.js).
> Data da revisão: 2026-07-17. Escopo: injeção, autenticação/autorização, abuso de requisições
> em massa, upload de arquivos, exposição de dados e regras de negócio.

Cada item traz **severidade**, **status** (✅ corrigido nesta revisão · 🔧 recomendado) e o
**arquivo** afetado.

---

## Resumo executivo

| # | Severidade | Área | Item | Status |
|---|-----------|------|------|--------|
| 1 | 🔴 Alta | Injeção/DoS | Paginação sem limites (`NaN`, `perPage` ilimitado) | ✅ Corrigido |
| 2 | 🔴 Alta | Mass-assignment | Sugestões de edição aceitavam qualquer campo | ✅ Corrigido |
| 3 | 🟠 Média | Upload | Content-Type confiável do cliente (spoofing → XSS armazenado) | ✅ Corrigido |
| 4 | 🟠 Média | DoS | Upload multipart sem limite de nº de arquivos | ✅ Corrigido |
| 5 | 🟠 Média | Vazamento | Erros 500 expunham `err.message` interno | ✅ Corrigido |
| 6 | 🟠 Média | Broken access control | Qualquer usuário sobrescrevia o rótulo de qualquer café | ✅ Corrigido |
| 7 | 🟠 Média | Abuso | Registro e pedidos de amizade sem rate limit próprio | ✅ Corrigido |
| 8 | 🟡 Baixa | Robustez | Cursor de feed adulterado gerava `Invalid Date` | ✅ Corrigido |
| 9 | 🟡 Baixa | Autorização | Admin podia rebaixar o próprio papel (self-lockout) | ✅ Corrigido |
| 10 | 🟠 Média | Config | Swagger/OpenAPI exposto em produção | ✅ Corrigido |
| 11 | 🟠 Média | Hardening | Sem HSTS, sem `bodyLimit`, CORS sem trim | ✅ Corrigido |
| 12 | 🔴 Alta | Integridade DB | `EditSuggestion`: 3 FKs na mesma coluna (impossível inserir) | 🔧 Recomendado |
| 13 | 🟠 Média | Rate limit | Store em memória não funciona multi-instância | 🔧 Recomendado |
| 14 | 🟠 Média | Auth | Fluxo de reset de senha não implementado | 🔧 Recomendado |
| 15 | 🟡 Baixa | Auth | Sem detecção de reuso de refresh token | 🔧 Recomendado |
| 16 | 🟡 Baixa | Privacidade | Landing carrega Google Fonts via `@import` externo | 🔧 Recomendado |

---

## Itens corrigidos nesta revisão

### 1. 🔴 Paginação sem limites — injeção de valor e DoS
**Antes:** todas as rotas de listagem usavam `z.string().transform(Number)` sem validação.
`?perPage=abc` virava `NaN` (repassado a `skip`/`take` do Prisma) e `?perPage=1000000`
permitia extrair a tabela inteira em uma requisição (exaustão de memória/banco e exfiltração).

**Correção:** novo helper [`shared/utils/pagination.schema.ts`](../apps/backend/src/shared/utils/pagination.schema.ts)
com `z.coerce.number().int().min(1).max(100).catch(default)`. Aplicado em coffees, producers,
roasteries, admin (suggestions + users), friends e users/checkins. Cobertura em
`pagination.schema.test.ts`.

### 2. 🔴 Mass-assignment nas sugestões de edição
**Antes:** `createSuggestionSchema` aceitava `payload: z.record(z.unknown())` — JSON arbitrário.
Ao aprovar, `admin.service#applyPayload` fazia `prisma.coffee.update({ data: safe })` com o payload
quase inteiro. Um usuário podia sugerir `{ roasteryId, createdBy, isActive: false }` e, uma vez
aprovado, reatribuir o café a outra torrefação ou despublicar itens do catálogo.

**Correção (defesa em profundidade):**
- **Na submissão:** payload validado contra uma allowlist estrita (`.strict()`) de campos seguros
  em [`coffees.schema.ts`](../apps/backend/src/modules/coffees/coffees.schema.ts).
- **Na aprovação:** `applyPayload` filtra por allowlist explícita por tipo de entidade
  ([`admin.service.ts`](../apps/backend/src/modules/admin/admin.service.ts)) — nunca `id`, relações,
  `createdBy`, `isActive` ou timestamps.

### 3. 🟠 Upload confiando no Content-Type do cliente
**Antes:** `validateImageUpload` só checava o `mimetype` enviado pelo cliente e o `uploadImage`
gravava no S3 com esse tipo. Um arquivo HTML/SVG rotulado como `image/png` seria aceito e, se
servido inline, resultaria em **XSS armazenado**.

**Correção:** [`s3.ts`](../apps/backend/src/shared/utils/s3.ts) agora faz *sniffing* dos magic bytes
(`detectImageType`), rejeita conteúdo que não seja JPEG/PNG/WebP real, e grava no S3 com o tipo
detectado + `Content-Disposition: inline` forçado. Cobertura em `upload-signature.test.ts`.

### 4. 🟠 Upload multipart sem limite de arquivos
**Antes:** `multipart` só limitava `fileSize`. A rota `POST /checkins/:id/photos` lia **todos** os
arquivos em memória (`for await ... toBuffer()`) antes de checar o limite de 3 → milhares de partes
= exaustão de memória.

**Correção:** limites globais em [`app.ts`](../apps/backend/src/app.ts): `files: 3`, `fields: 10`,
`fieldSize: 100KB`, além do `fileSize` de 5 MB.

### 5. 🟠 Vazamento de erros internos em respostas 500
**Antes:** rotas faziam `reply.status(500).send({ error: { message: err.message } })` e a waitlist
tinha `throw err` sem tratamento → stack/mensagens internas expostas ao cliente.

**Correção:** `setErrorHandler` global em [`app.ts`](../apps/backend/src/app.ts): 5xx retornam
mensagem genérica e logam o erro real só no servidor; 4xx preservam a mensagem de negócio. Também
adicionado `setNotFoundHandler` padronizado.

### 6. 🟠 Broken access control no rótulo do café
**Antes:** qualquer usuário autenticado podia `POST /coffees/:id/label` e sobrescrever a imagem de
**qualquer** café.

**Correção:** [`coffees.service.ts#uploadLabel`](../apps/backend/src/modules/coffees/coffees.service.ts)
exige que o solicitante seja o criador (`createdBy`) ou `ADMIN`; café inexistente → 404.

### 7. 🟠 Registro e amizade sem rate limit dedicado
**Correção:** `POST /auth/register` limitado a 5/15 min; `POST /friends/request/:userId` a 30/min,
com validação do `userId` como CUID e verificação de existência do alvo (evita FK 500 e enumeração).

### 8. 🟡 Cursor de feed adulterado
**Correção:** `decodeCursor` em [`feed.service.ts`](../apps/backend/src/modules/feed/feed.service.ts)
ignora cursores malformados em vez de repassar `Invalid Date` ao Prisma.

### 9. 🟡 Admin rebaixando o próprio papel
**Correção:** `updateUserRole` bloqueia alteração do próprio papel (evita self-lockout) e valida a
existência do alvo.

### 10–11. 🟠 Hardening de configuração
- Swagger/OpenAPI agora só é registrado fora de produção.
- `helmet` com **HSTS** em produção; `bodyLimit` de 256 KB para JSON; `CORS_ORIGIN` com `trim()`.

---

## Itens recomendados (não aplicados — exigem migração/decisão de produto)

### 12. 🔴 `EditSuggestion` — três FKs na mesma coluna
[`schema.prisma`](../apps/backend/prisma/schema.prisma) define três relações (`coffee`, `producer`,
`roastery`) todas usando `entityId` como campo de FK. No PostgreSQL isso cria **três constraints**
sobre a mesma coluna: um `entityId` não-nulo precisaria existir **simultaneamente** nas três tabelas
— o que torna **impossível** inserir qualquer sugestão em um banco real.

**Correção recomendada:** trocar por colunas anuláveis separadas (`coffeeId?`, `producerId?`,
`roasteryId?`), cada uma com sua própria relação/FK, e uma checagem de aplicação garantindo que
exatamente uma esteja preenchida conforme `entityType`. Requer migração.

### 13. 🟠 Rate limit em memória
O store padrão de `@fastify/rate-limit` é por processo. Com múltiplas instâncias, o limite é
multiplicado pelo nº de réplicas. **Recomendado:** usar o `redis` já disponível como store
compartilhado (`@fastify/rate-limit` aceita `redis`).

### 14. 🟠 Reset de senha não implementado
Existem `forgotPasswordSchema`/`resetPasswordSchema` e SMTP configurado no `env`, mas **não há rota
nem serviço**. Implementar com token de uso único, expiração curta e hash em repouso.

### 15. 🟡 Sem detecção de reuso de refresh token
A rotação revoga o token atual, mas usar um token já revogado apenas falha silenciosamente.
**Recomendado:** ao detectar reuso, revogar toda a família de tokens do usuário (indício de roubo).

### 16. 🟡 Fontes externas na landing
`globals.css` importa Google Fonts via `@import url(...)`, o que vaza IP do visitante ao Google e
bloqueia a renderização. **Recomendado:** `next/font` para auto-hospedar as fontes.

---

## Pontos positivos observados

- Senhas com **bcrypt** (12 rounds) e comparação em tempo constante.
- Refresh tokens **hasheados** (SHA-256) em repouso, com rotação e revogação.
- Tokens no app em **Keychain/Keystore** (`flutter_secure_storage`), nunca em `SharedPreferences`.
- **Zod** valida todas as entradas; Prisma parametriza todas as queries (o único `$queryRaw` usa
  template tags — sem concatenação).
- `env.ts` centraliza e valida segredos; `process.env` não é acessado fora dele.
- `helmet`, CORS restritivo e rate limit global já presentes.
