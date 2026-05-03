---
description: Executar uma issue planejada seguindo TDD
argument-hint: @docs/issues/{issue-file}.md
---

# Execute

Instructions: $ARGUMENTS

Implementar a issue seguindo o plano e disciplina TDD.

1. Ler a issue (deve ja ter plano via `/plan`).
2. Consultar skills `tdd` e `jbird-discipline`. Se a issue toca proxy/bundle/comandos ativos/regra, consultar `jbird-domain`.
3. Atualizar `docs/issues/status.md`: marcar issue `in_progress`.

## Ciclo TDD por item do plano

1. **Red** — testes conforme planejado (`.test.ts` co-localizado, `.spec.ts` em `tests/`). Rodar `bun test --watch packages/{pacote}/src/{area}`. Confirmar falha pelo motivo certo.
2. **Green** — minimo pra passar. Respeitar camadas (Command → Operation → Service → Infrastructure), ports na fronteira, schemas em `@jbird/core`, sem `console.log`, sem `any`. Service novo recebe ports no constructor.
3. **Refactor** — mantendo verde. Naming, decomposicao, magic values pra constants, imports respeitando camadas, cross-package via barrel.
4. Proximo item.

## Validation gates antes de marcar `completed`

Rodar todos:

1. `bun test packages/{pacote}` — passa.
2. `bun test` — suite completa passa (verificar nada regrediu).
3. `bunx tsc --noEmit` — zero errors.
4. `bun run lint` — zero erros.
5. `bun run build` — CLI compila com `bun build --compile`, proxy entry compila.
6. `bun test --coverage` — thresholds (90% Services / 95% puras / 80% routers / 90% Operations / 90% proxy handlers).
7. Idempotencia onde aplicavel (rodar `init` 2x, conferir zero file changes na 2a).
8. Journal NDJSON correto onde aplicavel.

## Conclusao

1. Marcar issue `completed` em `docs/issues/status.md` com timestamp + bullets do que foi entregue.
2. Atualizar arquivos referenciados em "Documentacao a atualizar".
3. Conventional Commit com scope do package: `feat(cli):`, `fix(proxy):`, `refactor(core):`, `chore(bundle):`. Stage, nao commit.

## Falha

Nao marcar `completed`. Detalhes do erro no Log de Execucao + Notas. Sub-agent em loop ate iteration cap → surfacar full transcript, deixar artifacts no FS, exit non-zero.

## Code review apos execute

Rodar `code-review-partner` no diff produzido. Fix critical antes de marcar `completed`. Warnings podem virar issue follow-up se nao bloqueiam aceite.
