import type { Command } from "commander";
import type { Stdout } from "../../shared/services/ports.ts";
import { runRefactor } from "./run/run.ts";

interface RefactorOptions {
  readonly scope?: string;
  readonly gates: string;
}

interface CommandDeps {
  readonly stdout: Stdout;
}

export function registerRefactor(program: Command, deps: CommandDeps): void {
  program
    .command("refactor")
    .description("Run refactor workflow for a target description.")
    .argument("<target>", "description of the refactoring target")
    .option("--scope <path>", "limit refactoring to this path")
    .option("--gates <gates>", "gates to run: test,lint,build", "test,lint,build")
    .action(async (target: string, opts: RefactorOptions) => {
      await runRefactor({ target, scope: opts.scope, gates: opts.gates }, deps);
      process.exitCode = 2;
    });
}
