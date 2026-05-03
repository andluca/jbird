# 009 — Implement jbird init Mode A (adopt existing project)

## Overview

`jbird init [path]` quando o path contem codigo existente: detectar tipo de projeto (`package.json`, `pyproject.toml`, `Cargo.toml`, etc), gerar `.jbird/config.toml` com defaults detectados, materializar bundle em `.claude/`, scaffoldar `CLAUDE.md` com convencoes do projeto, trigger initial Context-Lens indexing (skippable via `--no-index`), check shell profile pra `ANTHROPIC_BASE_URL` setup (skippable via `--no-shell-setup`), verificar proxy is running.

Referencia: spec section 3.2.1 (jbird init) + Phase 9.

Criterio de aceite (high-level): spec test com empty git repo + `jbird init` produz `.jbird/config.toml` valido, `.claude/` materializado, `CLAUDE.md` scaffoldado, indexacao via Context-Lens. Re-rodar `init` e idempotente e prompta antes de overwrite em `CLAUDE.md`.

Depende de: 006, 007, 008.
