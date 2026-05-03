---
description: Plan + execute em sequencia (Opus planeja, Sonnet executa)
argument-hint: @docs/issues/{issue-file}.md
---

# Run

Instructions: $ARGUMENTS

Dispatchar `planner` (Opus) e depois `executor` (Sonnet) em sequencia, sem pausa entre as duas fases.

1. Agent tool com `subagent_type: planner` — passar caminho da issue. Esperar retorno.
2. Se planner retornar `blocked` ou flagar decisao nao-obvia, **abortar antes do execute** e reportar pro user.
3. Agent tool com `subagent_type: executor` — passar caminho da issue. Esperar retorno.
4. Sumarizar saida final pro user: o que foi planejado, o que foi entregue, gates verdes, status do commit staged.

Use quando a issue e clara o suficiente que voce nao precisa pausar pra revisar o plano. Caso contrario, rode `/plan` e `/execute` separadamente.
