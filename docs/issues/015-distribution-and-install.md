# 015 — Distribution and install

## Overview

`bun build --compile` packaging do `@jbird/cli` (single-file binary com deps inlined). npm publish setup (`bin` entry no package.json). README e install docs. Smoke tests em clean macOS + Linux container — full flow: install → `jbird services start` → `jbird init <existing project>` → real Claude Code session atraves do proxy → routing decisions logadas → `jbird stats` mostra dados esperados.

Referencia: spec section 2.11 (Build & Distribution) + Phase 15.

Criterio de aceite (high-level): fresh install funciona em clean macOS + clean Linux container, full smoke flow passa end-to-end.

Depende de: todas as anteriores.
