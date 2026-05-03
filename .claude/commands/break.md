---
description: Quebrar spec em issues numeradas com status tracking
argument-hint: @docs/specs/{feature}.md ou @docs/specification.md
---

# Break

Instructions: $ARGUMENTS

Quebrar a spec em issues individuais.

1. Ler a spec indicada e `docs/specification.md` (mae) se a passada nao for ela.
2. Criar `docs/issues/`, uma issue por arquivo, prefixada (`001-`, `002-`, ...).
3. Cada issue tem **apenas titulo + breve overview**. Detalhamento vem no `/plan`.
4. Respeitar dependencias da spec (campo "Depende de"):
   - `@jbird/core` (types/schemas) antes de qualquer consumidor.
   - Ports/integrations antes de Services dependentes.
   - Services antes de Operations.
   - Operations antes de Commands.
   - Bundle entries antes de testar `BundleMaterializer`.
   - Proxy passthrough antes de routing ativo.
5. Issues isoladas por package — nao misturar mudancas em `core` com `cli` na mesma issue.

## Naming

- `001-setup-{package}-{area}.md`
- `002-implement-{operation}-in-{command}.md`
- `003-add-{handler}-to-proxy.md`
- `004-bundle-{kind}-{name}.md`
- `005-integrate-{a}-with-{b}.md`
- `006-config-{capability}.md`

## status.md

Apos criar issues, gerar `docs/issues/status.md`:

```markdown
# Status do Projeto

Ultima atualizacao: {timestamp ISO 8601}

## Spec
{docs/specification.md ou docs/specs/{feature}.md}

## Issues
- [ ] 001-nome.md - pending
- [ ] 002-nome.md - pending

## Resumo
Total: X | Concluidas: 0 | Em andamento: 0 | Pendentes: X | Falharam: 0

## Log de Execucao
(Entradas adicionadas conforme issues sao processadas, com timestamp)

## Notas
(Decisoes, blockers, observacoes)
```

Se a quebra gerar > 10 issues, dividir a spec em fases ou sub-specs. Se uma issue ja indica que precisa Service complexo (>200 LOC esperado) ou orquestracao multi-agent, sinalizar no overview.
