# 003 — Implement CLI scaffolding

## Overview

Implementar `@jbird/cli/src/jbird.ts` (router top-level via Commander) e os stubs de Command/Operation pra todos os comandos: `init`, `tdd`, `audit`, `refactor`, mais admin (`services`, `plugins`, `stats`, `config`). Cada comando imprime "not yet implemented" com help text. Lint rules de camada em vigor (Command nao importa Service/Infrastructure direto).

Referencia: spec section 2.3 (Three-Layer CLI Architecture) + Phase 3.

Criterio de aceite (high-level): `jbird --help` lista os 4 comandos + admin, cada `--help` renderiza, routers contem zero business logic (verificado por import-graph lint rule).

Depende de: 002.
