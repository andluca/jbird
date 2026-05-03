# 004 — Implement configuration and state

## Overview

Bootstrap de `~/.jbird/`: directory creation com permissions 700, config loading global + project (com override semantics e Zod merge), NDJSON journal writer, comando `jbird config get/set/edit`.

Referencia: spec section 2.6 (Configuration & State) + Phase 4.

Criterio de aceite (high-level): ler config inexistente retorna defaults sem erro, write-then-read round-trips, project config sobrescreve global per Zod merge logic, state directory auto-criado com permissions corretas.

Depende de: 002.
