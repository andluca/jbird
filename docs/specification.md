# Spec: jbird

## Resumo

jbird is a personal CLI in TypeScript/Bun that extends Claude Code with dynamic model routing, RAG, agentic workflows (init, tdd, audit, refactor), caveman compression, and observability — designed to extend session capacity within the Claude Max plan rather than reduce per-token spend. It functions as a peer tool to Claude Code, agnostic to the host where Claude Code runs (any terminal, any editor integration). jbird never replaces or spawns Claude Code. The architecture is hybrid: a multi-command CLI following a three-layer architecture (Command → Operation → Service → Infrastructure), a declarative plugin bundle that materializes MCPs, skills, hooks, sub-agents, and rules into `~/.claude/` and `.claude/`, and a single persistent local daemon (the routing proxy) that Claude Code consumes transparently. Passive capabilities (model routing, RAG, caveman compression, observability, the jbird operating rule) run always-on; active commands (init, tdd, audit, refactor) are invoked deliberately. Stack: Bun runtime, TypeScript 7.0, Hono for HTTP, `bun:test` for testing, third-party MCP servers (Context-Lens, Sequential Thinking, n8n-MCP, Firecrawl, GitNexus, caveman), Bruno for API tests, HOL recommended as companion observability dashboard. Authentication via Claude Code's existing OAuth token (pass-through); jbird never handles credentials directly.

---

## 1. Objective and Context

**Objective:** Build a unified personal tool that extends Claude Code session capacity within the Claude Max plan (via dynamic routing, RAG, caveman compression) and increases productivity in recurring workflows (TDD, audit, refactor) — packaging opinion and infrastructure into a single `jbird` binary invokable from any terminal.

**Context:**

- **What exists today.** Claude Code running with default configuration, in the developer's host of choice, authenticated against a Claude Max plan via OAuth. Every prompt goes to the most capable available model regardless of difficulty, full files get injected as context instead of relevant chunks, and every session starts cold without structured memory beyond CLAUDE.md. Result: Max-plan usage windows fill up faster than they should, and recurring workflows get re-executed manually each time.
- **Why it's changing.** Without routing, RAG, and inter-agent compression, every prompt consumes more of the 5-hour usage window than it needs to. Common workflows (project init, TDD loop, quality audit, refactor with verification) get re-executed manually every time. Skills, sub-agents, and quality rules get re-authored per project. A layer is missing that automates all of this consistently.
- **What does not change.** Claude Code remains the host of the agentic loop, with its UI and execution cycle intact. jbird does not replace Claude Code, does not modify its interface, does not fork the binary, and does not impose a specific host — any environment where the developer already uses Claude Code stays functional. All extension happens via Claude Code's native surface (MCPs, hooks, skills, sub-agents, slash commands, settings.json, rules), with one bounded exception: a local HTTP proxy intercepts traffic to `api.anthropic.com` to enable dynamic per-prompt model routing — something the native extension surface doesn't express. The proxy passes Claude Code's OAuth token through unchanged; jbird never handles credentials directly.
- **v1 scope.** Personal use only by the developer, in own projects, in local environment (macOS/Linux), authenticating via Claude Max OAuth. No multi-user, no remote deployment, no enterprise support, no paid embedding APIs, no heavy local model servers. v1 works exclusively with Anthropic models (Opus → Sonnet → Haiku); the RouterManager architecture is pluggable to accommodate other providers (Qwen Code, which uses API-key auth) in v2 without core rewrite.

---

## 2. Foundation

### 2.1 Runtime & Language Stack

- **Runtime:** Bun (latest stable). Replaces Node + npm/pnpm + Vitest in one. Native TypeScript execution, no separate build step needed for development, fast cold start, single tool to install.
- **Language:** TypeScript 7.0 (Go-rewritten compiler — dramatically faster type-checks and `.d.ts` emission). `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`. Type-checking via `tsc --noEmit`; runtime execution via Bun directly.
- **Package manager:** Bun (`bun install`, `bun add`, `bun.lockb`, workspaces native).
- **Module system:** ESM only (`"type": "module"` everywhere).
- **HTTP framework:** Hono — lightweight, streaming-friendly, runs natively on Bun.
- **Test runner:** `bun:test` (matches the reference architecture).
- **CLI parsing:** Commander.js (Command layer only).
- **Side-service supervision:** `Bun.spawn()` with `detached: true` for v1; launchd/systemd integration deferred to v2.

### 2.2 Repository Layout

jbird is a Bun-managed monorepo with four packages:

```
jbird/
├── packages/
│   ├── core/              # @jbird/core      shared types, schemas, contracts
│   ├── cli/               # @jbird/cli       the jbird binary
│   ├── proxy/             # @jbird/proxy     routing proxy daemon
│   └── bundle/            # @jbird/bundle    skills, hooks, sub-agents, MCP configs, rules
├── package.json           # workspaces config
├── bun.lockb
└── tsconfig.base.json
```

`@jbird/core` is dependency-free runtime code: shared types (`ModelId`, `RoutingDecision`, `Classification`), Zod schemas for config validation, error classes, logging contracts. Everything else depends on it.

`@jbird/cli` is the binary. Three-layer architecture. Talks to the proxy over local HTTP; talks to MCP servers via Claude Code (not directly).

`@jbird/proxy` is an independent Bun server. Ships its own minimal entrypoint. The cli manages its lifecycle.

`@jbird/bundle` is mostly content (markdown skills, JSON MCP configs, shell hook scripts, sub-agent definitions, the jbird operating rule) plus a small TypeScript helper to materialize content into Claude Code's config directories.

### 2.3 Three-Layer CLI Architecture

The cli package follows Command → Operation → Service → Infrastructure with downward-only imports:

```
packages/cli/src/
├── jbird.ts                       # top-level router
├── commands/
│   ├── init/
│   │   ├── init.ts                # router for `jbird init`
│   │   └── scaffold/
│   │       ├── scaffold.ts        # operation
│   │       └── scaffold.test.ts
│   ├── tdd/
│   │   ├── tdd.ts
│   │   └── run/
│   │       ├── run.ts
│   │       └── tests/run.spec.ts
│   ├── audit/
│   ├── refactor/
│   ├── services/                  # admin: start, stop, status, install, logs
│   ├── plugins/                   # admin: sync, list
│   ├── stats/                     # admin: read journals
│   └── config/                    # admin: get, set, edit
└── shared/
    ├── services/
    │   ├── ProjectScaffolder.ts
    │   ├── ProjectGenerator.ts    # used by init Mode B
    │   ├── BundleMaterializer.ts
    │   ├── RoutingPolicy.ts
    │   ├── TddOrchestrator.ts
    │   ├── AuditOrchestrator.ts
    │   ├── RefactorOrchestrator.ts
    │   ├── TestRunner.ts
    │   ├── GateRunner.ts
    │   └── ServiceManager.ts      # proxy lifecycle
    ├── models/
    │   ├── settings.ts
    │   └── journal.ts
    ├── integrations/
    │   ├── proxy-client.ts        # localhost HTTP to @jbird/proxy
    │   ├── claude-config.ts       # reads/writes ~/.claude/ and .claude/
    │   └── bruno.ts
    └── test/
        ├── cli.ts                 # runCli, setupTestRepo helpers
        └── index.ts
```

Routers never contain business logic. Single-operation commands still get a thin router file delegating to the operation. This keeps adding new operations frictionless.

### 2.4 Side Services

One long-running daemon, managed by the jbird CLI:

| Service | Package | Default port | Purpose |
| --- | --- | --- | --- |
| **proxy** | `@jbird/proxy` | 7878 | HTTP proxy intercepting `api.anthropic.com` for routing |

**Lifecycle commands:**

- `jbird services start` — starts the proxy if not running
- `jbird services stop` — stops the proxy
- `jbird services status` — PID, port, uptime, version
- `jbird services install` — registers as launchd (macOS) or systemd-user (Linux); opt-in
- `jbird services logs` — tails the proxy journal

**How supervision actually works.** First time you run `jbird` after install, the CLI checks for `~/.jbird/services/proxy.info` (a JSON file with PID, port, version, start timestamp). Doesn't exist, so the CLI calls `Bun.spawn()` with `detached: true` and `stdio: 'ignore'`. The child process inherits no TTY, detaches from the parent process group (so killing the CLI doesn't kill it), writes its info file, and starts listening on port 7878. The CLI polls `GET /health` until it responds (5s timeout), then proceeds with whatever the user asked for, then exits. The daemon keeps running.

On subsequent CLI invocations, the CLI reads `proxy.info`, sends signal 0 to the PID (existence check), and if alive verifies version compatibility via `/health`. If the PID is dead (orphan info file), it cleans up and restarts. `jbird services stop` reads the info file, sends SIGTERM, waits up to 5s, sends SIGKILL if needed.

**Crashes.** No automatic restart in v1. Next CLI invocation detects the dead PID and restarts. v2 candidate: launchd/systemd integration that handles crash-restart properly.

**Failure mode.** Proxy down → Claude Code's API client fails to reach the proxy port and falls back to the real upstream. No routing happens, but Claude Code remains functional. The user gets the same experience as if jbird wasn't installed.

### 2.5 Plugin Bundle System

The bundle package is the source of truth for everything jbird installs into Claude Code's config directories. Versioned with jbird itself.

```
packages/bundle/src/
├── manifest.json              # everything in this bundle (versions, sources)
├── mcps/                      # MCP server configs
│   ├── context-lens.json      # local-only RAG, no API
│   ├── sequential-thinking.json
│   ├── n8n.json
│   ├── firecrawl.json
│   ├── gitnexus.json
│   └── caveman-compress.json  # MCP description compressor wrapper
├── hooks/
│   └── post-tool-use/         # observability hook → HOL-compatible journal
├── skills/
│   ├── caveman/               # vendored at pinned version
│   └── jbird/                 # our authored skills (e.g., final-response override)
├── subagents/
│   ├── cavecrew-investigator.md
│   ├── cavecrew-builder.md
│   ├── cavecrew-reviewer.md
│   ├── tdd-test-writer.md
│   ├── tdd-refactorer.md
│   ├── project-architect.md
│   ├── audit-reporter-quality.md
│   ├── audit-reporter-security.md
│   ├── audit-reporter-architecture.md
│   └── refactor-verifier.md
├── rules/
│   └── jbird.md               # the always-active jbird operating rule
├── slash-commands/
└── settings/
    └── permissions.json       # auto-approval for our hooks/MCPs
```

The `BundleMaterializer` service in the cli writes everything to `~/.claude/` (global) and `.claude/` (project). Idempotent. Content-hashing skips unchanged files. Never deletes files outside paths it owns (tracked via `.jbird-managed` manifest in each target dir). Triggered explicitly by `jbird plugins sync`, implicitly during `jbird init`.

### 2.6 Configuration & State

Two-level config, both validated with Zod schemas in `@jbird/core`:

- Global: `~/.jbird/config.toml`
- Per-project: `<project>/.jbird/config.toml`

Project overrides global. Schema excerpt:

```toml
[services]
proxy = { autostart = true, port = 7878 }

[routing]
default_model = "sonnet"

[[routing.rules]]
match = { token_estimate_lt = 500 }
provider = "anthropic"
model = "haiku"

[[routing.rules]]
match = { contains_any = ["refactor", "architecture", "design"] }
provider = "anthropic"
model = "opus"

[bundle]
version = "0.1.0"
profile = "default"
```

Note: no `[rag]` section — Context-Lens is configured via the bundle's `mcps/context-lens.json` and runs agent-decided.

State directory:

```
~/.jbird/
├── config.toml
├── services/
│   └── proxy.info             # PID, port, version, started_at
├── logs/                      # NDJSON journals
│   ├── proxy.log
│   └── cli.log
├── cache/
└── stats/                     # aggregated telemetry for `jbird stats`
```

`~/.claude/` and `.claude/` remain Claude Code's territory; jbird only writes to paths declared in the bundle manifest.

### 2.7 API Routing Proxy & Provider Abstraction

Claude Code's API client respects `ANTHROPIC_BASE_URL`. When `jbird services start` runs, it ensures the proxy is up and writes `~/.jbird/env.sh`:

```bash
export ANTHROPIC_BASE_URL=http://localhost:7878
```

Users source it from their shell profile. `jbird init` checks the user's profile and offers to add the source line.

**OAuth pass-through.** Claude Code authenticates with Anthropic via OAuth on its own. The request that hits our proxy already has `Authorization: Bearer <oauth-token>` set. The proxy forwards the header unchanged. jbird never reads, stores, or rotates credentials. No `ANTHROPIC_API_KEY` env var required.

**Proxy responsibilities:**

1. Accept requests in Anthropic Messages API format
2. Stream-aware (handles `text/event-stream` transparently)
3. Inspect, classify, route through the appropriate `ModelProvider`
4. Forward upstream with auth headers untouched, stream response back
5. Log a `RoutingDecision` event to the journal

**Provider abstraction in `@jbird/core`:**

```typescript
interface ModelProvider {
  readonly id: 'anthropic' | 'qwen' | string;
  readonly models: ReadonlyArray<ModelMeta>;

  classify(req: NormalizedRequest): Classification;
  select(classification: Classification, policy: RoutingPolicy): ModelId;
  transform(req: NormalizedRequest, target: ModelId): UpstreamRequest;
  forward(req: UpstreamRequest): AsyncIterable<UpstreamChunk>;

  // For Max-plan thinking, this returns "quota units consumed", not dollars.
  estimateUsageWeight(usage: Usage, model: ModelId): number;
}
```

**v1:** `AnthropicProvider` covers Opus, Sonnet, Haiku, all via OAuth pass-through. `RoutingPolicy` is a pure function: input is a normalized request, output is `{ provider, model, inject_directives }`. Consults user's config rules first, then heuristics.

**v2 extensibility:** Qwen Code uses API-key auth (not OAuth). The provider abstraction handles this cleanly — each `ModelProvider` owns its own auth strategy. Adding Qwen is implementing `QwenProvider` (or a generic `OpenAICompatibleProvider`), registering it with the proxy's provider registry, extending policy rules. No proxy core changes; v2 will mix OAuth-pass-through and key-managed flows side by side.

**Sequential Thinking gating:** the policy emits `inject_directives` alongside the route. When the routed model is non-Opus, the directive `"use-sequential-thinking-mcp"` is included. The proxy injects a small system-prompt fragment into the outgoing request body telling the model to use the Sequential Thinking MCP for non-trivial reasoning.

### 2.8 RAG via Context-Lens MCP

RAG is delivered by **Context-Lens** as an MCP server, configured via the bundle and consumed agent-decided. No jbird-managed daemon involved.

**Why Context-Lens, not Claude Context.** Anthropic does not offer an embeddings API. RAG always needs embeddings from somewhere. Claude Context requires either OpenAI/VoyageAI/Gemini (paid per-token) or Ollama running a local embedding model (requires hardware to host). Context-Lens loads a 90MB sentence-transformers model into its own process on demand, runs on plain CPU, no GPU, no daemon, no API key. Vector storage is LanceDB — a file on disk, no Milvus required. This matches the "no paid APIs, no heavy local model servers" constraint exactly.

**Tradeoffs accepted:** lower-dimension embeddings (384 vs 1536) means slightly worse precision; pure dense search means no BM25 hybrid (slightly worse on exact-identifier queries); on-demand reindexing rather than file-watched incremental.

**Bundle config** (`packages/bundle/src/mcps/context-lens.json`):

```json
{
  "command": "uvx",
  "args": ["context-lens"],
  "autoApprove": ["search_documents", "list_documents"]
}
```

Materialized into `~/.claude/settings.json` mcpServers section by `BundleMaterializer`.

**Tools Claude calls:** `add_document` (index a path or repo), `search_documents` (semantic search), `list_documents`, `remove_document`. Claude decides when to invoke them. The jbird operating rule (section 3.1.6) teaches Claude *when* to search — pulling the lever via doctrine rather than mechanism.

**What we're losing vs an automatic-injection setup:** every prompt no longer auto-receives relevant context. If observed behavior is insufficient, revisit by either (a) authoring a UserPromptSubmit hook that calls Context-Lens via stdio, or (b) building a wrapping daemon. Defer until proven necessary.

### 2.9 Inter-Process Communication

Only one IPC channel in v1: cli ↔ proxy.

- **Transport:** localhost HTTP over IPv4 loopback. Unix sockets considered for v2 if perf demands.
- **Format:** JSON for request/response, NDJSON for streaming.
- **Auth:** none — single user, proxy binds only to `127.0.0.1`, refuses non-loopback connections. (Note: this is jbird's internal IPC. The Anthropic OAuth token Claude Code sends through the proxy is a separate concern, just passed through.)
- **Versioning:** every request includes `X-Jbird-Client-Version`. Mismatches logged, compatible versions accepted.
- **Schema validation:** Zod schemas in `@jbird/core`. Both ends validate on the boundary.
- **Errors:** standard HTTP status codes + `{ error: { code, message, details? } }` body. Logged to relevant journal.

### 2.10 Testing Strategy

Three test types from the reference architecture:

| Suffix | Runner | Use for |
| --- | --- | --- |
| `.test.ts` | `bun:test`, direct calls | Pure logic in services, models, integrations |
| `.spec.ts` | `bun:test` with `runCli()` | End-to-end: spawns `jbird` against temp dirs |
| `.test.tsx` | (deferred) | No Ink UI in v1 |

**Layout:**

- Unit tests co-located: `src/commands/init/scaffold/scaffold.test.ts`
- Spec tests in per-operation `tests/`: `src/commands/init/scaffold/tests/scaffold.spec.ts`
- Proxy tests in its own package

Helpers in `shared/test/`. `runCli` spawns the jbird binary in a temp dir, captures stdout/stderr/exit, returns parsed result. `setupTestRepo` creates a temp dir with `git init`, empty `.jbird/config.toml`, optionally a fake `~/.claude/` overlay via env var.

For spec tests needing the proxy: ephemeral instance starts on a random port for the test duration, isolated from the user's running daemon.

### 2.11 Build & Distribution

**Build:** Bun handles TS execution natively. For type-checking and `.d.ts` emission, `tsc --noEmit` (TS 7.0) runs in CI. The cli package produces a single executable via `bun build --compile` (Bun's built-in single-file binary compilation), with all dependencies inlined.

**Distribution:**

- **v1:** npm as `@jbird/cli` with a `bin` entry. `bun install -g @jbird/cli` (or `npm install -g @jbird/cli` for users without Bun — the compiled binary doesn't require Bun at runtime if compiled with `--compile`).
- **v2 candidate:** Homebrew formula.

**Side service** distributed *inside* `@jbird/cli` as a bundled subprocess entrypoint. `jbird services start` invokes a path inside the installed cli package as a child process. Single dependency, simpler install.

**Updates:** standard npm semantics. Bundle version pinned in cli version → updating jbird updates everything coherently. After update, `jbird plugins sync` refreshes the materialized bundle.

**Versioning:** semver. Major bumps signal incompatible bundle/config changes requiring user action.

---

## 3. Features

### 3.1 Invisible Foundation

These capabilities require no user invocation. Once `jbird init` has been run on a project and `jbird services start` has been called, they operate transparently on every Claude Code session.

#### 3.1.1 Dynamic Model Routing

**What it does.** Every API call Claude Code makes to `api.anthropic.com` flows through the local proxy on port 7878. The proxy classifies the request and decides which model the request should actually use, potentially overriding the model Claude Code requested.

**Classification inputs.** The `RoutingPolicy` evaluates each request against:

- Estimated input token count (cheap proxy: character count / 4)
- Presence of keywords in the latest user message (`refactor`, `architecture`, `design`, `debug`, etc.)
- Tool-use density in recent turns (high tool use → likely an agentic loop, prefer faster model)
- Presence of `<retrieved_context>` tags (RAG-injected → the heavy lifting was already done by retrieval, lighter model often sufficient)
- Whether the request is a sub-agent invocation (sub-agents get downgraded by default)

**Decision output.** A `RoutingDecision` struct: chosen provider, chosen model, reason code, list of `inject_directives` (e.g., `use-sequential-thinking-mcp` for non-Opus routes), original requested model (for telemetry).

**Default rules** shipped in `bundle/settings`, overridable in `~/.jbird/config.toml`:

| Condition | Route to |
| --- | --- |
| Sub-agent invocation | Haiku |
| Token estimate < 500, no architectural keywords | Haiku |
| Architectural/design keywords present | Opus |
| Default | Sonnet |

**Sequential Thinking gating.** When the chosen model is non-Opus, the proxy injects a small system-prompt fragment into the outgoing request: an instruction to use the `sequential-thinking` MCP for any non-trivial reasoning. Opus routes get no injection (its native extended thinking suffices).

**Telemetry.** Every routing decision logs an event to `~/.jbird/logs/proxy.log` (NDJSON): timestamp, requested model, chosen model, reason, token estimate, latency. `jbird stats` reads these for reporting.

**Safety override.** A request can opt out of routing by including a header `X-Jbird-Route: passthrough`. Useful for debugging and testing.

#### 3.1.2 RAG via Context-Lens

**What it does.** Context-Lens runs as an MCP server that Claude Code invokes when it decides it needs to search the codebase. It exposes `add_document`, `search_documents`, `list_documents`, `get_document_info`, `remove_document`. Local-only, no API keys, vector storage on disk.

**When indexing happens.** `jbird init` triggers an initial `add_document` call against the project root. After that, indexing is on-demand: the user (or a slash command) re-runs index when they want it refreshed. Acceptable for personal projects where you know when significant changes happen.

**When search happens.** Agent-decided. Claude calls `search_documents` when it judges that semantic search would help. The jbird operating rule (3.1.6) teaches Claude *when* to search — for example, "before editing code in a module you haven't recently touched, search for callers."

**What we don't do in v1.** Automatic per-prompt context injection. If observation shows Claude failing to search when it should, revisit by either adding a UserPromptSubmit hook that calls Context-Lens directly via stdio, or building a wrapping daemon. Deferred.

#### 3.1.3 Caveman Compression

**What it does.** The caveman skill is vendored into the bundle at a pinned version and auto-activated by Claude Code. It compresses **internal** communication — sub-agent output, tool call results, intermediate reasoning — to roughly 25–35% of natural length while preserving technical content (code, paths, identifiers stay byte-identical). The **final user-facing response is always full prose**, well-written, with full sentences and proper structure.

**The principle.** Caveman is for the engine room, not the front desk. Claude works in caveman internally — sub-agents respond in caveman, MCP tool descriptions are compressed, intermediate analyses are terse. When Claude finally turns to address the user, it expands from compressed form into proper prose. This pulls two compounding levers:

1. Internal token cost drops sharply (sub-agent transcripts, tool descriptions, intermediate work all get cheap)
2. Final output quality improves because expanding from compressed form forces real composition rather than passing verbose intermediate text through to the user

**Three layers of activation:**

1. **Sub-agent compression (always on).** All sub-agent definitions in the bundle (cavecrew investigator/builder/reviewer + custom tdd-test-writer, tdd-refactorer, project-architect, audit-reporter variants, refactor-verifier) include caveman directives in their system prompts. Sub-agent output back to the orchestrator is compressed by default. This is where the largest savings happen — sub-agent transcripts get dumped back into the parent context, and compressing them by 70% directly reduces the parent's context load.

2. **MCP description compression (always on).** Caveman's stdio proxy wraps the bundle's other MCP servers (sequential-thinking, n8n, firecrawl, gitnexus, context-lens) and compresses their `tools/list` / `prompts/list` / `resources/list` responses. This cuts session-warmup token cost — those descriptions get loaded every session, every project.

3. **Final user response: explicit decompression.** A skill in the bundle (`bundle/skills/jbird/final-response.md`) instructs Claude that any response directly addressed to the user is exempt from caveman mode and must be written in full prose. Activates as the highest-priority output style, overriding caveman when Claude is composing the final turn back to the user.

**How "internal vs final" gets distinguished in practice.** Claude Code already separates the agent loop's internal work (tool calls, sub-agent invocations, intermediate reasoning) from the final assistant message that gets shown to the user. The skill anchors on that boundary: the final assistant message is always full prose, everything before it (sub-agent responses, tool result summaries, internal planning) runs caveman.

**Bundle integration.** Caveman vendored at `bundle/skills/caveman/` at a pinned version. The MCP description compressor configured at `bundle/mcps/caveman-compress.json` as a wrapper around the other MCP entries. Final-response override at `bundle/skills/jbird/final-response.md`. `BundleMaterializer` writes all three into the appropriate Claude Code config locations.

**Smart suppression.** Caveman drops compression for security warnings and destructive operations (file deletes, `rm -rf`, etc.) where clarity matters more than terseness. Behavior shipped in the upstream skill, no jbird customization needed. Independent of the final-response override — security warnings appear in full clarity even when they're internal-layer messages.

#### 3.1.4 Memory

**What it does.** Native Claude Code auto-memory (v2.1.59+) plus CLAUDE.md handle persistence. No jbird-managed memory layer in v1.

**What jbird contributes.** During `jbird init`, the project's CLAUDE.md is scaffolded with project-specific guardrails (the same ones the audit/refactor/tdd workflows verify against). Auto-memory is left at Claude Code defaults — on, per-project, written to `~/.claude/projects/<project>/memory/`.

**What we don't do.** Run a separate memory daemon, install Claude Mem (user reports it doesn't deliver more than vanilla auto-memory), or integrate Bedrock (deferred to v2 if Obsidian adoption ever happens).

#### 3.1.5 Observability

**What it does.** Two complementary telemetry surfaces:

1. **jbird internal journals** (`~/.jbird/logs/*.log`) — NDJSON event streams from the proxy (every routing decision) and the cli (every command invocation, every materialization, every service lifecycle event). Read by `jbird stats` for in-CLI reporting.
2. **HOL** — installed as a separate Python tool (`pip install harness-observability-layer`). Reads Claude Code's session archives from `~/.claude/projects/`, surfaces spend, prompt rankings, model mix, prescriptive insights via local dashboard at `localhost:3845`. Started by `hol init` from the project directory. Not bundled with jbird; recommended as a companion install in `jbird init`'s output.

**How they relate.** jbird journals show *routing-layer* truth — what the proxy decided, why, with what input. HOL shows *Claude Code session-layer* truth — what actually happened in conversations and what it cost in usage. Together they answer different questions: jbird answers "is the router pulling its weight?", HOL answers "where did this week's window quota go?"

**v2 candidate:** native HOL integration where `jbird stats` includes HOL-style insights inline, removing the need for a separate dashboard. Out of scope for v1.

#### 3.1.6 The `jbird` Operating Rule

**What it is.** A rule at `bundle/rules/jbird.md`, materialized into `~/.claude/rules/` and `.claude/rules/`. Always active in every session of a jbird-managed project. Not a skill — not lazy-loaded, not opt-in. Claude Code applies it automatically by virtue of it being a rule.

**Why a rule and not a skill.** Skills load on-demand when their description matches the current task; that's the wrong primitive for "always use this." Rules in `.claude/rules/` are the right primitive — always-active operating doctrine, exactly the layer this content belongs in.

**What it teaches Claude.**

1. **The caveman boundary.** Internal communication (sub-agent calls, tool results, intermediate reasoning) is always caveman. The final assistant message back to the user is always full prose. This rule overrides any sub-agent's natural verbosity. Security warnings and destructive operations are exempt from compression in either direction.
2. **When to delegate vs do inline.** "Need to locate code across the repo? Delegate to cavecrew-investigator, don't grep yourself." "Editing 1–2 files surgically? Delegate to cavecrew-builder." "Reviewing a diff? Delegate to cavecrew-reviewer." "Anything bigger? Plan first, then delegate per chunk." Doing it inline burns the orchestrator's context unnecessarily.
3. **When to search via Context-Lens.** Before editing in a module you haven't recently touched: search for callers and related code first. Before answering "how does X work" questions about existing code: search rather than guess. Before refactoring: map the surface area via search. Triggers enumerated explicitly because relying on Claude's own judgment for "should I search?" is exactly what fails today.
4. **When to invoke Sequential Thinking.** The proxy injects the directive automatically when routing to non-Opus models. The rule teaches what that directive means in practice: use the MCP for any reasoning step with more than 2–3 dependent decisions, branching alternatives, or trade-off analysis. Skip it for mechanical tasks.
5. **Project conventions live in CLAUDE.md, not here.** The rule is project-agnostic operating doctrine. Project-specific rules (build commands, lint conventions, "always do X") live in CLAUDE.md. The rule teaches Claude to read CLAUDE.md as the source of truth for the *what* of this project, while the rule itself is the source of truth for the *how* of working in jbird.
6. **TDD as the default discipline.** When the user describes work that involves code changes, default to the TDD loop unless explicitly opt-out. Tests first, minimal implementation, then refactor. Applies even for changes invoked outside `jbird tdd` — the slash command formalizes the loop, the rule embeds the discipline.
7. **Cost awareness.** Favor: reading via Context-Lens search over reading full files; delegating multi-file work over inline; using cavecrew-investigator (cheap, Haiku-routed) for exploration over doing it as the orchestrator. Makes the cost mental model visible to Claude so it can self-direct.
8. **Failure escalation.** When something doesn't work after reasonable attempts (test won't pass, sub-agent keeps producing wrong output, tool unavailable), surface it clearly to the user with context — don't silently retry forever or invent workarounds. Specific patterns for how to escalate.

**Activation scope.** Frontmatter restricts the rule to projects where `.jbird/config.toml` exists, so it doesn't interfere with non-jbird projects on the same machine.

**Ownership.** jbird-owned, regenerated by `BundleMaterializer` on every `jbird plugins sync`. The user doesn't edit it. Project-specific rules and conventions live in `CLAUDE.md`, scaffolded once by `jbird init` and owned by the user thereafter.

**Versioning.** Rule version pins to bundle version. After a jbird update, `jbird plugins sync` overwrites the rule with the current version. No merge logic needed.

**Relationship to caveman's bundled skill.** Caveman's bundled skill teaches Claude *how* to compress; the jbird rule teaches Claude *when and where* compression applies in the jbird operating model (internal yes, final response no). They compose — caveman is the mechanism, jbird is the policy.

### 3.2 Active Commands

User-invoked. Each follows the three-layer architecture: a thin command router parses arguments, an operation orchestrates services, services contain logic, infrastructure handles file/process/HTTP I/O.

#### 3.2.1 `jbird init`

**Purpose.** Scaffold a project with everything needed to be a "jbird-managed project" — config, materialized bundle, project-specific guardrails, CLAUDE.md, initial RAG indexing, optional shell-profile setup. Supports both **adopting an existing project** and **starting a new project from a prompt**.

**Invocation:**

```
jbird init [path] [--prompt "<description>"] [--profile <name>] [--no-index] [--no-shell-setup]
```

**Two modes:**

**Mode A — Adopt existing project** (no `--prompt`, path contains code):

1. Detect project type (walks the directory tree looking for `package.json`, `pyproject.toml`, `Cargo.toml`, etc.). Determines language, framework hints, test runner, monorepo vs single-package.
2. Write `.jbird/config.toml` with detected defaults.
3. Materialize the bundle into `.claude/` (project-scoped half).
4. Generate `CLAUDE.md` with project-specific guardrails. Idempotent — running `init` again offers to merge or skip if `CLAUDE.md` already exists.
5. Trigger initial RAG indexing via Context-Lens. Skippable with `--no-index`.
6. Check shell profile for `ANTHROPIC_BASE_URL` setup. Offer to add `source ~/.jbird/env.sh` if missing. Skippable with `--no-shell-setup`.
7. Verify proxy is running. If not, prompt to run `jbird services start`.

**Mode B — Start new project from prompt** (`--prompt` flag, or path is empty/non-existent):

1. **Receive intent.** The prompt describes what the user wants to build.
2. **Spawn `project-architect` sub-agent** (bundled, Opus-routed). Takes the prompt, asks clarifying questions only if absolutely necessary, produces a project blueprint — stack choices, directory layout, initial dependencies, key files to scaffold, conventions to enforce.
3. **Confirm with user.** Blueprint is shown, user confirms, edits, or aborts. Interactive prompt.
4. **Materialize the project skeleton.** A `cavecrew-builder` sub-agent (or several in parallel for independent files) creates files per the blueprint: `package.json` / `Cargo.toml` / `pyproject.toml`, initial source structure, `.gitignore`, README skeleton, test scaffolding, CI config if requested.
5. **Run the standard `init` flow on top.** Once the skeleton exists, the rest of `init` proceeds normally — write `.jbird/config.toml` (now with detected stack from the blueprint), materialize the bundle, generate CLAUDE.md (incorporating architectural decisions from the blueprint), trigger RAG indexing, shell-profile check, proxy verification.

**Layered decomposition:**

- Command (`commands/init/init.ts`): parses args
- Operation (`commands/init/scaffold/scaffold.ts`): branches Mode A vs Mode B at the top, orchestrates the steps
- Services: `ProjectScaffolder` (project-type detection + CLAUDE.md generation), `ProjectGenerator` (Mode B — architect sub-agent, blueprint confirmation, skeleton materialization), `BundleMaterializer` (bundle → `.claude/`)
- Infrastructure: `claude-config` (file writes), `proxy-client` (health check), shell profile manipulation

**Output.** Mode A: summary of what was scaffolded, what was skipped, next-step suggestions. Mode B: blueprint summary, files created, plus the same next-step suggestions.

#### 3.2.2 `jbird tdd`

**Purpose.** Enforce TDD as the operating discipline for any unit of work — feature, change, or bug fix. Red → Green → Refactor, always in that order, no exceptions. The model is constrained to think in tests first, implement minimally to pass, then refactor for quality with the test suite as a safety net. Bruno is the execution engine for API-level tests; native test runners (`bun:test`, vitest, jest, pytest, cargo test, etc.) handle unit and integration tests.

**Invocation:**

```
jbird tdd "<work description>" [--mode feature|change|bug] [--stack <runner>] [--max-iterations 5]
```

**Modes:**

- `feature` (default) — adding new behavior. Full Red → Green → Refactor.
- `change` — modifying existing behavior. Existing tests get updated first (becoming red against the desired new behavior), then implementation, then refactor.
- `bug` — reproducing and fixing a defect. Failing test that reproduces the bug first, then fix, then refactor.

**The loop (mode = feature):**

1. **Understand.** Spawn a `cavecrew-investigator` sub-agent to map the area touched by the work — existing tests, related code, contracts, conventions. Output: structured caveman context for the rest of the loop.

2. **Red — write failing tests first.** Spawn a `tdd-test-writer` sub-agent (bundled, Sonnet-routed by default) with the work description and the investigator's context. Task: write the smallest set of tests that, if green, would prove the work is done. API surface tests use Bruno; unit/integration tests use the project's native runner. Sub-agent emits the test files only — no implementation.

3. **Verify Red.** Run the new tests. They MUST fail, and fail for the right reason (the behavior under test doesn't exist or is wrong, not a syntax error or missing import). If they pass immediately, the work was already done or the tests don't actually test the intended behavior — sub-agent is sent back to revise (max 3 attempts before escalating to user).

4. **Green — minimal implementation.** Spawn a `cavecrew-builder` sub-agent with the failing tests and investigator context. Task: make the tests pass with the **minimum change possible**. Builder is explicitly forbidden from refactoring or improving anything not required to pass the tests.

5. **Verify Green.** Re-run the new tests. Pass → continue. Fail → loop back to step 4 with the failure output. Max iterations configurable, default 5.

6. **Verify nothing else broke.** Run the full test suite. Any regression → loop back to step 4 with the regression output (still in Green mode — "make the failing tests pass without breaking the passing ones," no refactor yet).

7. **Refactor — make it good.** Spawn a `tdd-refactorer` sub-agent (bundled, **Opus-routed because this is the architectural-judgment step**, with Sequential Thinking MCP active per the routing policy). Task: improve the code quality of what was just added — naming, decomposition, removing duplication, applying project conventions from CLAUDE.md, improving readability — **without changing behavior**. Full test suite is the safety net: refactorer runs tests after each change.

8. **Verify Refactor preserved Green.** Run the full test suite. Pass → continue. Fail → loop back to step 7 with the failure (refactorer broke something, must revert or redo). Max iterations.

9. **Generate commit message.** Caveman commit message describing the work.

10. **Stage but don't commit.** User reviews and commits.

**The loop variations:**

- **`--mode change`:** step 2 becomes "modify existing tests to express the new desired behavior, making them fail against the current implementation." Steps 3–8 proceed identically.
- **`--mode bug`:** step 2 becomes "write the smallest failing test that reproduces the bug as described." The rest proceeds identically.

**Why refactor gets Opus + Sequential Thinking.** The refactor step is where architectural judgment happens — the one phase where the model needs to reason about quality, consistency with conventions, and tradeoffs, rather than executing a mechanical task. Routing it to Opus gives the strongest reasoning available. Also the step most often skipped in human TDD practice; making it explicit and routed correctly is the discipline jbird is designed to enforce.

**Why test-writer and builder are separate sub-agents.** Hard separation prevents the most common TDD failure mode — the model writing tests *and* implementation simultaneously, which means tests get written to match what was just coded rather than driving design. Test-writer sees no implementation; builder sees no permission to write code beyond what makes tests pass.

**Layered decomposition:**

- Command (`commands/tdd/tdd.ts`): parses args
- Operation (`commands/tdd/run/run.ts`): orchestrates the 10 steps with mode-specific branching
- Services: `TddOrchestrator` (loop logic, phase tracking, iteration caps, escalation), `TestRunner` (abstracts Bruno + native runners), `BruniRunner` (Bruno-specific shell-out for API tests)
- Infrastructure: `bruno` integration, native runner shell-outs, git operations

**Failure modes.** Any phase hitting `--max-iterations` without success surfaces the full transcript (sub-agent reasoning, file changes, test outputs at each iteration) and exits non-zero. The user picks up manually, with all artifacts left in place to inspect.

**What the user sees.** Phase-by-phase progress in caveman-compressed status updates during the loop, then a full-prose summary at the end describing what was tested, what was implemented, what was refactored, and what to review.

#### 3.2.3 `jbird audit`

**Purpose.** Run a multi-agent quality/security/architecture audit on a project (or a specific path within it) and produce a report.

**Invocation:**

```
jbird audit [path] [--scope quality|security|architecture|all] [--format md|json] [--output <path>]
```

**Operations:**

1. **Index check.** Verify Context-Lens has the project indexed. If not, trigger indexing.
2. **Spawn parallel sub-agents per scope.** Each scope (quality, security, architecture) spawns its own `audit-reporter` sub-agent variant with a focused prompt. Sub-agents work in parallel where possible, reading the codebase via Context-Lens search rather than full-file reads.
3. **Each sub-agent emits findings in caveman format** — `path:line: <severity>: <issue>. <suggested fix>.` per finding. No prose, no preamble.
4. **Aggregate.** The operation collects findings, deduplicates, sorts by severity, groups by file.
5. **Render the report.** Markdown by default, JSON optional. Default output location: `./jbird-audit-<timestamp>.md`. Stdout if `--output -`.

**Layered decomposition:**

- Command (`commands/audit/audit.ts`): parses args
- Operation (`commands/audit/run/run.ts`): orchestrates parallel sub-agents and aggregation
- Services: `AuditOrchestrator` (sub-agent fan-out, aggregation), `ReportRenderer` (md/json output)
- Infrastructure: claude-config (sub-agent invocation), file writes

**Sub-agent variants** in bundle:

- `audit-reporter-quality.md` — code style, complexity, dead code, missing tests
- `audit-reporter-security.md` — common vulnerabilities, secret leaks, dependency risks
- `audit-reporter-architecture.md` — layering violations, circular deps, abstraction leaks

#### 3.2.4 `jbird refactor`

**Purpose.** Orchestrated refactor with verification gates — describe the refactor target and constraints, jbird coordinates analysis, planning, change application, and verification.

**Invocation:**

```
jbird refactor "<target description>" [--scope <path>] [--gates test,lint,build]
```

**Operations:**

1. **Analyze.** Spawn `cavecrew-investigator` sub-agent to map the affected code: callers, dependencies, contract surface. Output: structured caveman report.
2. **Plan.** Spawn a planner sub-agent (uses Opus, gated by routing) with the analysis. Produces a plan: list of file changes, order, risks, verification steps.
3. **Confirm with user.** The plan gets shown, user confirms, edits, or aborts. Interactive prompt.
4. **Apply changes.** Spawn `cavecrew-builder` sub-agent(s) — one per logical change in the plan. Each makes its 1–2 file edit.
5. **Run gates.** After all changes applied, run the configured gates in order: tests (via Bruno or native runner), lint, build. Any gate fails → spawn `refactor-verifier` sub-agent with the failure to attempt a fix. Loop with iteration cap.
6. **Generate commit message.** Caveman commit message describing the refactor.
7. **Stage but don't commit.** User reviews and commits.

**Layered decomposition:**

- Command (`commands/refactor/refactor.ts`): parses args
- Operation (`commands/refactor/run/run.ts`): orchestrates analyze → plan → confirm → apply → verify
- Services: `RefactorOrchestrator` (the multi-phase flow), `PlanRenderer` (presents plan to user), `GateRunner` (test/lint/build orchestration)
- Infrastructure: claude-config, bruno, test-runner shell-outs, git

**Failure modes.** Gates fail past iteration cap → operation exits with the full plan, applied changes, and failure transcript. User decides whether to revert or fix manually. Critical: jbird *never* commits or force-pushes; it only stages.

#### 3.2.5 Admin Layer

Small commands for managing jbird itself. No agentic workflow involved — pure utility.

**`jbird services <subcommand>`** — proxy lifecycle (start, stop, status, install, logs). Detailed in 2.4.

**`jbird plugins <subcommand>`:**

- `jbird plugins sync` — re-materialize the bundle into `~/.claude/` and `.claude/`. Usually run after a jbird update.
- `jbird plugins list` — show what's in the active bundle (MCPs, skills, sub-agents, rules) with versions.

**`jbird stats`:**

- `jbird stats` (no args) — summary of last 7 days from journals: total prompts routed, model distribution, average prompt size, top 5 most expensive prompts.
- `jbird stats --since 30d` — adjustable window.
- `jbird stats --json` — machine-readable for scripting.

**`jbird config <subcommand>`** (utility for editing the TOML configs):

- `jbird config get <key>` — reads from project config, falls back to global
- `jbird config set <key> <value>` — writes to project config (or global with `--global`)
- `jbird config edit` — opens the appropriate config in `$EDITOR`

---

## 4. Validation Gates

How we know each phase is done. Objective and verifiable — no "looks good to me" allowed.

### 4.1 Universal Gates (apply to every phase)

These run on every phase before it's considered complete:

- `bun test` — all tests pass (unit + spec)
- `bunx tsc --noEmit` — type-check passes with zero errors under TS 7.0 strict mode
- `bun run lint` — zero lint errors (ESLint with `@typescript-eslint/strict-type-checked`)
- `bun run build` — `bun build --compile` produces a working binary for `@jbird/cli` and a working server entry for `@jbird/proxy`
- No new `any` types introduced (enforced by lint rule)
- No new direct `console.log` calls (use the `Logger` from `@jbird/core`)

### 4.2 Phase-Specific Gates

| Phase | Specific Validation |
| --- | --- |
| **1. Monorepo skeleton** | `bun install` succeeds from clean. All four packages build. Empty `jbird` binary runs and prints help. |
| **2. Core types & schemas** | All Zod schemas have round-trip tests (parse → serialize → parse equals input). 100% of public types exported from `@jbird/core` index. |
| **3. CLI scaffolding** | `jbird --help` lists all four commands + admin layer. Each command's `--help` renders. Routers contain zero business logic (verified by import-graph lint rule: `commands/*/[command].ts` may only import from `commands/*/[operation]/`). |
| **4. Configuration & state** | Reading non-existent config returns defaults without error. Writing then reading round-trips. Project config overrides global per Zod merge logic. State directory auto-created with correct permissions (700). |
| **5. Proxy daemon** | Proxy starts, responds on `/health`, accepts a passthrough request and forwards it correctly (verified against a mock upstream). OAuth `Authorization` header passes through unchanged. SSE streams forward without buffering. |
| **6. Service supervision** | `jbird services start` spawns a detached proxy that survives CLI exit. `jbird services status` reports correctly. `jbird services stop` terminates cleanly. Orphan info file gets cleaned and daemon restarted on next CLI invocation. |
| **7. Routing policy & provider abstraction** | `RoutingPolicy.decide()` is pure (same input always produces same output, verified by property test). `AnthropicProvider` correctly maps each rule from a fixture config to expected route. Sequential Thinking directive injected only on non-Opus routes. |
| **8. Bundle materialization** | `BundleMaterializer.materialize()` is idempotent (running twice produces zero file changes on second run, verified by content-hash comparison). Files outside `.jbird-managed` manifest paths are never touched. Removing an entry from manifest removes the corresponding file on next sync. |
| **9. `jbird init` (Mode A — adopt)** | Spec test: empty git repo + `jbird init` produces valid `.jbird/config.toml`, materialized `.claude/`, scaffolded `CLAUDE.md`, indexed via Context-Lens. Re-running `init` is idempotent and prompts before overwriting `CLAUDE.md`. |
| **10. `jbird init` (Mode B — generate)** | Spec test: empty dir + `jbird init --prompt "<fixture>"` produces a project skeleton matching the architect's blueprint. Blueprint confirmation step works interactively (test via stdin injection). |
| **11. `jbird tdd`** | Spec test: fixture project with a known feature description completes the full Red → Green → Refactor loop. Verifies test-writer produces actually-failing tests (red gate enforced), builder makes them pass without touching unrelated files, refactorer preserves green. |
| **12. `jbird audit`** | Spec test: fixture project with known issues produces a report containing those issues, formatted correctly in markdown and JSON. Findings are caveman-formatted by sub-agents, aggregated correctly by orchestrator. |
| **13. `jbird refactor`** | Spec test: fixture project + refactor prompt produces a plan, applies it after confirmation, runs gates, surfaces failures correctly. Critical: never commits or pushes (verified by checking git state after operation). |
| **14. Admin commands** | `jbird stats`, `jbird config`, `jbird plugins` produce expected output against fixture journals/configs. |
| **15. End-to-end smoke** | Fresh install on a clean macOS + clean Linux container. Full flow: install → `jbird services start` → `jbird init <existing project>` → real Claude Code session through the proxy → routing decisions logged correctly → `jbird stats` shows expected data. |

---

## 5. Implementation Phases

Numbered, ordered by dependency. Infrastructure before features. Each phase delivers a working, testable slice.

| # | Phase | Description | Depends on |
| --- | --- | --- | --- |
| 1 | **Monorepo skeleton** | Bun workspace setup, four package directories, shared `tsconfig.base.json`, lint config, basic CI. Empty `jbird` binary that prints help. | — |
| 2 | **Core types & schemas** | All shared types in `@jbird/core` (`ModelId`, `ModelMeta`, `RoutingDecision`, `Classification`, `NormalizedRequest`, `UpstreamRequest`, etc.). All Zod schemas (config, journal events, IPC requests/responses). Logger contract. Error classes. | 1 |
| 3 | **CLI scaffolding** | Top-level `jbird.ts` router. Empty command/operation files for all commands (`init`, `tdd`, `audit`, `refactor`, `services`, `plugins`, `stats`, `config`). Each prints "not yet implemented" with help text. Layered architecture lint rules in place. | 2 |
| 4 | **Configuration & state** | `~/.jbird/` directory bootstrap. Config loading (global + project, with override semantics). State directory creation. NDJSON journal writer. `jbird config` command. | 2 |
| 5 | **Proxy daemon (passthrough only)** | `@jbird/proxy` Hono server listening on 7878. Receives Anthropic Messages API requests, forwards to upstream untouched (no routing yet), streams responses back. OAuth pass-through verified. `/health` endpoint. | 2 |
| 6 | **Service supervision** | `ServiceManager` service in `@jbird/cli`. `jbird services {start,stop,status,logs}` commands. Detached spawn with `Bun.spawn`, info file at `~/.jbird/services/proxy.info`, health polling, orphan cleanup. | 4, 5 |
| 7 | **Routing policy & provider abstraction** | `ModelProvider` interface, `AnthropicProvider` implementation, `RoutingPolicy` pure function consuming config rules. Proxy now applies routing instead of pure passthrough. `inject_directives` mechanism for Sequential Thinking gating. Per-decision journal logging. | 5, 4 |
| 8 | **Bundle materialization** | `@jbird/bundle` package with manifest schema, vendored caveman skill at pinned version, MCP configs (context-lens, sequential-thinking, n8n, firecrawl, gitnexus, caveman-compress), sub-agent definitions, the jbird operating rule, settings fragments. `BundleMaterializer` service. `jbird plugins {sync,list}` commands. | 4 |
| 9 | **`jbird init` (Mode A — adopt existing)** | Project-type detection, `.jbird/config.toml` generation, bundle materialization, CLAUDE.md scaffolding from project conventions, Context-Lens initial indexing trigger, shell-profile setup, proxy verification. | 6, 7, 8 |
| 10 | **`jbird init` (Mode B — generate from prompt)** | `ProjectGenerator` service. `project-architect` sub-agent definition. Blueprint generation, interactive confirmation, skeleton materialization, then handoff to Mode A flow. | 9 |
| 11 | **`jbird tdd`** | `TddOrchestrator` service. `tdd-test-writer`, `tdd-refactorer`, `cavecrew-builder` (already in bundle from phase 8) sub-agents. `TestRunner` abstraction over Bruno + native runners. Three-mode support (feature/change/bug). Phase-by-phase status reporting. | 9 |
| 12 | **`jbird audit`** | `AuditOrchestrator` service. `audit-reporter-{quality,security,architecture}` sub-agents in bundle. `ReportRenderer` for markdown/JSON output. Parallel sub-agent fan-out. | 9 |
| 13 | **`jbird refactor`** | `RefactorOrchestrator` service. `refactor-verifier` sub-agent. Multi-phase flow (analyze → plan → confirm → apply → verify). `GateRunner` for tests/lint/build. Strict no-commit guarantee. | 9, 11 |
| 14 | **`jbird stats`** | Journal aggregation (proxy decisions, command invocations, materializations). Default 7-day window, configurable. JSON output mode. | 7 |
| 15 | **Distribution & install** | `bun build --compile` packaging. npm publish setup for `@jbird/cli`. README and install docs. Smoke tests on clean macOS + Linux. | All prior |

Phases 1–8 are infrastructure (the foundation must work before any feature does). Phases 9–14 deliver user-facing capabilities, each independently shippable once 1–8 are stable. Phase 15 closes v1.

If any phase grows past two weeks of work, it gets split.

---

## 6. Decisions

Every non-obvious choice with the alternative we discarded and why.

| Decision | Choice | Alternative discarded | Reason |
| --- | --- | --- | --- |
| **Tool shape** | Hybrid: thin CLI + plugin bundle + side service | Pure wrapper around Claude Code, or pure plugin bundle | Wrapper required reimplementing Claude Code's loop; pure plugin couldn't do dynamic per-prompt model routing. Hybrid is the smallest surface that unlocks all required levers. |
| **Host relationship** | jbird is a peer to Claude Code; never spawns it | jbird launches Claude Code with everything pre-wired | User runs Claude Code wherever they want (terminal, VS Code, JetBrains, etc.). Spawning would lock the host and break workflows. |
| **Runtime** | Bun | Node + npm/pnpm + Vitest | One tool replaces three; native TS execution; matches reference architecture; faster cold start. |
| **Language** | TypeScript 7.0 | TypeScript 5.x | Go-rewritten compiler is dramatically faster for type-checks and `.d.ts` emission, which matters in a monorepo. |
| **Test runner** | `bun:test` | Vitest, Jest | Comes with Bun, matches reference architecture, no extra dep. |
| **HTTP framework** | Hono | Express, Fastify, native Bun.serve | Lightweight, streaming-first, runs natively on Bun, used in proxy and IPC. |
| **CLI parser** | Commander | Yargs, Oclif | Simpler API, sufficient for our command surface, smallest dependency. |
| **Side-service supervision** | `Bun.spawn({ detached: true })` + info files | PM2, launchd from day one, custom supervisor process | Zero extra dependencies; OS-level detached process is sufficient for v1; launchd/systemd integration deferred to v2. |
| **IPC** | localhost HTTP (loopback only, 127.0.0.1) | Unix sockets, gRPC, named pipes | HTTP is the lowest-friction debuggable option; localhost-only addresses security; perf is fine for our load. Sockets considered for v2 if needed. |
| **RAG provider** | Context-Lens | Claude Context | Claude Context requires either paid embedding APIs (OpenAI/VoyageAI/Gemini) or local Ollama with model-server hardware. Context-Lens runs a 90MB model in-process on plain CPU, no API key, no daemon. Fits "no paid APIs, no heavy local servers" constraint. |
| **RAG invocation** | Agent-decided via MCP | Auto-injection via UserPromptSubmit hook + wrapping daemon | Context-Lens is stdio MCP, doesn't expose HTTP; building a wrapping daemon adds complexity without proven necessity. The jbird operating rule teaches Claude *when* to search, pulling the lever via doctrine rather than mechanism. Revisit if observed behavior is insufficient. |
| **Memory** | Native Claude Code auto-memory + CLAUDE.md only | Claude Mem plugin, Bedrock | User reports claude-mem doesn't deliver more than vanilla auto-memory; Bedrock requires Obsidian + active curation; native is zero-effort and sufficient. |
| **Observability** | jbird internal journals + HOL as recommended companion | Bundled HOL, custom dashboard, Context-Lens (which was mislabeled as observability) | HOL solves the dashboard problem cleanly, written in Python (separate install); jbird journals cover what HOL can't (routing-layer truth). Bundling HOL would force a Python dep on jbird users; recommending it preserves the choice. |
| **Sequential Thinking activation** | Always installed; gated by routing policy via `inject_directives` | Always-on system prompt; never installed | Opus has strong native extended thinking; injecting Sequential Thinking instruction on Opus routes is wasteful. Non-Opus models (Sonnet, Haiku, future Qwen) benefit substantially. Routing-time gating gives the right behavior per-call without static config. |
| **Caveman boundary** | Internal yes, final user response no (enforced by jbird rule) | Default-on everywhere, default-off everywhere | Default-on saves tokens but produces unreadable output for the user; default-off saves nothing on the heavy cost (sub-agent transcripts). Boundary captures both wins and is enforced as always-active doctrine via the rule. |
| **Caveman MCP description compression** | Use caveman's stdio proxy wrapper | Skip it | Sub-agent and tool descriptions get loaded every session; compressing them via the upstream proxy is free token savings with zero implementation cost. |
| **Operating doctrine** | A rule at `~/.claude/rules/jbird.md` | A skill (lazy-loaded), a CLAUDE.md section, a sub-agent | Skills are on-demand, wrong primitive. Mixing into CLAUDE.md collides with project conventions and creates merge complexity. Rules are the always-active primitive Claude Code provides; this is exactly what they're for. |
| **CLAUDE.md ownership split** | Project-level CLAUDE.md is user-owned forever after `init` scaffold; the rule at `~/.claude/rules/jbird.md` is jbird-owned | jbird manages a section of CLAUDE.md with markers | No idempotent merging logic, no risk of stomping user edits, clean ownership boundary. |
| **Routing v1 scope** | Anthropic only (Opus/Sonnet/Haiku); architecture pluggable for future providers | Anthropic + Qwen from day one | Qwen needs API-key auth (different from OAuth pass-through); proves the abstraction is correct without adding v1 complexity. v2 adds Qwen as a `QwenProvider` registration. |
| **Cost framing** | "Extend session capacity within Max plan limits" | "Reduce per-token spend" | User is on Claude Max OAuth, not pay-per-token API. Routing/RAG/caveman extend how much useful work fits in a 5-hour window, they don't reduce dollar cost. Reframe avoids misleading metrics in `jbird stats`. |
| **External code comprehension** | Firecrawl + Context-Lens (covers external repos via URL ingestion) | DeepWiki, Code Wiki, GitSummarize, Code2Tutorial | The four are convenience layers on top of capabilities Context-Lens already provides (it can `add_document <github-url>`). No reason to add four separate dependencies. |
| **TDD scope** | Single command with three modes (feature, change, bug) | Separate `tdd` and `bug` commands | Same loop, same gates, same orchestration; only the trigger differs. Single command with mode flag is the cleaner abstraction. |
| **Refactor step routing** | Always Opus (Sequential Thinking gated off because we're already on Opus) | Sonnet to save quota | Refactor is the architectural-judgment phase; routing it cheap defeats the purpose. Other phases (test-writer, builder) are mechanical and route accordingly. |
| **Test-writer and builder are separate sub-agents** | Hard separation enforced by sub-agent definitions | Single sub-agent does both | Prevents the most common TDD failure mode: writing tests to match what was just coded rather than driving design. Test-writer never sees implementation; builder never writes code beyond what makes tests pass. |
| **Init Mode B requires explicit confirmation of blueprint** | Interactive prompt before scaffolding | Auto-proceed if blueprint is "high confidence" | Generation is destructive (creates files); user must approve. No exception. |
| **Refactor never commits** | Stage only, user reviews and commits | Auto-commit if all gates green | Loss-of-work risk on auto-commit; preserves user control over what enters git history. |