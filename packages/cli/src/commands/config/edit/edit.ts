import { ConfigError } from "@jbird/core";
import type { Stdout, Editor } from "../../../shared/services/ports.ts";
import type { ConfigLoader } from "../../../shared/services/ConfigLoader.ts";
import type { StateDir } from "../../../shared/services/StateDir.ts";

export interface ConfigEditOptions {
  readonly global?: boolean;
  readonly cwd: string;
}

export interface ConfigEditDeps {
  readonly stdout: Stdout;
  readonly editor: Editor;
  readonly stateDir: StateDir;
  readonly configLoader: ConfigLoader;
}

export async function runConfigEdit(opts: ConfigEditOptions, deps: ConfigEditDeps): Promise<void> {
  const useGlobal = opts.global !== false;
  const paths = useGlobal
    ? await deps.stateDir.ensureGlobal()
    : await deps.stateDir.ensureProject(opts.cwd);

  const exitCode = await deps.editor.open(paths.configPath);

  if (exitCode !== 0) {
    process.stderr.write(`Editor exited with code ${exitCode.toString()}\n`);
    process.exitCode = 1;
    return;
  }

  try {
    if (useGlobal) {
      await deps.configLoader.loadGlobal();
    } else {
      await deps.configLoader.load(opts.cwd);
    }
    deps.stdout.write("config saved");
  } catch (err) {
    const message = err instanceof ConfigError ? err.message : "Config validation failed after edit";
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}
