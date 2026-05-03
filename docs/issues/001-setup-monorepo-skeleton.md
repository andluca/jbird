# 001 — Setup monorepo skeleton

## Overview

Criar o esqueleto do monorepo Bun com os quatro packages (`@jbird/core`, `@jbird/cli`, `@jbird/proxy`, `@jbird/bundle`), `package.json` com workspaces, `tsconfig.base.json` compartilhado, lint config (ESLint + `@typescript-eslint/strict-type-checked`), CI basico, e binario `jbird` vazio que imprime help.

Referencia: spec section 2.2 (Repository Layout) + Phase 1.

Criterio de aceite (high-level): `bun install` succeeds from clean, todos os 4 packages buildam, binario `jbird` printa help.

Sem dependencias de outras issues.

## Contexto

### O que ja existe

Repo vazio: so `LICENSE`, `README.md`, `.gitignore`, `docs/`, `.claude/`. Nenhum `package.json`, nenhum `packages/`, nenhum `tsconfig`. Construcao do zero.

### Referencia na spec

- Section 2.1 (Runtime & Language Stack): Bun, TS 7.0, ESM only, `strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes`, Hono, `bun:test`, Commander.
- Section 2.2 (Repository Layout): quatro packages em `packages/{core,cli,proxy,bundle}`.
- Section 2.11 (Build & Distribution): `bun build --compile` para o cli, `bin` entry no `package.json`.
- Section 4.2 Phase 1 gate: `bun install` clean, todos os packages buildam, binario printa help.

### Decisoes ja tomadas que afetam essa issue

- Bun como package manager + runtime + test runner. Sem npm/pnpm/yarn, sem Vitest/Jest.
- ESM only (`"type": "module"` em todos os `package.json`).
- TS 7.0 strict (`tsc --noEmit` apenas — Bun executa TS direto).
- Schemas Zod sao fonte de tipo, mas Zod entra em 002. Issue 001 so precisa que o tooling exista.
- CI = GitHub Actions (matches "basico" da spec).
- Binario `jbird` so precisa printar help (Commander entra ja em 003 — mas como o gate da Phase 1 exige help renderizando, ja vamos plugar Commander minimo aqui pra evitar refazer).

## Plano

### Schemas e tipos (@jbird/core)

Nada de schemas em 001. So criamos a estrutura do package com `src/index.ts` exportando vazio (ou um marker pra confirmar build pipeline).

### Ports e integrations

N/A em 001.

### Testes (escrever primeiro)

Phase 1 nao tem logica de dominio. Os "testes" reais sao os universal gates (`bun install`, `bun test`, `tsc --noEmit`, `bun run lint`, `bun run build`). Mas pra honrar TDD, escrever:

- `packages/cli/src/jbird.test.ts` — chama `runCli(['--help'])` (helper minimo inline em 001, sera extraido pra `shared/test/cli.ts` em 003) e verifica que stdout contem o nome `jbird` e a string `Usage:`. Behavioral assertion: ao rodar `jbird --help`, o usuario ve documentacao do binario.
- `packages/core/src/index.test.ts` — smoke test que importa o barrel e confirma que o package carrega sem throw. Justifica existencia do test runner em todos os packages.

`@jbird/proxy` e `@jbird/bundle` em 001 sao package skeletons — `src/index.ts` placeholder e nada mais. Sem teste aqui ate ter codigo real (002+).

### Implementacao

Ordem:

1. **Root `package.json`** (Workspace root)
   - `"private": true`, `"type": "module"`, `"workspaces": ["packages/*"]`.
   - Scripts: `test`, `lint`, `build` (cada um delega via `bun run --filter '*' <script>`), `typecheck` (`bunx tsc --noEmit -p packages/cli && ... `).
   - DevDeps: `typescript@^7`, `eslint`, `typescript-eslint`, `@types/bun`.

2. **`tsconfig.base.json`** — strict TS 7.0 settings compartilhados. Cada package estende.
   - `target: ES2023`, `module: ESNext`, `moduleResolution: bundler`, `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`, `verbatimModuleSyntax: true`, `isolatedModules: true`, `noEmit: true`, `skipLibCheck: true`, `lib: ["ES2023"]`, `types: ["bun"]`.

3. **`eslint.config.mjs`** (flat config) — ESLint v9 flat com `@typescript-eslint` strict-type-checked.
   - Regras enforcing: no `any`, no `console.log` (warn), import-graph rules para layered architecture entram em 003.

4. **Per-package** `packages/{core,cli,proxy,bundle}/`:
   - `package.json` com `"name": "@jbird/{name}"`, `"type": "module"`, `"main": "./src/index.ts"`, `"exports": { ".": "./src/index.ts" }`.
   - `tsconfig.json` extendendo `../../tsconfig.base.json`, com `rootDir: "./src"`.
   - `src/index.ts` placeholder (export vazio em core/proxy/bundle).

5. **`@jbird/cli` extras:**
   - `package.json` com `"bin": { "jbird": "./src/jbird.ts" }`. Build target em script: `bun build --compile ./src/jbird.ts --outfile dist/jbird`.
   - `src/jbird.ts` com shebang `#!/usr/bin/env bun`. Setup minimo do Commander: `program.name('jbird').description(...).version('0.0.0')`. `program.parse()`. Sem subcomandos ainda — vem em 003.
   - `src/jbird.test.ts` (red gate antes de implementar).

6. **CI** — `.github/workflows/ci.yml`:
   - Triggers: push, PR.
   - Steps: setup-bun, `bun install --frozen-lockfile`, `bun run lint`, `bun run typecheck`, `bun test`, `bun run build`.
   - Matrix: ubuntu-latest, macos-latest.

7. **`.gitignore` update** — ja tem entries gerais; adicionar `dist/` se faltar e confirmar `bun.lockb` esta tracked (commitamos lockfile em monorepo).

### Integracao

- `packages/cli/src/jbird.ts` ja e o entrypoint do binario. Vira router top-level em 003.
- Barrels (`src/index.ts`) ficam vazios em 001 — populados conforme cada package recebe codigo.
- Sem registro de bin global ate Phase 15 (distribution).

### Documentacao a atualizar

- `docs/issues/status.md` — marcar 001 `in_progress` no comeco, `completed` no fim, com bullets do entregue.
- README de cada package: nao em 001. Conforme API publica aparece (002+).
- Spec: nao alterar — issue executa a section 2.2 conforme escrita.

## Arquivos envolvidos

```
package.json
tsconfig.base.json
eslint.config.mjs
.github/workflows/ci.yml
packages/core/package.json
packages/core/tsconfig.json
packages/core/src/index.ts
packages/core/src/index.test.ts
packages/cli/package.json
packages/cli/tsconfig.json
packages/cli/src/jbird.ts
packages/cli/src/jbird.test.ts
packages/proxy/package.json
packages/proxy/tsconfig.json
packages/proxy/src/index.ts
packages/bundle/package.json
packages/bundle/tsconfig.json
packages/bundle/src/index.ts
.gitignore (update se necessario)
```

## Notas de execucao

- TS 7.0 (spec section 2.1/2.11) ainda nao publicado em npm em 2026-05-03 — `npm view typescript` mostra `latest: 6.0.3`. Adotamos TS `^6.0.0` (TS 6 ja embute o compilador Go-rewritten que motivou a escolha da spec). Quando 7.0 sair, bumpar dependency e reabrir gate. Spec section 2.1 nao foi alterada; deviation registrada aqui.
- ESLint usa `strictTypeChecked` + `stylisticTypeChecked` com `projectService` type-aware — alinha com spec section 4.1 ("strict-type-checked").
- `no-console` configurado como `error` no codigo de producao (allow `warn`/`error`) para alinhar com hard rule do code-review-partner.
- Bun 1.3 gera `bun.lock` (text), nao `bun.lockb` (binary). `.gitignore` ignora `bun.lockb` e portanto `bun.lock` e tracked — `bun install --frozen-lockfile` no CI funciona.
- `runCli` helper inline em `jbird.test.ts`; sera extraido pra `shared/test/cli.ts` em 003 conforme planejado.

## Criterio de aceite

- `packages/cli/src/jbird.test.ts` passa: `runCli(['--help'])` retorna stdout com `jbird` e `Usage:`.
- `packages/core/src/index.test.ts` passa: import smoke.
- Universal gates verdes:
  - `bun install` from clean.
  - `bun test` — todos passam.
  - `bunx tsc --noEmit` (root) — zero erros.
  - `bun run lint` — zero erros.
  - `bun run build` — `bun build --compile` produz `dist/jbird` executavel; `proxy`/`bundle` entry compila (mesmo sendo placeholder).
- Sem `any`, sem `console.log` (em codigo de producao — `jbird.ts` usa Commander que escreve direto em stdout/stderr; isso e ok).
- Cobertura: nao aplicavel em 001 (sem logica de Service/puro/Operation; gates de cobertura entram com TDD real em 002+).
- Idempotencia: N/A.
