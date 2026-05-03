# 007 — Implement routing policy and provider abstraction

## Overview

`ModelProvider` interface, `AnthropicProvider` implementation (cobre Opus, Sonnet, Haiku via OAuth pass-through), `RoutingPolicy` como funcao pura consumindo regras de config. Proxy passa a aplicar routing em vez de pure passthrough. Mecanismo de `injectDirectives` pra Sequential Thinking gating em rotas non-Opus. Per-decision journal logging (`RoutingDecision` em `~/.jbird/logs/proxy.log` NDJSON).

Referencia: spec section 2.7 (Provider abstraction, RoutingPolicy, Sequential Thinking gating) + section 3.1.1 + Phase 7.

Criterio de aceite (high-level): `RoutingPolicy.decide()` puro (property test confirma determinismo), `AnthropicProvider` mapeia cada regra de fixture config pra rota esperada, Sequential Thinking directive injetada apenas em rotas non-Opus.

Depende de: 005, 004.
