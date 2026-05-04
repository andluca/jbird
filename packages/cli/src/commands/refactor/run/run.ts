import type { Stdout } from "../../../shared/services/ports.ts";

export interface RefactorRunOptions {
  readonly target: string;
  readonly scope: string | undefined;
  readonly gates: string;
}

export interface RefactorRunDeps {
  readonly stdout: Stdout;
}

export function runRefactor(opts: RefactorRunOptions, deps: RefactorRunDeps): Promise<void> {
  deps.stdout.write(`jbird refactor run: not yet implemented (target=${opts.target})`);
  return Promise.resolve();
}
