# 006 — Implement service supervision

## Overview

`ServiceManager` em `@jbird/cli`. Comandos `jbird services start/stop/status/logs`. Detached spawn via `Bun.spawn({ detached: true, stdio: 'ignore' })`, info file em `~/.jbird/services/proxy.info` (PID, port, version, started_at), health polling apos spawn, signal 0 pra existence check, SIGTERM com 5s timeout + SIGKILL fallback, orphan info file cleanup + restart.

Referencia: spec section 2.4 (Side Services) + Phase 6.

Criterio de aceite (high-level): `services start` spawna detached proxy que sobrevive ao exit do CLI, `status` reporta corretamente, `stop` termina cleanly, orphan info file limpo e daemon restartado na proxima invocacao.

Depende de: 004, 005.
