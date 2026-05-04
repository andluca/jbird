import type { Stdout } from "../../../shared/services/ports.ts";

export interface ConfigGetOptions {
  readonly key: string;
}

export interface ConfigGetDeps {
  readonly stdout: Stdout;
}

export function runConfigGet(opts: ConfigGetOptions, deps: ConfigGetDeps): Promise<void> {
  deps.stdout.write(`jbird config get: not yet implemented (key=${opts.key})`);
  return Promise.resolve();
}
