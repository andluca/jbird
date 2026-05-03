---
description: Planejar implementacao detalhada de uma issue
argument-hint: @docs/issues/{issue-file}.md
---

# Plan

Instructions: $ARGUMENTS

Atualizar a issue com plano detalhado. Nao implementar — apenas escrever o plano.

1. Ler a issue.
2. Ler `docs/specification.md` e qualquer `docs/specs/{feature}.md` referenciado.
3. Explorar codigo existente nos packages tocados (`/explore` se a area e grande).
4. Consultar skills: `jbird-domain` (proxy/bundle/regra/sub-agentes/comandos), `jbird-discipline` (camadas/ports/schemas/naming), `tdd` (forma dos testes, cobertura).

## Estrutura do plano na issue

```markdown
# {Titulo}

## Overview
{breve descricao — vinda do break}

## Contexto

### O que ja existe
- `packages/core/src/...`
- `packages/cli/src/...`
- `packages/proxy/src/...`
- `packages/bundle/src/...`

Testes existentes que sao referencia de pattern.

### Referencia na spec
Section da spec mae ou `docs/specs/{feature}.md` (ex: "section 2.7 — API Routing Proxy").

### Decisoes ja tomadas que afetam essa issue
Bullets curtos. Ex: "RoutingPolicy.decide e pura — sem I/O", "Materialize idempotente via content hash".

## Plano

### Schemas e tipos (@jbird/core, se aplicavel)
- Schema Zod e local: `packages/core/src/schemas/{name}.ts`
- Tipo exportado: `packages/core/src/types/{name}.ts`
- Round-trip test esperado
- Atualizacao de `packages/core/src/index.ts`

### Ports e integrations (se aplicavel)
- Port nova: interface em `packages/cli/src/shared/services/ports.ts`
- Implementacao concreta em `packages/cli/src/shared/integrations/{name}.ts`
- Casos de erro que a port sinaliza

### Testes (escrever primeiro)
Listar com `describe`/`it` planejados e arquivo:
- Unit: `packages/cli/src/commands/{cmd}/{op}/{op}.test.ts`
- Service unit: `packages/cli/src/shared/services/{Service}.test.ts`
- Spec E2E: `packages/cli/src/commands/{cmd}/{op}/tests/{op}.spec.ts`
- Proxy: `packages/proxy/src/{area}/{thing}.test.ts` + `tests/{thing}.spec.ts` (instancia efemera)

### Implementacao
Passo a passo na ordem. Indicar arquivo e camada (Command/Operation/Service/Infrastructure).
- Justificar extracao pra Service (ex: ">150 LOC esperados, melhor isolar pra teste").
- Proxy: handler, route path, headers respeitados, journal events.
- Bundle: entries adicionadas, referencia no manifest.

### Integracao
- Referencia em `packages/cli/src/jbird.ts`.
- Atualizacoes de barrel `index.ts`.
- Comando novo: registro `bin` em `package.json`.
- Sub-agent novo: registro no manifest do bundle.

### Documentacao a atualizar
- `docs/specification.md` se introduz comportamento nao-coberto (raro).
- Skill em `.claude/skills/{skill}/SKILL.md` se altera convencao reusavel.
- README do package se API publica muda.

## Arquivos envolvidos
Lista plana.

## Criterio de aceite
- Testes especificos passando.
- Universal gates: `bun test`, `bunx tsc --noEmit`, `bun run lint`, `bun run build`.
- Cobertura: 90% Services / 95% puras / 80% Command routers / 90% Operations.
- Sem `any` novo, sem `console.log` novo.
- Side-effects verificados (FS materializado, journal, request forwardado, exit code).
- Idempotencia preservada onde aplicavel.
```

5. Atualizar `docs/issues/status.md`: marcar issue `planned`, adicionar entrada no Log de Execucao com timestamp.
