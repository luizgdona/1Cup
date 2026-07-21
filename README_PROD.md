# 1Cup — Guia de Produção

> Passo a passo completo para colocar o 1Cup no ar: backend, e-mail transacional,
> build Android assinado e publicação na Google Play.
>
> Este documento existe para que **nenhuma configuração fique como conhecimento tácito**.
> Se você fizer um passo fora daqui, documente aqui.

Para desenvolvimento local, veja o [README.md](README.md). Este guia cobre **apenas produção**.

---

## Sumário

1. [Custos](#1-custos)
2. [O que nunca pode ser commitado](#2-o-que-nunca-pode-ser-commitado)
3. [Backend — variáveis de ambiente](#3-backend--variáveis-de-ambiente)
4. [Backend — deploy](#4-backend--deploy)
5. [E-mail transacional (SMTP)](#5-e-mail-transacional-smtp)
6. [Android — keystore e build assinado](#6-android--keystore-e-build-assinado)
7. [Google Play Console](#7-google-play-console)
8. [Teste fechado — a regra dos 12/14](#8-teste-fechado--a-regra-dos-1214)
9. [Checklist final](#9-checklist-final)
10. [Lacunas conhecidas](#10-lacunas-conhecidas)

---

## 1. Custos

**Pagamento único**

| Item | Custo |
|---|---|
| Google Play Developer (vitalício, apps ilimitados) | **US$ 25** |

Não é anual. Apple, para comparação, cobra US$ 99/ano — mas iOS está fora de escopo por ora.

**Recorrente — configuração mínima viável**

| Item | Opção sugerida | Custo/mês |
|---|---|---|
| Backend Node | VPS Hetzner CX22 (2 vCPU/4 GB) ou Railway Hobby | €4,5 / US$ 5 |
| PostgreSQL 17 | Neon free tier, ou no próprio VPS | R$ 0 |
| Redis 8 | Upstash free (500k comandos/mês), ou no VPS | R$ 0 |
| Imagens | Cloudflare R2 — 10 GB grátis, egress zero | R$ 0 |
| Landing Next.js | Vercel Hobby | R$ 0 |
| E-mail transacional | Brevo (300/dia) ou Resend (100/dia, 3k/mês) | R$ 0 |
| Domínio `.com.br` | — | ~R$ 5 (R$ 60/ano) |

**Total realista: US$ 25 uma vez + ~R$ 30–60/mês.** Escala confortavelmente até a
casa de alguns milhares de usuários ativos antes de exigir banco gerenciado pago.

---

## 2. O que nunca pode ser commitado

**Antes de qualquer push, confira `git status`.**

| Arquivo | Por quê | Regra esperada no `.gitignore` |
|---|---|---|
| `.env`, `.env.local` | Segredos de banco, JWT, S3, SMTP | `.env`, `.env.local`, `.env.*.local` |
| `apps/mobile/android/key.properties` | Senhas da keystore | `apps/mobile/android/key.properties` |
| `*.jks`, `*.keystore` | **A chave de assinatura do app** | `*.jks`, `*.keystore` |
| `apps/mobile/android/local.properties` | Caminhos locais do SDK | `apps/mobile/android/local.properties` |

> ⚠️ **Não confie nesta tabela** — ela lista o que *deveria* estar ignorado, e cada
> regra pode estar ausente no checkout em que você está (as de assinatura Android,
> por exemplo, chegam junto com a pasta `android/`). Rode os comandos abaixo e
> acredite na saída deles.
>
> Independente disso, a orientação da [seção 6.2](#62-criar-keyproperties) é guardar a
> keystore **fora do repositório**, o que torna a regra de ignore irrelevante em vez de
> ser a única linha de defesa da chave de assinatura.

Os templates versionados — `.env.example` e `.env.local.example` — **nunca** contêm
valores reais. Ao adicionar uma variável nova, adicione-a ao `.example` no mesmo commit.

Para validar que uma regra está funcionando:

```bash
git check-ignore -v apps/mobile/android/key.properties
git check-ignore -v apps/mobile/android/app/upload-keystore.jks
```

Se o comando não imprimir nada, o arquivo **não** está sendo ignorado — pare e corrija.
Trate a saída desses comandos como a fonte da verdade, não esta tabela: uma regra pode ter
sido alterada depois que este documento foi escrito.

> **Se um segredo vazar num commit:** rotacione o segredo imediatamente. Remover o
> commit não basta — assuma que o valor foi comprometido no instante do push.

---

## 3. Backend — variáveis de ambiente

Todas as variáveis são validadas por Zod em [`apps/backend/src/config/env.ts`](apps/backend/src/config/env.ts),
que é a **única** fonte de `process.env` no projeto. Se qualquer uma faltar ou for
inválida, o processo encerra no boot com `process.exit(1)` e loga o campo problemático.

| Variável | Obrigatória | Formato | Observação |
|---|---|---|---|
| `NODE_ENV` | sim | `production` | Ativa HSTS, desativa Swagger, ativa envio real de e-mail |
| `PORT` | não | número | Default `3000` |
| `DATABASE_URL` | sim | URL | `postgresql://user:pass@host:5432/db` |
| `REDIS_URL` | sim | URL | `redis://...` ou `rediss://...` (TLS) |
| `JWT_ACCESS_SECRET` | sim | min 32 chars | Ver geração abaixo |
| `JWT_REFRESH_SECRET` | sim | min 32 chars | **Diferente** do access |
| `S3_ENDPOINT` | sim | URL | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
| `S3_BUCKET` | sim | string | Ex.: `1cup-media` |
| `S3_ACCESS_KEY` | sim | string | Token R2 |
| `S3_SECRET_KEY` | sim | string | Token R2 |
| `S3_PUBLIC_URL` | sim | URL | Domínio público do bucket |
| `CORS_ORIGIN` | não | lista CSV | Default `http://localhost:3001` — **troque em produção** |
| `BCRYPT_ROUNDS` | não | número | Default `12` |
| `SMTP_HOST` | **em produção** | string | Ver [seção 5](#5-e-mail-transacional-smtp) |
| `SMTP_PORT` | não | número | Default `587` |
| `SMTP_SECURE` | não | `true`/`false` | `true` para 465, `false` para 587 |
| `SMTP_USER` | **em produção** | string | |
| `SMTP_PASS` | **em produção** | string | |
| `SMTP_FROM` | **em produção** | e-mail | Deve ser do domínio verificado |

### Gerando os segredos JWT

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Rode **duas vezes** — access e refresh precisam ser valores diferentes. Trocar esses
segredos invalida todas as sessões ativas (é o botão de emergência caso vazem).

> ⚠️ **Atenção ao primeiro deploy:** com `NODE_ENV=production`, se qualquer uma das
> quatro variáveis SMTP faltar, **a aplicação não sobe**. Isso é deliberado — sem
> e-mail, o gate `requireVerified` impede que usuários novos criem qualquer conteúdo,
> ou seja, o produto estaria quebrado de forma silenciosa. Configure o SMTP **antes**
> de subir esta versão.

---

## 4. Backend — deploy

### 4.1 Banco de dados

Provisione o PostgreSQL 17 (Neon, Supabase, ou no próprio VPS) e aponte `DATABASE_URL`.

Aplique as migrations com o comando de **produção** — não o de dev:

```bash
cd apps/backend
npm run db:migrate:prod        # = prisma migrate deploy
```

`npm run db:migrate` (= `prisma migrate dev`) é para desenvolvimento: ele cria
migrations novas e pode pedir reset do banco. **Nunca rode em produção.**

### 4.2 Redis

Necessário para rate limiting distribuído. Se o Redis cair, o rate limit degrada
com `skipOnError` em vez de derrubar a API — mas os limites deixam de valer, então
não trate como opcional.

### 4.3 Storage (Cloudflare R2)

1. Crie o bucket (ex.: `1cup-media`)
2. Gere um token de API com permissão de leitura e escrita **apenas** nesse bucket
3. Configure um domínio público (ex.: `media.1cup.app`) e aponte `S3_PUBLIC_URL` para ele

### 4.4 Subir a aplicação

```bash
cd apps/backend
npm ci
npm run db:generate            # prisma generate
npm run build                  # tsc -> dist/
NODE_ENV=production npm start  # = node dist/app.js
```

O entrypoint é `dist/app.js`, não `dist/server.js` — use `npm start` e o caminho fica
correto mesmo se ele mudar.

Use um supervisor de processo (systemd, PM2 ou o do PaaS) para reiniciar em caso de crash.

#### Shutdown gracioso — configure o timeout do supervisor

Ao receber `SIGTERM`/`SIGINT` o processo para de aceitar conexões e então aguarda o
trabalho em background terminar (envio de e-mails e escrita de tokens), porque um
e-mail de verificação perdido deixa o usuário travado atrás do gate `requireVerified`.

| Etapa | Orçamento |
|---|---|
| Fechar o servidor HTTP | 15 s |
| Drenar tarefas em background | 10 s |
| **Prazo total** | **25 s** |

> ⚠️ **Configure o supervisor para esperar mais de 25 s antes do `SIGKILL`.** No
> systemd é `TimeoutStopSec=30`; em Kubernetes, `terminationGracePeriodSeconds: 30`.
> Com o padrão mais curto de alguns orquestradores, o processo é morto no meio do
> drain e o mecanismo não serve para nada.

O drain é *best-effort*, não durável: um envio travado contra um SMTP fora do ar pode
ultrapassar o orçamento e ser abandonado, e um crash forçado perde o trabalho de
qualquer forma. Garantia real exige fila (BullMQ/Redis).

### 4.5 HTTPS e proxy reverso

Ponha Nginx ou Caddy na frente, com TLS. O backend já envia HSTS quando
`NODE_ENV=production`. Confira que o proxy repassa o IP real do cliente — sem isso o
rate limiting por IP passa a limitar o proxy inteiro como se fosse um único usuário.

### 4.6 Verificação pós-deploy

```bash
curl -i https://api.1cup.app/health
curl -i https://api.1cup.app/docs   # deve retornar 404 em produção
```

O Swagger ficar acessível em produção é uma falha de configuração — significa que
`NODE_ENV` não está como `production`.

---

## 5. E-mail transacional (SMTP)

O transporte usa **nodemailer via SMTP genérico**, então trocar de provedor é mudança
de variável de ambiente, não de código.

### 5.1 Escolher o provedor

| Provedor | Free tier | Host SMTP |
|---|---|---|
| Brevo | 300 e-mails/dia | `smtp-relay.brevo.com:587` |
| Resend | 100/dia, 3.000/mês | `smtp.resend.com:465` |

### 5.2 Verificar o domínio

O `SMTP_FROM` **precisa** ser um endereço do domínio verificado. Remetente `@gmail.com`
não passa por DKIM e cai em spam ou é rejeitado.

No painel do provedor, adicione `1cup.app` (ou um subdomínio dedicado como
`mail.1cup.app`) e copie os registros DNS que ele indicar.

### 5.3 Configurar o DNS

No registrador do domínio, crie os três registros. **Use os valores exatos que o painel
do provedor mostrar** — os exemplos abaixo são só a forma:

| Tipo | Nome | Valor (exemplo — confirme no painel) |
|---|---|---|
| TXT | `@` | `v=spf1 include:spf.brevo.com ~all` |
| TXT/CNAME | seletor DKIM do provedor | chave fornecida pelo provedor |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:voce@1cup.app` |

Comece o DMARC com `p=none` (só monitora). Depois de algumas semanas sem falha de
alinhamento nos relatórios, endureça para `p=quarantine` e depois `p=reject`.

Aguarde a propagação e clique em "verify" no painel antes de seguir.

### 5.4 Credenciais e variáveis

Gere a chave SMTP no painel e configure no ambiente de produção:

```
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false          # true apenas para a porta 465
SMTP_USER=<usuário SMTP do painel>
SMTP_PASS=<chave SMTP — nunca no git>
SMTP_FROM=noreply@1cup.app
```

### 5.5 Smoke test

```bash
# O e-mail PRECISA ser de uma conta já registrada. Para um endereço desconhecido a
# rota responde sucesso e não envia nada — o teste passaria sem exercitar o SMTP.
curl -X POST https://api.1cup.app/api/v1/auth/forgot-password \
  -H 'Content-Type: application/json' \
  -d '{"email":"conta-que-existe@exemplo.com"}'
```

A rota **sempre** responde a mesma mensagem neutra, exista o e-mail ou não — é a defesa
contra enumeração de usuários, não um bug. Duas medidas complementam a mensagem:

1. **Todo o trabalho específico da conta registrada roda fora do caminho da resposta** —
   escrita do token e envio do e-mail. Os dois ramos fazem exatamente uma consulta antes
   de responder, então o trabalho em si não difere.
2. **Piso de tempo de resposta**, que absorve a variância residual dessa consulta, do
   agendamento e do runtime.

O mesmo vale para `/auth/resend-verification`. As medidas reduzem o sinal de tempo a
ruído — não o eliminam por construção, como faria um caminho de execução literalmente
idêntico nos dois casos.

Para saber se o envio funcionou, confira:

1. A caixa de entrada **e a pasta de spam**
2. Os logs do backend (logger `mailer`) — sucesso registra o `messageId`

Se o e-mail não chegar e o log não acusar erro, o problema é de deliverability (DNS),
não de código.

> **Se o host bloquear portas SMTP de saída:** alguns PaaS bloqueiam 25/465/587. As
> alternativas variam por provedor — não são intercambiáveis:
>
> | Provedor | Portas alternativas | `SMTP_SECURE` |
> |---|---|---|
> | Brevo | `2525` | `false` |
> | Resend | `2465` (TLS), `2587` (STARTTLS) | `true` / `false` |
>
> Confirme no painel do provedor antes de assumir que uma porta existe. Se nenhuma
> funcionar, aí sim considere migrar para o SDK HTTP.

---

## 6. Android — keystore e build assinado

### 6.1 Gerar a keystore de upload

**Passo manual — envolve senhas pessoais e não deve ser automatizado.**

```bash
keytool -genkey -v -keystore upload-keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

O `keytool` vem com o JDK. Se não estiver no PATH, `flutter doctor -v` mostra o caminho
do Java usado pelo Android Studio.

> 🔴 **Backup, agora e não depois.** Guarde o `.jks` e as senhas em pelo menos dois
> lugares seguros (gerenciador de senhas + backup offline). Ative o **Google Play App
> Signing** no primeiro upload: o Google passa a guardar a chave de assinatura final e a
> sua vira apenas "upload key", que é recuperável via suporte se perdida. Sem isso,
> perder a keystore significa nunca mais publicar atualização do app com o mesmo
> `applicationId`.

### 6.2 Criar `key.properties`

Em `apps/mobile/android/key.properties` (já ignorado pelo git):

```properties
storePassword=<senha da store>
keyPassword=<senha da key>
keyAlias=upload
storeFile=C:/Users/voce/keystores/upload-keystore.jks
```

**Guarde a keystore fora do repositório** e use caminho absoluto, com **barras normais**
mesmo no Windows. Um caminho relativo (`storeFile=upload-keystore.jks`) resolve para
dentro de `apps/mobile/android/app/`, ou seja, coloca a chave de assinatura do app dentro
da árvore do git — a proteção passa a depender exclusivamente de uma regra de ignore
estar correta. Manter o arquivo fora elimina a classe inteira de erro.

Se ainda assim optar por guardá-la dentro do repositório, confirme a regra antes de
qualquer commit:

```bash
git check-ignore -v apps/mobile/android/app/upload-keystore.jks
```

Se `key.properties` não existir, o build de release cai automaticamente para a chave de
debug. Isso é intencional — permite que o CI e outros devs compilem sem ter a keystore —
mas **um `.aab` assinado com a chave de debug é rejeitado pela Play Store**.

### 6.3 Identidade do app

| Item | Valor | Mutável? |
|---|---|---|
| `applicationId` | `app.onecup.mobile` | 🔴 **Não**, após a primeira publicação |
| `android:label` | `1Cup` | Sim |
| `versionName` / `versionCode` | de `pubspec.yaml` (`0.1.0+1`) | Sim |

Para subir versão, edite **apenas** o `version:` do `pubspec.yaml`. O número após o `+`
é o `versionCode` e precisa ser estritamente crescente a cada upload na Play.

### 6.4 Ícones do launcher

A arte-fonte está em `apps/mobile/assets/branding/` — pasta deliberadamente **não**
declarada em `assets:` no pubspec, já que só é lida em tempo de build.

Depois de alterar a arte, regenere:

```bash
cd apps/mobile
flutter pub run flutter_launcher_icons
```

Use `flutter pub run`, não `dart run` — se houver um Dart SDK standalone no PATH, o
`dart run` falha por não achar o `flutter_test` do SDK do Flutter.

### 6.5 Build de release

```bash
cd apps/mobile
flutter clean && flutter pub get
flutter build appbundle --release \
  --dart-define=API_BASE_URL=https://api.1cup.app/api/v1 \
  --obfuscate --split-debug-info=build/symbols
```

Saída: `build/app/outputs/bundle/release/app-release.aab`

O `--dart-define` é **obrigatório**: sem ele o app aponta para
`http://10.0.2.2:3000/api/v1`, que é o localhost do emulador. Guarde o diretório
`build/symbols` de cada release — sem ele os stack traces de crash vêm ofuscados e
ilegíveis.

### 6.6 Testar o `.aab` localmente

```bash
java -jar bundletool.jar build-apks --bundle=app-release.aab --output=app.apks --mode=universal
java -jar bundletool.jar install-apks --apks=app.apks
```

O [bundletool](https://github.com/google/bundletool) reproduz exatamente o que a Play
entrega ao dispositivo. Alternativa mais rápida para smoke test:
`flutter build apk --release --dart-define=...` seguido de `flutter install`.

**Checklist no aparelho físico:**

- [ ] Instala e abre sem crash no cold start (valida que o R8 não removeu nada essencial)
- [ ] Login persiste após fechar e reabrir (valida `flutter_secure_storage` em release)
- [ ] Feed carrega imagens (valida permissão `INTERNET`)
- [ ] Fontes corretas renderizam (o `google_fonts` baixa em runtime — teste também em modo avião após o primeiro uso)
- [ ] Navegação completa funciona (valida go_router sob ofuscação)
- [ ] Ícone correto no launcher, em tema claro e escuro

---

## 7. Google Play Console

### 7.1 Conta

US$ 25, pagamento único, cartão de crédito ou débito — **cartões pré-pagos não são
aceitos**.

### 7.2 Política de privacidade (obrigatória)

Precisa estar numa **URL pública** antes do envio. O app coleta e-mail, nome, fotos de
check-in e conteúdo gerado pelo usuário. Publique em `https://1cup.app/privacidade`.

> Hoje a landing tem apenas a página raiz — **esta página ainda não existe e precisa ser
> criada.**

### 7.3 Data Safety

Formulário obrigatório. Declare o que o app realmente coleta:

| Dado | Coletado | Finalidade |
|---|---|---|
| E-mail, nome | Sim | Conta e autenticação |
| Fotos | Sim | Conteúdo de check-in |
| Conteúdo do usuário | Sim | Funcionalidade do app |
| Localização | **Não** | A permissão não é declarada no manifest |

Declarar dado que não se coleta é tão problemático quanto omitir — a Play cruza a
declaração com as permissões do manifest.

### 7.4 Assets da listagem

| Asset | Especificação | Status |
|---|---|---|
| Ícone | 512×512 PNG transparente, até 1 MB | Derivar de `assets/branding/app_icon.png` |
| Feature graphic | 1024×500 PNG/JPG | ⚠️ **Falta criar** |
| Screenshots telefone | 2 a 8, mín. 320px no menor lado | Reaproveitar `docs/screenshots/` |
| Descrição curta | até 80 caracteres | ⚠️ **Falta escrever** |
| Descrição completa | até 4000 caracteres | ⚠️ **Falta escrever** |

---

## 8. Teste fechado — a regra dos 12/14

Contas **pessoais** de desenvolvedor criadas após **13/nov/2023** só ganham acesso a
produção depois de rodar um teste fechado com **12 testers opted-in por 14 dias
consecutivos**. (Eram 20 testers até dez/2024.)

Detalhes que costumam pegar as pessoas:

- **"Opted-in" significa que a pessoa aceitou o convite *e instalou* o app** com a conta
  Google correspondente. A instalação e o uso são recomendados para gerar feedback real, mas o requisito publicado mede o opt-in contínuo.
- Os 14 dias só começam a contar depois que o release é **aprovado** e os 12 testers já
  estão opted-in. Se cair para 11, o contador é afetado.
- Contas de **organização** são isentas — se você tiver CNPJ, vale considerar (exige
  D-U-N-S e verificação, mas dispensa os 14 dias).

**Faixas de teste, em ordem de uso:**

| Faixa | Testers | Review | Uso |
|---|---|---|---|
| Internal testing | até 100 | não | Validação sua, sobe em minutos — **comece por aqui** |
| Closed testing | ilimitado | sim | É o que conta para os 14 dias |
| Open testing | público | sim | Beta aberto |
| Production | — | sim | Liberado após cumprir o requisito |

Referências: [App testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en) ·
[Get started with Play Console](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en)

---

## 9. Checklist final

**Backend**

- [ ] Todas as variáveis da [seção 3](#3-backend--variáveis-de-ambiente) configuradas
- [ ] `JWT_ACCESS_SECRET` e `JWT_REFRESH_SECRET` gerados, diferentes entre si
- [ ] `CORS_ORIGIN` com os domínios de produção (não o default de localhost)
- [ ] `npx prisma migrate deploy` aplicado
- [ ] `/health` responde 200 e `/docs` responde 404
- [ ] HTTPS ativo, proxy repassando o IP real do cliente
- [ ] Backup automatizado do PostgreSQL configurado

**E-mail**

- [ ] Domínio verificado no provedor
- [ ] SPF, DKIM e DMARC propagados e validados
- [ ] Smoke test recebido na caixa de entrada (não no spam)

**Android**

- [ ] Keystore gerada e **com backup em dois lugares**
- [ ] `key.properties` criado e confirmado como ignorado pelo git
- [ ] `.aab` assinado com a upload key (não a de debug)
- [ ] Checklist de aparelho físico da [seção 6.6](#66-testar-o-aab-localmente) completo
- [ ] `git status` sem `.jks`, `key.properties` ou `.env`

**Play Console**

- [ ] Conta paga (US$ 25)
- [ ] Play App Signing ativado
- [ ] Política de privacidade publicada
- [ ] Data Safety preenchido e coerente com o manifest
- [ ] Assets da listagem completos
- [ ] Internal testing validado antes de abrir o closed testing

---

## 10. Lacunas conhecidas

Itens que **ainda não existem** e bloqueiam a publicação:

| Item | Onde | Impacto |
|---|---|---|
| Página de política de privacidade | `apps/landing` | 🔴 Bloqueia o envio à Play |
| Feature graphic 1024×500 | — | 🔴 Bloqueia a listagem |
| Descrições curta e completa | — | 🔴 Bloqueia a listagem |
| App Flutter não usa os endpoints da Fase 8 | `apps/mobile` | 🟠 Backend mais rico que o app |
| Sem observabilidade (Sentry/métricas) | backend | 🟠 Falhas passam despercebidas |
| Sem backup automatizado do banco | infra | 🟠 Risco de perda de dados |
| Arte da marca é raster, não vetor | `assets/branding/` | 🟡 Redesenhar em SVG se precisar de impresso |
| Flutter local 3.41.7 vs CI 3.44.0 | `.github/workflows/ci.yml` | 🟡 Builds podem divergir |
