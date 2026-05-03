---
name: tdd
description: Disciplina TDD para o monorepo jbird — Red-Green-Refactor com peso no Refactor, suffixos `.test.ts`/`.spec.ts`, behavioral only, mocks na fronteira, cobertura por camada. Consultar ao implementar service, operation, route do proxy ou helper.
---

# TDD — jbird

Codigo de producao nao entra sem teste falhando primeiro.

## Ciclo

1. **Red** — teste do comportamento esperado. Falha pelo motivo certo (comportamento ausente, nao sintaxe).
2. **Green** — minimo codigo pra passar. Nada alem.
3. **Refactor** — **passo mais critico, nao pular.** Questionar cada decisao do Green: nomes obscuros, duplicacao, mock no nivel errado, magic value sem constante, funcao > 60 LOC, nesting > 2, helper que devia ser servico. Mover, renomear, extrair. Manter verde a cada movimento. So vai pro proximo ciclo quando o codigo nao tem nada que voce mudaria.

Sem Refactor, TDD vira "tests + lixo verde". Tempo gasto aqui paga juros compostos.

## Dois suffixos

| Suffix | Runner | Use para |
|---|---|---|
| `.test.ts` | `bun:test`, chamada direta | Logica pura, services com ports, helpers |
| `.spec.ts` | `bun:test` + `runCli()` em temp dir | E2E: spawna `jbird`, verifica FS, exit code, stdout |

Ink components (`.test.tsx`) deferred — spec section 2.10. `bun:test` apenas — sem vitest, sem jest.

## Helpers do projeto

- `runCli(args)` e `setupTestRepo({ kind })` em `packages/cli/src/shared/test/`. Nao chamar `Bun.spawn` direto em spec.
- `BrunoRunner` em `shared/integrations/bruno.ts` pra rotas HTTP do proxy (`.bru` files versionados).
- Specs do proxy usam instancia efemera em porta aleatoria.

Mockar na fronteira do modulo (port: FS, HTTP, child-process) — nunca a classe sob teste, nunca logica interna.

## Behavioral only — implementation tests sao lixo

Teste afirma o que o codigo **faz**, nao como. Heuristica: se trocar a implementacao por outra equivalente e o teste continua passando, e behavioral. Se quebra sem mudanca de comportamento, e implementation test — deletar.

Assert no retorno, excecao, ou estado observavel (FS escrito, journal gravado, request forwardado, exit code). `toHaveBeenCalledWith` ok pra contrato com port; nunca pra ordem de chamadas.

### Anti-patterns proibidos

Tudo que `tsc --noEmit` ja garante nao vira teste runtime. Se escreveu, delete:

- **Existencia de export** — `expect(X).toBeDefined()`, smoke imports, loops de `toBeDefined`.
- **Compilacao de tipo** — `_typeAssertions()` com `void _x`, "type smoke" instanciando interface inline.
- **Cardinalidade de union** — `expect(levels).toHaveLength(4)`. Switch sem default ja falha em caso novo.
- **Cadeia de heranca** — `instanceof` repetido por subclasse. 1x em loop ok se ha quirk real (Error subclass pre-ES2022).
- **Mock-retorna-mock** — assert no proprio mock que voce setou. Nao testa nada.
- **Ordem de chamadas internas** — `toHaveBeenCalledBefore`, sequencia em `mock.calls`.

## O que testar primeiro

1. Happy path.
2. Edge — input vazio, valor no limite (token_estimate exato 500), config sem rules.
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
