import type { Stdout } from "../../../shared/services/ports.ts";

export interface TddRunOptions {
  readonly work: string;
  readonly mode: "feature" | "change" | "bug";
  readonly stack: string | undefined;
  readonly maxIterations: number;
}

export interface TddRunDeps {
  readonly stdout: Stdout;
}

export function runTdd(opts: TddRunOptions, deps: TddRunDeps): Promise<void> {
  deps.stdout.write(`jbird tdd run: not yet implemented (work=${opts.work})`);
  return Promise.resolve();
}
