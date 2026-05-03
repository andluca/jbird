---
name: jbird-discipline
description: Disciplina arquitetural do monorepo jbird — three-layer Command → Operation → Service → Infrastructure, four packages, ports na fronteira, schemas Zod em @jbird/core, naming, Bun-isms. Consultar ao criar comando, operation, service, rota do proxy ou helper novo.
---

# Disciplina jbird

Testabilidade decide a forma. Se voce testa com `expect(fn(input)).toEqual(output)` → funcao exportada. Se precisa mockar dependencias → classe com ports no constructor. Service > 80 LOC → extrair.

## Monorepo (4 packages)

```
@jbird/core      ← dependency-free, types/schemas/contracts/Logger/errors
   ↑
@jbird/bundle    @jbird/proxy
   ↑                ↑
@jbird/cli (orquestra todos)
```

Cross-package import so do barrel `index.ts`. Nunca de `packages/X/src/internal/...`.

## Three-layer (CLI)

```
packages/cli/src/
├── jbird.ts                              # router top-level (Commander)
├── commands/{cmd}/{cmd}.ts               # Command — parse argv, delega
├── commands/{cmd}/{op}/{op}.ts           # Operation — orquestra, recebe typed data
├── commands/{cmd}/shared/                # Command-level shared (services/models/integrations)
└── shared/                               # Global shared (services/models/integrations/test)
```

| Camada | Faz | Nao faz |
|---|---|---|
| Command | parse argv via Commander, delega pra Operation | business logic, FS, HTTP, child-process |
| Operation | orquestra Services + Infrastructure via ports | parsear argv, FS direto, shell direto |
| Service | logica complexa, ports no constructor | importar Command/Operation, escrever no stdout |
| Infrastructure | I/O concreto (FS, HTTP, shell, journal) | business logic |

Imports: descendentes only. Sharing: operation-level → command-level (`commands/{cmd}/shared/`) → global (`shared/`). Promover so quando 2+ consumidores existem.

## Ports

Service recebe ports como interfaces no constructor. Implementacao concreta vive em `shared/integrations/`. Em testes, mocks satisfazem a port.

<example>
```typescript
// shared/services/ports.ts
export interface FileSystem {
  readFile(path: string): Promise<string | null>;
  writeFile(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  hash(path: string): Promise<string>;
}

// shared/services/BundleMaterializer.ts
export class BundleMaterializer {
  constructor(
    private fs: FileSystem,
    private manifestStore: ManifestStore,
    private logger: Logger,
  ) {}

  async materialize(entries: ReadonlyArray<BundleEntry>): Promise<MaterializeResult> {
    const changes: FileChange[] = [];
    for (const entry of entries) {
      const existing = (await this.fs.exists(entry.target)) ? await this.fs.hash(entry.target) : null;
      if (existing === entry.hash) continue;
      const content = (await this.fs.readFile(entry.source)) ?? '';
      await this.fs.writeFile(entry.target, content);
      changes.push({ target: entry.target, action: existing ? 'update' : 'create' });
    }
    await this.manifestStore.write({ files: entries.map((e) => e.target) });
    return { changes };
  }
}
```
</example>

## Schemas

Zod em `@jbird/core/schemas`. Tipo derivado: `type X = z.infer<typeof xSchema>`. Single source of truth — nao duplique como interface paralela. Validar em fronteira (config TOML, IPC, journal events, manifest, sub-agent payload).

## Logging e errors

`Logger` interface em `@jbird/core` injetada via constructor. Sem `console.log` em production. Errors via classes de `@jbird/core/errors` (`ConfigError`, `BundleError`, `ProxyError`, `ServiceLifecycleError`, `IpcError`) com `code` discriminator e `details` opcional.

## Naming

- `kebab-case` arquivos: `routing-policy.ts`, `bundle-materializer.ts`.
- `PascalCase` classes: `BundleMaterializer`, `RoutingPolicy`.
- `camelCase` vars/metodos.
- `SCREAMING_SNAKE_CASE` constants top-level: `DEFAULT_PROXY_PORT`, `BUNDLE_MANIFEST_PATH`.
- Test suffix casa com codigo: `BundleMaterializer.test.ts`, `init.spec.ts`.
- Funcoes puras de modulo em `helpers.ts` quando nao vivem dentro do service.

## Bun-isms

- ESM only (`"type": "module"`).
- `Bun.file`, `Bun.write`, `Bun.spawn` passam por ports — nao chame direto em Service.
- HTTP no proxy: Hono. HTTP do CLI ao proxy: `fetch` nativo encapsulado em `ProxyClient`.
- `bun:test` apenas. Sem Vitest, sem Jest.

## Anti-patterns

<flag severity="critical">
- Static method em classe (use funcao exportada)
- `any` em production (use `unknown` + narrow)
- `console.log` em production (use Logger)
- Service tocando FS/HTTP/child-process direto sem port
- Operation parseando argv ou tocando FS direto
- Command importando Service ou Infrastructure
- Tipo paralelo a um schema Zod ja existente
</flag>
