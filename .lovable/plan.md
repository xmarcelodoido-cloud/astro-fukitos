## Objetivo

Deixar o Astrokitos com fluxo estilo Zeta: **tela de login RA da Sala do Futuro como primeira tela**, e só depois o hub com as plataformas. Além disso, criar o **script do Speak (Efekta)** que auto-completa lições usando as APIs `efid_tokens` / `catalyst_token` / `azid_token`, tudo no tema laranja/preto do Astro.

---

## 1. Fluxo de login RA obrigatório

**Nova página `/login`** (vira a rota inicial `/`):
- Form com RA + senha da Sala do Futuro, no tema Astro (Bricolage Grotesque, gradient laranja/preto, glow blobs).
- Lista de **contas salvas** (localStorage `astrokitos_accounts`) com login 1-clique.
- Botão "Apoiar" e link do Discord no rodapé.
- Ao logar com sucesso via `proxy-catalyst` action `login`, salvo `{ra, nick, auth_token, roomCode, targets}` em `sessionStorage.astrokitos_session` + adiciono a conta na lista salva.

**Guard de rota (`RequireAuth`)** em `App.tsx`:
- Se `sessionStorage.astrokitos_session` não existir, redireciona qualquer rota (exceto `/login`, `/admin`, `/admin-login`) para `/login`.
- Hub `/` passa a ser `/hub` renderizando o atual `ModeSelect` (sem o form dele — o login já foi feito).
- Botão "Sair" no header do hub e no `/perfil` limpa `sessionStorage` e volta para `/login`.

**Ajustes nas plataformas existentes** (`/automatico`, `/ia`, etc): usam a sessão já autenticada em vez de refazer login. `Index.tsx` (TarefaSP) hoje mostra `LoginForm` — passa a pular direto para o dashboard consumindo a sessão global.

**Intro** (`IntroFlow`): passa a rodar **1x após o login**, antes do primeiro acesso ao hub (não mais no boot da aplicação).

## 2. Script do Speak (Efekta) — nova plataforma `/speak`

Ativar o card "Speak" no hub (hoje não existe — adicionar como 7ª plataforma, active).

**Nova página `src/pages/Speak.tsx`** no tema Astro (mesmo shell visual das outras) com:
1. Painel para obter tokens Efekta.
2. Lista de lições pendentes.
3. Botão "Completar todas" + progresso individual (bem parecido com `/automatico`).

**Obtenção dos tokens** — abordagem em 2 camadas:
- **Tentativa 1 (SSO integrado via RA):** nova edge function `efekta-sso` que, dado o `auth_token` da Sala do Futuro, tenta o fluxo `login.microsoftonline.com/…/b2c_1a_signin_b2s_global` → `global.accounts.better.efekta.com` → `learn.better.efekta.com` para gerar `azid_token` + `efid_tokens` + `catalyst_token` automaticamente. **Aviso importante:** esse SSO usa cookies B2C da Microsoft com JIT partner code `SANP-…`, e pode não funcionar de forma 100% server-side — se falhar, cai no fallback.
- **Fallback (colar manual):** 3 textareas onde o aluno cola os tokens copiados do DevTools do `learn.better.efekta.com` (mostro instruções passo a passo). Tokens salvos em `sessionStorage.astrokitos_efekta`.

**Nova edge function `proxy-efekta`** (verify_jwt=false, com CORS) que faz proxy para as APIs do Efekta usando os tokens fornecidos pelo cliente. Endpoints:
- `list_lessons`: `GET https://catalyst-eu.better.efekta.com/gap/api/lessons` (retorna lições pendentes com `activityId`/`lessonId`/`taskId`/`sessionId`).
- `complete_task`: envia a sequência de eventos observada na payload que você mandou:
  `taskResponseSubmitted` → `taskResponseAssessed` (result: "correct") → `taskProgressed` (score 100) → `taskCompleted` → `taskPassed` → `activityProgressed` → `activityPassed` → `activityCompleted` → `stepProgressed` → `lessonProgressed`, todos com `commandId` UUID novo, `timeSpent` aleatório 300-1500s, `score: 100`.
  Endpoint: `POST https://catalyst-eu.better.efekta.com/gap/api/commands` com header `Authorization: Bearer <catalyst_token>`.

**Fluxo do usuário no `/speak`:**
1. Chega na página → se não tem tokens, mostra formulário SSO (botão "Tentar login automático") + fallback manual.
2. Com tokens válidos → chama `proxy-efekta` action `list_lessons`, lista lições com título + score atual.
3. Botão "Auto-completar tudo" itera enviando `complete_task` para cada lição pendente com delay 1-2s + score 100 e resultado "correct" (igual ao TarefaSP).
4. Progresso e falhas gravados em `task_results` (mesma tabela) marcando `room: "Speak"` para aparecer no `/perfil` e no painel Admin.

## 3. Ajustes gerais

- `PlatformShell.tsx`: adiciona botão "Sair" no header além de "Voltar/Hub".
- `ModeSelect.tsx`: header ganha bloco "Olá, {nick}" + botão Sair; card Speak passa a ser `available: true`; recontagem de stats.
- `useAntiInspect` + `SecurityShield` continuam ativos em todas as páginas novas.
- Se o `auth_token` da Sala do Futuro expirar, o guard redireciona para `/login` de novo.

## Estrutura técnica

```text
src/
  contexts/SessionContext.tsx    # NOVO — provider com sessão RA global
  components/RequireAuth.tsx     # NOVO — guard
  pages/
    Login.tsx                    # NOVO — nova tela inicial
    Speak.tsx                    # NOVO — script Speak com tema Astro
    ModeSelect.tsx               # editar: remover form, adicionar user chip + logout
    Index.tsx                    # editar: usar sessão global em vez de LoginForm
  lib/
    efekta.ts                    # NOVO — cliente do proxy-efekta + tipos
supabase/functions/
  efekta-sso/index.ts            # NOVO — tenta SSO RA→Efekta
  proxy-efekta/index.ts          # NOVO — proxy autenticado p/ APIs Efekta
supabase/config.toml             # adicionar verify_jwt=false para as 2 novas
```

## Notas / riscos

- **SSO RA→Efekta pode não funcionar** puramente server-side por conta do CAPTCHA/anti-bot da Microsoft B2C e do `botScore` no `catalyst_token`. Se o experimento inicial falhar, mantemos só o fluxo manual de colar tokens (mesmo que o Zeta faz na prática).
- Nenhuma tabela nova é necessária — reuso `task_results` marcando `room` = plataforma.
- Rotas `/leia`, `/redacao`, `/matific`, `/khan` continuam como stubs "em breve".