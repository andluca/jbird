# 001 — Setup monorepo skeleton

## Overview

Criar o esqueleto do monorepo Bun com os quatro packages (`@jbird/core`, `@jbird/cli`, `@jbird/proxy`, `@jbird/bundle`), `package.json` com workspaces, `tsconfig.base.json` compartilhado, lint config (ESLint + `@typescript-eslint/strict-type-checked`), CI basico, e binario `jbird` vazio que imprime help.

Referencia: spec section 2.2 (Repository Layout) + Phase 1.

Criterio de aceite (high-level): `bun install` succeeds from clean, todos os 4 packages buildam, binario `jbird` printa help.

Sem dependencias de outras issues.
