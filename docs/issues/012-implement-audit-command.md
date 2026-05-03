# 012 — Implement jbird audit command

## Overview

`jbird audit [path] [--scope quality|security|architecture|all] [--format md|json] [--output <path>]`. `AuditOrchestrator` service. Sub-agentes `audit-reporter-quality`, `-security`, `-architecture` no bundle (desde phase 8). `ReportRenderer` pra markdown/JSON output. Parallel sub-agent fan-out, findings em caveman format, aggregation com dedupe + sort por severity + group por file.

Referencia: spec section 3.2.3 (jbird audit) + Phase 12.

Criterio de aceite (high-level): spec test com fixture project com issues conhecidas produz report contendo essas issues, formatado corretamente em markdown e JSON. Findings caveman-formatadas pelos sub-agentes, agregadas corretamente pelo orchestrator.

Depende de: 009.
