# Status do Projeto

Ultima atualizacao: 2026-05-04T03:30:00-03:00

## Spec

`docs/specification.md`

## Issues

- [x] 001-setup-monorepo-skeleton.md - completed
- [x] 002-implement-core-types-and-schemas.md - completed
- [x] 003-implement-cli-scaffolding.md - completed
- [x] 004-implement-configuration-and-state.md - completed
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

Total: 15 | Concluidas: 4 | Em andamento: 0 | Planejadas: 0 | Pendentes: 11 | Falharam: 0

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
- 2026-05-03T20:15:00-03:00 — `/plan 003` concluido. Plano detalhado escrito na issue cobrindo: composition root em `jbird.ts` (instancia deps, registra 8 comandos), routers thin via `register{Cmd}(program, deps)`, operations stub `run{Op}(opts, deps)` que escrevem "not yet implemented" via port `Stdout`, ~60 novos arquivos (commands/{init/scaffold,init/generate,tdd/run,audit/run,refactor/run,services/{start,stop,status,install,logs},plugins/{sync,list},stats/report,config/{get,set,edit}}). Mode A vs Mode B em operations separadas (`scaffold/` adopt + `generate/` Mode B) — leve desvio nominal da spec, alinha SRP. Lint rule de camada via `no-restricted-imports` built-in (sem `eslint-plugin-boundaries`): routers nao importam `shared/{services,integrations}/*` (allowTypeImports nas ports), operations nao importam `commander` nem `shared/integrations/*`. `runCli` promovido pra `shared/test/cli.ts`; `setupTestRepo` deferred pra 004. Exit code `2` pra placeholders (convencao Unix). Status `planned`.
- 2026-05-03T21:00:00-03:00 — `/execute 003` iniciado. 4 decisoes confirmadas com user: (1) exit code 2; (2) duas operations init/scaffold + init/generate; (3) lint via `no-restricted-imports` built-in; (4) port `Stdout` minima, Logger fica pra 004. Status `in_progress`.
- 2026-05-04T08:30:00-03:00 — 003 completed. Entregue:
  - `packages/cli/src/jbird.ts` rewrite: composition root cria `deps = { stdout: createStdout() }` e registra 8 comandos via `register{Cmd}(program, deps)`.
  - 8 routers thin (`commands/{init,tdd,audit,refactor,services,plugins,stats,config}/{cmd}.ts`) — cada um registra subcommand + opcoes da spec, delega pra operation.
  - 13 operations stub (`commands/*/*/{op}.ts`): scaffold, generate, tdd/run, audit/run, refactor/run, services/{start,stop,status,install,logs}, plugins/{sync,list}, stats/report, config/{get,set,edit}. Cada uma com `run{Op}(opts, deps): Promise<void>` + body que escreve "not yet implemented" via `deps.stdout`.
  - Port `Stdout` em `shared/services/ports.ts` (interface so `write(line)`); impl `createStdout()` em `shared/integrations/stdout.ts` que injeta `\n` se ausente.
  - `runCli` promovido de inline pra `packages/cli/src/shared/test/cli.ts` + barrel `shared/test/index.ts`.
  - 13 spec E2E (`commands/*/*/tests/*.spec.ts`): cada operation testa exit code 2 + "not yet implemented" no stdout + `--help` exit 0 com Usage.
  - 8 router unit tests refatorados pra serem 100% behavioral (so dispatch tests; tests de "registers subcommand" e "has --X option" deletados como implementation tests).
  - 13 operation unit tests refatorados pra serem 100% behavioral (tests redundantes "resolves without throwing" deletados).
  - `eslint.config.mjs` com 2 novos blocos de `no-restricted-imports`: routers nao importam `shared/{services,integrations}/*` (allowTypeImports nas ports); operations nao importam `commander` nem `shared/integrations/*`.
  - Gates: bun test (177 pass, 224 expects), tsc --noEmit (0 erros), bun run lint (0 erros), bun run build (todos packages ok), `./packages/cli/dist/jbird --help` lista os 8 comandos.
  - Code-review-partner: implementation tests detectados pos-execute (8 routers com `toBeDefined` + 13 operations com `resolves without throwing` redundante) e cleanup feito; 1 lint error (`no-unnecessary-type-assertion` em stdout.test.ts) resolvido. 0 criticals remanescentes.
- 2026-05-03T22:00:00-03:00 — `/plan 004` concluido. Plano detalhado escrito na issue cobrindo: 4 ports novas (`Fs`, `Toml`, `Editor`, `Clock`) + reuse `Logger`; 5 integrations concretas (nodeFs, smol-toml adapter com snake↔camel translation, editor via Bun.spawn TTY-inherit, systemClock, consoleLogger via stderr); 4 services novos (`StateDir` bootstrap 0o700, `ConfigLoader` global+project deep merge, `ConfigWriter` set+chmod 0o600, `JournalWriter` NDJSON append); helpers puros (`deepMerge`, `setAtPath`, `getAtPath`, case translation); operations reescritas substituindo stubs; router ganha `--global` flag em set/edit. Ordem TDD em 7 rounds (helpers → StateDir → ConfigLoader → ConfigWriter → JournalWriter → operations unit → spec E2E). 10 decisoes flagged a alinhar antes de codar (TOML lib, bundle.version default vs required, granularidade do merge, formato `config get`, semantica `set` partial config, `--global` flag scope, file vs dir permissions, editor fallback, comment preservation, journal rotation). Status `planned`.
- 2026-05-04T03:30:00-03:00 — 004 completed. Entregue:
  - `packages/core/src/version.ts`: constante `JBIRD_VERSION = "0.0.0"` exportada via barrel `@jbird/core`.
  - `packages/cli/package.json`: dep `smol-toml` adicionada.
  - Ports em `shared/services/ports.ts`: `Fs`, `Toml`, `Editor`, `Clock` (+ `Stdout` preexistente).
  - Integrations: `fs.ts` (Bun.file + node:fs/promises), `toml.ts` (smol-toml + snake↔camel key translation), `editor.ts` ($VISUAL → $EDITOR → vi, Bun.spawn TTY-inherit), `clock.ts` (systemClock), `logger.ts` (consoleLogger via stderr, sem console.log, child() com bindings merge).
  - Helpers puros em `shared/services/helpers.ts`: `toCamelCase`, `toSnakeCase`, `getAtPath`, `setAtPath` (com coerce string→number/boolean), `deepMerge` (plain objects merge key-by-key, arrays replace). 26 testes.
  - `StateDir`: ensureGlobal() cria `~/.jbird/{logs,services,cache,stats}/` a 0700; ensureProject() cria `<cwd>/.jbird/` a 0700. 8 testes.
  - `ConfigLoader`: loadGlobal() (defaults via JBIRD_VERSION quando ausente), loadProject() (partial schema + keepOnlyPresentKeys para nao vazar defaults), load() (deep merge global+project). 11 testes.
  - `ConfigWriter`: setGlobal/setProject — load base, setAtPath com coerce, validate full schema, write TOML a 0600. 9 testes.
  - `JournalWriter`: append() — valida via journalEventSchema.parse(), serializa NDJSON, cria dir pai, append-only. 5 testes.
  - Operations reescritas (stubs substituidos): `runConfigGet` (getAtPath + valueToString), `runConfigSet` (stateDir + configWriter), `runConfigEdit` (stateDir + editor + configLoader validate). Unit tests: 6+5+4 testes. E2E specs: 5+5+3 testes com setupTestRepo() isolando HOME.
  - Composition root `jbird.ts` instancia todos os services + injeta em deps.
  - `setupTestRepo()` em `shared/test/`: cria tempdir, overrides HOME/USERPROFILE, retorna cleanup(). Usado nos E2E specs.
  - Gates: bun test (252 pass), tsc --noEmit (0 erros), bun run lint (0 erros), bun run build (ok), bun test --coverage (services 100%, helpers 100%, operations >=90%).
  - Code-review-partner: 0 criticals. Warnings: JournalWriter._clock reservado (ISP — documentado, clock presente nos testes); edge de `config edit --global` default=true vs `set` default=false (assimetria intencional, edit abre um arquivo unico); eslint-disable em editor.ts (empty-string env fallback semantica).

## Notas

- Quebra excede o teto de 10 issues do `/break` porque a spec mae tem 15 phases ordenadas e a quebra 1:1 mantem a referencia clara entre spec section 5 e issues. Sub-divisao em sub-specs nao agrega — phases ja sao a unidade atomica do plano.
- Issues 009 e 010 (init Mode A e Mode B) podem ser fundidas em uma se Mode B se mostrar marginal apos implementar Mode A. Reavaliar ao iniciar 010.
- Issue 015 (distribution) bloqueia publish mas nao bloqueia uso local — pode rodar local desde 009 completar.
- FOLLOW-UP (de 002): `jbird-discipline` skill nao documenta SOLID/clean architecture explicitamente. Ja pratica DIP (ports), SRP (um arquivo por responsabilidade), mas sem mencao explicita aos principios. Abrir issue/task separada pra extender a skill documentando SOLID mapping ao projeto.
