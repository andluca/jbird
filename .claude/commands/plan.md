---
description: Planejar implementacao detalhada de uma issue (dispatcha subagent planner em Opus)
argument-hint: @docs/issues/{issue-file}.md
---

# Plan

Instructions: $ARGUMENTS

Dispatchar o subagent `planner` (model: opus) com a issue passada como input. O subagent escreve o plano detalhado dentro do issue file e atualiza `docs/issues/status.md` para `planned`.

Invocacao: Agent tool com `subagent_type: planner` e prompt incluindo o caminho da issue + qualquer contexto que o user passou.

Apos retorno, sumarizar pra mim em 3 bullets: (1) caminho da issue, (2) o que esta no plano, (3) flags pra revisar antes de executar.
