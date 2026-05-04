import type { Stdout } from "../../../shared/services/ports.ts";

export type ServicesLogsOptions = Record<string, unknown>;

export interface ServicesLogsDeps {
  readonly stdout: Stdout;
}

export function runServicesLogs(_opts: ServicesLogsOptions, deps: ServicesLogsDeps): Promise<void> {
  deps.stdout.write("jbird services logs: not yet implemented");
  return Promise.resolve();
}
