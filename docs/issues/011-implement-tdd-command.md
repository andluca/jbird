# 011 — Implement jbird tdd command

## Overview

`jbird tdd "<work>" [--mode feature|change|bug] [--stack <runner>] [--max-iterations 5]`. `TddOrchestrator` service. Sub-agentes `tdd-test-writer` e `tdd-refactorer` (no bundle desde phase 8) + reuso de `cavecrew-investigator` e `cavecrew-builder`. `TestRunner` abstraction sobre Bruno + native runners (bun:test, vitest, jest, pytest, cargo test). Suporte aos 3 modos. Phase-by-phase status reporting em caveman, full-prose summary no final.

Referencia: spec section 3.2.2 (jbird tdd) + Phase 11.

Criterio de aceite (high-level): spec test com fixture project + descricao conhecida completa o full Red → Green → Refactor loop. Verificar test-writer produz testes que falham (red gate enforced), builder faz pass sem tocar arquivos nao-relacionados, refactorer preserva green.

Depende de: 009.
