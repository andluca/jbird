---
description: Onboarding interativo para devs novos no projeto jbird
---

# Onboarding

Instructions: $ARGUMENTS

Guiar dev novo no jbird (CLI pessoal Bun + TS que estende Claude Code).

1. Ler `docs/specification.md` (spec mae) e `.claude/CLAUDE.md`.
2. Ler skills: `jbird-domain`, `jbird-discipline`, `tdd`, `code-review-partner`.
3. Explorar `packages/` (em projeto jovem, referenciar a estrutura projetada na spec section 2.2).
4. Apresentar:
   - **Projeto:** estende capacidade da janela de 5h do Claude Max — nao reduz custo por token. Peer ao Claude Code, nunca host. OAuth pass-through.
   - **Arquitetura hibrida:** multi-command CLI three-layer + plugin bundle declarativo + daemon proxy local.
   - **Quatro packages:** `@jbird/core` (types/schemas dependency-free), `@jbird/cli` (binario), `@jbird/proxy` (Hono :7878), `@jbird/bundle` (skills/hooks/sub-agents/MCPs/regra).
   - **Workflow:** `/spec` → `/break` → `/plan` → `/execute` (com `code-review-partner`). Atalho `/run`. Status em `docs/issues/status.md`. TDD obrigatorio.
   - **Comandos do produto:** `jbird init` (adopt/generate), `jbird tdd`, `jbird audit`, `jbird refactor`. Admin: `services`, `plugins`, `stats`, `config`.
   - **Sub-agentes do bundle:** cavecrew (investigator/builder/reviewer) + tdd (test-writer/refactorer) + project-architect + audit-reporter (quality/security/architecture) + refactor-verifier.
   - **Convencoes:** `bun:test` apenas, Zod pra schemas, Hono pro proxy, Commander pro CLI, ports na fronteira, sem static methods, sem `any`, sem `console.log`, ESM only.
   - **Como rodar:** `bun install`, `bun test`, `bunx tsc --noEmit`, `bun run lint`, `bun run build`. CLI local: `bun run packages/cli/src/jbird.ts <args>`. Proxy isolado: `bun run packages/proxy/src/index.ts`.
5. Responder duvidas no contexto do projeto. Se a duvida ja esta na spec ou skill, citar a section em vez de re-explicar.

Direto e pratico. Objetivo: dev pega uma issue de `docs/issues/`, roda `/plan`, depois `/execute`, e abre commit limpo no mesmo dia.
