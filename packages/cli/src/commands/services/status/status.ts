import type { Stdout } from "../../../shared/services/ports.ts";

export type ServicesStatusOptions = Record<string, unknown>;

export interface ServicesStatusDeps {
  readonly stdout: Stdout;
}

export function runServicesStatus(_opts: ServicesStatusOptions, deps: ServicesStatusDeps): Promise<void> {
  deps.stdout.write("jbird services status: not yet implemented");
  return Promise.resolve();
}
