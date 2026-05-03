---
description: Criar spec completa de uma feature ou subsistema do jbird
argument-hint: descricao da feature
---

# Spec

Instructions: $ARGUMENTS

Criar spec completa pra feature ou subsistema descrito. Output em `docs/specs/{nome}.md`.

1. Ler `docs/specification.md` (spec mae) e qualquer `docs/specs/{feature}.md` relacionado.
2. Consultar skills `jbird-domain`, `jbird-discipline`, `tdd`.
3. Se for refatoracao, explorar `packages/*/src/` pra mapear comportamento atual (use `/explore` se a area e grande).
4. Se a feature ja esta na spec mae, **referenciar a section** em vez de duplicar.

## Estrutura

```markdown
# Spec: {Nome}

## Resumo
Um paragrafo. O que e, o que cobre, package alvo (`@jbird/core`/`cli`/`proxy`/`bundle`), fase da spec mae se aplicavel.

## 1. Objetivo e Contexto
**Objetivo:** o que entrega.
**Contexto:** o que existe, por que muda, o que NAO muda. Citar section da spec mae quando aplicavel.

## 2. Fundacao
Decisoes locais a essa feature. Nao repetir decisoes ja na spec mae. Schemas Zod novos, ports novas, integrations novas, sub-agentes novos.

## 3. Feature(s)
Para cada unidade:
- Schema/contratos (tipos exportados, IPC, manifest entries)
- Operations (Command → Operation → Service → Infrastructure mapeado)
- Comportamento detalhado (fluxos, edge cases)
- Side-effects observaveis (FS, journal, sub-agent, HTTP)
- Patterns especificos (streaming, gating, idempotencia, retry, escalation)

## 4. Validation Gates
Universais (toda fase): `bun test`, `bunx tsc --noEmit`, `bun run lint`, `bun run build`, sem `any` novo, sem `console.log` novo.

Tabela com gate especifico por fase desta spec.

## 5. Implementation Phases
Tabela: # | Phase | Descricao | Status | Depende de.

Schemas em `@jbird/core` antes de consumidores. Ports antes de Services. Services antes de Operations. Operations antes de Commands. Manter <= 10 phases.

## 6. Decisoes
Tabela: Decisao | Escolha | Alternativa descartada | Motivo.

Apenas decisoes nao-obvias **especificas dessa spec**. Decisoes da spec mae nao reaparecem.
```

So implementavel — sem wishlist. Apos escrita, quebrar em issues via `/break`.
