import type { Stdout } from "../../../shared/services/ports.ts";

export interface AuditRunOptions {
  readonly path: string;
  readonly scope: "quality" | "security" | "architecture" | "all";
  readonly format: "md" | "json";
  readonly output: string | undefined;
}

export interface AuditRunDeps {
  readonly stdout: Stdout;
}

export function runAudit(opts: AuditRunOptions, deps: AuditRunDeps): Promise<void> {
  deps.stdout.write(`jbird audit run: not yet implemented (path=${opts.path})`);
  return Promise.resolve();
}
