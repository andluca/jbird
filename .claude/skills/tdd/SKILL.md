---
name: tdd
description: Disciplina TDD para o monorepo jbird — Red-Green-Refactor, suffixos `.test.ts` (unit) e `.spec.ts` (E2E via runCli), behavioral assertions, mocks na fronteira, cobertura por camada. Consultar ao implementar qualquer service, operation, route do proxy ou helper.
---

# TDD — jbird

Codigo de producao nao entra sem teste falhando primeiro.

## Ciclo

1. **Red** — escrever teste do comportamento esperado. Rodar. Falha pelo motivo certo (comportamento ausente, nao sintaxe).
2. **Green** — minimo codigo pra passar. Nada alem.
3. **Refactor** — questionar decisoes do Green. Nomes, decomposicao, duplicacao, mocks na fronteira correta. Manter verde a cada movimento.

## Dois suffixos

| Suffix | Runner | Use para |
|---|---|---|
| `.test.ts` | `bun:test`, chamada direta | Logica pura em services, models, integrations, helpers |
| `.spec.ts` | `bun:test` + `runCli()` em temp dir | E2E: spawna `jbird`, verifica side-effects FS, exit code, stdout |

Ink components (`.test.tsx`) deferred — spec section 2.10.

## Funcoes puras (`.test.ts`)

<example>
```typescript
import { describe, expect, it } from 'bun:test';
import { estimateTokens, hasArchitecturalKeywords } from '../routing-policy';

describe('estimateTokens', () => {
  it('approximates by character count divided by 4', () => {
    expect(estimateTokens('hello world')).toBe(3);
  });

  it('returns 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });
});

describe('hasArchitecturalKeywords', () => {
  it('flags refactor keyword', () => {
    expect(hasArchitecturalKeywords('please refactor this')).toBe(true);
  });
});
```
</example>

Sem setup, sem mock, sem framework. Microsegundos.

## Service com ports (`.test.ts`)

<example>
```typescript
import { describe, expect, it, mock } from 'bun:test';
import { BundleMaterializer } from './BundleMaterializer';

const makeFs = () => ({
  readFile: mock(async () => 'content'),
  writeFile: mock(async () => undefined),
  exists: mock(async () => false),
  hash: mock(async () => 'sha256:0'),
});

const makeManifestStore = () => ({
  read: mock(async () => ({ files: [] })),
  write: mock(async () => undefined),
});

describe('BundleMaterializer', () => {
  it('writes a bundle file when target does not exist', async () => {
    const fs = makeFs();
    const materializer = new BundleMaterializer(fs, makeManifestStore(), makeLogger());

    await materializer.materialize([
      { source: '/bundle/skills/x.md', target: '/.claude/skills/x.md', hash: 'sha256:abc' },
    ]);

    expect(fs.writeFile).toHaveBeenCalledWith('/.claude/skills/x.md', 'content');
  });

  it('skips write when content hash matches existing file', async () => {
    const fs = makeFs();
    fs.exists = mock(async () => true);
    fs.hash = mock(async () => 'sha256:abc');
    const materializer = new BundleMaterializer(fs, makeManifestStore(), makeLogger());

    await materializer.materialize([
      { source: '/bundle/skills/x.md', target: '/.claude/skills/x.md', hash: 'sha256:abc' },
    ]);

    expect(fs.writeFile).not.toHaveBeenCalled();
  });
});
```
</example>

Mockar na fronteira do modulo (port) — nunca a classe sob teste, nunca logica interna.

## CLI E2E (`.spec.ts`)

<example>
```typescript
import { describe, expect, it } from 'bun:test';
import { runCli, setupTestRepo } from '@jbird/cli/shared/test';

describe('jbird init (Mode A)', () => {
  it('scaffolds a project with .jbird/config.toml when invoked on existing repo', async () => {
    const repo = await setupTestRepo({ kind: 'bun-package' });

    const result = await runCli(['init', repo.path, '--no-index', '--no-shell-setup']);

    expect(result.exitCode).toBe(0);
    expect(await repo.exists('.jbird/config.toml')).toBe(true);
    expect(await repo.exists('.claude/rules/jbird.md')).toBe(true);
  });

  it('is idempotent', async () => {
    const repo = await setupTestRepo({ kind: 'bun-package' });
    await runCli(['init', repo.path, '--no-index', '--no-shell-setup']);

    const before = await repo.snapshotHashes();
    await runCli(['init', repo.path, '--no-index', '--no-shell-setup']);
    const after = await repo.snapshotHashes();

    expect(after).toEqual(before);
  });
});
```
</example>

`runCli` e `setupTestRepo` vivem em `shared/test/`. Nao chame `Bun.spawn` direto em spec. Specs do proxy usam instancia efemera em porta aleatoria.

## Behavioral assertions

Teste afirma o que o codigo faz, nao como.

<example caption="Certo — comportamental">
```typescript
it('routes refactor prompts to opus', () => {
  expect(policy.decide(req('please refactor this module'), config).model).toBe('opus');
});
```
</example>

<example caption="Errado — testa implementacao">
```typescript
it('calls hasArchitecturalKeywords before estimateTokens', () => {
  policy.decide(req('foo'), config);
  expect(spy.hasArchitecturalKeywords).toHaveBeenCalledBefore(spy.estimateTokens);
});
```
</example>

Assert no retorno, nas excecoes, ou no estado observavel (FS escrito, journal gravado, request forwardado, exit code). `toHaveBeenCalledWith` ok pra verificar contrato com fronteira (port recebeu valor correto), nao pra ordem de chamadas.

## Estrutura describe

- `describe` externo: nome da classe ou funcao publica.
- `describe` interno: metodo ou cenario.
- `it`: comportamento, nao implementacao.

## O que testar primeiro

1. Happy path.
2. Edge cases — input vazio, valor no limite (token_estimate exato 500), config sem rules.
3. Erros — FS read falha, upstream timeout, info file orfao, manifest corrompido.

## Cobertura minima (validation gate)

| Area | % |
|---|---|
| Services em `shared/services/` | 90 |
| Funcoes puras (helpers, schemas, RoutingPolicy) | 95 |
| Routers de comando | 80 |
| Operations | 90 |
| Proxy handlers | 90 |

`bun test --coverage` em CI.

## Workflow por unidade

1. Identificar contrato — entrada, saida, side-effects observaveis.
2. Separar logica pura de orquestracao.
3. Red `.test.ts` puro → Green funcao exportada.
4. Red `.test.ts` service com ports → Green classe.
5. Red `.spec.ts` se for E2E → Green ajustes.
6. Refactor.

## Bruno para API tests

Quando o teste cobre rota HTTP do proxy, use `BrunoRunner` em `shared/integrations/bruno.ts`. Nao curl direto no spec — `.bru` files versionados.
