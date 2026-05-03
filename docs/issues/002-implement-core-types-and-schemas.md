# 002 — Implement core types and schemas

## Overview

Implementar `@jbird/core`: todos os tipos compartilhados (`ModelId`, `ModelMeta`, `RoutingDecision`, `Classification`, `NormalizedRequest`, `UpstreamRequest`, `Usage`, etc), todos os schemas Zod (config TOML, journal events, IPC requests/responses, bundle manifest), `Logger` interface, classes de erro (`ConfigError`, `BundleError`, `ProxyError`, `ServiceLifecycleError`, `IpcError`).

Referencia: spec sections 2.6, 2.7, 2.9 + Phase 2.

Criterio de aceite (high-level): round-trip test em todos os schemas (parse → serialize → parse equals input), 100% dos tipos publicos exportados de `packages/core/src/index.ts`, dependency-free runtime.

Depende de: 001.

## Contexto

### O que ja existe

- `packages/core/package.json` — `@jbird/core@0.0.0`, `type: module`, `main: ./src/index.ts`, scripts `build` (`tsc --noEmit`) e `test` (`bun test`). Sem deps.
- `packages/core/tsconfig.json` — extende `tsconfig.base.json`, `rootDir: ./src`.
- `packages/core/src/index.ts` — `export {};` placeholder.
- `packages/core/src/index.test.ts` — smoke import (mantido).
- Root `tsconfig.base.json` — strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` + `verbatimModuleSyntax` + `isolatedModules` + `noEmit`.
- Root `eslint.config.mjs` — `strictTypeChecked` + `stylisticTypeChecked` type-aware, `no-explicit-any: error`, `no-console: error`.
- Bun workspaces ativos. `bun:test` disponivel global.

### Referencia na spec

- **Section 2.6** (Configuration & State) — TOML schema com `[services]`, `[routing]`, `[[routing.rules]]`, `[bundle]`. Match clauses (`token_estimate_lt`, `contains_any`). `default_model`, `provider`, `model`, `version`, `profile`.
- **Section 2.7** (API Routing Proxy & Provider Abstraction) — interface `ModelProvider` com `id`, `models` (`ReadonlyArray<ModelMeta>`), metodos `classify`, `select`, `transform`, `forward`, `estimateUsageWeight`. Tipos `NormalizedRequest`, `Classification`, `ModelId`, `UpstreamRequest`, `UpstreamChunk`, `RoutingPolicy`, `Usage`, `RoutingDecision` (com `inject_directives: ReadonlyArray<string>`).
- **Section 2.9** (IPC) — localhost HTTP, JSON request/response, NDJSON streaming, header `X-Jbird-Client-Version`, error envelope `{ error: { code, message, details? } }`. Schemas Zod em ambas pontas.
- **Section 3.1.1** (Dynamic Model Routing) — `RoutingDecision` carrega `chosen provider, chosen model, reason code, list of inject_directives, original requested model`. Header opt-out `X-Jbird-Route: passthrough`.
- **Section 3.1.5** (Observability) — NDJSON journals em `~/.jbird/logs/`. Events: routing decision (proxy), command invocation, materialization, service lifecycle (cli).
- **Section 2.5** (Bundle) — `manifest.json` lista MCPs, hooks, skills, sub-agents, rules, slash-commands, settings. Cada target dir tem `.jbird-managed` manifest dos arquivos owned (escrito pelo `BundleMaterializer`, schema vive em core).
- **Phase 2 gate (section 4.2)** — round-trip em todos schemas, 100% public types exportados, dependency-free runtime.

### Decisoes ja tomadas que afetam essa issue

- **Zod e fonte de tipo.** `type X = z.infer<typeof xSchema>` — sem interface paralela (jbird-discipline).
- **`@jbird/core` e dependency-free runtime, exceto Zod.** Adicionar Zod como unica runtime dep do package. Sem `@types/*` que tenha runtime, sem `dotenv`, sem nada mais.
- **Errors via classes em `@jbird/core/errors`** com `code` discriminator + `details?` opcional. Sem expor stack pra user.
- **Logger e interface, nao classe.** Implementacao concreta vive em `@jbird/cli/shared/integrations/` (vem em issue 004).
- **`ModelId` e `'opus' | 'sonnet' | 'haiku'`** literal union em v1 (spec section 1 diz "v1 works exclusively with Anthropic models"). Provider id e `'anthropic' | 'qwen' | string` (section 2.7) — string-aberto, mas v1 fixa `'anthropic'`.
- **Routing rule match clauses sao open-ended em v1** (spec exemplo lista `token_estimate_lt` e `contains_any`; nao enumera o resto). Modelar como discriminated union extensible com `z.discriminatedUnion('kind', ...)` cobrindo o subconjunto v1: `token-estimate-lt`, `token-estimate-gte`, `contains-any`, `is-subagent`, `has-retrieved-context`. Documentar no schema que outras clauses voltarao falsy ate serem implementadas.
- **TOML parsing e responsabilidade do consumer (issue 004).** Core so define os schemas Zod que rodam apos parse — input e o objeto JS que veio do TOML.
- **Round-trip** = `schema.parse(schema.parse(input))` igual ao primeiro parse, e `JSON.parse(JSON.stringify(parsed))` re-parsa identico. Nao testamos TOML ↔ JS aqui (issue 004).

## Plano

### Schemas e tipos (@jbird/core)

Estrutura proposta:

```
packages/core/src/
├── index.ts                                  # barrel publico
├── errors/
│   ├── index.ts                              # re-exporta tudo
│   ├── jbird-error.ts                        # base class
│   ├── config-error.ts
│   ├── bundle-error.ts
│   ├── proxy-error.ts
│   ├── service-lifecycle-error.ts
│   └── ipc-error.ts
├── logger/
│   ├── index.ts
│   └── logger.ts                             # interface Logger + LogLevel
├── schemas/
│   ├── index.ts
│   ├── config.ts                             # CoreConfig, ServicesConfig, RoutingConfig, RoutingRule (discriminated union de Match), BundleSection
│   ├── routing.ts                            # ModelId, ProviderId, ModelMeta, NormalizedRequest, UpstreamRequest, UpstreamChunk, Classification, Usage, RoutingDecision, InjectDirective, RoutingReason
│   ├── journal.ts                            # JournalEvent (discriminated union): routing-decision, command-invocation, materialization, service-lifecycle
│   ├── ipc.ts                                # IPC envelope: HealthRequest/Response, ProxyControlRequest/Response, ErrorBody
│   ├── bundle-manifest.ts                    # BundleManifest (top-level), BundleEntry, ManagedManifest (.jbird-managed file content)
│   └── primitives.ts                         # versionSchema (semver), portSchema (1-65535), pathSchema, isoTimestampSchema, sha256Schema
└── types/
    └── index.ts                              # re-export de z.infer<...> tipos publicos
```

Por que separar `schemas/` e `types/`:
- Schemas vivem por feature; tipos sao apenas `z.infer` re-exports agrupados pra tornar o consumer pattern `import type { RoutingDecision } from '@jbird/core'` clean.
- Single source of truth — nao redeclaramos interfaces.

Por que `primitives.ts`:
- Reuso entre schemas (semver em config + manifest, port em config + IPC, sha256 em manifest + journal, ISO timestamp em todos os journal events).
- Testar uma vez, importar em todos.

### Detalhamento dos schemas

**`primitives.ts`:**
- `semverSchema` — `z.string().regex(/^\d+\.\d+\.\d+(?:-[\w.]+)?$/)`.
- `portSchema` — `z.number().int().min(1).max(65535)`.
- `pathSchema` — `z.string().min(1)` (validacao de FS fica em `cli`; aqui so garantimos non-empty).
- `isoTimestampSchema` — `z.string().datetime()`.
- `sha256Schema` — `z.string().regex(/^sha256:[0-9a-f]{64}$/)`.

**`routing.ts`:**
- `modelIdSchema` — `z.enum(['opus', 'sonnet', 'haiku'])`.
- `providerIdSchema` — `z.string().min(1)` (string-aberto pra v2; v1 sempre `'anthropic'`).
- `modelMetaSchema` — `{ id: ModelId, providerId: ProviderId, displayName: string, contextWindow: number, supportsThinking: boolean }`.
- `normalizedRequestSchema` — subset Anthropic Messages API normalizado: `{ messages: Array<{ role, content }>, system?: string, tools?: Array<...>, model: string (originalRequested), metadata?: { isSubagent?: boolean, hasRetrievedContext?: boolean }, headers: Record<string, string> }`. Apenas o que `RoutingPolicy` consome (estimar tokens, detectar keywords, ler header passthrough). Nao precisamos schema completo do Anthropic API aqui.
- `upstreamRequestSchema` — `{ url: string, method: 'POST', headers: Record<string,string>, body: unknown }`. (corpo nao validado em depth — passa pro provider).
- `upstreamChunkSchema` — `{ raw: string }` (SSE event line) ou tipo opaco pra streaming.
- `usageSchema` — `{ inputTokens: number, outputTokens: number, cacheCreationInputTokens?: number, cacheReadInputTokens?: number }`.
- `classificationSchema` — `{ tokenEstimate: number, hasArchitecturalKeywords: boolean, hasRetrievedContext: boolean, isSubagent: boolean, toolUseDensity: number }`.
- `routingReasonSchema` — `z.enum(['subagent-downgrade', 'small-prompt-haiku', 'architectural-keywords-opus', 'rag-context-haiku', 'default-sonnet', 'config-rule-match', 'passthrough-header'])`.
- `injectDirectiveSchema` — `z.enum(['use-sequential-thinking-mcp'])` (open-ended via `.or(z.string())` se precisar — mas em v1 limitar pro discriminator funcionar em journal).
- `routingDecisionSchema` — `{ chosenProviderId: ProviderId, chosenModel: ModelId, originalRequestedModel: string, reason: RoutingReason, injectDirectives: ReadonlyArray<InjectDirective>, decidedAt: ISOTimestamp }`.

**`config.ts`:**
- `servicesConfigSchema` — `{ proxy: { autostart: boolean, port: portSchema } }`. Defaults: `autostart: true, port: 7878`.
- `matchClauseSchema` — `z.discriminatedUnion('kind', [...])`:
  - `{ kind: 'token-estimate-lt', value: number }`
  - `{ kind: 'token-estimate-gte', value: number }`
  - `{ kind: 'contains-any', terms: ReadonlyArray<string> }`
  - `{ kind: 'is-subagent', value: boolean }`
  - `{ kind: 'has-retrieved-context', value: boolean }`
- `routingRuleSchema` — `{ match: matchClauseSchema (ou intersection AND de varias), provider: ProviderId, model: ModelId }`. Decisao: rule tem **uma** match clause ou um array (AND-ed)? Spec exemplo TOML mostra `match = { token_estimate_lt = 500 }` como objeto, sugerindo que cada `[[routing.rules]]` tem o que o exemplo TOML expressa diretamente. Modelar `match` como **objeto com chaves opcionais** (todas AND-ed) em vez de array — alinha melhor com o TOML idiomatico:
  - `{ tokenEstimateLt?: number, tokenEstimateGte?: number, containsAny?: ReadonlyArray<string>, isSubagent?: boolean, hasRetrievedContext?: boolean }`. Com `.refine` que pelo menos uma chave esteja definida.
  - Esta decisao desvia do `matchClauseSchema` discriminado acima — flag pra discutir abaixo.
- `routingConfigSchema` — `{ defaultModel: ModelId, rules: ReadonlyArray<routingRuleSchema> }`. Defaults: `defaultModel: 'sonnet'`, `rules: []`.
- `bundleConfigSchema` — `{ version: semverSchema, profile: z.string().min(1).default('default') }`.
- `coreConfigSchema` — `z.object({ services: servicesConfigSchema, routing: routingConfigSchema, bundle: bundleConfigSchema }).strict()`. Strict mode pra rejeitar TOML keys nao-reconhecidas (sinaliza typo do user).

Nota importante sobre **snake_case vs camelCase**: TOML do user usa `snake_case` (section 2.6: `default_model`, `token_estimate_lt`). Mas TS usa `camelCase` (jbird-discipline). Solucao: schemas falam camelCase; conversao snake↔camel acontece no loader TOML (issue 004). Manter core schemas em camelCase. Documentar isso no `config.ts`.

**`journal.ts`:**

Discriminated union em `kind`:
- `{ kind: 'routing-decision', timestamp, decision: RoutingDecision, classification: Classification, latencyMs: number, requestId: string }`
- `{ kind: 'command-invocation', timestamp, command: string, args: ReadonlyArray<string>, exitCode: number, durationMs: number }`
- `{ kind: 'materialization', timestamp, target: 'global' | 'project', changes: ReadonlyArray<{ path, action: 'create' | 'update' | 'skip' | 'delete' }> }`
- `{ kind: 'service-lifecycle', timestamp, service: 'proxy', action: 'start' | 'stop' | 'crash-detected' | 'restart', pid?: number, version?: string }`

`journalEventSchema = z.discriminatedUnion('kind', [...])`.

**`ipc.ts`:**
- `clientVersionHeaderSchema` — `z.string().regex(semver)`.
- `errorBodySchema` — `{ error: { code: string, message: string, details?: z.unknown() } }`.
- `healthRequestSchema` — `z.object({}).strict()` (vazio).
- `healthResponseSchema` — `{ ok: boolean, version: semverSchema, port: portSchema, startedAt: isoTimestampSchema, pid: z.number().int().positive() }`.
- (Outros endpoints concretos viram em phases posteriores — em 002 cobrimos health + error envelope. Schema do request body do proxy upstream nao e IPC; e formato Anthropic e nao validamos.)

**`bundle-manifest.ts`:**

Bundle ships em `packages/bundle/src/manifest.json`. Cada entry descreve uma materializacao.

- `bundleEntryKindSchema` — `z.enum(['mcp', 'hook', 'skill', 'subagent', 'rule', 'slash-command', 'settings-fragment'])`.
- `bundleEntrySchema` — `{ kind, source: pathSchema (relativo ao bundle root), target: { scope: 'global' | 'project', path: pathSchema (relativo ao .claude/) }, sha256: sha256Schema, version: semverSchema }`.
- `bundleManifestSchema` — `{ version: semverSchema, entries: ReadonlyArray<bundleEntrySchema> }`.
- `managedManifestSchema` — schema do `.jbird-managed` que vive em cada `.claude/` materializado: `{ version: semverSchema, files: ReadonlyArray<{ path, sha256, kind: bundleEntryKindSchema }>, writtenAt: isoTimestampSchema }`.

### Errors

Base class:

```ts
export abstract class JbirdError extends Error {
  abstract readonly code: string;
  constructor(message: string, public readonly details?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
  }
  toJSON(): { code: string; message: string; details?: Record<string, unknown> } { ... }
}
```

Subclasses (cada uma fixa `code`):
- `ConfigError` — `code: 'config'`. Subcategoria via `details.kind`: `'parse-failed' | 'validation-failed' | 'not-found' | 'override-conflict'`.
- `BundleError` — `code: 'bundle'`. Subcategoria: `'manifest-invalid' | 'source-missing' | 'target-outside-managed' | 'hash-mismatch'`.
- `ProxyError` — `code: 'proxy'`. Subcategoria: `'upstream-unreachable' | 'invalid-request' | 'streaming-aborted' | 'auth-missing'`.
- `ServiceLifecycleError` — `code: 'service-lifecycle'`. Subcategoria: `'spawn-failed' | 'health-check-timeout' | 'orphan-info-file' | 'already-running' | 'not-running'`.
- `IpcError` — `code: 'ipc'`. Subcategoria: `'version-mismatch' | 'schema-validation' | 'transport'`.

`toJSON()` produz `{ code, message, details? }` — alinha com `errorBodySchema` em `ipc.ts`. Nao expoe stack.

### Logger

```ts
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export interface LogFields { readonly [key: string]: unknown }
export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
  child(bindings: LogFields): Logger;
}
```

Sem implementacao concreta em core (vem em 004 com NDJSON file logger). Apenas o contrato.

### Ports e integrations

N/A em 002. Core e dependency-free; nao define ports concretas (ports vivem em `cli`, `proxy`, `bundle`).

### Testes (escrever primeiro)

Ordem TDD — cada bloco e Red → Green → Refactor antes do proximo.

**Round 1 — primitives** (`packages/core/src/schemas/primitives.test.ts`):
- `describe('semverSchema')` — accepts `'1.2.3'`, `'0.0.0'`, `'1.2.3-beta.1'`; rejects `'1.2'`, `''`, `'foo'`.
- `describe('portSchema')` — accepts `7878`, `1`, `65535`; rejects `0`, `65536`, `-1`, `1.5`, `'7878'`.
- `describe('isoTimestampSchema')` — accepts `'2026-05-03T12:00:00.000Z'`; rejects `'2026-05-03'`, `'now'`.
- `describe('sha256Schema')` — accepts `'sha256:' + 'a'.repeat(64)`; rejects sem prefix, hex curto, uppercase.

**Round 2 — routing** (`packages/core/src/schemas/routing.test.ts`):
- `modelIdSchema` aceita `'opus'|'sonnet'|'haiku'`, rejeita `'gpt-4'`.
- `routingDecisionSchema` round-trip — fixture com decisao Sonnet + injectDirective `'use-sequential-thinking-mcp'`. Parse → JSON.stringify → JSON.parse → parse de novo, assert deep equal.
- `routingDecisionSchema` round-trip — decisao Opus com `injectDirectives: []` (nao injeta em Opus, invariante do dominio — schema permite mas garantimos no fixture).
- `classificationSchema` — fixture realistic, round-trip.
- `usageSchema` — round-trip, campos opcionais ausentes.

**Round 3 — config** (`packages/core/src/schemas/config.test.ts`):
- `coreConfigSchema` happy path — fixture do exemplo da spec section 2.6 (camelCase): `{ services: { proxy: { autostart: true, port: 7878 } }, routing: { defaultModel: 'sonnet', rules: [...] }, bundle: { version: '0.1.0', profile: 'default' } }`. Round-trip.
- Defaults aplicam — input minimo `{ bundle: { version: '0.1.0' } }` produz config completo? Decisao: schemas tem `.default(...)` em campos opcionais para que parse de input parcial seja robusto. Test isso explicitamente.
- Strict mode rejeita keys desconhecidas — `{ services: {...}, foo: 'bar' }` falha.
- `routingRuleSchema.match` exige pelo menos uma chave — `{ match: {}, provider: 'anthropic', model: 'haiku' }` falha com erro claro.
- `routingRuleSchema.match` aceita combinacao — `{ tokenEstimateLt: 500, containsAny: ['refactor'] }` parse ok.
- `matchClauseSchema` (se mantermos a versao discriminada como helper) — accept cada kind, reject kind desconhecido.

**Round 4 — journal** (`packages/core/src/schemas/journal.test.ts`):
- Round-trip de cada variante do discriminated union.
- `journalEventSchema` rejeita `kind` desconhecido.
- NDJSON stringify-then-parse mantem identidade (cada event e self-contained — JSON serializavel sem perda).

**Round 5 — ipc** (`packages/core/src/schemas/ipc.test.ts`):
- `errorBodySchema` round-trip com e sem `details`.
- `healthResponseSchema` round-trip.
- `errorBodySchema` produzido a partir de `JbirdError.toJSON()` parse com sucesso (cross-test entre errors e ipc).

**Round 6 — bundle manifest** (`packages/core/src/schemas/bundle-manifest.test.ts`):
- `bundleManifestSchema` round-trip com 0 entries, 1 entry, multiplos kinds.
- `managedManifestSchema` round-trip.
- Rejeita sha256 invalido.
- Rejeita `target.scope` fora de `'global' | 'project'`.

**Round 7 — errors** (`packages/core/src/errors/errors.test.ts`):
- Cada subclass instancia, `code` correto, `name` igual ao class name.
- `toJSON()` produz `{ code, message, details? }` sem `stack`.
- `toJSON()` resultado parse contra `errorBodySchema` (se envelopado em `{ error: ... }`).
- `instanceof Error` ainda true (TypeScript subclass quirk — testar pra evitar regressao).

**Round 8 — logger** (`packages/core/src/logger/logger.test.ts`):
- Apenas test de contrato/tipo. Implementar fake `Logger` em-line, verificar que satisfaz a interface (compilar). Sem comportamento. Pode ser apenas um `expectTypeOf` style smoke test ou um teste vazio com import — o real eh ter o tipo exportado e o `tsc --noEmit` validar.

**Round 9 — barrel (`packages/core/src/index.test.ts`)**:
- Manter o smoke existente.
- Adicionar: import nominal de **cada tipo publico** (`ModelId`, `RoutingDecision`, `Classification`, `NormalizedRequest`, `UpstreamRequest`, `Usage`, `CoreConfig`, `RoutingRule`, `JournalEvent`, `BundleManifest`, `ManagedManifest`, `HealthResponse`, `ErrorBody`, `Logger`, `LogLevel`, `JbirdError`, `ConfigError`, `BundleError`, `ProxyError`, `ServiceLifecycleError`, `IpcError`) e cada schema (`*Schema`) — verifica que estao exportados. Falha de exportacao quebra o test no compile.

Cobertura esperada: **>=95% em schemas/primitives** (puros), **100% em errors** (4-5 linhas por classe), **>=95% em schemas/* round-trips**. Logger e interface (sem cobertura aplicavel).

### Implementacao

Ordem (cada passo: Red → Green → Refactor):

1. **Adicionar Zod ao `@jbird/core/package.json`** — `dependencies: { zod: '^4.0.0' }` (ou ultima major estavel disponivel; checar `bun pm view zod` antes). Rodar `bun install`.
2. **`schemas/primitives.ts`** — schemas puros + tests.
3. **`schemas/routing.ts`** — depende de primitives. Tests round-trip.
4. **`schemas/config.ts`** — depende de routing (`ModelId`, `ProviderId`) + primitives. Tests + decisao do `match` shape (ver "Decisoes a discutir").
5. **`schemas/journal.ts`** — depende de routing + primitives. Tests.
6. **`schemas/ipc.ts`** — depende de primitives. Tests.
7. **`schemas/bundle-manifest.ts`** — depende de primitives. Tests.
8. **`schemas/index.ts`** — barrel re-exporta os schemas + tipos `z.infer`.
9. **`errors/jbird-error.ts`** — base class. Test do `toJSON()`.
10. **`errors/{config,bundle,proxy,service-lifecycle,ipc}-error.ts`** — subclasses. Tests.
11. **`errors/index.ts`** — barrel.
12. **`logger/logger.ts`** — interface + `LogLevel`.
13. **`logger/index.ts`** — barrel.
14. **`types/index.ts`** — agrupa todos os `z.infer` re-exports + tipos da Logger.
15. **`packages/core/src/index.ts`** — re-exporta `errors`, `logger`, `schemas`, `types`. Garantir que apenas `schemas/*Schema` e `types/*` saem como named exports do barrel publico (sem leaks de helpers internos).
16. **Atualizar smoke test (`index.test.ts`)** com lista exaustiva de imports nomeados.

### Integracao

- `packages/core/src/index.ts` — barrel publico: `export * from './errors'; export * from './logger'; export * from './schemas'; export type * from './types'`.
- Outros packages (cli, proxy, bundle) ainda nao importam de core nesta issue — fazem isso a partir de 003+. Verificar via grep que `@jbird/core` ainda nao e importado em nenhum lugar em 002 (so o smoke test).
- Sem alteracao em `package.json` root (zod entra no package core, nao no root).

### Documentacao a atualizar

- `docs/issues/status.md` — marcar 002 `in_progress` no comeco, `completed` no fim, log entry com bullets do entregue e timestamps.
- README do `@jbird/core` — **nao** criar nesta issue (CLAUDE.md do projeto desencoraja markdown novo a menos que pedido). Documentacao da API publica vive nos JSDoc dos schemas/tipos exportados.
- Spec — nao alterar. 002 executa sections 2.6, 2.7, 2.9 conforme escritas.
- Skill `jbird-discipline` — nao alterar. A convencao "Zod e fonte de tipo" ja esta documentada.

## Arquivos envolvidos

```
packages/core/package.json                               (update: + zod dep)
packages/core/src/index.ts                               (rewrite: barrel publico)
packages/core/src/index.test.ts                          (extend: imports exaustivos)
packages/core/src/schemas/index.ts                       (new)
packages/core/src/schemas/primitives.ts                  (new)
packages/core/src/schemas/primitives.test.ts             (new)
packages/core/src/schemas/routing.ts                     (new)
packages/core/src/schemas/routing.test.ts                (new)
packages/core/src/schemas/config.ts                      (new)
packages/core/src/schemas/config.test.ts                 (new)
packages/core/src/schemas/journal.ts                     (new)
packages/core/src/schemas/journal.test.ts                (new)
packages/core/src/schemas/ipc.ts                         (new)
packages/core/src/schemas/ipc.test.ts                    (new)
packages/core/src/schemas/bundle-manifest.ts             (new)
packages/core/src/schemas/bundle-manifest.test.ts        (new)
packages/core/src/errors/index.ts                        (new)
packages/core/src/errors/jbird-error.ts                  (new)
packages/core/src/errors/config-error.ts                 (new)
packages/core/src/errors/bundle-error.ts                 (new)
packages/core/src/errors/proxy-error.ts                  (new)
packages/core/src/errors/service-lifecycle-error.ts      (new)
packages/core/src/errors/ipc-error.ts                    (new)
packages/core/src/errors/errors.test.ts                  (new)
packages/core/src/logger/index.ts                        (new)
packages/core/src/logger/logger.ts                       (new)
packages/core/src/logger/logger.test.ts                  (new — type smoke)
packages/core/src/types/index.ts                         (new — z.infer re-exports)
docs/issues/status.md                                    (update)
bun.lock                                                 (regenerated by `bun install`)
```

## Decisoes alinhadas com o user (2026-05-03)

Confirmadas em discussao antes do execute:

1. **`routingRuleSchema.match` = objeto com chaves opcionais AND-ed.** Cobre AND-dentro-da-regra (chaves multiplas) e OR-entre-regras (multiplas `[[routing.rules]]`). Schema generico AND/OR/NOT recursivo descartado — ilegivel em TOML escrito a mao. Se v2 precisar OR/NOT real, expandir sem quebrar TOML existente.

2. **`injectDirectiveSchema` = enum fechado.** `z.enum(['use-sequential-thinking-mcp'])` em v1. Garante exhaustiveness em switches no proxy. Adicionar directive = PR que altera o enum + atualiza switches.

3. **`upstreamChunkSchema` = opaco `{ raw: string }`.** Pass-through SSE puro. Proxy nao parsa estrutura Anthropic. Alinhado com SOLID (SRP — proxy so encaminha) e clean architecture (nao acopla nosso dominio ao protocolo upstream). Se 007 precisar parsing structurado, ai expandimos.

4. **Zod `^4.4.0`.** Latest stable (4.4.2 publicado 2026-05-01). Verificado compat: `@hono/zod-validator@0.7.6` aceita `^3.25.0 || ^4.0.0`. Sem bloqueio.

### Diretivas SOLID / clean architecture a reforcar no execute

Enquanto implementa, garantir (e auditar via `code-review-partner` no diff):

- **SRP** — cada schema em arquivo proprio; cada erro com responsabilidade unica (config vs bundle vs proxy).
- **OCP** — schemas extensiveis via union/discriminated union antes de breaking change; `JbirdError` base permite novas subclasses sem alterar codigo existente.
- **LSP** — todas as subclasses de `JbirdError` substituiveis pelo base (mesmo `toJSON()` shape).
- **ISP** — `Logger` e interface enxuta (`debug/info/warn/error/child`); nao expor metodos que so 1 consumer usa.
- **DIP** — core nao depende de cli/proxy/bundle. Apenas Zod (runtime) + tipos. Ports/integrations vivem nos packages que precisam (issues 003+).
- **Clean architecture** — schemas (dominio) sao puros, sem I/O. TOML parsing, FS, network ficam em camadas superiores.

Auditar tambem se `jbird-discipline` skill ja documenta isso — se nao, abrir follow-up issue pra extender a skill (sem fazer nesta issue, escopo).

## Criterio de aceite

- Todos os `*.test.ts` passam (>= ~30 unit tests cobrindo schemas, errors, types).
- Round-trip test em **todos** os schemas top-level (primitives sao tested via schemas que os usam + diretamente; routing, config, journal, ipc, bundle-manifest cada um com fixture round-trip).
- 100% dos tipos publicos (`ModelId`, `ProviderId`, `ModelMeta`, `NormalizedRequest`, `UpstreamRequest`, `UpstreamChunk`, `Classification`, `Usage`, `RoutingDecision`, `RoutingReason`, `InjectDirective`, `CoreConfig`, `ServicesConfig`, `RoutingConfig`, `RoutingRule`, `BundleConfig`, `JournalEvent`, `HealthResponse`, `ErrorBody`, `BundleManifest`, `BundleEntry`, `ManagedManifest`, `Logger`, `LogLevel`, `LogFields`, classes de erro) exportados de `packages/core/src/index.ts` — verificado pelo `index.test.ts` exaustivo.
- Universal gates verdes:
  - `bun install` clean.
  - `bun test` — todos passam.
  - `bunx tsc --noEmit` (root) — zero erros.
  - `bun run lint` — zero erros.
  - `bun run build` — todos os packages compilam (core agora tem conteudo real; cli/proxy/bundle inalterados).
- Cobertura: schemas puros >=95%, errors >=95%, primitives >=95%. (Logger e interface, sem cobertura runtime aplicavel.)
- Sem `any` introduzido. Sem `console.log`. Sem stack trace exposto em `toJSON()` de errors.
- `@jbird/core/package.json` `dependencies` contem **apenas** `zod`. Sem outras runtime deps. (devDeps herdadas do root.)
- Nenhum tipo paralelo declarado fora do schema correspondente — toda interface publica e `z.infer<typeof ...Schema>` ou interface puramente nominal (Logger).
- Idempotencia: round-trip parse->serialize->parse deep-equal ao input pos-primeiro-parse para todos os schemas.

## Notas

- TS 7.0 ainda nao publicado (registrado em 001). 002 roda com TS 6.0.3 — schemas Zod e tipos `z.infer` funcionam identicamente.
- Bun text lockfile (`bun.lock`) sera regenerado ao adicionar Zod. Commitar junto.
- Provider id como `string` open-ended em vez de literal — alinhado com spec section 2.7 que ja antecipa Qwen em v2. v1 sempre `'anthropic'` mas schema nao force.
- Match clauses no schema cobrem o subconjunto v1 enumerado na spec section 3.1.1 (token estimate, keywords, tool-use density, retrieved-context tags, sub-agent invocation). `toolUseDensity` aparece em `Classification` mas **nao** em `routingRuleSchema.match` — usuario nao expressa "match by tool-use density" via TOML em v1; isso e consumido apenas pelo `RoutingPolicy` heuristic interno. Documentar nesse arquivo.
