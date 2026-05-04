import type { Stdout } from "../../../shared/services/ports.ts";

export type ServicesStartOptions = Record<string, unknown>;

export interface ServicesStartDeps {
  readonly stdout: Stdout;
}

export function runServicesStart(_opts: ServicesStartOptions, deps: ServicesStartDeps): Promise<void> {
  deps.stdout.write("jbird services start: not yet implemented");
  return Promise.resolve();
}
