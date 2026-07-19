# 1Cup — Revisão de Design & UX

> Avaliação visual e de fluxo do app Flutter e da landing page, com recomendações
> priorizadas. Data: 2026-07-17.

O 1Cup já parte de uma base sólida: Material 3 com `ColorScheme` completo (claro/escuro),
tokens de espaçamento/tipografia centralizados e uma landing com paleta quente coerente e
animações com `framer-motion`. As recomendações abaixo elevam o produto de "bem organizado" para
"moderno e fluido".

> **Atualização — Fase 10 (entregue):** landing com fontes auto-hospedadas (`next/font`), metadados
> OpenGraph/Twitter, `themeColor` e skip link de acessibilidade; app Flutter com **skeletons**
> (feed + descobrir), **empty states ilustrados** com CTA, **transições de página** (fade/slide) nas
> rotas de detalhe e `Semantics` de leitor de tela no rating. Os itens abaixo marcados com ✅ já
> foram implementados.

---

## 1. Aplicado nesta revisão (landing)

Mudanças de baixo risco, já buildadas e verificadas (`next build` ✓):

- **Fundo aurora/mesh** (`.aurora-bg`) no Hero — profundidade sem imagens pesadas.
- **Gradiente dourado animado** no título (shimmer sutil de 6s).
- **Mockup flutuante** — leve animação vertical contínua dá vida à cena.
- **Glassmorphism** (`.glass`) disponível como utilitário para cartões em destaque.
- **Acessibilidade:** `:focus-visible` dourado consistente, `::selection` da marca,
  `prefers-reduced-motion` respeitado, `-webkit-font-smoothing`/`optimizeLegibility`.

Arquivos: [`globals.css`](../apps/landing/src/app/globals.css), [`Hero.tsx`](../apps/landing/src/components/Hero.tsx).

---

## 2. Landing — próximas melhorias recomendadas

| Prioridade | Item | Porquê |
|---|---|---|
| Alta | Auto-hospedar fontes com `next/font` | Remove request externo ao Google (privacidade + LCP mais rápido) |
| Alta | Meta/OG tags + `metadata` do Next | Compartilhamento social e SEO (título, descrição, imagem) |
| Média | Aplicar `.glass` aos cards de _Features_ | Consistência com o mockup e visual mais premium |
| Média | Estado de erro/sucesso da waitlist com toast/inline animado | Feedback mais claro que texto vermelho |
| Média | Seção de _social proof_ real (logos/depoimentos) | Confiança |
| Baixa | Dark/light toggle visível na Navbar | `next-themes` já está instalado |
| Baixa | `prefers-reduced-motion` também nas animações `framer-motion` | Coerência com o CSS |

---

## 3. App Flutter — visual

| Prioridade | Item | Detalhe |
|---|---|---|
| Alta | **Skeletons/shimmer** em vez de spinners | Feed, discover e perfil carregam listas — skeleton reduz percepção de espera |
| Alta | **Estados vazios ilustrados** | "Nenhum check-in ainda", "Sem amigos ainda" com CTA claro (hoje provavelmente vazio/branco) |
| Média | **Micro-interações** | Animar a seleção de estrelas no check-in, transição de páginas com `go_router` (fade/shared axis) |
| Média | **Hero image no detalhe do café** | Usar `Hero` widget do card → detalhe para transição contínua |
| Média | **Tipografia de display** | Usar uma serifada (como a landing) nos títulos de tela para identidade de marca |
| Baixa | **Haptics** no check-in concluído e ao ganhar badge | Recompensa tátil reforça a gamificação |
| Baixa | **Badge unlock celebration** | Animação/confete ao desbloquear conquista aumenta retenção |

---

## 4. Fluxo de uso (UX) — pontos de atrito e recomendações

1. **Onboarding ausente.** Após registro o usuário cai direto no `/feed`, que estará vazio (sem
   amigos, sem check-ins). Recomenda-se um onboarding curto: (a) fazer o 1º check-in, (b) seguir
   algumas torrefações/pessoas, (c) explicar badges. Isso resolve o "cold start".

2. **Guard de rota admin no cliente.** [`app_router.dart`](../apps/mobile/lib/core/router/app_router.dart)
   não verifica `role` — qualquer usuário autenticado pode navegar para `/admin` e ver a tela (a API
   bloqueia, mas a UI mostra erros). Adicionar checagem de papel no `redirect`.

3. **Descoberta → check-in.** O fluxo café → check-in já passa `coffeeId` por query param (bom).
   Garantir que o botão de check-in seja um **FAB persistente** e que "café não encontrado" leve
   direto a "adicionar café".

4. **Feed só mostra check-ins públicos** — inclusive os do próprio usuário. Um usuário que só faz
   check-ins privados vê o próprio feed vazio. Considerar mostrar os próprios privados no feed
   pessoal.

5. **Sugerir edição vs. editar.** O fluxo de sugestão de edição é ótimo para catálogo comunitário,
   mas precisa de feedback claro de "sua sugestão foi enviada e aguarda revisão".

6. **Pull-to-refresh e paginação infinita** no feed (cursor já existe no backend) — garantir
   indicador de "carregando mais" e fim de lista.

---

## 5. Sistema de design — consolidação

- Extrair os tokens da landing (cores, raios, sombras) e do Flutter para uma **fonte única
  documentada** (ex.: um `DESIGN_TOKENS.md` ou Figma) para manter paridade entre web e app.
- Padronizar **raios** (a landing usa 16/24px; confirmar equivalência no Flutter `AppSpacing`).
- Definir **escala tipográfica** nomeada (display/title/body/caption) idêntica nas duas plataformas.

---

## 6. Acessibilidade (a fazer)

- Contraste: validar o dourado `#FFC000` sobre fundos claros (texto pequeno pode falhar AA).
  Preferir o dourado só em elementos grandes/decorativos; texto usa `espresso`.
- Áreas de toque ≥ 48×48 dp no app.
- `Semantics`/labels nos ícones-only (nav bar, estrelas) para leitores de tela.
- Testar navegação por teclado na landing (o `:focus-visible` já ajuda).
