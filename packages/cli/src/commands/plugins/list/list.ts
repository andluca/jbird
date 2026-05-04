import type { Stdout } from "../../../shared/services/ports.ts";

export type PluginsListOptions = Record<string, unknown>;

export interface PluginsListDeps {
  readonly stdout: Stdout;
}

export function runPluginsList(_opts: PluginsListOptions, deps: PluginsListDeps): Promise<void> {
  deps.stdout.write("jbird plugins list: not yet implemented");
  return Promise.resolve();
}
