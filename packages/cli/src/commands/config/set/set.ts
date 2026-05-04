import { ConfigError } from "@jbird/core";
import type { Stdout } from "../../../shared/services/ports.ts";
import type { ConfigWriter } from "../../../shared/services/ConfigWriter.ts";
import type { StateDir } from "../../../shared/services/StateDir.ts";

export interface ConfigSetOptions {
  readonly key: string;
  readonly value: string;
  readonly global?: boolean;
}

export interface ConfigSetDeps {
  readonly stdout: Stdout;
  readonly configWriter: ConfigWriter;
  readonly stateDir: StateDir;
}

export async function runConfigSet(opts: ConfigSetOptions, deps: ConfigSetDeps): Promise<void> {
  try {
    if (opts.global === true) {
      await deps.stateDir.ensureGlobal();
      await deps.configWriter.setGlobal(opts.key, opts.value);
    } else {
      const cwd = process.cwd();
      await deps.stateDir.ensureProject(cwd);
      await deps.configWriter.setProject(cwd, opts.key, opts.value);
    }
    deps.stdout.write(`set ${opts.key} = ${opts.value}`);
  } catch (err) {
    const message = err instanceof ConfigError ? err.message : "Failed to write config";
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}
