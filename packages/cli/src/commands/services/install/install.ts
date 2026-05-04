import type { Stdout } from "../../../shared/services/ports.ts";

export type ServicesInstallOptions = Record<string, unknown>;

export interface ServicesInstallDeps {
  readonly stdout: Stdout;
}

export function runServicesInstall(_opts: ServicesInstallOptions, deps: ServicesInstallDeps): Promise<void> {
  deps.stdout.write("jbird services install: not yet implemented");
  return Promise.resolve();
}
