import type { Stdout } from "../../../shared/services/ports.ts";

export interface GenerateOptions {
  readonly path: string;
  readonly prompt: string | undefined;
  readonly profile: string | undefined;
}

export interface GenerateDeps {
  readonly stdout: Stdout;
}

export function runGenerate(opts: GenerateOptions, deps: GenerateDeps): Promise<void> {
  deps.stdout.write(`jbird init generate: not yet implemented (path=${opts.path})`);
  return Promise.resolve();
}
