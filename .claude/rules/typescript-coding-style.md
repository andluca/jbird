---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---
# TypeScript — jbird

Stack: Bun + TS 7.0 strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), ESM only.

- Tipos explicitos em funcoes/metodos exportados. Inferencia em locals.
- `interface` pra shapes extendiveis/implementaveis. `type` pra unions/intersections/mapped/utility.
- Schemas Zod sao a fonte do tipo: `type X = z.infer<typeof xSchema>`. Nao duplique como interface.
- Sem `any` (use `unknown` + narrow). Sem non-null assertion `!` salvo caso documentado.
- Sem `console.log` — use `Logger` de `@jbird/core` injetado via constructor.
- Errors via classes de `@jbird/core/errors` (`ConfigError`, `BundleError`, `ProxyError`, `ServiceLifecycleError`, `IpcError`). `try/catch` com narrow seguro de `unknown`.
- Validar entrada externa com Zod (`schema.parse()`) — nunca pular em fronteira (config, IPC, journal, manifest).
- Imutabilidade: spread pra updates, `ReadonlyArray<T>` em params que nao mutam.
- `const` > `let`, `===` sempre, `?.` e `??` > checks manuais, `async/await` > `.then()`, type guards > `as`.
- Cross-package import so do barrel `index.ts`, nunca de `packages/X/src/internal/...`.
- `bun:test` apenas. Sem `vitest`, sem `jest`, sem `vi.fn()` ou `jest.fn()`.

Camadas, ports, monorepo, naming → ver skill `jbird-discipline`.
