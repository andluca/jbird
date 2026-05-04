import type { Stdout } from "../../../shared/services/ports.ts";

export type ConfigEditOptions = Record<string, unknown>;

export interface ConfigEditDeps {
  readonly stdout: Stdout;
}

export function runConfigEdit(_opts: ConfigEditOptions, deps: ConfigEditDeps): Promise<void> {
  deps.stdout.write("jbird config edit: not yet implemented");
  return Promise.resolve();
}
