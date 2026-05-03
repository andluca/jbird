# Status do Projeto

Ultima atualizacao: 2026-05-03T19:30:00-03:00

## Spec

`docs/specification.md`

## Issues

- [x] 001-setup-monorepo-skeleton.md - completed
- [x] 002-implement-core-types-and-schemas.md - completed
- [ ] 003-implement-cli-scaffolding.md - pending
- [ ] 004-implement-configuration-and-state.md - pending
- [ ] 005-implement-proxy-passthrough-daemon.md - pending
- [ ] 006-implement-service-supervision.md - pending
- [ ] 007-implement-routing-policy-and-providers.md - pending
- [ ] 008-implement-bundle-materialization.md - pending
- [ ] 009-implement-init-mode-a-adopt.md - pending
- [ ] 010-implement-init-mode-b-generate.md - pending
- [ ] 011-implement-tdd-command.md - pending
- [ ] 012-implement-audit-command.md - pending
- [ ] 013-implement-refactor-command.md - pending
- [ ] 014-implement-stats-command.md - pending
- [ ] 015-distribution-and-install.md - pending

## Resumo

Total: 15 | Concluidas: 2 | Em andamento: 0 | Planejadas: 0 | Pendentes: 13 | Falharam: 0

## Dependencias

```
001 → 002 → 003
            ↓
            004 → 005 → 006 → 007 → 014
            ↓     ↓     ↓     ↓
            └─────┴─────┴─────┘
                            008
                            ↓
                            009 → 010
                                  011 → 013
                                  012
                                            ↓
                                            015
```

Phases 1-8 (issues 001-008) sao infraestrutura. Phases 9-14 (issues 009-014) sao features user-facing. Phase 15 (issue 015) fecha v1.

## Log de Execucao

- 2026-05-03T15:45:00-03:00 — `/break` da spec mae produziu 15 issues. Mapping 1:1 com phases da spec section 5. Status inicial pending.
- 2026-05-03T16:10:00-03:00 — `/run 001` iniciado. Plano escrito na issue. Status `in_progress`.
- 2026-05-03T16:50:00-03:00 — 001 completed. Entregue:
  - Workspaces + 4 packages (`core`, `cli`, `proxy`, `bundle`) com `package.json`, `tsconfig.json`, `src/index.ts` placeholders.
  - `tsconfig.base.json` strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `isolatedModules`, `noEmit`).
  - ESLint v9 flat config com `strictTypeChecked` + `stylisticTypeChecked` type-aware, ban `any`, `no-console` error.
  - CI GitHub Actions matrix ubuntu+macos rodando lint/typecheck/test/build.
  - Binario `jbird` minimo via Commander (printa help + version). `bun build --compile` produz `dist/jbird` standalone.
  - 3 testes verdes (cli help, cli version, core barrel smoke).
  - Gates: `bun install`, `bun test`, `tsc --noEmit`, `bun run lint`, `bun run build` — todos zero-erro.
  - Code-review-partner: 2 critical resolvidos (ESLint `strictTypeChecked` + `no-console: error`); TS 7.0 → TS 6.0.3 documentado nas notas (TS 7 ainda nao publicado).
- 2026-05-03T17:15:00-03:00 — `/plan 002` concluido. Plano detalhado escrito na issue cobrindo: estrutura `packages/core/src/{schemas,errors,logger,types}/`, schemas Zod (primitives, routing, config, journal, ipc, bundle-manifest), 5 classes de erro + base `JbirdError`, interface `Logger`. Ordem TDD em 9 rounds (primitives → routing → config → journal → ipc → bundle-manifest → errors → logger → barrel). 4 decisoes flagged pra alinhamento (shape do `match` em routing rules, fechamento do enum `injectDirective`, granularidade do `upstreamChunkSchema`, versao major do Zod). Criterio: round-trip em todos schemas, 100% tipos publicos exportados, dep runtime so Zod. Status `planned`.
- 2026-05-03T18:00:00-03:00 — `/execute 002` iniciado. Status `in_progress`.
- 2026-05-03T19:30:00-03:00 — 002 completed. Entregue:
  - `packages/core/package.json` atualizado: dep runtime `zod@^4.4.0` adicionada.
  - `packages/core/src/schemas/primitives.ts` + test: semverSchema, portSchema, pathSchema, isoTimestampSchema (Zod 4 z.iso.datetime()), sha256Schema. 23 tests.
  - `packages/core/src/schemas/routing.ts` + test: modelIdSchema, providerIdSchema, modelMetaSchema, normalizedRequestSchema, upstreamRequestSchema, upstreamChunkSchema (opaco { raw: string }), usageSchema, classificationSchema, routingReasonSchema, injectDirectiveSchema (enum fechado), routingDecisionSchema. 13 tests.
  - `packages/core/src/schemas/config.ts` + test: proxyServiceConfigSchema, servicesConfigSchema, routingRuleMatchSchema (.refine >= 1 chave), routingRuleSchema, routingConfigSchema, bundleConfigSchema, coreConfigSchema (.strict() + defaults via factory). 14 tests. Constant DEFAULT_PROXY_PORT = 7878.
  - `packages/core/src/schemas/journal.ts` + test: discriminated union routing-decision | command-invocation | materialization | service-lifecycle. 9 tests.
  - `packages/core/src/schemas/ipc.ts` + test: errorBodySchema, clientVersionHeaderSchema, healthRequestSchema, healthResponseSchema. 10 tests.
  - `packages/core/src/schemas/bundle-manifest.ts` + test: bundleEntryKindSchema, bundleEntrySchema, bundleManifestSchema, managedManifestSchema. 9 tests.
  - `packages/core/src/schemas/index.ts`: barrel de todos os schemas + DEFAULT_PROXY_PORT.
  - `packages/core/src/errors/jbird-error.ts` + config/bundle/proxy/service-lifecycle/ipc errors + barrel + test. 24 tests.
  - `packages/core/src/logger/logger.ts` (interface Logger + LogLevel + LogFields como Record) + barrel + test. 3 tests.
  - `packages/core/src/types/index.ts`: todos z.infer<> types (24 tipos publicos).
  - `packages/core/src/index.ts`: barrel publico completo (erros, logger, schemas, tipos + DEFAULT_PROXY_PORT).
  - `packages/core/src/index.test.ts`: imports exaustivos de todos schemas e tipos + type assertions em funcao _typeAssertions().
  - Gates: bun test (111 pass), tsc --noEmit (0 erros), bun run lint (0 erros), bun run build (todos packages ok), bun test --coverage (100% lines).
  - Code-review-partner: 0 criticals. Warnings resolvidos: (1) tipos/index.ts unificado para importar de schemas/index barrel (removendo import direto de routing.ts); (2) magic value 7878 extraido para DEFAULT_PROXY_PORT exportado. Follow-up: jbird-discipline skill nao documenta SOLID explicitamente — registrado nas Notas.

## Notas

- Quebra excede o teto de 10 issues do `/break` porque a spec mae tem 15 phases ordenadas e a quebra 1:1 mantem a referencia clara entre spec section 5 e issues. Sub-divisao em sub-specs nao agrega — phases ja sao a unidade atomica do plano.
- Issues 009 e 010 (init Mode A e Mode B) podem ser fundidas em uma se Mode B se mostrar marginal apos implementar Mode A. Reavaliar ao iniciar 010.
- Issue 015 (distribution) bloqueia publish mas nao bloqueia uso local — pode rodar local desde 009 completar.
- FOLLOW-UP (de 002): `jbird-discipline` skill nao documenta SOLID/clean architecture explicitamente. Ja pratica DIP (ports), SRP (um arquivo por responsabilidade), mas sem mencao explicita aos principios. Abrir issue/task separada pra extender a skill documentando SOLID mapping ao projeto.
