# 002 — Implement core types and schemas

## Overview

Implementar `@jbird/core`: todos os tipos compartilhados (`ModelId`, `ModelMeta`, `RoutingDecision`, `Classification`, `NormalizedRequest`, `UpstreamRequest`, `Usage`, etc), todos os schemas Zod (config TOML, journal events, IPC requests/responses, bundle manifest), `Logger` interface, classes de erro (`ConfigError`, `BundleError`, `ProxyError`, `ServiceLifecycleError`, `IpcError`).

Referencia: spec sections 2.6, 2.7, 2.9 + Phase 2.

Criterio de aceite (high-level): round-trip test em todos os schemas (parse → serialize → parse equals input), 100% dos tipos publicos exportados de `packages/core/src/index.ts`, dependency-free runtime.

Depende de: 001.
