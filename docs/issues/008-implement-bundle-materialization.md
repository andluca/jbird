# 008 — Implement bundle materialization

## Overview

`@jbird/bundle`: manifest schema, caveman skill vendored em versao pinada, MCP configs (context-lens, sequential-thinking, n8n, firecrawl, gitnexus, caveman-compress), sub-agent definitions (cavecrew + tdd + audit + refactor + project-architect), regra `jbird` operacional, settings fragments. `BundleMaterializer` service em `@jbird/cli`. Comandos `jbird plugins sync/list`.

Referencia: spec section 2.5 (Plugin Bundle System) + section 3.1.6 (Operating Rule) + Phase 8.

Criterio de aceite (high-level): `materialize()` idempotente (segunda execucao = zero file changes via content hash), arquivos fora de `.jbird-managed` nunca tocados, remover entry do manifest remove o arquivo correspondente no proximo sync.

Depende de: 004.
