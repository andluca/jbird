# 003 — Implement CLI scaffolding

## Overview

Implementar `@jbird/cli/src/jbird.ts` (router top-level via Commander) e os stubs de Command/Operation pra todos os comandos: `init`, `tdd`, `audit`, `refactor`, mais admin (`services`, `plugins`, `stats`, `config`). Cada comando imprime "not yet implemented" com help text. Lint rules de camada em vigor (Command nao importa Service/Infrastructure direto).

Referencia: spec section 2.3 (Three-Layer CLI Architecture) + Phase 3.

Criterio de aceite (high-level): `jbird --help` lista os 4 comandos + admin, cada `--help` renderiza, routers contem zero business logic (verificado por import-graph lint rule).

Depende de: 002.

## Contexto

### O que ja existe

- `packages/cli/package.json` — `@jbird/cli@0.0.0`, `bin: { jbird: ./src/jbird.ts }`, deps `@jbird/core` (workspace) + `commander@^13.0.0`. Script `build` faz `bun build --compile ./src/jbird.ts --outfile dist/jbird`.
- `packages/cli/src/jbird.ts` — entry minimo via Commander (`name`, `description`, `version("0.0.0")`, `program.parse()`). Sem subcomandos.
- `packages/cli/src/jbird.test.ts` — usa `Bun.spawn(['bun', 'run', ENTRY, ...args])` e cobre `--help` + `--version`. **Vai virar referencia do `runCli()` global** — promover pra `shared/test/cli.ts` aqui mesmo (faz sentido junto da scaffolding) OU manter inline ate issue 004 onde `runCli` realmente passa a ser usado por specs (decisao abaixo).
- `packages/core/src/index.ts` — barrel publico com errors, Logger, schemas e tipos. Disponivel via `import { ... } from '@jbird/core'`.
- Root `eslint.config.mjs` — `strictTypeChecked` + `stylisticTypeChecked` type-aware, `no-explicit-any: error`, `no-console: error` (allow `warn`/`error`), com override pra liberar `console` em `*.test.ts` e `tests/**/*.spec.ts`.
- `tsconfig.base.json` strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` + `verbatimModuleSyntax` + `isolatedModules` + `noEmit`.

### Referencia na spec

- **Section 2.3** (Three-Layer CLI Architecture) — `packages/cli/src/` com `jbird.ts` (router top-level), `commands/{cmd}/{cmd}.ts` (router por comando), `commands/{cmd}/{op}/{op}.ts` (operation), `shared/{services,models,integrations,test}/`. Routers nunca contem business logic; mesmo single-operation commands tem thin router que delega.
- **Section 3.2.1** (`jbird init`) — `init [path] [--prompt "<description>"] [--profile <name>] [--no-index] [--no-shell-setup]`. Dois modes: A (adopt existing, default) e B (generate from prompt). Mode B dispara quando `--prompt` esta presente OU path e empty/non-existent. Decomposicao por camada listada em 3.2.1.
- **Section 3.2.2** (`jbird tdd`) — `tdd "<work description>" [--mode feature|change|bug] [--stack <runner>] [--max-iterations 5]`. Default mode `feature`. Operation em `commands/tdd/run/run.ts`.
- **Section 3.2.3** (`jbird audit`) — `audit [path] [--scope quality|security|architecture|all] [--format md|json] [--output <path>]`. Operation `commands/audit/run/run.ts`.
- **Section 3.2.4** (`jbird refactor`) — `refactor "<target description>" [--scope <path>] [--gates test,lint,build]`. Operation `commands/refactor/run/run.ts`.
- **Section 3.2.5** (Admin) — `services {start,stop,status,install,logs}`, `plugins {sync,list}`, `stats [--since <window>] [--json]`, `config {get,set,edit}`.
- **Section 2.4** (Side Services) — sub-comandos do `services` enumerados: `start`, `stop`, `status`, `install`, `logs`.
- **Phase 3 gate (section 4.2)** — `jbird --help` lista todos os 4 comandos + admin layer. Cada `--help` renderiza. Routers contem zero business logic, verificado por **import-graph lint rule**: `commands/*/[command].ts` may only import from `commands/*/[operation]/`.

### Decisoes ja tomadas que afetam essa issue

- **Three-layer estrita** (jbird-discipline). Command apenas parseia argv e delega; Operation orquestra; Service tem logica; Infrastructure faz I/O. Imports descendentes only.
- **Thin router obrigatorio** mesmo em comandos de uma operacao — facilita adicionar operations no futuro.
- **`bin/jbird` aponta pra `./src/jbird.ts`**. Em runtime usuario chama `bun jbird`/binario compilado; testes spawnam `bun run` no entry. `runCli` helper centraliza isso.
- **Commander v13** (ja em deps). API: `program.command('subcmd').description(...).option(...).action(handler)`. Sub-commands aninhados via `.command().command()` ou via `Command` objects.
- **Sem implementacao real** — operations imprimem "not yet implemented" (stderr) com exit code apropriado e retornam. Routers e operations existem com estrutura final pra issues 004+ apenas preencherem o body.
- **Exit code apropriado pra "not yet implemented"** = `2` (convencao Unix: misuse/feature unavailable distingue de erro real `1` e sucesso `0`). Help text via `--help` continua exit `0`. **Decisao tomada — sem flag pra discutir.** Justificativa: spec nao prescreve, mas exit `0` esconderia a placeholder em scripts; exit `1` colide com erro de execucao que viria nas issues seguintes; exit `2` e o canonical pra "command exists mas nao roda" (rsync, curl, ssh).
- **Lint rule de camada** = `no-restricted-imports` com pattern globs. Sem instalar `eslint-plugin-boundaries` (overhead pra um set fechado de regras). Padroes:
  - `commands/*/*.ts` (router) **so** pode importar `./<op>/<op>.ts` (operation) e `commander` + `@jbird/core` types.
  - `commands/*/*.ts` **nao** pode importar `../../shared/services/*`, `../../shared/integrations/*`.
  - `commands/*/*/*.ts` (operation) **nao** pode importar `commander` direto (operation recebe parsed args, nao argv).
- **`runCli` helper** vive em `packages/cli/src/shared/test/cli.ts`. Esta issue cria o arquivo (apenas `runCli`; `setupTestRepo` vem na issue 004 quando config/state aparecem). Move o `runCli` inline de `jbird.test.ts` pra ca, refatora o teste pra usar.
- **`init` Mode A vs Mode B** = duas operations separadas (`commands/init/scaffold/scaffold.ts` pra Mode A e `commands/init/generate/generate.ts` pra Mode B). Spec (3.2.1) lista `commands/init/scaffold/scaffold.ts` como a operacao, mas tambem fala em `ProjectGenerator` pra Mode B com dispatch no top do operation. **Decisao**: dois operation files, dispatch no router (`init.ts`) baseado em `--prompt`/path-vazio. Justificativa: SRP — Mode A e Mode B tem inputs e outputs distintos (adopt usa detection; generate usa sub-agent + blueprint). Operation unica que branch logo no topo violaria SRP e cresceria desproporcionalmente. Stub agora ja deixa estrutura pronta.
- **Admin `services`, `plugins`, `config`** = comandos com subcomandos (Commander `Command` aninhado). Cada subcomando = operation propria.
  - `services start` → `commands/services/start/start.ts`
  - `services stop` → `commands/services/stop/stop.ts`
  - `services status` → `commands/services/status/status.ts`
  - `services install` → `commands/services/install/install.ts`
  - `services logs` → `commands/services/logs/logs.ts`
  - `plugins sync` → `commands/plugins/sync/sync.ts`
  - `plugins list` → `commands/plugins/list/list.ts`
  - `config get` → `commands/config/get/get.ts`
  - `config set` → `commands/config/set/set.ts`
  - `config edit` → `commands/config/edit/edit.ts`
- **Admin `stats`** = comando sem subcomandos (so opcoes `--since`, `--json`). Operation unica = `commands/stats/report/report.ts`. Router `stats.ts` thin.
- **Tipo dos handler params** — Commander v13 entrega args + opts + command instance. Definir tipo local por operacao: `interface InitOptions { prompt?: string; profile?: string; index: boolean; shellSetup: boolean; }` etc. Operation recebe esse tipo + um `Logger` (preparando 004) + um `Stdout` writer port. Em 003 `Logger` ainda nao injetado (vem em 004); operation usa `console.warn` provisorio? **Nao** — vai contra `no-console`. Solucao: operations recebem um `Stdout` port simples `{ write(line: string): void }` definido em `shared/services/ports.ts`. Default impl e `process.stdout.write` em `shared/integrations/stdout.ts`. Stub final imprime via essa port. (Premium: zero `console.log` em production; `Logger` pleno injetado em 004 substitui.)
  - **Alternativa considerada e descartada**: `no-console` allow apenas em routers stub. Adiciona override + rule esquece de remover depois. Port simples e clean architecture-correto e ja prepara o terreno pra 004.
- **`@jbird/core` import surface** — operations declaram tipos locais pros options (parsed); usam `JbirdError` pra erros (mesmo que stub nao throw nada). Em 003 import basicamente vazio na maioria — ok, presenca do package via workspace ja foi validada em 001.

## Plano

### Estrutura de arquivos

```
packages/cli/src/
├── jbird.ts                                     # router top-level (rewrite)
├── jbird.test.ts                                # E2E `--help`/`--version` + lista de comandos
├── commands/
│   ├── init/
│   │   ├── init.ts                              # router; dispatch Mode A vs Mode B
│   │   ├── init.test.ts                         # router unit test (parse + dispatch)
│   │   ├── scaffold/
│   │   │   ├── scaffold.ts                      # operation Mode A (stub)
│   │   │   ├── scaffold.test.ts
│   │   │   └── tests/
│   │   │       └── scaffold.spec.ts             # E2E `jbird init` stub
│   │   └── generate/
│   │       ├── generate.ts                      # operation Mode B (stub)
│   │       ├── generate.test.ts
│   │       └── tests/
│   │           └── generate.spec.ts             # E2E `jbird init --prompt "..."` stub
│   ├── tdd/
│   │   ├── tdd.ts
│   │   ├── tdd.test.ts
│   │   └── run/
│   │       ├── run.ts
│   │       ├── run.test.ts
│   │       └── tests/run.spec.ts
│   ├── audit/
│   │   ├── audit.ts
│   │   ├── audit.test.ts
│   │   └── run/
│   │       ├── run.ts
│   │       ├── run.test.ts
│   │       └── tests/run.spec.ts
│   ├── refactor/
│   │   ├── refactor.ts
│   │   ├── refactor.test.ts
│   │   └── run/
│   │       ├── run.ts
│   │       ├── run.test.ts
│   │       └── tests/run.spec.ts
│   ├── services/
│   │   ├── services.ts                          # router com 5 subcommands
│   │   ├── services.test.ts
│   │   ├── start/{start.ts, start.test.ts, tests/start.spec.ts}
│   │   ├── stop/{stop.ts, stop.test.ts, tests/stop.spec.ts}
│   │   ├── status/{status.ts, status.test.ts, tests/status.spec.ts}
│   │   ├── install/{install.ts, install.test.ts, tests/install.spec.ts}
│   │   └── logs/{logs.ts, logs.test.ts, tests/logs.spec.ts}
│   ├── plugins/
│   │   ├── plugins.ts
│   │   ├── plugins.test.ts
│   │   ├── sync/{sync.ts, sync.test.ts, tests/sync.spec.ts}
│   │   └── list/{list.ts, list.test.ts, tests/list.spec.ts}
│   ├── stats/
│   │   ├── stats.ts                             # router thin (so opcoes)
│   │   ├── stats.test.ts
│   │   └── report/
│   │       ├── report.ts
│   │       ├── report.test.ts
│   │       └── tests/report.spec.ts
│   └── config/
│       ├── config.ts
│       ├── config.test.ts
│       ├── get/{get.ts, get.test.ts, tests/get.spec.ts}
│       ├── set/{set.ts, set.test.ts, tests/set.spec.ts}
│       └── edit/{edit.ts, edit.test.ts, tests/edit.spec.ts}
└── shared/
    ├── services/
    │   ├── ports.ts                              # interface Stdout (e nada mais por ora)
    │   └── ports.test.ts                         # **NAO criar** (ports e interface pura, sem runtime)
    ├── integrations/
    │   └── stdout.ts                             # impl real Stdout (process.stdout.write)
    └── test/
        ├── cli.ts                                # runCli helper (movido de jbird.test.ts)
        └── index.ts                              # barrel
```

Nota sobre `ports.test.ts`: removido — interface pura nao precisa teste runtime (`tsc --noEmit` ja garante). Listado pra explicitar a decisao.

### Schemas e tipos (@jbird/core)

Nada novo nesta issue. Operations declaram options interfaces locais (nao precisam virar schemas Zod — sao internas, nao atravessam fronteira IPC/FS).

### Ports e integrations

**Port nova** (`packages/cli/src/shared/services/ports.ts`):

```ts
export interface Stdout {
  write(line: string): void;
}
```

So isso. Sem `Stderr` separado em v1 (operations stub usam stdout pra "not yet implemented" — info, nao erro). Quando uma operation realmente precisar reportar erro pro user (issue 004+), `Logger` de `@jbird/core` injetado faz isso. `Stdout` permanece pra outputs que nao sao log (saida de comandos como `config get key`).

**Implementacao concreta** (`packages/cli/src/shared/integrations/stdout.ts`):

```ts
import type { Stdout } from "../services/ports.ts";

export function createStdout(): Stdout {
  return {
    write(line: string): void {
      process.stdout.write(line);
      if (!line.endsWith("\n")) process.stdout.write("\n");
    },
  };
}
```

`process.stdout.write` nao e `console.log` — nao dispara `no-console`. (Verificar: rule e `no-console`, restringe membros de `console`, nao toca `process.stdout`.)

### Test helper

**`packages/cli/src/shared/test/cli.ts`:**

```ts
const ENTRY = new URL("../../jbird.ts", import.meta.url).pathname;

export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export async function runCli(args: readonly string[]): Promise<CliResult> {
  const proc = Bun.spawn(["bun", "run", ENTRY, ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  return { stdout, stderr, exitCode };
}
```

Move o helper inline de `jbird.test.ts` pra ca; `jbird.test.ts` passa a importar. `setupTestRepo` deferred pra issue 004 (precisa de config/state).

### Testes (escrever primeiro)

Dois niveis: **router unit tests** (`*.test.ts` chamando funcao exportada do router/operation com mocks) e **E2E spec tests** (`tests/*.spec.ts` via `runCli`).

#### Router pattern

Cada router exporta uma funcao `register(program: Command): void` (ou `build(): Command`). `jbird.ts` chama `register(program)` pra cada comando. Isso permite testar router unit sem spawnar processo.

```ts
// commands/init/init.ts (router)
import { Command } from "commander";
import { runScaffold } from "./scaffold/scaffold.ts";
import { runGenerate } from "./generate/generate.ts";
import { createStdout } from "../../shared/integrations/stdout.ts";  // ⚠ violacao da rule abaixo!
```

**Stop** — o router nao pode importar `shared/integrations/`. Como passar a port pro operation entao? **Decisao**: a *injection* acontece em `jbird.ts` (top-level entry/composition root), nao no router de comando. `jbird.ts` cria as ports concretas e passa via factory:

```ts
// jbird.ts
import { Command } from "commander";
import { createStdout } from "./shared/integrations/stdout.ts";
import { registerInit } from "./commands/init/init.ts";
import { registerTdd } from "./commands/tdd/tdd.ts";
// ...

const program = new Command()
  .name("jbird")
  .description("...")
  .version("0.0.0");

const stdout = createStdout();
const deps = { stdout };

registerInit(program, deps);
registerTdd(program, deps);
// ...

program.parse();
```

```ts
// commands/init/init.ts
import type { Command } from "commander";
import type { Stdout } from "../../shared/services/ports.ts";
import { runScaffold } from "./scaffold/scaffold.ts";
import { runGenerate } from "./generate/generate.ts";

interface CommandDeps { readonly stdout: Stdout; }

export function registerInit(program: Command, deps: CommandDeps): void {
  program
    .command("init")
    .description("Scaffold a jbird-managed project (adopt existing or generate from prompt).")
    .argument("[path]", "project path", ".")
    .option("--prompt <description>", "generate a new project from this description (Mode B)")
    .option("--profile <name>", "bundle profile to use", "default")
    .option("--no-index", "skip Context-Lens initial indexing")
    .option("--no-shell-setup", "skip shell-profile ANTHROPIC_BASE_URL setup")
    .action(async (path: string, opts: InitOptions) => {
      if (opts.prompt !== undefined || pathLooksEmpty(path)) {
        await runGenerate({ path, prompt: opts.prompt, profile: opts.profile }, deps);
      } else {
        await runScaffold({ path, profile: opts.profile, index: opts.index, shellSetup: opts.shellSetup }, deps);
      }
    });
}
```

`pathLooksEmpty()` em 003 pode ser stub que retorna `false` sempre — Mode B so dispara via `--prompt`. Implementacao real (FS check) entra na issue 009/010. Documentar com `// stub: 003 — real check em 009`.

Router unit tests testam: `registerInit(program, deps)` adiciona um subcommand `init` ao `program`; chamando o handler dispara a operation correta dado opcoes (mockando a operation via spy). **MAS** — tests nao mockam a operation por nome (anti-pattern). Em vez disso, operation recebe deps, e teste passa um `Stdout` mock, executa, e verifica que a string "not yet implemented" foi escrita uma vez. Behavioral.

#### Test inventory

**`packages/cli/src/jbird.test.ts`** (rewrite, usa `runCli`):
- `jbird --help` exit 0, lista os 8 comandos top-level: `init`, `tdd`, `audit`, `refactor`, `services`, `plugins`, `stats`, `config`.
- `jbird --version` exit 0, format `\d+\.\d+\.\d+`.
- `jbird` (sem args) exit `1` (Commander default pra "missing command") OU exit `0` printando help — **decisao**: Commander v13 default printa help + exit 1 quando subcommand obrigatorio. Aceitar esse default. Test: `jbird` sem args, stderr contem "Usage:" ou stdout contem help.

**`packages/cli/src/commands/{cmd}/{cmd}.test.ts`** (router unit, 8 arquivos):
- `register{Cmd}(program, deps)` adiciona o command com nome correto.
- Comando aceita as flags da spec (verificar via `program.commands.find(...)`.options).
- Para comandos com subcommands (`services`, `plugins`, `config`): subcommands corretos registrados.

**`packages/cli/src/commands/{cmd}/{op}/{op}.test.ts`** (operation unit, ~13 arquivos):
- `run{Op}(opts, deps)` chama `deps.stdout.write` com mensagem contendo `"not yet implemented"` e o nome da operacao (ex: `"jbird init scaffold: not yet implemented"`).
- Retorna `Promise<void>`. Sem throw.
- (Acoplamento futuro: assinatura final ja recebe `opts` e `deps` — quando issue 009 implementar Mode A, so substitui o body.)

**Spec E2E** (`packages/cli/src/commands/{cmd}/{op}/tests/{op}.spec.ts`, ~13 arquivos):
- `runCli(['<cmd>', '<subcmd>', ...args])` exit code apropriado (`2` pra not-implemented; **vai mudar quando implementar**).
- Stdout contem `"not yet implemented"` + identificador da operacao.
- `runCli(['<cmd>', '--help'])` exit `0`, contem `"Usage:"` e nome do comando.

**Cobertura proxy/bundle**: zero alteracao. Testes existentes continuam.

**Total estimado**: ~50 unit tests + ~13 spec tests + 3 do entry. Suite continua < 1s.

### Implementacao

Ordem (cada passo Red → Green → Refactor):

1. **`shared/services/ports.ts`** — interface `Stdout`. Sem teste (interface pura).
2. **`shared/integrations/stdout.ts`** — `createStdout()`. Test unit verificando escrita + newline.
3. **`shared/test/cli.ts`** — `runCli()` movido de `jbird.test.ts`. `shared/test/index.ts` barrel exportando.
4. **Refator `jbird.test.ts`** pra usar `runCli` importado. Testes existentes continuam verde.
5. **Operations stub** — pra cada operation, criar `{op}.ts` exportando `run{Op}({ /* opts */ }, deps): Promise<void>` que escreve `"jbird {cmd} {op}: not yet implemented"` via `deps.stdout`. Test unit pareado verifica a string + retorno void. Ordem alfabetica por comando: audit/run, config/{get,set,edit}, init/{scaffold,generate}, plugins/{sync,list}, refactor/run, services/{start,stop,status,install,logs}, stats/report, tdd/run.
6. **Routers de comando** — pra cada `commands/{cmd}/{cmd}.ts`, criar `register{Cmd}(program, deps)` que registra o subcommand e roteia pro operation. Test unit verifica registro + flags.
7. **`jbird.ts` rewrite** — substitui o entry minimo: cria `program`, instancia `deps = { stdout: createStdout() }`, chama `registerX(program, deps)` pra cada comando, `program.parse()`. Test E2E (`jbird.test.ts`) ja escrito no passo 4 cobre.
8. **Specs E2E** (`tests/*.spec.ts`) — escritos por ultimo (ja precisam do entry funcional). Cada um spawnna o binario via `runCli`, verifica exit + output.
9. **Lint rule de camada em `eslint.config.mjs`** — adicionar bloco com `no-restricted-imports` patterns (detalhado abaixo). Rodar `bun run lint` pra garantir zero erro novo + zero erro de violacao real (se algum import cruzou camadas, ajustar).
10. **Atualizar `cli/package.json`** — sem deps novas. Verificar que `"main"` aponta pra `./src/jbird.ts` (ja aponta).

#### Detalhamento da lint rule de camada

Adicionar ao `eslint.config.mjs`:

```js
{
  files: ["packages/cli/src/commands/*/*.ts"],
  ignores: ["packages/cli/src/commands/*/*.test.ts"],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          { group: ["**/shared/services/*"], message: "Routers cannot import services. Pass deps from jbird.ts (composition root) or call the operation, which receives ports." },
          { group: ["**/shared/integrations/*"], message: "Routers cannot import integrations. The composition root (jbird.ts) builds infrastructure and passes it as deps." },
        ],
      },
    ],
  },
},
{
  files: ["packages/cli/src/commands/*/*/*.ts"],
  ignores: ["packages/cli/src/commands/*/*/*.test.ts", "packages/cli/src/commands/*/*/tests/**"],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          { group: ["commander"], message: "Operations receive parsed options as typed args, not Commander objects. Argv parsing belongs to the router." },
          { group: ["**/shared/integrations/*"], message: "Operations consume ports (interfaces from shared/services/ports.ts), not concrete integrations. Composition happens in jbird.ts." },
        ],
      },
    ],
  },
},
```

Notas:
- `ignores` nao se aplica a `tests/**/*.spec.ts` (spec test escreve nada de produccao, so executa).
- `commands/*/*.ts` matches **router** (`init.ts`, `tdd.ts`, ...). `commands/*/*/*.ts` matches **operation** (`scaffold/scaffold.ts`, `run/run.ts`, ...).
- Allowlist: routers podem importar `commander` (tipos), operations do mesmo command (`./{op}/{op}.ts`), tipos de `../../shared/services/ports.ts` (apenas types? — `no-restricted-imports` patterns blocam `import type` tambem por default; precisamos `allowTypeImports: true` se quisermos liberar **types** das ports pros routers, ja que routers passam `deps` com tipo `CommandDeps`). **Decisao**: `allowTypeImports: true` em ambos blocos, pra que routers possam tipar `deps.stdout: Stdout` e operations possam tipar `opts` com tipos importados de `@jbird/core` se necessario. Type imports nao geram runtime — disciplina preservada.

```js
// versao corrigida com allowTypeImports
patterns: [
  { group: ["**/shared/services/*"], message: "...", allowTypeImports: true },
  { group: ["**/shared/integrations/*"], message: "..." },
],
```

(`integrations` permanece blocado mesmo pra type imports — ports.ts ja expoe os tipos contratuais; integration nao deve vazar tipo.)

Verificar com `bun run lint` que `commands/*/*.ts` tentando `import { foo } from '../../shared/services/foo'` gera erro, e `import type { Stdout } from '../../shared/services/ports'` passa.

Trade-off considerado: instalar `eslint-plugin-boundaries` pra rule mais expressiva. Descartado — `no-restricted-imports` cobre o caso atual sem nova dep. Se camadas crescerem (mais layers, regras complexas), revisitar.

### Integracao

- `packages/cli/src/jbird.ts` — rewrite final. Composition root: cria deps + registra todos comandos.
- Sem alteracao em `packages/cli/package.json` (sem deps novas, `bin` ja correto).
- Sem alteracao em outros packages.
- `eslint.config.mjs` — adicionar 2 blocos de regra de camada.

### Documentacao a atualizar

- `docs/issues/status.md` — marcar 003 `planned` no log de execucao com timestamp; depois `in_progress` ao executar; `completed` ao terminar.
- Spec mae — **sem alteracao**. 003 implementa section 2.3 + 3.2 conforme escritas.
- Skills (`jbird-discipline`, `jbird-domain`, `tdd`) — **sem alteracao** nesta issue. A composition-root pattern (jbird.ts cria deps, routers recebem) e clean architecture canonical e ja esta implicito em "Constructor injection". Se aparecer confusao em issues seguintes, abrir follow-up pra documentar explicitamente em `jbird-discipline`.
- READMEs de package — nao criar (CLAUDE.md desencoraja `*.md` novos sem pedido explicito).

## Arquivos envolvidos

```
packages/cli/src/jbird.ts                                                   (rewrite)
packages/cli/src/jbird.test.ts                                              (refactor: usa runCli)

packages/cli/src/shared/services/ports.ts                                   (new)
packages/cli/src/shared/integrations/stdout.ts                              (new)
packages/cli/src/shared/integrations/stdout.test.ts                         (new)
packages/cli/src/shared/test/cli.ts                                         (new — moved from jbird.test.ts)
packages/cli/src/shared/test/index.ts                                       (new — barrel)

packages/cli/src/commands/init/init.ts                                      (new)
packages/cli/src/commands/init/init.test.ts                                 (new)
packages/cli/src/commands/init/scaffold/scaffold.ts                         (new — Mode A stub)
packages/cli/src/commands/init/scaffold/scaffold.test.ts                    (new)
packages/cli/src/commands/init/scaffold/tests/scaffold.spec.ts              (new)
packages/cli/src/commands/init/generate/generate.ts                         (new — Mode B stub)
packages/cli/src/commands/init/generate/generate.test.ts                    (new)
packages/cli/src/commands/init/generate/tests/generate.spec.ts              (new)

packages/cli/src/commands/tdd/tdd.ts                                        (new)
packages/cli/src/commands/tdd/tdd.test.ts                                   (new)
packages/cli/src/commands/tdd/run/run.ts                                    (new)
packages/cli/src/commands/tdd/run/run.test.ts                               (new)
packages/cli/src/commands/tdd/run/tests/run.spec.ts                         (new)

packages/cli/src/commands/audit/audit.ts                                    (new)
packages/cli/src/commands/audit/audit.test.ts                               (new)
packages/cli/src/commands/audit/run/run.ts                                  (new)
packages/cli/src/commands/audit/run/run.test.ts                             (new)
packages/cli/src/commands/audit/run/tests/run.spec.ts                       (new)

packages/cli/src/commands/refactor/refactor.ts                              (new)
packages/cli/src/commands/refactor/refactor.test.ts                         (new)
packages/cli/src/commands/refactor/run/run.ts                               (new)
packages/cli/src/commands/refactor/run/run.test.ts                          (new)
packages/cli/src/commands/refactor/run/tests/run.spec.ts                    (new)

packages/cli/src/commands/services/services.ts                              (new)
packages/cli/src/commands/services/services.test.ts                         (new)
packages/cli/src/commands/services/start/start.ts                           (new)
packages/cli/src/commands/services/start/start.test.ts                      (new)
packages/cli/src/commands/services/start/tests/start.spec.ts                (new)
packages/cli/src/commands/services/stop/stop.ts                             (new)
packages/cli/src/commands/services/stop/stop.test.ts                        (new)
packages/cli/src/commands/services/stop/tests/stop.spec.ts                  (new)
packages/cli/src/commands/services/status/status.ts                         (new)
packages/cli/src/commands/services/status/status.test.ts                    (new)
packages/cli/src/commands/services/status/tests/status.spec.ts              (new)
packages/cli/src/commands/services/install/install.ts                       (new)
packages/cli/src/commands/services/install/install.test.ts                  (new)
packages/cli/src/commands/services/install/tests/install.spec.ts            (new)
packages/cli/src/commands/services/logs/logs.ts                             (new)
packages/cli/src/commands/services/logs/logs.test.ts                        (new)
packages/cli/src/commands/services/logs/tests/logs.spec.ts                  (new)

packages/cli/src/commands/plugins/plugins.ts                                (new)
packages/cli/src/commands/plugins/plugins.test.ts                           (new)
packages/cli/src/commands/plugins/sync/sync.ts                              (new)
packages/cli/src/commands/plugins/sync/sync.test.ts                         (new)
packages/cli/src/commands/plugins/sync/tests/sync.spec.ts                   (new)
packages/cli/src/commands/plugins/list/list.ts                              (new)
packages/cli/src/commands/plugins/list/list.test.ts                         (new)
packages/cli/src/commands/plugins/list/tests/list.spec.ts                   (new)

packages/cli/src/commands/stats/stats.ts                                    (new)
packages/cli/src/commands/stats/stats.test.ts                               (new)
packages/cli/src/commands/stats/report/report.ts                            (new)
packages/cli/src/commands/stats/report/report.test.ts                       (new)
packages/cli/src/commands/stats/report/tests/report.spec.ts                 (new)

packages/cli/src/commands/config/config.ts                                  (new)
packages/cli/src/commands/config/config.test.ts                             (new)
packages/cli/src/commands/config/get/get.ts                                 (new)
packages/cli/src/commands/config/get/get.test.ts                            (new)
packages/cli/src/commands/config/get/tests/get.spec.ts                      (new)
packages/cli/src/commands/config/set/set.ts                                 (new)
packages/cli/src/commands/config/set/set.test.ts                            (new)
packages/cli/src/commands/config/set/tests/set.spec.ts                      (new)
packages/cli/src/commands/config/edit/edit.ts                               (new)
packages/cli/src/commands/config/edit/edit.test.ts                          (new)
packages/cli/src/commands/config/edit/tests/edit.spec.ts                    (new)

eslint.config.mjs                                                           (update: 2 layer-rule blocks)
docs/issues/status.md                                                       (update: log + status)
```

Total: 1 rewrite + 1 refactor + ~60 novos arquivos + 2 updates. **Volume alto** — todos sao stubs muito pequenos (~10-30 LOC cada), o boilerplate da scaffolding e o produto desta issue.

## Criterio de aceite

### Comportamento esperado

- `jbird --help` exit `0`, lista os 8 comandos: `init`, `tdd`, `audit`, `refactor`, `services`, `plugins`, `stats`, `config`.
- `jbird --version` exit `0`, format semver.
- `jbird <cmd> --help` (cada um dos 8) exit `0`, renderiza usage com flags da spec.
- `jbird services --help` lista subcommands `start`, `stop`, `status`, `install`, `logs`. Idem `plugins` (`sync`, `list`), `config` (`get`, `set`, `edit`).
- `jbird <cmd>` (executando uma operacao) exit `2`, stdout contem `"jbird <cmd> [<subcmd>]: not yet implemented"`.
- Routers contem **zero** business logic — `bun run lint` passa com a regra `no-restricted-imports` aplicada (verificacao automatica do gate de Phase 3).

### Universal gates

- `bun install` clean (sem alteracao em deps).
- `bun test` — todos passam (~63 testes).
- `bunx tsc --noEmit` — zero erros.
- `bun run lint` — zero erros, **incluindo as duas novas regras de camada**.
- `bun run build` — `bun build --compile` produz `dist/jbird` funcional. Smoke: `./packages/cli/dist/jbird --help` exit `0`.

### Cobertura

- Routers de comando (`commands/*/*.ts`): >= 80% (gate da skill `tdd`). Stubs muito pequenos — fica facilmente em 100%.
- Operations (`commands/*/*/*.ts`): >= 90%. Stubs sao 1 linha de output — 100%.
- Helpers (`shared/integrations/stdout.ts`, `shared/test/cli.ts`): >= 95%.

### Disciplina

- Sem `any` introduzido.
- Sem `console.log`/`console.info` (uso autorizado: `console.warn`/`console.error` por allowlist global; nenhum dos arquivos novos deve usar).
- Sem static methods (funcoes exportadas).
- Sem cross-camada import (lint rule garante).
- Cada operation expoe `run{Op}(opts, deps): Promise<void>` — assinatura final, body stub.
- `init` Mode A vs Mode B em operations separadas (alinhado com SRP).
- `runCli` centralizado em `shared/test/cli.ts` — `Bun.spawn` direto em spec test e proibido por convencao (skill tdd reforca).

### Side-effects observaveis

- `dist/jbird` produzido pelo build executavel standalone.
- Comandos stub nao escrevem em FS, nao tocam `~/.jbird/`, nao spawnam processos. Verificar por inspecao do diff.

## Decisoes alinhadas com o user (2026-05-03)

Confirmadas em discussao antes do execute:

1. **Exit code `2`** pra placeholders. Convencao Unix (misuse of command). `0` esconderia, `1` colidiria com erros reais futuros.
2. **Mode A e Mode B em duas operations separadas** (`scaffold/` e `generate/`). SOLID. Leve desvio nominal da spec (que cita "scaffold.ts" como operation unica), mas alinha com SRP e prepara terreno pra issues 009/010 ja quebradas separadas. Notar no log de execucao.
3. **Lint rule via `no-restricted-imports` built-in**. O mais simples vence. Sem dep nova.
4. **Port `Stdout` minima** (`write(line)`). Cada coisa no seu tempo — Logger entra em 004 com NDJSON file handler.

## Notas

- Volume de arquivos alto (~60 novos), mas cada um tem ~10-30 LOC. Boilerplate da scaffolding e o entregavel.
- Composition root pattern (`jbird.ts` instancia infraestrutura, routers recebem) nao esta documentado explicitamente em `jbird-discipline`. Implicito em "Constructor injection" + "Routers nao tocam I/O". Avaliar se vale extender a skill apos esta issue.
- Issue 004 vai promover `runCli` pra ter `setupTestRepo`, e substituir `Stdout` por `Logger` pleno em operations conforme cada uma ganha implementacao real.
- `pathLooksEmpty()` em `init.ts` e stub em 003 (sempre `false`); FS check real entra em 009.
- TS 6.0.3 ainda ativo (TS 7.0 nao publicado, registrado em 001/002). Sem impacto.
- Build de `@jbird/cli` continua produzindo `dist/jbird` standalone — verificar smoke apos rewrite.
