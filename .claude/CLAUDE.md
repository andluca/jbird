# jbird (Bun + TypeScript 7.0)

CLI pessoal que estende Claude Code via routing dinamico de modelo, RAG, caveman compression e workflows agenticos. Peer ao Claude Code, nunca host. OAuth pass-through (jbird nao toca credencial).

## Source of Truth

- `docs/specification.md` — spec mae (decisoes arquiteturais, fases, validation gates).
- `docs/specs/{feature}.md` — specs locais por feature.
- `docs/issues/status.md` — estado atual de implementacao.
- Reference: three-layer Command → Operation → Service → Infrastructure (`webdev-bench/docs/terminal/architecture.md`).

## Skills

- `jbird-domain` — deltas e gotchas do dominio (proxy, bundle, caveman, regra). Spec mae cobre o resto.
- `jbird-discipline` — camadas, ports, monorepo, naming.
- `tdd` — Red-Green-Refactor, `.test.ts` vs `.spec.ts`, behavioral assertions.
- `code-review-partner` — checklist de review.

## Stack

Bun, TypeScript 7.0 strict, Hono (proxy), Commander (CLI), Zod (schemas), `bun:test`, Bruno (API tests). Quatro packages: `@jbird/core`, `@jbird/cli`, `@jbird/proxy`, `@jbird/bundle`. ESM only.

## Convencoes

- `kebab-case` arquivos, `PascalCase` classes, `camelCase` vars/metodos, `SCREAMING_SNAKE_CASE` constants.
- Conventional Commits com scope do package: `feat(cli):`, `fix(proxy):`, `refactor(core):`, `chore(bundle):`.
- Schemas Zod sao a fonte do tipo (`z.infer<typeof xSchema>`). Nao duplicar como interface paralela.
- Constructor injection. Funcao exportada em vez de static method.
- Errors via classes de `@jbird/core/errors`. Sem expor stack trace.

## Workflow

- Discutir antes de implementar. Pergunta clarificadora vence assumir.
- TDD: codigo de producao nao entra sem teste falhando primeiro.
- Apos `/execute` ou `/run`, rodar `code-review-partner` no diff. Fix critical antes de marcar `completed`.
- Atualizar `docs/issues/status.md` (Log de Execucao com timestamp + bullets).

## Commands

```bash
bun install
bun test                                 # suite completa
bun test --watch packages/cli/src/...    # TDD watch
bun test --coverage
bunx tsc --noEmit
bun run lint
bun run build
bun run packages/cli/src/jbird.ts <args>
bun run packages/proxy/src/index.ts
```

## Layout projetado

```
packages/{core,cli,proxy,bundle}/
packages/cli/src/
├── jbird.ts                    # router top-level (Commander)
├── commands/                   # init, tdd, audit, refactor + admin (services, plugins, stats, config)
└── shared/{services,models,integrations,test}/

docs/
├── specification.md            # spec mae
├── specs/                      # specs locais
└── issues/                     # status.md + 001-...
```

## Estado runtime

```
~/.jbird/                       config.toml, services/proxy.info, logs/*.log (NDJSON), cache/, stats/
<projeto>/.jbird/config.toml    override do global
<projeto>/.claude/, ~/.claude/  bundle materializado
```

`ANTHROPIC_BASE_URL=http://localhost:7878` no shell profile (oferecido por `jbird init`).

## Ciclo

`/spec` → `/break` → `/plan` → `/execute` → `code-review-partner`. Atalho `/run` = plan+execute. `/onboarding` para devs novos. `/explore` (subagent) para investigar codigo sem alterar.
