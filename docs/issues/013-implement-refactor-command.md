# 013 — Implement jbird refactor command

## Overview

`jbird refactor "<target>" [--scope <path>] [--gates test,lint,build]`. `RefactorOrchestrator` service. Sub-agent `refactor-verifier` no bundle. Multi-phase flow (analyze via `cavecrew-investigator` → plan via Opus-routed planner → confirm com user → apply via `cavecrew-builder` sub-agentes → run gates via `GateRunner` com retry no `refactor-verifier`). Strict no-commit guarantee — apenas stage.

Referencia: spec section 3.2.4 (jbird refactor) + Phase 13.

Criterio de aceite (high-level): spec test com fixture project + refactor prompt produz plano, aplica apos confirmation, roda gates, surfacea falhas corretamente. Critico: nunca commita ou pusha (verificado conferindo git state apos operacao).

Depende de: 009, 011.
