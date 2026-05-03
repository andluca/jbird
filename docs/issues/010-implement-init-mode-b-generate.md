# 010 — Implement jbird init Mode B (generate from prompt)

## Overview

`jbird init --prompt "<descricao>"` ou path vazio/inexistente: `ProjectGenerator` service spawnando `project-architect` sub-agent (Opus-routed) que produz blueprint, blueprint confirmation interativa com user, materialize project skeleton via `cavecrew-builder` sub-agentes (paralelos quando possivel), depois handoff pro flow do Mode A (write `.jbird/config.toml` com stack detectado, materialize bundle, generate CLAUDE.md incorporando decisoes do blueprint, trigger indexing, shell-profile check).

Referencia: spec section 3.2.1 (Mode B) + Phase 10.

Criterio de aceite (high-level): spec test com empty dir + `jbird init --prompt "<fixture>"` produz skeleton matching o blueprint do architect, blueprint confirmation funciona interativamente (testado via stdin injection).

Depende de: 009.
