# 005 — Implement proxy passthrough daemon

## Overview

`@jbird/proxy` Hono server escutando na porta 7878. Recebe requests no formato Anthropic Messages API, forwarda upstream untouched (sem routing ainda), streama respostas back. OAuth pass-through verificado (Authorization header forwardado sem inspecionar). Endpoint `/health`.

Referencia: spec section 2.7 (API Routing Proxy) + Phase 5.

Criterio de aceite (high-level): proxy starta, responde em `/health`, aceita passthrough request e forwarda corretamente (verificado contra mock upstream), Authorization header passthrough sem alteracao, SSE streams forwardam sem buffering.

Depende de: 002.
