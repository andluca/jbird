import type { Stdout } from "../../../shared/services/ports.ts";

export interface ScaffoldOptions {
  readonly path: string;
  readonly profile: string | undefined;
  readonly index: boolean;
  readonly shellSetup: boolean;
}

export interface ScaffoldDeps {
  readonly stdout: Stdout;
}

export function runScaffold(opts: ScaffoldOptions, deps: ScaffoldDeps): Promise<void> {
  deps.stdout.write(`jbird init scaffold: not yet implemented (path=${opts.path})`);
  return Promise.resolve();
}
