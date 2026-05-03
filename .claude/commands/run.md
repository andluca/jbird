---
description: Planejar e executar uma issue em sequencia (/plan + /execute)
argument-hint: @docs/issues/{issue-file}.md
---

# Run

Instructions: $ARGUMENTS

Rodar `/plan` e `/execute` em sequencia, sem pausa entre as duas fases.

1. Executar `/plan` com `$ARGUMENTS` ate o final (issue atualizada com plano, marcada `planned`).
2. Executar `/execute` com `$ARGUMENTS` ate o final (TDD, gates, code-review-partner, marcada `completed`).

Use quando a issue e clara o suficiente que voce nao precisa pausar pra revisar o plano antes de implementar. Caso contrario, rode `/plan` e `/execute` separadamente.

Se durante o `/plan` aparecer decisao nao-obvia ou a issue revelar que precisa ser quebrada, **abortar antes do `/execute`** e reportar ao user.
