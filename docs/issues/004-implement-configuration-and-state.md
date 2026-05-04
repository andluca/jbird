# 004 — Implement configuration and state

## Overview

Bootstrap de `~/.jbird/`: directory creation com permissions 700, config loading global + project (com override semantics e Zod merge), NDJSON journal writer, comando `jbird config get/set/edit`.

Referencia: spec section 2.6 (Configuration & State) + Phase 4.

Criterio de aceite (high-level): ler config inexistente retorna defaults sem erro, write-then-read round-trips, project config sobrescreve global per Zod merge logic, state directory auto-criado com permissions corretas.

Depende de: 002.

## Contexto

### O que ja existe

- `packages/core/src/schemas/config.ts` — `coreConfigSchema` (camelCase, `.strict()`, defaults via factory: `services.proxy={autostart:true,port:7878}`, `routing={defaultModel:"sonnet",rules:[]}`). `bundle` e o unico campo *required* (sem default — precisa de `version` semver). `DEFAULT_PROXY_PORT = 7878` exportado.
- `packages/core/src/schemas/journal.ts` — `journalEventSchema` (discriminated union: `routing-decision | command-invocation | materialization | service-lifecycle`). Cada event ja tem `timestamp: isoTimestampSchema`.
- `packages/core/src/errors/config-error.ts` — `ConfigError extends JbirdError` com 4 subkinds documentados em jsdoc: `parse-failed`, `validation-failed`, `not-found`, `override-conflict`.
- `packages/core/src/logger/logger.ts` — interface `Logger` (debug/info/warn/error) + `LogFields` (Record).
- `packages/cli/src/jbird.ts` — composition root que cria `deps = { stdout: createStdout() }` e dispatcha pra 8 routers via `register{Cmd}(program, deps)`.
- `packages/cli/src/shared/services/ports.ts` — apenas `Stdout { write(line) }`.
- `packages/cli/src/shared/integrations/stdout.ts` — `createStdout()` impl.
- `packages/cli/src/commands/config/config.ts` — router que registra `get <key>`, `set <key> <value>`, `edit`, dispatcha pra `runConfig{Get,Set,Edit}` com `process.exitCode = 2`.
- 3 operations stub (`get/get.ts`, `set/set.ts`, `edit/edit.ts`) que escrevem "not yet implemented" via `Stdout`.
- 3 spec files (`get/tests/get.spec.ts`, `set/tests/set.spec.ts`, `edit/tests/edit.spec.ts`) testando exit 2 + msg stub.
- 3 unit tests (`get/get.test.ts`, etc) atualmente comportamentais sobre o stub.
- `packages/cli/src/shared/test/cli.ts` — `runCli(args): {stdout, stderr, exitCode}` via `Bun.spawn(["bun", "run", ENTRY, ...args])`.

### Referencia na spec

- Section 2.6 — Configuration & State (TOML schema exemplo, layout `~/.jbird/`, override semantics).
- Section 3.1.5 — Observability (NDJSON journals em `~/.jbird/logs/proxy.log` e `~/.jbird/logs/cli.log`).
- Section 3.2.5 — `jbird config <get|set|edit>` (semantica curta: get le project depois global, set escreve project ou global com `--global`, edit abre `$EDITOR`).
- Section 4.2 phase 4 — gates: read non-existent config → defaults sem erro; write-then-read round-trip; project sobrescreve global per Zod merge; state dir auto-criado com permissions 700.

### Decisoes ja tomadas que afetam essa issue

- Schema `coreConfigSchema` esta em camelCase. TOML usa snake_case. **Translation snake↔camel acontece no loader** (esta issue), nao no schema (decidido em 002 e documentado em `packages/core/src/schemas/config.ts:5-10`).
- `bundle.version` e o unico campo *required* sem default. Implicacao: ler config TOML totalmente vazio falha validation. **Decisao a confirmar abaixo.**
- `coreConfigSchema.strict()` rejeita keys desconhecidas. Loader nao pode silenciosamente droppar typos do user.
- Operations recebem `deps` por injection. Compor novas dependencias (`ConfigLoader`, `ConfigWriter`, `JournalWriter`, `Editor`, `Clock`, `Fs`) no `jbird.ts` segue o padrao ja estabelecido em 003.
- Errors via `ConfigError` (ja existente). Sem novas error classes.
- Logging: ainda nao temos impl de `Logger` no cli (003 ficou so com `Stdout`). Esta issue **introduz a impl concreta** (`createConsoleLogger` ou `createNullLogger`) ja que `JournalWriter`/`ConfigLoader` precisam logar.

## Decisoes a alinhar antes de executar

Flagged como bloqueio leve — precisam confirmacao do user antes de codar.

1. **TOML library.** Bun nao tem `Bun.TOML`. Candidatos:
   - **`smol-toml`** (~7kb, 0 deps, TOML 1.0.0 compliant, JSON-like API, zero-dep). Recomendacao default.
   - `@iarna/toml` — popular mas ~30kb, e o `parse` retorna mutable plain objects.
   - `toml` (npm) — so parser, nao stringifier.
   - Custom mini-parser — fora de scope.
   Decisao recomendada: **`smol-toml`**. Adicionar em `packages/cli/package.json` como dep runtime.

2. **`bundle.version` required vs default.** Spec section 2.6 mostra `[bundle] version = "0.1.0"` como exemplo, e schema 002 fez `version` required. Mas spec phase 4 diz "reading non-existent config returns defaults without error". Contradicao parcial.
   - Opcao A: `bundle.version` ganha default no schema (= versao corrente do bundle, hardcoded em `@jbird/core`). Loader so valida.
   - Opcao B: Loader injeta `bundle.version` = versao corrente do `@jbird/cli` package.json antes de validar quando o arquivo nao existe. Schema fica required.
   - Opcao C: Spec interpreta "defaults sem erro" como "se arquivo existe e e parcial, defaults preenchem". Arquivo totalmente ausente → ainda erro? Improvavel — phase 4 explicitamente quer no-error.
   Decisao recomendada: **Opcao B** (loader injeta version corrente). Mantem schema 002 intacto, evita coupling de schema com versao runtime. Hardcode em `packages/core/src/version.ts` (constant `JBIRD_VERSION`) lendo de `package.json` no build, ou loader le do package.json do `@jbird/cli` em runtime.

3. **Override semantics — granularidade.** Spec section 2.6 diz "Project overrides global", sem detalhar. Issue resumo diz "key-by-key (Zod merge), nao replace". Cenario:
   - Global: `[services.proxy] autostart=true, port=7878`
   - Project: `[services.proxy] port=9999`
   - Esperado: `{services:{proxy:{autostart:true, port:9999}}}` (key-by-key deep merge).
   Mas e arrays? `routing.rules` e array. Project define `routing.rules = [...]` — substitui ou concatena?
   Decisao recomendada: **objects deep-merge, arrays replace**. Comportamento padrao de `Object.assign`-like deep-merge. Documentar no jsdoc do `ConfigLoader.load()`.

4. **`config get` formato de saida.**
   - Path tipo `services.proxy.port` → printa o primitivo (`7878\n`)?
   - Path tipo `services.proxy` → printa objeto como JSON (`{"autostart":true,"port":7878}\n`)? Ou TOML fragment?
   - Path inexistente → exit non-zero + stderr msg, ou exit 0 + empty stdout?
   Decisao recomendada: **primitivos = string crua + newline; objetos/arrays = JSON one-line; path inexistente = exit 1 + stderr `key not found: <key>`**. Match unix conventions (grep-friendly). Path *valido por schema mas ausente do user file* (= default kicked in) ainda printa o default.

5. **`config set` em path nested + create-on-set.**
   - `config set services.proxy.port 9999` em sistema sem `~/.jbird/config.toml`: cria o arquivo com so essa chave + `bundle.version`?
   - Validar parcialmente ou exigir config completa? Schema 002 requer `bundle.version`. Sem it, `coreConfigSchema.parse({services:{proxy:{port:9999}}})` falha.
   Decisao recomendada: **`config set` aceita config parcial; loader-side merge com defaults + `bundle.version` = `JBIRD_VERSION` antes de validar; escreve o arquivo final completo (ou so as chaves que diferem do default? — escrever so o que diferiu mantem TOML enxuto). v1: escrever o objeto completo apos validation, simplifica round-trip.**

6. **`config set --global` flag.** Spec section 3.2.5 menciona `--global` mas o router atual (`config.ts`) nao registra. Adicionar em `set` (`-g, --global`). `get` tambem precisa? Spec diz "get reads from project, falls back to global" — get nao precisa flag. **Confirmar.**
   Decisao recomendada: adicionar `--global` so no `set` por agora.

7. **Permissions 700 — diretorio vs arquivos.** Spec section 4.2 phase 4 diz "state directory auto-created with correct permissions (700)". Plural "permissions" mas singular "directory".
   - Diretorio `~/.jbird/`: 0o700 (rwx so user). Sim.
   - Arquivos `config.toml`, `*.log`, `proxy.info`: 0o600 (rw user)? Spec nao fala. Conservador: sim (logs podem conter request hashes, model decisions, paths). 
   Decisao recomendada: **dir 0o700, arquivos 0o600**. Aplicar em ambos `~/.jbird/` e `<project>/.jbird/`. Em windows, chmod e no-op (Node ignora) — safe.

8. **`config edit` fallback do `$EDITOR`.** Spec nao detalha.
   Decisao recomendada: **`$VISUAL` > `$EDITOR` > `vi`**. Se nenhum dos tres existe no PATH, error com instrucao pra setar `$EDITOR`. Padrao git.

9. **TOML round-trip preserva comments?** smol-toml *nao* preserva comments no stringify (zero TOML lib JS preserva facilmente). Implicacao: `config set` destroi comments do user.
   Decisao recomendada: **v1 aceita destruir comments**. Documentar em jsdoc do `ConfigWriter`. Se virar dor de cabeca, abrir issue separada pra TOML round-trip preserving (impl complexa — precisa AST-level edit).

10. **NDJSON journal — rotation, atomic writes.**
    - Rotation: spec nao menciona. v1: append unbounded; rotation pode virar issue futura quando virar dor.
    - Atomic: cada line e um write. Bun.write nao garante atomicity per-line. Solucao: usar `fs.appendFileSync` pra writes pequenos (< 4kb sao atomic em POSIX). 
    Decisao recomendada: **append-only via `fs.appendFile` (async); cada event e uma linha JSON + `\n`; sem rotation em v1; sem locking (single CLI invocation por vez na pratica)**.

## Plano

### Schemas e tipos (@jbird/core)

Sem mudancas em `@jbird/core/src/schemas/`. Schemas ja foram entregues em 002.

**Adicionar:** `packages/core/src/version.ts` — `export const JBIRD_VERSION = "0.0.0"` (lido de algum lugar; v1 = hardcoded sync com root `package.json`). Exportar do barrel `index.ts`.

Justificativa: loader precisa injetar `bundle.version` quando arquivo nao existe (ver decisao #2). Manter constante em core evita import cycle (cli → core e ok).

### Ports novas (`packages/cli/src/shared/services/ports.ts`)

Estender `ports.ts` com:

- **`Fs`** — leituras/escritas/mkdir/chmod/exists. Metodos:
  - `readFile(path: string): Promise<string | null>` (`null` se nao existe)
  - `writeFile(path: string, content: string, mode?: number): Promise<void>` (mode opcional pra 0o600)
  - `appendFile(path: string, content: string): Promise<void>` (pra journal)
  - `mkdir(path: string, mode?: number): Promise<void>` (recursive, idempotente)
  - `exists(path: string): Promise<boolean>`
  - `chmod(path: string, mode: number): Promise<void>`
  - `homedir(): string` (sync — config global precisa de `~`)
- **`Toml`** — parse/stringify:
  - `parse(input: string): unknown`
  - `stringify(value: unknown): string`
- **`Editor`** — spawn editor:
  - `open(path: string): Promise<number>` (retorna exit code)
- **`Clock`** — pure clock:
  - `now(): Date`

Manter `Stdout` existente. Adicionar tambem **`Logger`** re-exportando de `@jbird/core` apenas como type (port simbolica — ja existe).

### Integrations concretas (`packages/cli/src/shared/integrations/`)

- **`fs.ts`** — `createNodeFs(): Fs` usando `node:fs/promises`. Implementa todos os metodos. `homedir()` via `node:os`. mkdir com `recursive: true, mode`.
- **`toml.ts`** — `createTomlAdapter(): Toml` envolvendo `smol-toml`. Internamente faz **camelCase ↔ snake_case translation**:
  - `parse(input)` retorna obj com keys camelCase (recursivo).
  - `stringify(value)` aceita obj camelCase, retorna TOML com keys snake_case.
  - Helper interno `toCamelCase`/`toSnakeCase` pra strings (regex simples). Lista de chaves preservadas (ex: `provider="anthropic"` valor nao muda, so keys).
- **`editor.ts`** — `createEditor(): Editor` usando `Bun.spawn` com `stdio: "inherit"` (precisa ser interativo). Resolve `$VISUAL || $EDITOR || "vi"`. Inheritance crucial — sem TTY o editor nao roda.
- **`clock.ts`** — `createSystemClock(): Clock` retorna `{ now: () => new Date() }`.
- **`logger.ts`** — `createConsoleLogger(opts?): Logger` que escreve em stderr (debug/info/warn → stderr, error → stderr). Formata como `[level] message {fields}`. **No `console.log`** — usar `process.stderr.write`. Sera uitlizado por services novos. NB: ESLint `no-console` ja bloqueia `console.*`.

### Services (`packages/cli/src/shared/services/`)

Quatro services novos. Cada um < 80 LOC esperado, com ports no constructor.

- **`StateDir.ts`** — bootstrap de `~/.jbird/` e `<project>/.jbird/`.
  - `class StateDir { constructor(private fs: Fs) {} }`
  - `globalRoot(): string` — `path.join(fs.homedir(), ".jbird")`
  - `projectRoot(cwd: string): string` — `path.join(cwd, ".jbird")`
  - `ensureGlobal(): Promise<{root, configPath, logsDir, servicesDir, cacheDir, statsDir}>` — mkdir 0o700 recursive em todos os subdirs (`logs/`, `services/`, `cache/`, `stats/`); idempotente.
  - `ensureProject(cwd): Promise<{root, configPath}>` — mkdir 0o700, returns paths.
  - Metodos sao puros wrappers sobre `Fs` — testaveis com fake `Fs`.

- **`ConfigLoader.ts`** — le e merge.
  - `class ConfigLoader { constructor(private fs: Fs, private toml: Toml, private stateDir: StateDir, private logger: Logger) {} }`
  - `loadGlobal(): Promise<CoreConfig>` — le `~/.jbird/config.toml`, parse TOML, valida com `coreConfigSchema`. Se nao existe, retorna defaults via `coreConfigSchema.parse({ bundle: { version: JBIRD_VERSION } })`.
  - `loadProject(cwd): Promise<Partial<CoreConfig> | null>` — le `<cwd>/.jbird/config.toml`. Retorna `null` se nao existe (project config e opcional). Se existe, parse + valida com schema parcial (`coreConfigSchema.partial()` ou validacao manual key-by-key).
  - `load(cwd): Promise<CoreConfig>` — orquestra: global = loadGlobal(); project = loadProject(cwd); merge deep (objects merge key-by-key; arrays replace); valida final com `coreConfigSchema`.
  - Erros: TOML parse falha → `ConfigError({kind: "parse-failed", path})`. Schema valida falha → `ConfigError({kind: "validation-failed", path, issues})`. FS read falha por permissao → re-throw com contexto.
  - Funcao pura interna `deepMerge<T>(global: T, project: Partial<T>): T` extraida pra `helpers.ts` e testada isoladamente.

- **`ConfigWriter.ts`** — set + edit support.
  - `class ConfigWriter { constructor(private fs: Fs, private toml: Toml, private stateDir: StateDir, private loader: ConfigLoader) {} }`
  - `setGlobal(key: string, value: unknown): Promise<CoreConfig>` — load atual, aplica `setAtPath(config, key, value)`, valida com schema, stringify TOML, write atomic + chmod 0o600.
  - `setProject(cwd, key, value): Promise<CoreConfig>` — idem mas no project file.
  - `setAtPath(obj, dotPath, value)` — helper puro em `helpers.ts`. Trata `services.proxy.port` → `obj.services.proxy.port = value`. Coerce string `"9999"` em numero quando schema espera number? **Decisao a alinhar:** v1 faz coerce numerico baseado no tipo do valor atual no schema (parse(value) + se schema espera number, `Number(value)` se finite). Booleans: `"true"|"false"` → bool. Strings ficam string.
  - `getAtPath(obj, dotPath)` — helper puro pra `config get`.

- **`JournalWriter.ts`** — append NDJSON events.
  - `class JournalWriter { constructor(private fs: Fs, private clock: Clock) {} }`
  - `append(filePath: string, event: JournalEvent): Promise<void>` — valida event com `journalEventSchema.parse(event)`, serializa `JSON.stringify` + `\n`, append via `fs.appendFile`. Cria parent dir se nao existe (defensivo, idempotente).
  - **Important:** event.timestamp eh fornecido pelo caller via `clock.now().toISOString()`. JournalWriter NAO timestampa internamente — caller responsabilidade. Justificativa: events tipo `routing-decision` ja vem com timestamp do proxy (clock dele).
  - Helper opcional `withTimestamp(clock, partialEvent)` em `helpers.ts` pra calls que querem timestamp automatico.

### Composition root (`packages/cli/src/jbird.ts`)

Adicionar criacao das integrations + services em `deps`:

```typescript
const fs = createNodeFs();
const toml = createTomlAdapter();
const editor = createEditor();
const clock = createSystemClock();
const logger = createConsoleLogger();
const stateDir = new StateDir(fs);
const configLoader = new ConfigLoader(fs, toml, stateDir, logger);
const configWriter = new ConfigWriter(fs, toml, stateDir, configLoader);
const journalWriter = new JournalWriter(fs, clock);

const deps = {
  stdout: createStdout(),
  stateDir,
  configLoader,
  configWriter,
  journalWriter,
  editor,
  logger,
};
```

`registerConfig(program, deps)` continua o mesmo signature. Os outros 7 routers ja recebem `deps` e ignoram campos novos (TS structural typing).

### Operations (atualizar — substituir stubs)

- **`commands/config/get/get.ts`** — `runConfigGet(opts: {key: string}, deps): Promise<void>`
  - Carrega config via `deps.configLoader.load(process.cwd())`.
  - `value = getAtPath(config, opts.key)`.
  - Se `undefined`: `process.stderr.write("key not found: ...\n")`, `process.exitCode = 1`, return.
  - Se primitivo: `deps.stdout.write(String(value))`.
  - Se objeto/array: `deps.stdout.write(JSON.stringify(value))`.
  - Sem mais `process.exitCode = 2` no router (remover override quando op suceeds).

- **`commands/config/set/set.ts`** — `runConfigSet(opts: {key, value, global?}, deps): Promise<void>`
  - Garante state dir via `deps.stateDir.ensureGlobal()` (e `.ensureProject(cwd)` se nao --global).
  - Chama `deps.configWriter.setGlobal(key, value)` ou `.setProject(cwd, key, value)`.
  - On `ConfigError`: write msg + issues a stderr, `process.exitCode = 1`.
  - On success: `deps.stdout.write(\`set \${key} = \${value}\`)` (feedback minimo).

- **`commands/config/edit/edit.ts`** — `runConfigEdit(opts: {global?}, deps): Promise<void>`
  - Garante state dir via `ensureGlobal()` (ou project).
  - Se config file nao existe: cria com defaults primeiro (`configWriter.setGlobal(...)` com no-op? Ou cria arquivo seed).
  - Chama `deps.editor.open(configPath)`. Aguarda exit.
  - Apos editor fechar, **reload + valida** o arquivo. Se invalid: write erro a stderr (preserva o file editado pelo user pra consertar manualmente), exit 1.
  - On success: `deps.stdout.write("config saved")`.

### Router (`commands/config/config.ts`)

- Adicionar opcao `--global` no `set` (e `edit`).
- Remover `process.exitCode = 2` (operations agora tem exit codes reais).
- Manter signature de `registerConfig(program, deps)`.

### Testes (escrever primeiro — ordem TDD)

Ordem por modulo, cada um Red → Green → Refactor antes de avancar.

**Round 1 — helpers puros (`shared/services/helpers.test.ts`):**
- `deepMerge` — global vazio, project vazio, override key-by-key, arrays replace, nested 3 niveis, undefined preserva global.
- `setAtPath` — top-level, nested, criar paths intermediarios, coerce numero/bool, paths invalidos throw.
- `getAtPath` — happy path, nested, retorna undefined em path ausente, retorna objeto inteiro, retorna array.
- `toCamelCase` / `toSnakeCase` — `"default_model" ↔ "defaultModel"`, idempotencia, nao toca valores.

**Round 2 — `StateDir.test.ts`:**
- Fake `Fs` que registra calls.
- `ensureGlobal` chama `mkdir(homedir/.jbird, 0o700)` + 4 subdirs com mode 0o700.
- Idempotente (segunda call nao throwa, mkdir recursive ok).
- `ensureProject(cwd)` cria `cwd/.jbird` 0o700.

**Round 3 — `ConfigLoader.test.ts`:**
- Fake `Fs` retornando strings TOML; fake `Toml` que parse/stringify Real (usa `smol-toml` real ou mock simples).
- `loadGlobal` arquivo ausente → defaults com `bundle.version = JBIRD_VERSION`.
- `loadGlobal` arquivo valido → parsed config camelCase.
- `loadGlobal` TOML inválido → `ConfigError({kind: "parse-failed"})`.
- `loadGlobal` schema invalido (ex: port = -1) → `ConfigError({kind: "validation-failed"})`.
- `loadGlobal` snake_case TOML → camelCase config (translation funciona).
- `loadGlobal` strict mode: chave desconhecida → throw.
- `loadProject(cwd)` ausente → `null` (nao throw).
- `load(cwd)` merge: project sobrescreve global key-by-key; arrays replace.
- `load(cwd)` so global existe → equivalente a loadGlobal.

**Round 4 — `ConfigWriter.test.ts`:**
- `setGlobal("services.proxy.port", "9999")` — coerce to number, valida, escreve TOML snake_case.
- `setGlobal("services.proxy.autostart", "false")` — coerce bool.
- `setGlobal` invalido (ex: port = 0) → `ConfigError({kind: "validation-failed"})`, **NAO escreve arquivo** (validacao antes de write).
- `setGlobal` em sistema sem arquivo → cria arquivo, com chmod 0o600.
- `setProject(cwd, ...)` — escreve em `cwd/.jbird/config.toml`.
- Round-trip: setGlobal seguido de loadGlobal retorna mesmo valor.

**Round 5 — `JournalWriter.test.ts`:**
- `append(path, event)` — valida event via schema, append linha JSON + `\n`.
- Multiplas appends produzem multiplas linhas, cada uma parseable.
- Event invalido (kind ausente) → throw antes de escrever.
- Cria parent dir se ausente (helper integration: real `Fs` em tmpdir).

**Round 6 — Operations unit (`get.test.ts`, `set.test.ts`, `edit.test.ts`):**
- Usar fake deps (fake `ConfigLoader`/`ConfigWriter`/`Editor` + capturing `Stdout`).
- `runConfigGet` retorna primitivo via `Stdout`.
- `runConfigGet` retorna JSON pra objeto.
- `runConfigGet` key inexistente → exit 1, msg em stderr (capturar via spy ou mock `process.stderr`).
- `runConfigSet` chama `configWriter.setGlobal` (default) ou `.setProject` (sem flag, decisao: set sem `--global` vai pra project).
- `runConfigSet` com `--global` chama setGlobal.
- `runConfigSet` em ConfigError → exit 1, msg em stderr.
- `runConfigEdit` chama `editor.open(configPath)`, recarrega, retorna ok.
- `runConfigEdit` editor exit non-zero → exit 1.
- `runConfigEdit` arquivo invalido pos-edit → exit 1, mantem arquivo.

**Round 7 — Spec E2E (`get/tests/get.spec.ts`, `set/tests/set.spec.ts`, `edit/tests/edit.spec.ts`):**
- `setupTestRepo` helper novo em `shared/test/cli.ts` ou `shared/test/setup-test-repo.ts`:
  - Cria temp dir via `fs.mkdtemp`.
  - Override `HOME` env var pro temp dir (forca `homedir()` retornar temp).
  - Limpa apos test.
- `runCli(["config", "get", "services.proxy.port"], { cwd, env })` — sistema sem config → printa `7878`, exit 0.
- `runCli(["config", "set", "services.proxy.port", "9999"])` → cria `~/.jbird/config.toml`, exit 0. Sequente get retorna `9999`.
- `runCli(["config", "set", "services.proxy.port", "9999", "--global"])` → escreve global, project ausente.
- Project override: criar `cwd/.jbird/config.toml` com `[services.proxy] port = 5555`. `get` retorna `5555` (sobrescreve global `9999`).
- Permissions: apos `ensureGlobal`, stat retorna mode `0o40700` (dir).
- Edit: pular ou usar fake editor via `EDITOR=true` env (true command e no-op com exit 0).

### Atualizar router e composition

- **`commands/config/config.ts`** — adicionar `--global` em `set` e `edit`. Remover `process.exitCode = 2` override (operations gerenciam).
- **`jbird.ts`** — instanciar e injetar novas deps (lista acima).
- **`shared/test/cli.ts`** — adicionar helper `setupTestRepo` + extender `runCli` pra aceitar `{ cwd?, env? }` opts.
- **`shared/test/index.ts`** — exportar helpers novos.

### Lint rules

Verificar se `no-restricted-imports` em `eslint.config.mjs` precisa atualizar pra cobrir novas integrations/ports. Operations nao podem importar de `shared/integrations/*` (ja regrado em 003) — implementacoes novas ficam atras de ports, ok.

### Documentacao a atualizar

- **NAO atualizar `docs/specification.md`** — esta issue implementa comportamento ja na spec.
- **Skill `jbird-discipline`** — opcional: adicionar nota sobre TOML adapter ou pulo. Provavelmente nao necessario.
- **`packages/cli/README.md`** — nao existe ainda. Skip.

## Arquivos envolvidos

### Criados

- `packages/core/src/version.ts` (+ export no `index.ts`)
- `packages/cli/src/shared/integrations/fs.ts` + `fs.test.ts`
- `packages/cli/src/shared/integrations/toml.ts` + `toml.test.ts`
- `packages/cli/src/shared/integrations/editor.ts` + `editor.test.ts`
- `packages/cli/src/shared/integrations/clock.ts` + `clock.test.ts`
- `packages/cli/src/shared/integrations/logger.ts` + `logger.test.ts`
- `packages/cli/src/shared/services/helpers.ts` + `helpers.test.ts`
- `packages/cli/src/shared/services/StateDir.ts` + `StateDir.test.ts`
- `packages/cli/src/shared/services/ConfigLoader.ts` + `ConfigLoader.test.ts`
- `packages/cli/src/shared/services/ConfigWriter.ts` + `ConfigWriter.test.ts`
- `packages/cli/src/shared/services/JournalWriter.ts` + `JournalWriter.test.ts`
- `packages/cli/src/shared/test/setup-test-repo.ts` (ou inline em `cli.ts`)

### Modificados

- `packages/core/src/index.ts` — export `JBIRD_VERSION`
- `packages/cli/package.json` — adicionar dep `smol-toml`
- `packages/cli/src/shared/services/ports.ts` — adicionar `Fs`, `Toml`, `Editor`, `Clock`. Re-export `Logger` type.
- `packages/cli/src/shared/test/cli.ts` — extender `runCli` com `{cwd, env}`. Adicionar `setupTestRepo`.
- `packages/cli/src/shared/test/index.ts` — barrel update.
- `packages/cli/src/jbird.ts` — instanciar e injetar novas deps.
- `packages/cli/src/commands/config/config.ts` — adicionar `--global`, remover exit 2 override.
- `packages/cli/src/commands/config/get/get.ts` — substituir stub pela impl real.
- `packages/cli/src/commands/config/set/set.ts` — idem.
- `packages/cli/src/commands/config/edit/edit.ts` — idem.
- `packages/cli/src/commands/config/get/get.test.ts` — reescrever pra impl real.
- `packages/cli/src/commands/config/set/set.test.ts` — idem.
- `packages/cli/src/commands/config/edit/edit.test.ts` — idem.
- `packages/cli/src/commands/config/get/tests/get.spec.ts` — reescrever pra cenarios E2E reais.
- `packages/cli/src/commands/config/set/tests/set.spec.ts` — idem.
- `packages/cli/src/commands/config/edit/tests/edit.spec.ts` — idem.

## Criterio de aceite

### Funcional

- `jbird config get services.proxy.port` em sistema sem config retorna `7878\n` exit 0.
- `jbird config set services.proxy.port 9999` cria `~/.jbird/config.toml` (mode 0o600) com TOML snake_case `[services.proxy]\nport = 9999`. exit 0.
- Round-trip: write valor, ler mesmo valor (`set` seguido de `get` retorna o que foi setado).
- Project config (`<cwd>/.jbird/config.toml`) sobrescreve global key-by-key. Arrays substituem.
- `~/.jbird/` criado com mode 0o700 se nao existir. Subdirs `logs/`, `services/`, `cache/`, `stats/` tambem 0o700.
- `JournalWriter.append` aceita event valido, append como NDJSON line, file existe e linha parseia de volta com `journalEventSchema`.
- `jbird config edit` abre `$VISUAL || $EDITOR || vi`, valida apos save.
- TOML parse error → `ConfigError({kind: "parse-failed"})` com path. Schema validation falha → `ConfigError({kind: "validation-failed"})` com issues. Sem stack trace exposto ao user.

### Universal gates

- `bun test` — todos os tests verdes.
- `bunx tsc --noEmit` — zero erros.
- `bun run lint` — zero erros (ESLint strictTypeChecked + no-console + no-any).
- `bun run build` — todos os packages compilam.
- `bun test --coverage`:
  - Services (StateDir, ConfigLoader, ConfigWriter, JournalWriter): >= 90%
  - Helpers puros (deepMerge, setAtPath, getAtPath): >= 95%
  - Operations (get, set, edit): >= 90%
  - Integrations (fs, toml, editor adapters): tests focam contrato; cobertura >= 80% sem precisar mockar OS profundamente.

### Disciplina

- Sem `any` novo (verificado por lint).
- Sem `console.log` novo (verificado por lint). Logger via port.
- Sem `process.exit()` direto — usar `process.exitCode = N` (Commander handle).
- Operations nao importam de `shared/integrations/*` (ja regrado).
- Routers nao importam de `shared/{services,integrations}/*` (ja regrado).
- Constructor injection em todos services.
- Errors via `ConfigError`, sem stack trace pro user.
- Schema valida antes de escrever (no FS write em config invalido).
- Idempotencia: `ensureGlobal` chamado N vezes nao quebra; `setGlobal` mesmo valor 2x = mesmo output.

### Side-effects verificados

- FS: arquivos criados nos paths esperados, com mode correto.
- Journal: NDJSON line append-only, parseable.
- Editor: spawn com `stdio: inherit`, await exit.
- Permissions: stat retorna mode esperado (verificado em spec test em tmp dir).

## Notas

- Bloqueio leve: 10 decisoes flagged em "Decisoes a alinhar". Recomendacoes ja propostas — alinhar com user antes de codar (ou aceitar defaults). Decisoes 1 (smol-toml), 2 (loader injeta version), 3 (objects merge / arrays replace), 7 (dir 0o700, files 0o600) sao as mais impactantes.
- TOML snake↔camel translation tem risco: se aparecer chave no TOML que ja e camelCase (raro mas possivel em string values), nao convert. So convert *keys*. Helper precisa cuidado com nested arrays-of-objects (ex: `routing.rules` array tem objetos com keys que precisam de translation).
- `setupTestRepo` precisa de `HOME` env override pra evitar tocar `~/.jbird/` real do user. Bun.spawn aceita `env: { ...process.env, HOME: tmpDir }`. Spec tests sao isolados por dir.
- `JBIRD_VERSION` em core: cuidado com sync entre `core/src/version.ts` e `package.json` root. v1: hardcode + comentario "manter sync". v2: gerado em build time via script.
