import type { Stdout } from "../../../shared/services/ports.ts";

export interface ConfigSetOptions {
  readonly key: string;
  readonly value: string;
}

export interface ConfigSetDeps {
  readonly stdout: Stdout;
}

export function runConfigSet(opts: ConfigSetOptions, deps: ConfigSetDeps): Promise<void> {
  deps.stdout.write(`jbird config set: not yet implemented (key=${opts.key})`);
  return Promise.resolve();
}
