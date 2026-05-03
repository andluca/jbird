# 014 — Implement jbird stats command

## Overview

`jbird stats [--since 7d] [--json]`. Journal aggregation (proxy decisions, command invocations, materializations) lendo NDJSON de `~/.jbird/logs/`. Default 7-day window, configurable via `--since`. JSON mode pra scripting. Output mostra: total prompts routed, model distribution, average prompt size, top 5 most expensive prompts (em quota units, nao dolares — user esta no Max OAuth).

Referencia: spec section 3.1.5 (Observability) + section 3.2.5 (Admin Layer) + Phase 14.

Criterio de aceite (high-level): `stats`, `config`, `plugins` produzem output esperado contra journals/configs de fixture.

Depende de: 007.
