import type { Stdout } from "../../../shared/services/ports.ts";

export type ServicesStopOptions = Record<string, unknown>;

export interface ServicesStopDeps {
  readonly stdout: Stdout;
}

export function runServicesStop(_opts: ServicesStopOptions, deps: ServicesStopDeps): Promise<void> {
  deps.stdout.write("jbird services stop: not yet implemented");
  return Promise.resolve();
}
