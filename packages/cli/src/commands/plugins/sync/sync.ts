import type { Stdout } from "../../../shared/services/ports.ts";

export type PluginsSyncOptions = Record<string, unknown>;

export interface PluginsSyncDeps {
  readonly stdout: Stdout;
}

export function runPluginsSync(_opts: PluginsSyncOptions, deps: PluginsSyncDeps): Promise<void> {
  deps.stdout.write("jbird plugins sync: not yet implemented");
  return Promise.resolve();
}
