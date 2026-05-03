---
description: Executar uma issue planejada (dispatcha subagent executor em Sonnet)
argument-hint: @docs/issues/{issue-file}.md
---

# Execute

Instructions: $ARGUMENTS

Dispatchar o subagent `executor` (model: sonnet) com a issue passada como input. O subagent segue o plano via TDD, roda validation gates, dispatcha `code-review-partner`, atualiza status e stagea commit.

Pre-condicao: a issue deve ja ter plano (via `/plan` ou `planner`). Se nao tiver, abortar e pedir `/plan` primeiro.

Invocacao: Agent tool com `subagent_type: executor` e prompt incluindo o caminho da issue.

Apos retorno, sumarizar pra mim em bullets: arquivos criados/alterados, gates verdes, criticals resolvidos, status final, mensagem do commit staged.
