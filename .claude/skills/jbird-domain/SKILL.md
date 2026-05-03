---
name: jbird-domain
description: Gotchas e invariantes do dominio jbird que nao estao na spec mae ou facilmente esquecidos ao implementar. Consultar ao tocar proxy, bundle, regra, sub-agentes ou comandos ativos. A spec (docs/specification.md) e a referencia completa — esta skill cobre o que da bug se ignorado.
---

# Dominio jbird — invariantes

A spec mae (`docs/specification.md`) descreve o sistema. Esta skill lista invariantes que da problema na hora de implementar.

## Proxy (section 2.7, 3.1.1)

- **OAuth header e read-only.** Forwardar `Authorization: Bearer <token>` sem inspecionar, decodificar ou copiar pra log. jbird nao tem credencial propria.
- **`RoutingPolicy.decide()` e funcao pura.** Sem FS, sem HTTP, sem clock, sem Math.random. Mesmo input → mesmo output. Property test obrigatorio.
- **SSE forwarda chunk-a-chunk.** Bufferizar full response antes de mandar pro client quebra streaming na UI do Claude Code. Use `ReadableStream.pipeThrough` ou equivalente.
- **Sequential Thinking directive injeta apenas em rotas non-Opus.** Opus tem extended thinking nativo — injetar e waste.
- **`X-Jbird-Route: passthrough` pula routing.** Util pra debug; respeitar sempre.
- **Falha de proxy = passthrough.** Quando o proxy crasha ou nao responde, Claude Code cai pro upstream real direto. Nao bloquear.

## Bundle (section 2.5, 3.1.6)

- **`BundleMaterializer` e idempotente via content hash.** Segunda execucao com bundle inalterado = zero file write. Verifique com `sha256(content)`.
- **Nunca deletar fora de `.jbird-managed` manifest.** Cada target dir tem manifest listando arquivos owned. Tudo fora e do user — nao tocar.
- **Targets sao `~/.claude/` (global) e `.claude/` (projeto). Apenas.** Nada fora.
- **Regra `jbird` e jbird-owned, regenerada todo `plugins sync`.** Project conventions vivem em CLAUDE.md, user-owned.

## Caveman boundary (section 3.1.3, 3.1.6)

- **Interno = caveman; final user message = prosa cheia.** Sub-agent output, tool results, intermediate reasoning sao caveman. Final assistant message ao user e prosa cheia, garantida pelo skill `bundle/skills/jbird/final-response.md`.
- **Security warnings e destructive ops sao exempt em qualquer direcao.** Mesmo internamente, deletes e rm-rf aparecem em prosa clara.
- **Sub-agent novo precisa de directiva caveman no system prompt.** Caso contrario sub-agent compose verboso e quebra o ganho de token.

## Sub-agentes (section 3.2.2)

- **`tdd-test-writer` nunca ve implementation.** `cavecrew-builder` nunca tem permissao de escrever codigo alem do necessario pra passar tests. Fundir em um sub-agent so quebra o invariante TDD.
- **Refactor step roda em Opus + Sequential Thinking.** Outras phases sao mecanicas e roteiam Sonnet/Haiku. Routing rules garantem isso — nao hardcode na orchestration.
- **Sub-agent reaches iteration cap → surfacar full transcript pro user, exit non-zero.** Nao retry forever, nao inventar workaround.

## Service supervision (section 2.4)

- **`Bun.spawn({ detached: true, stdio: 'ignore' })`.** Sem detached o processo morre quando o CLI exit.
- **Info file em `~/.jbird/services/proxy.info`** (PID, port, version, started_at). Signal 0 pra existence check, SIGTERM com 5s timeout, SIGKILL fallback.
- **Sem auto-restart de proxy crash em v1.** Proxima invocacao do CLI detecta PID morto, limpa orphan info file, restart.
- **Health polling apos spawn antes de retornar.** Race condition se voce nao espera.

## RAG via Context-Lens (section 2.8, 3.1.2)

- **Search e agent-decided, nao auto-injection.** Claude decide quando chamar `search_documents`. Nao force via UserPromptSubmit hook em v1.
- **Indexing inicial trigger no `jbird init`. Re-indexing e on-demand.** Nao file-watching.
- **Vector storage e arquivo local (LanceDB). Sem API key, sem daemon proprio.**

## Regra `jbird` (section 3.1.6)

- **Frontmatter restringe ativacao a projetos com `.jbird/config.toml`.** Caso contrario interfere em projetos non-jbird na mesma maquina.
- **Project conventions vivem em CLAUDE.md (user-owned).** A regra e doutrina project-agnostic (jbird-owned).

## Cost framing

- jbird estende capacidade da janela de 5h do Claude Max. **Nao reduz custo por token** — user esta no Max OAuth, nao na API pay-per-token. `jbird stats` reporta unidades de quota, nao dolares.

## v1 fora de scope

Multi-user, remote, paid embedding APIs, GPU-bound local models, auto-restart de proxy, auto-injection de RAG per-prompt, native HOL integration, Qwen provider, launchd/systemd integration. Defer pra v2.
